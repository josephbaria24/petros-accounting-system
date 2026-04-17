import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureOpeningBalanceEquityAccount } from "@/lib/opening-balance-journal";
import type { PaymentAccountRow } from "@/lib/payment-account-balances";

type Client = SupabaseClient;

type AccountType = PaymentAccountRow["type"];

/**
 * Post a single journal entry so the account's *display* balance moves from current → target.
 * Offsets against **Opening Balance Equity**, same pattern as opening balances.
 */
export async function postAccountBalanceAdjustment(
  supabase: Client,
  params: {
    accountId: string;
    accountType: AccountType;
    currentDisplayBalance: number;
    newDisplayBalance: number;
    entryDate: string;
    memo: string;
  },
): Promise<{ journalEntryId: string } | { skipped: true }> {
  const { accountId, accountType, currentDisplayBalance, newDisplayBalance, entryDate, memo } =
    params;

  const delta =
    Math.round((Number(newDisplayBalance) - Number(currentDisplayBalance)) * 100) / 100;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.005) {
    return { skipped: true };
  }

  const equityId = await ensureOpeningBalanceEquityAccount(supabase);
  if (accountId === equityId) {
    throw new Error("Adjust another account; Opening Balance Equity is only used as the offset.");
  }

  const absAmt = Math.abs(delta);
  const debitNormal = accountType === "asset" || accountType === "expense";

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: entryDate,
      description: memo.trim() || "Balance adjustment",
    })
    .select("id")
    .single();

  if (entryErr || !entry?.id) {
    throw new Error(entryErr?.message ?? "Failed to create journal entry.");
  }

  const journalId = entry.id;
  const lines: {
    journal_id: string;
    account_id: string;
    debit: number | null;
    credit: number | null;
  }[] = [];

  if (debitNormal) {
    if (delta > 0) {
      lines.push({ journal_id: journalId, account_id: accountId, debit: absAmt, credit: null });
      lines.push({ journal_id: journalId, account_id: equityId, debit: null, credit: absAmt });
    } else {
      lines.push({ journal_id: journalId, account_id: accountId, debit: null, credit: absAmt });
      lines.push({ journal_id: journalId, account_id: equityId, debit: absAmt, credit: null });
    }
  } else {
    if (delta > 0) {
      lines.push({ journal_id: journalId, account_id: accountId, debit: null, credit: absAmt });
      lines.push({ journal_id: journalId, account_id: equityId, debit: absAmt, credit: null });
    } else {
      lines.push({ journal_id: journalId, account_id: accountId, debit: absAmt, credit: null });
      lines.push({ journal_id: journalId, account_id: equityId, debit: null, credit: absAmt });
    }
  }

  const { error: linesErr } = await supabase.from("journal_lines").insert(lines);
  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", journalId);
    throw new Error(linesErr.message);
  }

  return { journalEntryId: journalId };
}
