-- =============================================================================
-- PetroBook: Chart of accounts + general ledger (Supabase SQL)
-- Run in: Supabase Dashboard → SQL Editor (safe to re-run; uses IF NOT EXISTS)
-- Matches: lib/supabase-types.ts, payment-account-balances, opening-balance-journal
-- =============================================================================

-- ── accounts ─────────────────────────────────────────────────────────────────

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  name text not null,
  type text not null
    check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  /** Shown as the right-hand label in payment account pickers (e.g. Bank, Credit Card). */
  description text null
);

create index if not exists accounts_type_idx on public.accounts (type);
create index if not exists accounts_name_idx on public.accounts (name);

-- If the table already existed without description (older installs):
alter table public.accounts add column if not exists description text null;

-- ── journal_entries ────────────────────────────────────────────────────────

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  reference_id uuid null,
  reference_type text null
    check (reference_type is null or reference_type in ('invoice', 'payment', 'bill', 'expense')),
  entry_date date null,
  description text null
);

create index if not exists journal_entries_entry_date_idx on public.journal_entries (entry_date);
create index if not exists journal_entries_reference_idx on public.journal_entries (reference_type, reference_id);

-- ── journal_lines ───────────────────────────────────────────────────────────

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),

  journal_id uuid null references public.journal_entries (id) on delete cascade,
  account_id uuid null references public.accounts (id) on delete restrict,

  debit numeric(14, 2) null default null,
  credit numeric(14, 2) null default null,

  constraint journal_lines_one_side_nonneg check (
    (debit is null or debit >= 0)
    and (credit is null or credit >= 0)
  )
);

create index if not exists journal_lines_journal_idx on public.journal_lines (journal_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id);

-- ── Row Level Security (adjust for multi-tenant / org scoping as needed) ────

alter table public.accounts         enable row level security;
alter table public.journal_entries  enable row level security;
alter table public.journal_lines      enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts_all_authenticated'
  ) then
    create policy accounts_all_authenticated
      on public.accounts
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'journal_entries' and policyname = 'journal_entries_all_authenticated'
  ) then
    create policy journal_entries_all_authenticated
      on public.journal_entries
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'journal_lines' and policyname = 'journal_lines_all_authenticated'
  ) then
    create policy journal_lines_all_authenticated
      on public.journal_lines
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- =============================================================================
-- OPTIONAL: seed rows for opening-balance wizard (exact names the app expects)
-- Comment out if you already have these accounts or use different names.
-- =============================================================================

insert into public.accounts (name, type, description)
select v.name, v.type::text, v.description
from (
  values
    ('Cash on hand', 'asset', 'Bank'),
    ('Checking', 'asset', 'Bank'),
    ('Savings', 'asset', 'Bank'),
    ('Petty Cash', 'asset', 'Bank'),
    ('Opening Balance Equity', 'equity', null)
) as v(name, type, description)
where not exists (
  select 1 from public.accounts a where lower(trim(a.name)) = lower(trim(v.name))
);

-- =============================================================================
-- Regenerate TypeScript types (local): npx supabase gen types typescript ...
-- =============================================================================
