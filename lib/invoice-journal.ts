import type { SupabaseClient } from "@supabase/supabase-js"

type Client = SupabaseClient

const AR_NAME = "Accounts Receivable"
const SALES_NAME = "Sales Revenue"

async function ensureAccount(
  supabase: Client,
  params: { name: string; type: "asset" | "income"; description?: string | null },
): Promise<string> {
  const { data: found, error: findErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", params.type)
    .eq("name", params.name)
    .maybeSingle()
  if (findErr) throw new Error(findErr.message)
  if (found?.id) return found.id

  const { data: created, error: insErr } = await supabase
    .from("accounts")
    .insert({
      name: params.name,
      type: params.type,
      description: params.description ?? null,
    })
    .select("id")
    .single()
  if (insErr || !created?.id) throw new Error(insErr?.message ?? "Could not create account.")
  return created.id
}

function clampIsoDate(d: string | null | undefined): string {
  const t = String(d || "").trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  return new Date().toISOString().slice(0, 10)
}

/** Removes the accrual journal entry for this invoice (journal_lines cascade). */
export async function removeInvoiceLedgerPosting(supabase: Client, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("reference_type", "invoice")
    .eq("reference_id", invoiceId)
  if (error) throw new Error(error.message)
}

/**
 * When invoices are deleted from the app, remove their ledger postings and any
 * payment postings tied to those invoices so Chart of Accounts stays aligned.
 */
export async function removeLedgerForDeletedInvoices(
  supabase: Client,
  invoiceIds: string[],
): Promise<void> {
  if (!invoiceIds.length) return

  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("id")
    .in("invoice_id", invoiceIds)
  if (payErr) throw new Error(payErr.message)

  const paymentIds = (payments || []).map((r) => r.id).filter(Boolean) as string[]
  if (paymentIds.length > 0) {
    const { error: jPayErr } = await supabase
      .from("journal_entries")
      .delete()
      .eq("reference_type", "payment")
      .in("reference_id", paymentIds)
    if (jPayErr) throw new Error(jPayErr.message)
  }

  const { error: jInvErr } = await supabase
    .from("journal_entries")
    .delete()
    .eq("reference_type", "invoice")
    .in("reference_id", invoiceIds)
  if (jInvErr) throw new Error(jInvErr.message)
}

async function deleteJournalEntryIdsByChunks(supabase: Client, entryIds: string[]): Promise<void> {
  const chunk = 150
  for (let i = 0; i < entryIds.length; i += chunk) {
    const slice = entryIds.slice(i, i + chunk)
    const { error } = await supabase.from("journal_entries").delete().in("id", slice)
    if (error) throw new Error(error.message)
  }
}

/**
 * Removes journal entries that still point at invoices or payments which no longer exist
 * (e.g. invoices deleted before ledger cleanup was implemented).
 */
export async function removeOrphanInvoicePaymentLedgers(supabase: Client): Promise<{
  removedInvoiceEntries: number
  removedPaymentEntries: number
}> {
  let removedInvoiceEntries = 0
  let removedPaymentEntries = 0

  const { data: invJe, error: invErr } = await supabase
    .from("journal_entries")
    .select("id, reference_id")
    .eq("reference_type", "invoice")
    .not("reference_id", "is", null)
  if (invErr) throw new Error(invErr.message)

  if (invJe?.length) {
    const refIds = [...new Set(invJe.map((r) => r.reference_id).filter(Boolean) as string[])]
    if (refIds.length) {
      const { data: invRows, error: invQErr } = await supabase.from("invoices").select("id").in("id", refIds)
      if (invQErr) throw new Error(invQErr.message)
      const still = new Set((invRows || []).map((r) => r.id))
      const orphanIds = invJe
        .filter((j) => j.reference_id && !still.has(String(j.reference_id)))
        .map((j) => j.id)
      if (orphanIds.length) {
        await deleteJournalEntryIdsByChunks(supabase, orphanIds)
        removedInvoiceEntries = orphanIds.length
      }
    }
  }

  const { data: payJe, error: payErr } = await supabase
    .from("journal_entries")
    .select("id, reference_id")
    .eq("reference_type", "payment")
    .not("reference_id", "is", null)
  if (payErr) throw new Error(payErr.message)

  if (payJe?.length) {
    const prefIds = [...new Set(payJe.map((r) => r.reference_id).filter(Boolean) as string[])]
    if (prefIds.length) {
      const { data: payRows, error: payQErr } = await supabase.from("payments").select("id").in("id", prefIds)
      if (payQErr) throw new Error(payQErr.message)
      const pstill = new Set((payRows || []).map((r) => r.id))
      const orphanPayIds = payJe
        .filter((j) => j.reference_id && !pstill.has(String(j.reference_id)))
        .map((j) => j.id)
      if (orphanPayIds.length) {
        await deleteJournalEntryIdsByChunks(supabase, orphanPayIds)
        removedPaymentEntries = orphanPayIds.length
      }
    }
  }

  return { removedInvoiceEntries, removedPaymentEntries }
}

/**
 * Accrual posting for an invoice:
 * - Debit Accounts Receivable
 * - Credit Sales Revenue
 */
export async function postInvoiceToLedger(
  supabase: Client,
  params: {
    invoiceId: string
    invoiceNo: string
    issueDate: string | null
    amount: number
  },
): Promise<void> {
  const amt = Math.round((Number(params.amount) || 0) * 100) / 100
  if (!Number.isFinite(amt) || amt <= 0) {
    await removeInvoiceLedgerPosting(supabase, params.invoiceId)
    return
  }

  const arId = await ensureAccount(supabase, {
    name: AR_NAME,
    type: "asset",
    description: "Accounts Receivable (A/R)",
  })
  const salesId = await ensureAccount(supabase, {
    name: SALES_NAME,
    type: "income",
    description: "Sales / invoice revenue",
  })

  // Idempotent: remove prior posting for this invoice if present, then insert fresh.
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("reference_type", "invoice")
    .eq("reference_id", params.invoiceId)
    .maybeSingle()

  if (existing?.id) {
    await supabase.from("journal_entries").delete().eq("id", existing.id)
  }

  const entryDate = clampIsoDate(params.issueDate)
  const { data: entry, error: jeErr } = await supabase
    .from("journal_entries")
    .insert({
      reference_id: params.invoiceId,
      reference_type: "invoice",
      entry_date: entryDate,
      description: `Invoice ${params.invoiceNo}`,
    })
    .select("id")
    .single()

  if (jeErr || !entry?.id) throw new Error(jeErr?.message ?? "Could not create journal entry.")

  const jid = entry.id
  const { error: jlErr } = await supabase.from("journal_lines").insert([
    { journal_id: jid, account_id: arId, debit: amt, credit: null },
    { journal_id: jid, account_id: salesId, debit: null, credit: amt },
  ])

  if (jlErr) {
    await supabase.from("journal_entries").delete().eq("id", jid)
    throw new Error(jlErr.message)
  }
}
