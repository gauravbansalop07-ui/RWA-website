-- Create Amenities table
create table public.amenities (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    image_url text,
    capacity integer default 1,
    price_per_slot decimal(10,2) default 0,
    slot_duration_minutes integer default 60,
    status text default 'open' check (status in ('open', 'closed', 'maintenance')),
    created_at timestamptz default now()
);

-- Enable RLS for amenities
alter table public.amenities enable row level security;

-- Policies for amenities
create policy "Amenities are viewable by everyone" on public.amenities
    for select using (true);

create policy "Admins can manage amenities" on public.amenities
    for all using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- Create Facility Bookings table
create table public.facility_bookings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    amenity_id uuid references public.amenities(id) on delete cascade not null,
    booking_date date not null,
    start_time time not null,
    end_time time not null,
    total_amount decimal(10,2) default 0,
    payment_status text default 'not_applicable' check (payment_status in ('not_applicable', 'pending', 'paid', 'failed')),
    transaction_id text,
    status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'pending_payment')),
    created_at timestamptz default now()
);

-- Enable RLS for facility_bookings
alter table public.facility_bookings enable row level security;

-- Policies for facility_bookings
create policy "Users can view their own bookings" on public.facility_bookings
    for select using (auth.uid() = user_id);

create policy "Admins can view all bookings" on public.facility_bookings
    for select using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "Users can create bookings" on public.facility_bookings
    for insert with check (auth.uid() = user_id);

create policy "Users can cancel their own bookings" on public.facility_bookings
    for update using (auth.uid() = user_id)
    with check (status = 'cancelled');

create policy "Admins can manage all bookings" on public.facility_bookings
    for all using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- Helper index for availability checks
create index idx_bookings_date_time on public.facility_bookings (amenity_id, booking_date, start_time, end_time);

-- Seed some default amenities
insert into public.amenities (name, description, capacity, price_per_slot)
values 
('Clubhouse', 'Modern clubhouse for small events and gatherings', 50, 500),
('Gym', 'Fully equipped fitness center', 10, 0),
('Badminton Court', 'Indoor wooden court', 4, 0),
('Swimming Pool', 'Community swimming pool with life guard', 20, 0);
