-- Run this in Supabase SQL editor to enable bills functionality.
-- Creates: public.bills, public.bill_items

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null,

  vendor_id uuid null references public.suppliers(id) on delete set null,

  bill_no text not null,
  bill_date date null,
  due_date date null,

  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid', 'for-review', 'overdue', 'void')),

  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  balance_due numeric(14, 2) not null default 0,

  -- kept for backward compatibility / display
  total_amount numeric(14, 2) generated always as (subtotal + tax_total) stored,

  notes text null,
  code text null,
  location text null,
  terms text null
);

create index if not exists bills_vendor_idx on public.bills (vendor_id);
create index if not exists bills_status_idx  on public.bills (status);

-- ── bill_items ──────────────────────────────────────────────────────────────

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  bill_id uuid not null references public.bills(id) on delete cascade,

  category text null,
  description text null,
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,

  amount numeric(14, 2) generated always as (quantity * unit_cost) stored
);

create index if not exists bill_items_bill_idx on public.bill_items (bill_id);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.bills      enable row level security;
alter table public.bill_items enable row level security;

do $$
begin
  -- bills: authenticated users can read/write all rows (adjust to taste)
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='bills' and policyname='bills_all_authenticated'
  ) then
    create policy bills_all_authenticated
      on public.bills
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  -- bill_items: same open policy tied to parent bill existing
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='bill_items' and policyname='bill_items_all_authenticated'
  ) then
    create policy bill_items_all_authenticated
      on public.bill_items
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
