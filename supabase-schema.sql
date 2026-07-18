-- Terp Budget Schema

-- Expenses table
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10, 2) not null,
  category text not null check (category in ('food', 'transport', 'entertainment', 'housing', 'other')),
  note text default '',
  created_at timestamptz default now()
);

alter table expenses enable row level security;

create policy "Users can manage their own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budgets table (one row per user)
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  weekly_limit numeric(10, 2) not null default 0,
  created_at timestamptz default now()
);

alter table budgets enable row level security;

create policy "Users can manage their own budget"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Paychecks table
create table paychecks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10, 2) not null,
  note text default '',
  created_at timestamptz default now()
);

alter table paychecks enable row level security;

create policy "Users can manage their own paychecks"
  on paychecks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allocations table (paycheck distribution rules)
create table allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  percentage numeric(5, 2) not null check (percentage > 0 and percentage <= 100),
  created_at timestamptz default now()
);

alter table allocations enable row level security;

create policy "Users can manage their own allocations"
  on allocations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migration: add pay_frequency to budgets (run in Supabase SQL editor)
alter table budgets
  add column if not exists pay_frequency text not null default 'biweekly'
    check (pay_frequency in ('weekly', 'biweekly', 'monthly'));

-- Migration: add weekly_budget to budgets (run in Supabase SQL editor).
-- The original table only had weekly_limit; onboarding and Home read/write weekly_budget.
alter table budgets
  add column if not exists weekly_budget numeric not null default 0;

-- Migration: add rollover_start to profiles (run in Supabase SQL editor).
-- The leftover-spending rollover ignores weeks (and expenses) before this date.
alter table profiles
  add column if not exists rollover_start date;

-- Migration: add projection window to profiles (run in Supabase SQL editor).
-- Projected Allocated Funds counts paychecks between these dates instead of
-- assuming a full year (e.g. a summer internship: June 22 – Dec 31).
alter table profiles
  add column if not exists projection_start date;
alter table profiles
  add column if not exists projection_end date;


-- Profiles table (onboarding data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  onboarding_step INTEGER DEFAULT 1,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'biweekly', 'monthly')),
  paycheck_amount NUMERIC,
  buckets JSONB,
  weekly_budget NUMERIC,
  weekly_breakdown JSONB,
  goal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);


-- Budgets table (pay frequency)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'biweekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);


-- Allocations table (paycheck buckets)
CREATE TABLE IF NOT EXISTS allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  percentage NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own allocations" ON allocations
  FOR ALL USING (auth.uid() = user_id);


-- Paychecks table
CREATE TABLE IF NOT EXISTS paychecks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own paychecks" ON paychecks
  FOR ALL USING (auth.uid() = user_id);


-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);