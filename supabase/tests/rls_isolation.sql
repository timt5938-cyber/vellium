begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'vellium-rls-1@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'vellium-rls-2@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.nutrition_profiles
  (id, owner_user_id, name, sex, birth_date, height_cm, weight_kg, activity, goal)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'Synthetic A', 'female', '1990-01-01', 170, 65, 'light', 'maintain'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
   'Synthetic family member', 'male', '1988-01-01', 180, 80, 'moderate', 'maintain');

insert into public.meal_entries
  (id, owner_user_id, profile_id, name, meal_type, grams, kcal, protein, fat, carbs, eaten_at)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'Synthetic meal', 'lunch',
   100, 200, 10, 5, 20, now()),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000003', 'Family meal', 'dinner',
   150, 250, 15, 8, 25, now());

do $$
declare changed integer;
begin
  if (select count(*) from public.nutrition_profiles) <> 2 or
     (select count(*) from public.meal_entries) <> 2 then
    raise exception 'Owner cannot read own data';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
  if (select count(*) from public.nutrition_profiles) <> 0 or
     (select count(*) from public.meal_entries) <> 0 then
    raise exception 'Another account can read private data';
  end if;

  update public.meal_entries set name = 'Tampered'
    where id = '20000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another account changed a meal'; end if;

  begin
    insert into public.meal_entries
      (owner_user_id, profile_id, name, meal_type, grams, kcal, protein, fat, carbs, eaten_at)
    values
      ('00000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001', 'Forged', 'lunch',
       100, 200, 10, 5, 20, now());
    raise exception 'Forged ownership insert was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.meal_entries
      (owner_user_id, profile_id, name, meal_type, grams, kcal, protein, fat, carbs, eaten_at)
    values
      ('00000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000001', 'Foreign profile', 'lunch',
       100, 200, 10, 5, 20, now());
    raise exception 'Foreign profile insert was allowed';
  exception when foreign_key_violation then null;
  end;
end $$;

rollback;
