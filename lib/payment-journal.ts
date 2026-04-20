import type { SupabaseClient } from "@supabase/supabase-js"
import type { PaymentAccountSlug } from "@/lib/payment-account-balances"
import { SLUG_TO_CANONICAL_NAME } from "@/lib/payment-account-balances"
import { ensurePaymentAssetAccounts } from "@/lib/opening-balance-journal"

type Client = SupabaseClient

const AR_NAME = "Accounts Receivable"

async function ensureArAccount(supabase: Client): Promise<string> {
  const { data: found, error: findErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", "asset")
    .eq("name", AR_NAME)
    .maybeSingle()
  if (findErr) throw new Error(findErr.message)
  if (found?.id) return found.id

  const { data: created, error: insErr } = await supabase
    .from("accounts")
    .insert({ name: AR_NAME, type: "asset", description: "Accounts Receivable (A/R)" })
    .select("id")
    .single()
  if (insErr || !created?.id) throw new Error(insErr?.message ?? "Could not create A/R account.")
  return created.id
}

function clampIsoDate(d: string): string {
  const t = String(d || "").trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  return new Date().toISOString().slice(0, 10)
}

/**
 * Posts a journal entry for a received invoice payment:
 * - Debit: selected deposit account (asset)
 * - Credit: Accounts Receivable (asset)
 */
export async function postPaymentToLedger(
  supabase: Client,
  params: {
    paymentId: string
    depositTo: PaymentAccountSlug
    amount: number
    entryDate: string
    memo?: string | null
  },
): Promise<void> {
  const amount = Math.round((Number(params.amount) || 0) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) return

  const assetIds = await ensurePaymentAssetAccounts(supabase)
  const depositId = assetIds[params.depositTo]
  if (!depositId) {
    throw new Error(`Deposit account not found for ${SLUG_TO_CANONICAL_NAME[params.depositTo]}`)
  }

  const arId = await ensureArAccount(supabase)
  const entryDate = clampIsoDate(params.entryDate)

  const { data: entry, error: jeErr } = await supabase
    .from("journal_entries")
    .insert({
      reference_id: params.paymentId,
      reference_type: "payment",
      entry_date: entryDate,
      description: params.memo?.trim() || "Invoice payment",
    })
    .select("id")
    .single()
  if (jeErr || !entry?.id) throw new Error(jeErr?.message ?? "Could not create journal entry.")

  const jid = entry.id
  const { error: jlErr } = await supabase.from("journal_lines").insert([
    { journal_id: jid, account_id: depositId, debit: amount, credit: null },
    { journal_id: jid, account_id: arId, debit: null, credit: amount },
  ])

  if (jlErr) {
    await supabase.from("journal_entries").delete().eq("id", jid)
    throw new Error(jlErr.message)
  }
}

