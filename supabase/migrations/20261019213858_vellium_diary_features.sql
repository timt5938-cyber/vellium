alter table public.meal_entries
  add column source text not null default 'legacy'
    check (source in ('legacy', 'manual', 'photo_ai', 'text_ai', 'voice_ai', 'catalog', 'repeat', 'recipe', 'offline')),
  add column source_detail text check (length(source_detail) <= 300),
  add column source_url text check (length(source_url) <= 500);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  owner_user_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 160),
  kind text not null check (kind in ('saved', 'recipe')),
  favorite boolean not null default true,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  grams numeric(7,1) not null check (grams > 0 and grams <= 5000),
  kcal numeric(7,1) not null check (kcal >= 0 and kcal <= 10000),
  protein numeric(7,1) not null check (protein >= 0 and protein <= 1000),
  fat numeric(7,1) not null check (fat >= 0 and fat <= 1000),
  carbs numeric(7,1) not null check (carbs >= 0 and carbs <= 1000),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  servings integer not null default 1 check (servings between 1 and 30),
  created_at timestamptz not null default now(),
  foreign key (profile_id, owner_user_id)
    references public.nutrition_profiles(id, owner_user_id) on delete cascade
);
create index meal_templates_profile_idx on public.meal_templates(profile_id, created_at desc);
alter table public.meal_templates enable row level security;
revoke all on public.meal_templates from anon;
grant select, insert, update, delete on public.meal_templates to authenticated;
create policy "Read accessible templates" on public.meal_templates for select to authenticated
  using (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));
create policy "Create accessible templates" on public.meal_templates for insert to authenticated
  with check (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and p.owner_user_id = meal_templates.owner_user_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));
create policy "Update accessible templates" on public.meal_templates for update to authenticated
  using (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))))
  with check (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and p.owner_user_id = meal_templates.owner_user_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));
create policy "Delete accessible templates" on public.meal_templates for delete to authenticated
  using (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));

create table public.profile_target_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  owner_user_id uuid not null,
  kcal integer not null check (kcal between 1000 and 6000),
  protein integer not null check (protein between 0 and 500),
  fat integer not null check (fat between 0 and 500),
  carbs integer not null check (carbs between 0 and 1000),
  recorded_at timestamptz not null default now(),
  foreign key (profile_id, owner_user_id)
    references public.nutrition_profiles(id, owner_user_id) on delete cascade
);
create index profile_target_history_idx on public.profile_target_history(profile_id, recorded_at desc);
alter table public.profile_target_history enable row level security;
revoke all on public.profile_target_history from anon;
grant select, insert on public.profile_target_history to authenticated;
create policy "Read accessible target history" on public.profile_target_history for select to authenticated
  using (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));
create policy "Record accessible target" on public.profile_target_history for insert to authenticated
  with check (exists (select 1 from public.nutrition_profiles p where p.id = profile_id
    and p.owner_user_id = profile_target_history.owner_user_id
    and (p.owner_user_id = (select auth.uid()) or p.member_user_id = (select auth.uid()))));

create table public.family_invite_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  foreign key (profile_id, owner_user_id)
    references public.nutrition_profiles(id, owner_user_id) on delete cascade
);
create index family_invite_links_profile_idx on public.family_invite_links(profile_id);
alter table public.family_invite_links enable row level security;
revoke all on public.family_invite_links from anon;
grant select, insert, delete on public.family_invite_links to authenticated;
create policy "Owner reads invite links" on public.family_invite_links for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "Owner creates invite links" on public.family_invite_links for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and redeemed_by is null and redeemed_at is null
    and expires_at > now() and expires_at <= now() + interval '7 days'
    and exists (select 1 from public.nutrition_profiles p where p.id = profile_id
      and p.owner_user_id = (select auth.uid()) and p.member_user_id is null));
create policy "Owner revokes invite links" on public.family_invite_links for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create function public.redeem_family_invite(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile uuid;
  v_owner uuid;
begin
  if v_user is null or not exists (
    select 1 from auth.users where id = v_user and email_confirmed_at is not null
  ) then
    raise exception 'Подтвердите адрес электронной почты перед вступлением в семью';
  end if;
  select profile_id, owner_user_id into v_profile, v_owner
    from public.family_invite_links
    where id = p_invite_id and expires_at > now() and redeemed_at is null
    for update;
  if v_profile is null or v_owner = v_user then
    raise exception 'Ссылка недействительна или срок её действия истёк';
  end if;
  update public.nutrition_profiles set member_user_id = v_user, updated_at = now()
    where id = v_profile and owner_user_id = v_owner and member_user_id is null;
  if not found then
    raise exception 'Профиль уже привязан к аккаунту';
  end if;
  update public.family_invite_links
    set redeemed_by = v_user, redeemed_at = now()
    where id = p_invite_id;
  return v_profile;
end;
$$;
revoke all on function public.redeem_family_invite(uuid) from public, anon;
grant execute on function public.redeem_family_invite(uuid) to authenticated;
