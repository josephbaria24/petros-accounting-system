-- Link expenses to the chart-of-accounts row used as "payment account".
-- Run after: public.accounts exists (see accounts_and_ledger.sql).
-- Safe to re-run.

alter table public.expenses
  add column if not exists payment_account_id uuid null references public.accounts (id) on delete set null;

create index if not exists expenses_payment_account_idx on public.expenses (payment_account_id);
