import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

type LineInput = { category: string; description: string; amount: number };

type ExpAcct = { id: string; name: string };

const MIN_SUB = 4;

/**
 * After an expense is saved: debit expense GL account(s), credit the payment account.
 *
 * Resolves each line to an `accounts` row with `type = 'expense'`:
 * 1. Exact match (case-insensitive) on **Category**, or **Description** if category is blank.
 * 2. Otherwise substring match (category/description contains account name or vice versa; min length {@link MIN_SUB}).
 * 3. Otherwise **General expense** (created if missing).
 */
export async function postExpenseToLedger(
  supabase: Client,
  params: {
    expenseId: string;
    paymentAccountId: string;
    entryDate: string;
    memo: string | null;
    lines: LineInput[];
  },
): Promise<void> {
  const { expenseId, paymentAccountId, entryDate, memo, lines } = params;

  const { data: payAcct, error: payErr } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("id", paymentAccountId)
    .maybeSingle();

  if (payErr) throw new Error(payErr.message);
  if (!payAcct) throw new Error("Payment account not found.");
  if (payAcct.type !== "asset" && payAcct.type !== "liability") {
    throw new Error("Payment account must be an asset or liability (e.g. bank or credit card).");
  }

  const { data: expenseAccts, error: expErr } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("type", "expense")
    .order("name");

  if (expErr) throw new Error(expErr.message);
  let expList: ExpAcct[] = expenseAccts || [];
  const byNorm = new Map<string, string>();
  for (const a of expList) {
    byNorm.set(a.name.trim().toLowerCase(), a.id);
  }

  let generalId = byNorm.get("general expense") ?? null;
  if (!generalId) {
    const { data: created, error: genErr } = await supabase
      .from("accounts")
      .insert({
        name: "General expense",
        type: "expense",
        description: "Catch-all when category/description does not match another expense account",
      })
      .select("id")
      .single();
    if (!genErr && created?.id) {
      generalId = created.id;
      byNorm.set("general expense", created.id);
      expList = [...expList, { id: created.id, name: "General expense" }];
    }
  }

  if (!generalId) {
    throw new Error(
      "Could not create or find a **General expense** account. Check Chart of Accounts and database permissions.",
    );
  }

  function resolveExpenseAccountId(label: string): string {
    const k = label.trim().toLowerCase();
    if (!k) return generalId!;

    const exact = byNorm.get(k);
    if (exact) return exact;

    let bestId: string | null = null;
    let bestScore = 0;
    for (const a of expList) {
      const n = a.name.trim().toLowerCase();
      if (n === "general expense") continue;
      if (n.length < MIN_SUB && k.length < MIN_SUB) continue;
      if (k.includes(n) || n.includes(k)) {
        const score = Math.min(Math.max(n.length, MIN_SUB), Math.max(k.length, MIN_SUB));
        if (score > bestScore) {
          bestScore = score;
          bestId = a.id;
        }
      }
    }
    if (bestId) return bestId;
    return generalId!;
  }

  const debitByAccount = new Map<string, number>();

  for (const item of lines) {
    const amt = Math.round((Number(item.amount) || 0) * 100) / 100;
    if (amt <= 0) continue;

    const label = (item.category || "").trim() || (item.description || "").trim();
    const eid = resolveExpenseAccountId(label);
    debitByAccount.set(eid, (debitByAccount.get(eid) || 0) + amt);
  }

  if (debitByAccount.size === 0) {
    throw new Error("Add at least one line with an amount greater than zero.");
  }

  const total = [...debitByAccount.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) throw new Error("Total must be greater than zero.");

  const { data: entry, error: jeErr } = await supabase
    .from("journal_entries")
    .insert({
      reference_id: expenseId,
      reference_type: "expense",
      entry_date: entryDate,
      description: memo?.trim() || "Expense",
    })
    .select("id")
    .single();

  if (jeErr || !entry?.id) throw new Error(jeErr?.message ?? "Could not create journal entry.");

  const jid = entry.id;
  const jl: {
    journal_id: string;
    account_id: string;
    debit: number | null;
    credit: number | null;
  }[] = [];

  for (const [accountId, amt] of debitByAccount) {
    jl.push({ journal_id: jid, account_id: accountId, debit: amt, credit: null });
  }
  jl.push({ journal_id: jid, account_id: paymentAccountId, debit: null, credit: total });

  const { error: jlErr } = await supabase.from("journal_lines").insert(jl);
  if (jlErr) {
    await supabase.from("journal_entries").delete().eq("id", jid);
    throw new Error(jlErr.message);
  }
}
