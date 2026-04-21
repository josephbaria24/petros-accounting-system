/**
 * Names excluded from Chart of Accounts browsing and from "Deposit to" on Receive Payment.
 * Ledger postings may still use these accounts in the background.
 */
const EXCLUDED_LOWER = new Set([
  "accounts receivable",
  "general expenses",
  "general expense",
])

export function isAccountHiddenFromCoaUi(name: string | null | undefined): boolean {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
  return EXCLUDED_LOWER.has(n)
}
