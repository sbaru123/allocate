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
