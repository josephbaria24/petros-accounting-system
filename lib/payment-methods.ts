/**
 * Payment method labels (stored as-is on `expenses.payment_method`).
 * Matches the options you use in QuickBooks-style expense entry.
 */
export const PAYMENT_METHOD_OPTIONS = [
  "Bank Deposit",
  "Bank Transfer",
  "Bayad Center",
  "BDO",
  "BPI Bank Deposit",
  "BPI Bank Payment",
  "BPI Bank Transfer",
  "Cash",
  "Cebuana Lhuilllier",
  "Check",
  "Cheque",
  "Credit Card",
  "Direct Debit",
  "GCash",
  "Maya",
  "ML Kwarta Padala",
  "Palawan Express Pera Padala",
  "Paymaya",
  "Paypal",
  "Western Union",
] as const;

export type PaymentMethodOption = (typeof PAYMENT_METHOD_OPTIONS)[number];
