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
  if (!Number.isFinite(amt) || amt <= 0) return

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
