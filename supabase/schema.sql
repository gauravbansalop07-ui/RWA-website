-- Enable RLS (Note: auth.users usually has RLS enabled by default in Supabase)
-- alter table auth.users enable row level security;

-- Enums
create type user_role as enum ('super_admin', 'treasurer', 'collector', 'resident');
create type payment_status as enum ('pending', 'paid', 'cash_requested', 'overdue');
create type payment_method as enum ('online', 'cash');
create type complaint_status as enum ('open', 'in_progress', 'resolved');

-- Profiles (extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  flat_number text,
  mobile text,
  role user_role default 'resident',
  vehicle_count integer default 0,
  vehicle_numbers text[], -- Array of vehicle registration numbers
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Maintenance Periods (Quarterly)
create table public.maintenance_periods (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g., "Q1 2024"
  amount numeric not null,
  start_date date,
  end_date date,
  due_date date,
  created_at timestamptz default now()
);
alter table public.maintenance_periods enable row level security;

-- Payments
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  period_id uuid references public.maintenance_periods(id),
  amount numeric not null,
  status payment_status default 'pending',
  method payment_method,
  transaction_id text,
  receipt_url text, -- link to storage
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;

-- Complaints
create table public.complaints (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  title text not null,
  description text,
  image_url text,
  status complaint_status default 'open',
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.complaints enable row level security;

-- Expenses (For Financial Transparency)
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  category text, -- e.g., "Electricity", "Security"
  amount numeric not null,
  description text,
  date date,
  attachment_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;

-- Announcements/Notices
create table public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;

-- Basic RLS Policies (Draft)

-- Profiles: Users can view all profiles (for directory), but only edit their own.
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Authenticated users can insert profiles." on public.profiles for insert to authenticated with check (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Maintenance Periods: Viewable by all, insert/update by admins only (TODO: Add admin check).
create policy "Maintenance periods are viewable by everyone." on public.maintenance_periods for select using (true);

-- Payments: Users view their own, admins view all.
create policy "Users can view own payments." on public.payments for select using (auth.uid() = user_id);

-- Complaints: Users view their own, admins view all.
create policy "Users can view own complaints." on public.complaints for select using (auth.uid() = user_id);
create policy "Users can insert complaints." on public.complaints for insert with check (auth.uid() = user_id);

-- Announcements: Viewable by everyone.
create policy "Announcements are viewable by everyone." on public.announcements for select using (true);
