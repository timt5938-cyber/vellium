import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Meal, Profile } from '../lib/nutrition';
import { supabase } from '../services/supabase';

type Diary = { profile: Profile | null; meals: Meal[] };
const empty: Diary = { profile: null, meals: [] };

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось сохранить данные. Повторите попытку.';
}

export function useCloudDiary() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<Diary>(empty);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');

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
    setData(empty);
    setProfileId(null);
    setLoaded(false);
    setError('');
    if (!user || !supabase) { setLoaded(true); return; }
    let active = true;
    const client = supabase;
    async function load() {
      const [profiles, meals] = await Promise.all([
        client.from('nutrition_profiles').select('*').eq('owner_user_id', user!.id).order('created_at').limit(1),
        client.from('meal_entries').select('*').eq('owner_user_id', user!.id).order('eaten_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profiles.error || meals.error) {
        setError(message(profiles.error ?? meals.error));
      } else {
        const row = profiles.data?.[0];
        setProfileId(row?.id ?? null);
        setData({
          profile: row ? {
            name: row.name, sex: row.sex, birthDate: row.birth_date,
            heightCm: Number(row.height_cm), weightKg: Number(row.weight_kg),
            activity: row.activity, goal: row.goal,
            manualTarget: row.manual_target ?? undefined,
          } : null,
          meals: (meals.data ?? []).map((meal) => ({
            id: meal.id, name: meal.name, type: meal.meal_type, grams: Number(meal.grams),
            kcal: Number(meal.kcal), protein: Number(meal.protein),
            fat: Number(meal.fat), carbs: Number(meal.carbs), eatenAt: meal.eaten_at,
          })),
        });
      }
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, [user?.id]);

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
    setProfileId(id);
    setData((old) => ({ ...old, profile }));
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
    setData((old) => ({ ...old, meals: [...old.meals, meal] }));
  }

  async function removeMeal(id: string) {
    if (!supabase || !user) throw new Error('Войдите в аккаунт.');
    const { error: removeError } = await supabase.from('meal_entries').delete()
      .eq('id', id).eq('owner_user_id', user.id);
    if (removeError) throw removeError;
    setData((old) => ({ ...old, meals: old.meals.filter((meal) => meal.id !== id) }));
  }

  async function clearData() {
    if (!supabase || !user || !profileId) return;
    const { error: removeError } = await supabase.from('nutrition_profiles').delete()
      .eq('id', profileId).eq('owner_user_id', user.id);
    if (removeError) throw removeError;
    setData(empty);
    setProfileId(null);
  }

  return { configured: Boolean(supabase), user, authReady, loaded, data, error,
    setError, saveProfile, addMeal, removeMeal, clearData };
}
