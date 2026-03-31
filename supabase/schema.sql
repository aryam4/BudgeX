create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null,
  description text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own transactions" on public.transactions;
create policy "Users can insert their own transactions"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  balance numeric(12, 2) not null check (balance >= 0),
  credit_limit numeric(12, 2) not null check (credit_limit > 0),
  due_date date not null,
  created_at timestamptz not null default now()
);

alter table public.credit_accounts enable row level security;

drop policy if exists "Users can view their own credit accounts" on public.credit_accounts;
create policy "Users can view their own credit accounts"
on public.credit_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own credit accounts" on public.credit_accounts;
create policy "Users can insert their own credit accounts"
on public.credit_accounts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own credit accounts" on public.credit_accounts;
create policy "Users can update their own credit accounts"
on public.credit_accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own credit accounts" on public.credit_accounts;
create policy "Users can delete their own credit accounts"
on public.credit_accounts
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  date_of_birth date,
  phone_country_code text not null default '',
  phone_number text not null default '',
  address_line_1 text not null default '',
  address_line_2 text not null default '',
  city text not null default '',
  country text not null default '',
  state_province text not null default '',
  postal_code text not null default '',
  home_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists address_line_1 text not null default '';
alter table public.user_profiles add column if not exists address_line_2 text not null default '';
alter table public.user_profiles add column if not exists city text not null default '';
alter table public.user_profiles add column if not exists country text not null default '';
alter table public.user_profiles add column if not exists state_province text not null default '';
alter table public.user_profiles add column if not exists postal_code text not null default '';

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dark_mode boolean not null default false,
  font_size text not null default 'medium',
  notifications_enabled boolean not null default true,
  lock_numericals boolean not null default false,
  monetary_pin_hash text not null default '',
  categories_json jsonb not null default '[]'::jsonb,
  reminder_bill_payment boolean not null default false,
  reminder_weekly_summary boolean not null default true,
  reminder_budget_alerts boolean not null default true,
  reminder_unusual_spending boolean not null default true,
  widget_net_worth boolean not null default false,
  widget_spending_breakdown boolean not null default true,
  widget_investment_portfolio boolean not null default false,
  widget_upcoming_bills boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.budget_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_income numeric(12, 2) not null default 0 check (monthly_income >= 0),
  budget_style text not null default 'custom',
  goal text not null default '',
  rows_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_plans enable row level security;

drop policy if exists "Users can view their own budget plans" on public.budget_plans;
create policy "Users can view their own budget plans"
on public.budget_plans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own budget plans" on public.budget_plans;
create policy "Users can insert their own budget plans"
on public.budget_plans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own budget plans" on public.budget_plans;
create policy "Users can update their own budget plans"
on public.budget_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own budget plans" on public.budget_plans;
create policy "Users can delete their own budget plans"
on public.budget_plans
for delete
to authenticated
using (auth.uid() = user_id);
