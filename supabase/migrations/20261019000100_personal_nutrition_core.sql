create table public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  sex text not null check (sex in ('male', 'female')),
  birth_date date not null,
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 350),
  activity text not null check (activity in ('sedentary', 'light', 'moderate', 'high')),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  manual_target integer check (manual_target between 1000 and 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 160),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  grams numeric(7,1) not null check (grams > 0 and grams <= 5000),
  kcal numeric(7,1) not null check (kcal >= 0 and kcal <= 10000),
  protein numeric(7,1) not null check (protein >= 0 and protein <= 1000),
  fat numeric(7,1) not null check (fat >= 0 and fat <= 1000),
  carbs numeric(7,1) not null check (carbs >= 0 and carbs <= 1000),
  eaten_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (profile_id, owner_user_id)
    references public.nutrition_profiles(id, owner_user_id) on delete cascade
);

create index meal_entries_profile_eaten_at_idx
  on public.meal_entries (profile_id, eaten_at desc);

alter table public.nutrition_profiles enable row level security;
alter table public.meal_entries enable row level security;

revoke all on public.nutrition_profiles, public.meal_entries from anon;
grant select, insert, update, delete on public.nutrition_profiles, public.meal_entries to authenticated;

create policy "Read own profile" on public.nutrition_profiles
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "Create own profile" on public.nutrition_profiles
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "Update own profile" on public.nutrition_profiles
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "Delete own profile" on public.nutrition_profiles
  for delete to authenticated using ((select auth.uid()) = owner_user_id);

create policy "Read own meals" on public.meal_entries
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "Create own meals" on public.meal_entries
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "Update own meals" on public.meal_entries
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "Delete own meals" on public.meal_entries
  for delete to authenticated using ((select auth.uid()) = owner_user_id);
