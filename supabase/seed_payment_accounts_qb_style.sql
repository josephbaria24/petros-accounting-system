-- One-time seed: payment-style accounts from the list you shared (screenshots).
-- Run after accounts_and_ledger.sql. Safe to re-run: skips rows whose name already exists.
-- Types: most as asset + description 'Bank'; credit card as liability; other current assets as listed in your UI.

insert into public.accounts (name, type, description)
select v.name, v.type, v.description
from (
  values
    -- Bank (from your dropdowns)
    ('3481-0038-99 BPI', 'asset', 'Bank'),
    ('3483 0576 19 Cash on Bank (BPI)', 'asset', 'Bank'),
    ('Cash on Bank (BDO)', 'asset', 'Bank'),
    ('Cash on hand', 'asset', 'Bank'),
    ('Cash on hand(Pangasinan Branch)', 'asset', 'Bank'),
    ('Cebu Branch', 'asset', 'Bank'),
    ('Cebu Branch-New', 'asset', 'Bank'),
    ('Charges fee', 'asset', 'Bank'),
    ('Coverage Allowance', 'asset', 'Bank'),
    ('Doubtful Accounts', 'asset', 'Bank'),
    ('Educational Assistance', 'asset', 'Bank'),
    ('Educational Benefits', 'asset', 'Bank'),
    ('Employee Meal Allowance', 'asset', 'Bank'),
    ('Equimpment Repair and Maintenace', 'asset', 'Bank'),
    ('Equipment', 'asset', 'Bank'),
    ('Equipment Maintenance', 'asset', 'Bank'),
    ('Equipment Repair and Maintenance', 'asset', 'Bank'),
    ('FLASH EXPRESS', 'asset', 'Bank'),
    ('Gcash Account', 'asset', 'Bank'),
    ('Gcash Charge', 'asset', 'Bank'),
    ('HCC', 'asset', 'Bank'),
    ('Health Benefits', 'asset', 'Bank'),
    ('House Keeping Maintenance Allowance', 'asset', 'Bank'),
    ('Hrad Expenses', 'asset', 'Bank'),
    ('Hse Training', 'asset', 'Bank'),
    ('Load', 'asset', 'Bank'),
    ('Loan Payment', 'asset', 'Bank'),
    ('Masteral Fee', 'asset', 'Bank'),
    ('Meal Allowance', 'asset', 'Bank'),
    ('Metro Manila Branch', 'asset', 'Bank'),
    ('Office Equipment', 'asset', 'Bank'),
    ('Office Maintenance', 'asset', 'Bank'),
    ('Office Repair and maintenance', 'asset', 'Bank'),
    ('Paypal Account', 'asset', 'Bank'),
    ('Penalties', 'asset', 'Bank'),
    ('Re-connection Fee', 'asset', 'Bank'),
    ('Roxas Branch-Old Account', 'asset', 'Bank'),
    ('Roxas City Branch', 'asset', 'Bank'),
    ('Salaries and Wages', 'asset', 'Bank'),
    ('Salary and Wage', 'asset', 'Bank'),
    ('Sales Return', 'asset', 'Bank'),
    ('Service Maintainance', 'asset', 'Bank'),
    ('Service Maintenance', 'asset', 'Bank'),
    ('Shipping Fee', 'asset', 'Bank'),
    ('Sponsorship', 'asset', 'Bank'),
    ('Surcharge', 'asset', 'Bank'),
    ('Training Equipment', 'asset', 'Bank'),
    ('Training Materials', 'asset', 'Bank'),
    ('Training Meal Allowance', 'asset', 'Bank'),
    ('Training Food Subsidies', 'asset', 'Bank'),
    ('Training Food Allowance', 'asset', 'Bank'),
    ('Training incentives', 'asset', 'Bank'),
    ('Travel Allowance', 'asset', 'Bank'),
    -- Credit card
    ('Default Credit Card', 'liability', 'Credit Card'),
    -- Other current asset (as in your UI)
    ('Allowance for bad debt', 'asset', 'Other Current Asset'),
    ('Available for sale assets (short-term)', 'asset', 'Other Current Asset'),
    ('Cash Loan', 'asset', 'Other Current Asset'),
    ('Employee Cash Advances', 'asset', 'Other Current Asset'),
    ('Inventory', 'asset', 'Other Current Asset'),
    ('Inventory Asset', 'asset', 'Other Current Asset'),
    ('Loans To Officers', 'asset', 'Other Current Asset'),
    ('Loans to Others', 'asset', 'Other Current Asset'),
    ('Prepaid expenses', 'asset', 'Other Current Asset'),
    ('Uncategorised Asset', 'asset', 'Other Current Asset'),
    ('Undeposited Funds', 'asset', 'Other Current Asset')
) as v(name, type, description)
where not exists (
  select 1 from public.accounts a where lower(trim(a.name)) = lower(trim(v.name))
);
