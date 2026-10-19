import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Meal, Profile } from '../lib/nutrition';
import { supabase } from '../services/supabase';

type FamilyProfile = { id: string; ownerUserId: string; memberUserId: string | null; profile: Profile };
type FamilyMeal = Meal & { profileId: string };

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось сохранить данные. Повторите попытку.';
}

export function useCloudDiary() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [allMeals, setAllMeals] = useState<FamilyMeal[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const data = useMemo(() => ({
    profile: profiles.find((item) => item.id === profileId)?.profile ?? null,
    meals: allMeals.filter((meal) => meal.profileId === profileId),
  }), [profiles, allMeals, profileId]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    const client = supabase;
    client.auth.getUser().then(({ data: result, error: authError }) => {
      if (!active) return;
      setUser(authError ? null : result.user);
      setAuthReady(true);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setAuthReady(true); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setProfiles([]);
    setAllMeals([]);
    setProfileId(null);
    setLoaded(false);
    setError('');
    if (!user || !supabase) { setLoaded(true); return; }
    let active = true;
    const client = supabase;
    async function load() {
      if (user!.email) {
        const pending = await client.from('family_invitations').select('id')
          .eq('email', user!.email.toLowerCase()).eq('status', 'pending');
        if (pending.error) { setError(message(pending.error)); setLoaded(true); return; }
        for (const invite of pending.data ?? []) {
          const accepted = await client.from('family_invitations').update({ status: 'accepted' }).eq('id', invite.id);
          if (accepted.error) setError(message(accepted.error));
        }
      }
      const [profileResult, meals] = await Promise.all([
        client.from('nutrition_profiles').select('*').order('created_at'),
        client.from('meal_entries').select('*').order('eaten_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || meals.error) {
        setError(message(profileResult.error ?? meals.error));
      } else {
        const family: FamilyProfile[] = (profileResult.data ?? []).map((row) => ({
          id: row.id,
          ownerUserId: row.owner_user_id, memberUserId: row.member_user_id,
          profile: {
            name: row.name, sex: row.sex, birthDate: row.birth_date,
            heightCm: Number(row.height_cm), weightKg: Number(row.weight_kg),
            activity: row.activity, goal: row.goal,
            manualTarget: row.manual_target ?? undefined,
          },
        }));
        setProfiles(family);
        setAllMeals((meals.data ?? []).map((meal) => ({
            id: meal.id, profileId: meal.profile_id, name: meal.name,
            type: meal.meal_type, grams: Number(meal.grams),
            kcal: Number(meal.kcal), protein: Number(meal.protein),
            fat: Number(meal.fat), carbs: Number(meal.carbs), eatenAt: meal.eaten_at,
          })));
        const previous = localStorage.getItem(`vellium:profile:${user!.id}`);
        setProfileId(family.find((item) => item.id === previous)?.id ?? family[0]?.id ?? null);
      }
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, [user?.id]);

  function selectProfile(id: string) {
    if (!profiles.some((item) => item.id === id)) return;
    setProfileId(id);
    if (user) localStorage.setItem(`vellium:profile:${user.id}`, id);
  }

  function newProfile() { setProfileId(null); }

  async function saveProfile(profile: Profile) {
    if (!supabase || !user) throw new Error('Войдите в аккаунт.');
    const id = profileId ?? crypto.randomUUID();
    const current = profiles.find((item) => item.id === id);
    const fields = {
      name: profile.name, sex: profile.sex,
      birth_date: profile.birthDate, height_cm: profile.heightCm, weight_kg: profile.weightKg,
      activity: profile.activity, goal: profile.goal, manual_target: profile.manualTarget ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = current
      ? await supabase.from('nutrition_profiles').update(fields).eq('id', id)
      : await supabase.from('nutrition_profiles').insert({ id, owner_user_id: user.id, ...fields });
    if (saveError) throw saveError;
    setProfiles((old) => old.some((item) => item.id === id)
      ? old.map((item) => item.id === id ? { ...item, profile } : item)
      : [...old, { id, ownerUserId: user.id, memberUserId: null, profile }]);
    setProfileId(id);
    localStorage.setItem(`vellium:profile:${user.id}`, id);
    return id;
  }

  async function inviteAdult(id: string, email: string) {
    if (!supabase || !user) throw new Error('Войдите в аккаунт.');
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalized === user.email?.toLowerCase()) throw new Error('Укажите почту другого взрослого.');
    const selected = await supabase.from('nutrition_profiles').select('owner_user_id,member_user_id').eq('id', id).single();
    if (selected.error || selected.data.owner_user_id !== user.id || selected.data.member_user_id) throw new Error('Этот профиль нельзя пригласить.');
    const existing = await supabase.from('family_invitations').select('id').eq('profile_id', id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const removed = await supabase.from('family_invitations').delete().eq('id', existing.data.id);
      if (removed.error) throw removed.error;
    }
    const inserted = await supabase.from('family_invitations').insert({ profile_id: id, owner_user_id: user.id, email: normalized });
    if (inserted.error) throw inserted.error;
    const temporary = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const sent = await temporary.auth.signInWithOtp({ email: normalized, options: {
      emailRedirectTo: window.location.origin + '/app', shouldCreateUser: true,
    } });
    if (sent.error) throw new Error(`Профиль сохранён, но письмо не отправлено: ${sent.error.message}`);
  }

  async function addMeals(meals: Meal[]) {
    if (!supabase || !user || !profileId) throw new Error('Сначала сохраните профиль.');
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile || !meals.length) throw new Error('Выберите профиль и продукты.');
    const rows = meals.map((meal) => ({
      id: meal.id, owner_user_id: profile.ownerUserId, profile_id: profileId,
      name: meal.name, meal_type: meal.type, grams: meal.grams,
      kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs, eaten_at: meal.eatenAt,
    }));
    const { error: saveError } = await supabase.from('meal_entries').insert(rows);
    if (saveError) throw saveError;
    setAllMeals((old) => [...old, ...meals.map((meal) => ({ ...meal, profileId }))]);
  }

  async function addMeal(meal: Meal) { await addMeals([meal]); }

  async function updateMeal(meal: Meal) {
    if (!supabase || !user || !profileId) throw new Error('Войдите в аккаунт.');
    const { data: updated, error: saveError } = await supabase.from('meal_entries').update({
      name: meal.name, meal_type: meal.type, grams: meal.grams,
      kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs,
    }).eq('id', meal.id).eq('profile_id', profileId).select('id').single();
    if (saveError || !updated) throw saveError ?? new Error('Запись не найдена или недоступна.');
    setAllMeals((old) => old.map((item) => item.id === meal.id ? { ...meal, profileId } : item));
  }

  async function removeMeal(id: string) {
    if (!supabase || !user || !profileId) throw new Error('Войдите в аккаунт.');
    const { error: removeError } = await supabase.from('meal_entries').delete()
      .eq('id', id).eq('profile_id', profileId);
    if (removeError) throw removeError;
    setAllMeals((old) => old.filter((meal) => meal.id !== id));
  }

  async function clearData() {
    if (!supabase || !user) return;
    const { error: removeError } = await supabase.from('nutrition_profiles').delete()
      .eq('owner_user_id', user.id);
    if (removeError) throw removeError;
    setProfiles((old) => old.filter((item) => item.ownerUserId !== user.id));
    setAllMeals((old) => old.filter((meal) => profiles.find((item) => item.id === meal.profileId)?.ownerUserId !== user.id));
    setProfileId(profiles.find((item) => item.ownerUserId !== user.id)?.id ?? null);
    localStorage.removeItem(`vellium:profile:${user.id}`);
  }

  return { configured: Boolean(supabase), user, authReady, loaded, data, profiles,
    allMeals, profileId, error, setError, selectProfile, newProfile,
    saveProfile, inviteAdult, addMeal, addMeals, updateMeal, removeMeal, clearData };
}
