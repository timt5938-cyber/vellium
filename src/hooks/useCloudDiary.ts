import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Meal, Profile } from '../lib/nutrition';
import { supabase } from '../services/supabase';

type FamilyProfile = { id: string; profile: Profile };
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
      const [profileResult, meals] = await Promise.all([
        client.from('nutrition_profiles').select('*').eq('owner_user_id', user!.id).order('created_at'),
        client.from('meal_entries').select('*').eq('owner_user_id', user!.id).order('eaten_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || meals.error) {
        setError(message(profileResult.error ?? meals.error));
      } else {
        const family: FamilyProfile[] = (profileResult.data ?? []).map((row) => ({
          id: row.id,
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
    const { error: saveError } = await supabase.from('nutrition_profiles').upsert({
      id, owner_user_id: user.id, name: profile.name, sex: profile.sex,
      birth_date: profile.birthDate, height_cm: profile.heightCm, weight_kg: profile.weightKg,
      activity: profile.activity, goal: profile.goal, manual_target: profile.manualTarget ?? null,
      updated_at: new Date().toISOString(),
    });
    if (saveError) throw saveError;
    setProfiles((old) => old.some((item) => item.id === id)
      ? old.map((item) => item.id === id ? { id, profile } : item)
      : [...old, { id, profile }]);
    setProfileId(id);
    localStorage.setItem(`vellium:profile:${user.id}`, id);
  }

  async function addMeal(meal: Meal) {
    if (!supabase || !user || !profileId) throw new Error('Сначала сохраните профиль.');
    const { error: saveError } = await supabase.from('meal_entries').insert({
      id: meal.id, owner_user_id: user.id, profile_id: profileId,
      name: meal.name, meal_type: meal.type, grams: meal.grams,
      kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs,
      eaten_at: meal.eatenAt,
    });
    if (saveError) throw saveError;
    setAllMeals((old) => [...old, { ...meal, profileId }]);
  }

  async function removeMeal(id: string) {
    if (!supabase || !user || !profileId) throw new Error('Войдите в аккаунт.');
    const { error: removeError } = await supabase.from('meal_entries').delete()
      .eq('id', id).eq('profile_id', profileId).eq('owner_user_id', user.id);
    if (removeError) throw removeError;
    setAllMeals((old) => old.filter((meal) => meal.id !== id));
  }

  async function clearData() {
    if (!supabase || !user) return;
    const { error: removeError } = await supabase.from('nutrition_profiles').delete()
      .eq('owner_user_id', user.id);
    if (removeError) throw removeError;
    setProfiles([]);
    setAllMeals([]);
    setProfileId(null);
    localStorage.removeItem(`vellium:profile:${user.id}`);
  }

  return { configured: Boolean(supabase), user, authReady, loaded, data, profiles,
    allMeals, profileId, error, setError, selectProfile, newProfile,
    saveProfile, addMeal, removeMeal, clearData };
}
