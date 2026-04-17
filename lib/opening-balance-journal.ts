import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PAYMENT_ACCOUNT_SLUGS,
  SLUG_TO_CANONICAL_NAME,
  type PaymentAccountSlug,
} from "@/lib/payment-account-balances";

const OPENING_EQUITY_NAME = "Opening Balance Equity";

/** Untyped client avoids `never` inference issues with generated `Database` in some builds. */
type Client = SupabaseClient;

/** Ensure the four payment asset accounts exist (exact name, type asset). */
export async function ensurePaymentAssetAccounts(supabase: Client): Promise<
  Record<PaymentAccountSlug, string>
> {
  const ids: Partial<Record<PaymentAccountSlug, string>> = {};

  for (const slug of PAYMENT_ACCOUNT_SLUGS) {
    const name = SLUG_TO_CANONICAL_NAME[slug];
    const { data: found } = await supabase
      .from("accounts")
      .select("id")
      .eq("type", "asset")
      .eq("name", name)
      .maybeSingle();

    if (found?.id) {
      ids[slug] = found.id;
      continue;
    }

    const { data: created, error } = await supabase
      .from("accounts")
      .insert({
        name,
        type: "asset",
        description: "Cash / bank payment account",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    ids[slug] = created!.id;
  }

  return ids as Record<PaymentAccountSlug, string>;
}

export async function ensureOpeningBalanceEquityAccount(supabase: Client): Promise<string> {
  const { data: found } = await supabase
    .from("accounts")
    .select("id")
    .eq("type", "equity")
    .eq("name", OPENING_EQUITY_NAME)
    .maybeSingle();

  if (found?.id) return found.id;

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({
      name: OPENING_EQUITY_NAME,
      type: "equity",
      description: "Offset for opening balance journal entries",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created!.id;
}

export type OpeningBalanceAmounts = Record<PaymentAccountSlug, number>;

/**
 * Posts one journal entry: debit each payment account (positive amounts), credit Opening Balance Equity for the sum.
 * Amounts must be ≥ 0. Skips zero lines.
 */
export async function postOpeningBalancesForPaymentAccounts(
  supabase: Client,
  amounts: OpeningBalanceAmounts,
  entryDate: string,
): Promise<{ journalEntryId: string; total: number }> {
  const rounded: OpeningBalanceAmounts = { ...amounts };
  for (const slug of PAYMENT_ACCOUNT_SLUGS) {
    const v = Number(rounded[slug]);
    if (!Number.isFinite(v) || v < 0) {
      throw new Error("Amounts must be zero or positive numbers.");
    }
    rounded[slug] = Math.round(v * 100) / 100;
  }

  const total = PAYMENT_ACCOUNT_SLUGS.reduce((s, slug) => s + rounded[slug], 0);
  if (total <= 0) {
    throw new Error("Enter at least one opening balance greater than zero.");
  }

  const assetIds = await ensurePaymentAssetAccounts(supabase);
  const equityId = await ensureOpeningBalanceEquityAccount(supabase);

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: entryDate,
      description: "Opening balances — payment accounts",
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    throw new Error(entryErr?.message ?? "Failed to create journal entry.");
  }

  const journalId = entry.id;

  const lines: { journal_id: string; account_id: string; debit: number | null; credit: number | null }[] =
    [];

  for (const slug of PAYMENT_ACCOUNT_SLUGS) {
    const amt = rounded[slug];
    if (amt <= 0) continue;
    lines.push({
      journal_id: journalId,
      account_id: assetIds[slug],
      debit: amt,
      credit: null,
    });
  }

  lines.push({
    journal_id: journalId,
    account_id: equityId,
    debit: null,
    credit: total,
  });

  const { error: linesErr } = await supabase.from("journal_lines").insert(lines);

  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", journalId);
    throw new Error(linesErr.message);
  }

  return { journalEntryId: journalId, total };
}

/**
 * Opening balances for any **payment-style** accounts (same set as the expense payment account picker:
 * `type` asset or liability). One journal entry: debit assets (and expenses if present), credit liabilities,
 * and net **Opening Balance Equity** so debits = credits.
 */
export async function postOpeningBalancesByAccountIds(
  supabase: Client,
  amountsByAccountId: Record<string, number>,
  entryDate: string,
): Promise<{ journalEntryId: string; totalAssetDebits: number }> {
  const entries = Object.entries(amountsByAccountId)
    .map(([id, v]) => ({ id, amt: Math.round((Number(v) || 0) * 100) / 100 }))
    .filter((x) => x.amt > 0);

  if (entries.length === 0) {
    throw new Error("Enter at least one opening balance greater than zero.");
  }

  const ids = entries.map((e) => e.id);
  const { data: accts, error: accErr } = await supabase
    .from("accounts")
    .select("id, type")
    .in("id", ids);

  if (accErr) throw new Error(accErr.message);
  const typeById = new Map((accts || []).map((a) => [a.id, a.type as string]));

  let assetSum = 0;
  let liabilitySum = 0;
  const lines: {
    journal_id: string;
    account_id: string;
    debit: number | null;
    credit: number | null;
  }[] = [];

  const equityId = await ensureOpeningBalanceEquityAccount(supabase);

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: entryDate,
      description: "Opening balances — payment accounts",
    })
    .select("id")
    .single();

  if (entryErr || !entry?.id) {
    throw new Error(entryErr?.message ?? "Failed to create journal entry.");
  }

  const journalId = entry.id;

  for (const { id, amt } of entries) {
    const t = typeById.get(id);
    if (!t) throw new Error(`Account not found: ${id}`);
    if (t === "asset" || t === "expense") {
      lines.push({ journal_id: journalId, account_id: id, debit: amt, credit: null });
      assetSum += amt;
    } else if (t === "liability" || t === "equity" || t === "income") {
      lines.push({ journal_id: journalId, account_id: id, debit: null, credit: amt });
      liabilitySum += amt;
    } else {
      throw new Error(`Opening balance for type "${t}" is not supported from this form.`);
    }
  }

  const net = Math.round((assetSum - liabilitySum) * 100) / 100;
  if (Math.abs(net) >= 0.005) {
    if (net > 0) {
      lines.push({ journal_id: journalId, account_id: equityId, debit: null, credit: net });
    } else {
      lines.push({ journal_id: journalId, account_id: equityId, debit: -net, credit: null });
    }
  }

  const { error: linesErr } = await supabase.from("journal_lines").insert(lines);
  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", journalId);
    throw new Error(linesErr.message);
  }

  return { journalEntryId: journalId, totalAssetDebits: assetSum };
}
