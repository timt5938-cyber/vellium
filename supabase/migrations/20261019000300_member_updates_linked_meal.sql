create policy "Member updates linked meal" on public.meal_entries
  for update to authenticated
  using (
    exists (select 1 from public.nutrition_profiles p
      where p.id = profile_id and p.owner_user_id = meal_entries.owner_user_id
        and p.member_user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.nutrition_profiles p
      where p.id = profile_id and p.owner_user_id = meal_entries.owner_user_id
        and p.member_user_id = (select auth.uid()))
  );
