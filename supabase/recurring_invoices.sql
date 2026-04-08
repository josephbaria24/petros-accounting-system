-- Run this in Supabase SQL editor to enable recurring invoices.
-- Creates: public.recurring_invoices

create table if not exists public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null,

  customer_id uuid not null references public.customers(id) on delete cascade,

  name text not null,
  is_active boolean not null default true,

  frequency text not null check (frequency in ('weekly','monthly')),
  interval integer not null default 1 check (interval >= 1 and interval <= 52),

  start_date date not null,
  next_run_date date not null,

  -- Template payload for invoice creation
  template jsonb not null
);

create index if not exists recurring_invoices_next_run_idx
  on public.recurring_invoices (is_active, next_run_date);

-- Basic RLS: authenticated users can manage their own schedules
alter table public.recurring_invoices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='recurring_invoices' and policyname='recurring_invoices_select_own'
  ) then
    create policy recurring_invoices_select_own
      on public.recurring_invoices
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='recurring_invoices' and policyname='recurring_invoices_insert_own'
  ) then
    create policy recurring_invoices_insert_own
      on public.recurring_invoices
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='recurring_invoices' and policyname='recurring_invoices_update_own'
  ) then
    create policy recurring_invoices_update_own
      on public.recurring_invoices
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;
end $$;

