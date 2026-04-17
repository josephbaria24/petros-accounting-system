/**
 * Expense line "Category" options (QuickBooks-style names you provided).
 * These are what users pick and what we store on `expenses.category` / split lines — not the full Chart of Accounts browse list.
 */
const RAW: string[] = [
  "2066 - PHP",
  "Accomodation expense - PHP",
  "Amortisation expense - PHP",
  "BIR Expense - PHP",
  "Bad debts - PHP",
  "Bank Withdrawal - PHP",
  "Bank charges - PHP",
  "Charitable Expenses - PHP",
  "Cleaning Supplies - PHP",
  "Commission Expense - PHP",
  "Commissions and fees - PHP",
  "Company Events - PHP",
  "Corporate Social Responsibility (CSR) Activities - PHP",
  "Cost of Deliverables - PHP",
  "Courier Expe - PHP",
  "Courier Expenses - PHP",
  "Direct Supplies - PHP",
  "Domain and Web Hosting Expenses - PHP",
  "Dues and subscriptions - PHP",
  "Elecrticity Bill - PHP",
  "Employee Benefits - PHP",
  "Employee ID - PHP",
  "Employee Meals - PHP",
  "Employee Salary - PHP",
  "Employee Salary & Benefits - PHP",
  "Employee Training and Seminars Expenses - PHP",
  "Employees Uniform - PHP",
  "Equipment Purchase - PHP",
  "Equipment rental - PHP",
  "Facebook Advertising Expense - PHP",
  "Fare Expense - PHP",
  "Food Expenses - PHP",
  "Fuel Expenses - PHP",
  "Globe Plan - PHP",
  "Income tax expense - PHP",
  "Installment Expenses - PHP",
  "Instructor Fee - PHP",
  "Insurance - Disability - PHP",
  "Insurance - General - PHP",
  "Insurance - Liability - PHP",
  "Interest expense - PHP",
  "Laundry Expenses - PHP",
  "Legal and professional fees - PHP",
  "Logistics Expenses - PHP",
  "Loss on discontinued operations, net of tax - PHP",
  "Management compensation - PHP",
  "General expense - PHP",
];

function dedupeSorted(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export const EXPENSE_CATEGORY_CHOICES: readonly string[] = dedupeSorted(RAW);
