create schema if not exists private;

alter table public.nutrition_profiles
  add column member_user_id uuid references auth.users(id) on delete set null;

create index nutrition_profiles_member_user_id_idx
  on public.nutrition_profiles(member_user_id) where member_user_id is not null;

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique,
  owner_user_id uuid not null,
  email text not null check (length(email) between 3 and 254 and email = lower(trim(email))),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  foreign key (profile_id, owner_user_id)
    references public.nutrition_profiles(id, owner_user_id) on delete cascade
);

create index family_invitations_email_pending_idx
  on public.family_invitations(email) where status = 'pending';

alter table public.family_invitations enable row level security;
revoke all on public.family_invitations from anon, authenticated;
grant select, insert, delete on public.family_invitations to authenticated;
grant update(status) on public.family_invitations to authenticated;

create policy "Owner sees invitations" on public.family_invitations
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "Invited adult sees invitation" on public.family_invitations
  for select to authenticated using (
    status = 'pending' and email = lower((select auth.jwt() ->> 'email'))
  );
create policy "Owner creates invitation" on public.family_invitations
  for insert to authenticated with check (
    owner_user_id = (select auth.uid()) and status = 'pending'
  );
create policy "Owner deletes invitation" on public.family_invitations
  for delete to authenticated using (owner_user_id = (select auth.uid()));
create policy "Invited adult accepts invitation" on public.family_invitations
  for update to authenticated
  using (status = 'pending' and email = lower((select auth.jwt() ->> 'email')))
  with check (status = 'accepted' and email = lower((select auth.jwt() ->> 'email')));

create function private.link_invited_adult()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  verified_email text;
begin
  if old.status <> 'pending' or new.status <> 'accepted' or auth.uid() is null then
    raise exception 'Недопустимое подтверждение приглашения';
  end if;
  select lower(email) into verified_email
    from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if verified_email is distinct from old.email or new.email <> old.email
     or new.profile_id <> old.profile_id or new.owner_user_id <> old.owner_user_id then
    raise exception 'Приглашение не соответствует подтверждённой почте';
  end if;
  update public.nutrition_profiles
    set member_user_id = auth.uid(), updated_at = now()
    where id = old.profile_id and owner_user_id = old.owner_user_id
      and member_user_id is null and owner_user_id <> auth.uid();
  if not found then
    raise exception 'Профиль уже привязан к другому аккаунту';
  end if;
  new.accepted_at := now();
  return new;
end;
$$;

create trigger link_invited_adult_before_accept
before update of status on public.family_invitations
for each row execute function private.link_invited_adult();

create policy "Member reads linked profile" on public.nutrition_profiles
  for select to authenticated using (member_user_id = (select auth.uid()));
create policy "Member updates linked profile" on public.nutrition_profiles
  for update to authenticated
  using (member_user_id = (select auth.uid()))
  with check (member_user_id = (select auth.uid()));

revoke update on public.nutrition_profiles from authenticated;
grant update(name, sex, birth_date, height_cm, weight_kg, activity, goal, manual_target, updated_at)
  on public.nutrition_profiles to authenticated;

create policy "Member reads linked meals" on public.meal_entries
  for select to authenticated using (
    exists (select 1 from public.nutrition_profiles p
      where p.id = profile_id and p.member_user_id = (select auth.uid()))
  );
create policy "Member adds linked meal" on public.meal_entries
  for insert to authenticated with check (
    exists (select 1 from public.nutrition_profiles p
      where p.id = profile_id and p.owner_user_id = meal_entries.owner_user_id
        and p.member_user_id = (select auth.uid()))
  );
create policy "Member deletes linked meal" on public.meal_entries
  for delete to authenticated using (
    exists (select 1 from public.nutrition_profiles p
      where p.id = profile_id and p.member_user_id = (select auth.uid()))
  );

