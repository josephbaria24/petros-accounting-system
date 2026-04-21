import type { SupabaseClient } from "@supabase/supabase-js"

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

const DEPOSIT_ALLOWED = new Set(["asset", "liability", "income", "expense"])

async function assertDepositPostingAccount(supabase: Client, accountId: string): Promise<void> {
  const id = String(accountId || "").trim()
  if (!id) throw new Error("Choose a deposit account from Chart of Accounts.")

  const { data: row, error } = await supabase.from("accounts").select("id, type, name").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!row?.id) throw new Error("Deposit account not found.")
  if (!row.type || !DEPOSIT_ALLOWED.has(row.type)) {
    throw new Error("Deposit account must be an asset, liability, income, or expense row from Chart of Accounts.")
  }

  const n = String(row.name || "").trim().toLowerCase()
  if (n === AR_NAME.toLowerCase()) {
    throw new Error("Choose a different account than Accounts Receivable.")
  }
}

/**
 * Posts a journal entry for a received invoice payment:
 * - Debit: selected Chart of Accounts account (asset, liability, income, or expense)
 * - Credit: Accounts Receivable (asset)
 */
export async function postPaymentToLedger(
  supabase: Client,
  params: {
    paymentId: string
    /** Chart of `accounts.id` — asset, liability, income, or expense (e.g. Cash on hand, Sales Revenue). */
    depositAccountId: string
    amount: number
    entryDate: string
    memo?: string | null
  },
): Promise<void> {
  const amount = Math.round((Number(params.amount) || 0) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) return

  await assertDepositPostingAccount(supabase, params.depositAccountId)
  const depositId = params.depositAccountId.trim()

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
