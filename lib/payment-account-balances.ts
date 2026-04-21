import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentAccountRow = {
  id: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  description: string | null;
};

/** Net ledger position per account: sum(debit − credit), same raw sum used in reports. */
export async function fetchLedgerRawNetByAccount(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("account_id, debit, credit");
  if (error) {
    console.error(error);
    return {};
  }
  const net: Record<string, number> = {};
  for (const line of lines || []) {
    const aid = line.account_id;
    if (!aid) continue;
    net[aid] = (net[aid] || 0) + (line.debit || 0) - (line.credit || 0);
  }
  return net;
}

/**
 * Turn raw net (debit − credit) into a display amount:
 * assets & expenses as-is; liability, equity, income flipped (positive = normal balance / revenue).
 */
export function displayBalanceForAccountType(
  type: PaymentAccountRow["type"],
  rawNet: number,
): number {
  if (type === "liability" || type === "equity" || type === "income") return -rawNet;
  return rawNet;
}

/** Right-hand label in the payment account list (e.g. Bank). Prefer `description` from COA when set. */
export function paymentAccountCategoryLabel(account: PaymentAccountRow): string {
  const d = account.description?.trim();
  if (d) return d;
  if (account.type === "asset") return "Asset";
  if (account.type === "liability") return "Liability";
  return account.type;
}

/** Accounts you can pay from: cash, bank, credit card, other funded accounts (assets + credit cards / pay-from liabilities). */
export async function fetchPaymentAccountsForExpense(
  supabase: SupabaseClient,
): Promise<PaymentAccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, description")
    .in("type", ["asset", "liability"])
    .order("name");
  if (error) {
    console.error(error);
    return [];
  }
  return (data || []) as PaymentAccountRow[];
}

/** UI slugs for the payment account dropdown — must match rows in Chart of Accounts (`accounts.name`) */
export const PAYMENT_ACCOUNT_SLUGS = [
  "cash-on-hand",
  "checking",
  "savings",
  "petty-cash",
] as const;

export type PaymentAccountSlug = (typeof PAYMENT_ACCOUNT_SLUGS)[number];

/** Canonical `accounts.name` values for payment accounts (must match Supabase chart of accounts). */
export const SLUG_TO_CANONICAL_NAME: Record<PaymentAccountSlug, string> = {
  "cash-on-hand": "Cash on hand",
  checking: "Checking",
  savings: "Savings",
  "petty-cash": "Petty Cash",
};

/**
 * Per-asset balance from the general ledger: sum(debit − credit) for each account.
 * Matches Balance Sheet asset logic in `reports/page.tsx` (`fetchBalanceSheet`).
 */
export async function fetchPaymentAccountBalances(
  supabase: SupabaseClient,
): Promise<Record<PaymentAccountSlug, number | null>> {
  const empty = (): Record<PaymentAccountSlug, number | null> => ({
    "cash-on-hand": null,
    checking: null,
    savings: null,
    "petty-cash": null,
  });

  const [{ data: assetAccounts, error: accErr }, { data: lines, error: lineErr }] =
    await Promise.all([
      supabase.from("accounts").select("id, name").eq("type", "asset"),
      supabase.from("journal_lines").select("account_id, debit, credit"),
    ]);

  if (accErr || lineErr) {
    console.error(accErr || lineErr);
    return empty();
  }

  const journalBalances: Record<string, number> = {};
  for (const line of lines || []) {
    if (!line.account_id) continue;
    journalBalances[line.account_id] =
      (journalBalances[line.account_id] || 0) + (line.debit || 0) - (line.credit || 0);
  }

  const byNorm = new Map<string, { id: string; name: string }>();
  for (const a of assetAccounts || []) {
    byNorm.set(a.name.trim().toLowerCase(), { id: a.id, name: a.name });
  }

  const out = empty();
  for (const slug of PAYMENT_ACCOUNT_SLUGS) {
    const canonical = SLUG_TO_CANONICAL_NAME[slug].trim().toLowerCase();
    const row = byNorm.get(canonical);
    if (!row) {
      out[slug] = null;
      continue;
    }
    out[slug] = journalBalances[row.id] ?? 0;
  }
  return out;
}

export function formatPhpBalance(amount: number | null): string {
  if (amount === null) return "—";
  const abs = Math.abs(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-₱${abs}`;
  return `₱${abs}`;
}

export function isPaymentAccountSlug(v: unknown): v is PaymentAccountSlug {
  return typeof v === "string" && (PAYMENT_ACCOUNT_SLUGS as readonly string[]).includes(v);
}
