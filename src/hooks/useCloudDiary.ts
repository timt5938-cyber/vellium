import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { calculateTargets } from '../lib/nutrition';
import type { Meal, Profile } from '../lib/nutrition';
import { supabase } from '../services/supabase';

type FamilyProfile = { id: string; ownerUserId: string; memberUserId: string | null; profile: Profile };
type FamilyMeal = Meal & { profileId: string };
export type MealTemplate = Meal & { profileId: string; kind: 'saved' | 'recipe'; favorite: boolean; ingredients: string[]; servings: number };
export type TargetRecord = { profileId: string; kcal: number; protein: number; fat: number; carbs: number; recordedAt: string };

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось сохранить данные. Повторите попытку.';
}

export function useCloudDiary() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [allMeals, setAllMeals] = useState<FamilyMeal[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [targetHistory, setTargetHistory] = useState<TargetRecord[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string[]>([]);
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
    setTemplates([]);
    setTargetHistory([]);
    setProfileId(null);
    setLoaded(false);
    setError('');
    setPending([]);
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
      const [profileResult, meals, savedTemplates, targetEvents] = await Promise.all([
        client.from('nutrition_profiles').select('*').order('created_at'),
        client.from('meal_entries').select('*').order('eaten_at', { ascending: false }),
        client.from('meal_templates').select('*').order('created_at', { ascending: false }),
        client.from('profile_target_history').select('*').order('recorded_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || meals.error || savedTemplates.error || targetEvents.error) {
        setError(message(profileResult.error ?? meals.error ?? savedTemplates.error ?? targetEvents.error));
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
            source: meal.source, sourceDetail: meal.source_detail ?? undefined, sourceUrl: meal.source_url ?? undefined,
          })));
        const queued = JSON.parse(localStorage.getItem(`vellium:queue:${user!.id}`) ?? '[]') as FamilyMeal[];
        if (queued.length) {
          setAllMeals((old) => [...old, ...queued.filter((item) => !old.some((meal) => meal.id === item.id))]);
          setPending(queued.map((item) => item.id));
        }
        setTemplates((savedTemplates.data ?? []).map((item) => ({
          id: item.id, profileId: item.profile_id, name: item.name, kind: item.kind,
          favorite: item.favorite, ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
          servings: item.servings, type: item.meal_type, grams: Number(item.grams),
          kcal: Number(item.kcal), protein: Number(item.protein), fat: Number(item.fat),
          carbs: Number(item.carbs), eatenAt: item.created_at, source: item.kind === 'recipe' ? 'recipe' : 'repeat',
        })));
        setTargetHistory((targetEvents.data ?? []).map((event) => ({
          profileId: event.profile_id, kcal: event.kcal, protein: event.protein,
          fat: event.fat, carbs: event.carbs, recordedAt: event.recorded_at,
        })));
        const previous = localStorage.getItem(`vellium:profile:${user!.id}`);
        setProfileId(family.find((item) => item.id === previous)?.id ?? family[0]?.id ?? null);
      }
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !supabase || !loaded) return;
    const client = supabase;
    let flushing = false;
    async function flush() {
      if (flushing || !navigator.onLine) return;
      const key = `vellium:queue:${user!.id}`;
      const queued = JSON.parse(localStorage.getItem(key) ?? '[]') as FamilyMeal[];
      if (!queued.length) return;
      flushing = true;
      const rows = queued.map((meal) => ({ id: meal.id, profile_id: meal.profileId,
        owner_user_id: profiles.find((item) => item.id === meal.profileId)?.ownerUserId ?? user!.id,
        name: meal.name, meal_type: meal.type, grams: meal.grams, kcal: meal.kcal,
        protein: meal.protein, fat: meal.fat, carbs: meal.carbs, eaten_at: meal.eatenAt,
        source: meal.source ?? 'offline', source_detail: meal.sourceDetail?.slice(0, 300) ?? null, source_url: meal.sourceUrl ?? null }));
      const { error: syncError } = await client.from('meal_entries').upsert(rows, { onConflict: 'id' });
      if (!syncError) { localStorage.removeItem(key); setPending([]); }
      else setError('Записи сохранены на этом устройстве и ждут синхронизации. Проверьте интернет.');
      flushing = false;
    }
    window.addEventListener('online', flush);
    void flush();
    return () => window.removeEventListener('online', flush);
  }, [user?.id, loaded, profiles]);

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
    const target = calculateTargets(profile);
    const last = targetHistory.find((item) => item.profileId === id);
    if (target && (!last || (['kcal', 'protein', 'fat', 'carbs'] as const).some((key) => last[key] !== target[key]))) {
      const saved = await supabase.from('profile_target_history').insert({
        profile_id: id, owner_user_id: current?.ownerUserId ?? user.id,
        kcal: target.kcal, protein: target.protein, fat: target.fat, carbs: target.carbs,
      }).select('recorded_at').single();
      if (saved.error) setError(`Профиль сохранён, но история ориентира недоступна: ${message(saved.error)}`);
      else setTargetHistory((old) => [{ profileId: id, ...target, recordedAt: saved.data.recorded_at }, ...old]);
    }
    return id;
  }

  async function createInviteLink(id: string) {
    if (!supabase || !user) throw new Error('Войдите в аккаунт.');
    const profile = await supabase.from('nutrition_profiles').select('owner_user_id, member_user_id').eq('id', id).single();
    if (profile.error || profile.data.owner_user_id !== user.id || profile.data.member_user_id) throw new Error('Этот профиль нельзя пригласить.');
    const { data, error: inviteError } = await supabase.from('family_invite_links')
      .insert({ profile_id: id, owner_user_id: user.id }).select('id').single();
    if (inviteError || !data) throw inviteError ?? new Error('Не удалось создать ссылку.');
    return `${window.location.origin}/join/${data.id}`;
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
      source: meal.source ?? 'manual', source_detail: meal.sourceDetail?.slice(0, 300) ?? null, source_url: meal.sourceUrl ?? null,
    }));
    const { error: saveError } = await supabase.from('meal_entries').insert(rows);
    if (saveError) {
      if (navigator.onLine && !/fetch|network|timeout|connect/i.test(saveError.message)) throw saveError;
      const key = `vellium:queue:${user.id}`;
      const queued = JSON.parse(localStorage.getItem(key) ?? '[]') as FamilyMeal[];
      const staged = meals.map((meal) => ({ ...meal, profileId }));
      localStorage.setItem(key, JSON.stringify([...queued, ...staged]));
      setPending((old) => [...old, ...meals.map((meal) => meal.id)]);
      setError('Нет связи: запись сохранена на этом устройстве и будет синхронизирована при подключении.');
    }
    setAllMeals((old) => [...old, ...meals.map((meal) => ({ ...meal, profileId }))]);
  }

  async function addMeal(meal: Meal) { await addMeals([meal]); }

  async function updateMeal(meal: Meal) {
    if (!supabase || !user || !profileId) throw new Error('Войдите в аккаунт.');
    if (pending.includes(meal.id)) {
      const key = `vellium:queue:${user.id}`;
      const queued = JSON.parse(localStorage.getItem(key) ?? '[]') as FamilyMeal[];
      localStorage.setItem(key, JSON.stringify(queued.map((item) => item.id === meal.id ? { ...meal, profileId } : item)));
      setAllMeals((old) => old.map((item) => item.id === meal.id ? { ...meal, profileId } : item));
      return;
    }
    const { data: updated, error: saveError } = await supabase.from('meal_entries').update({
      name: meal.name, meal_type: meal.type, grams: meal.grams,
      kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs,
      source: meal.source ?? 'legacy', source_detail: meal.sourceDetail?.slice(0, 300) ?? null, source_url: meal.sourceUrl ?? null,
    }).eq('id', meal.id).eq('profile_id', profileId).select('id').single();
    if (saveError || !updated) throw saveError ?? new Error('Запись не найдена или недоступна.');
    setAllMeals((old) => old.map((item) => item.id === meal.id ? { ...meal, profileId } : item));
  }

  async function removeMeal(id: string) {
    if (!supabase || !user || !profileId) throw new Error('Войдите в аккаунт.');
    if (pending.includes(id)) {
      const key = `vellium:queue:${user.id}`;
      const queued = JSON.parse(localStorage.getItem(key) ?? '[]') as FamilyMeal[];
      localStorage.setItem(key, JSON.stringify(queued.filter((item) => item.id !== id)));
      setPending((old) => old.filter((item) => item !== id));
      setAllMeals((old) => old.filter((meal) => meal.id !== id));
      return;
    }
    const { error: removeError } = await supabase.from('meal_entries').delete()
      .eq('id', id).eq('profile_id', profileId);
    if (removeError) throw removeError;
    setAllMeals((old) => old.filter((meal) => meal.id !== id));
  }

  async function deleteSelectedProfile() {
    if (!supabase || !user || !profileId) throw new Error('Выберите профиль.');
    const selected = profiles.find((item) => item.id === profileId);
    if (!selected || selected.ownerUserId !== user.id) throw new Error('Удалить профиль может только его владелец.');
    const { data: deleted, error: removeError } = await supabase.from('nutrition_profiles').delete()
      .eq('id', profileId).eq('owner_user_id', user.id).select('id').single();
    if (removeError || !deleted) throw removeError ?? new Error('Профиль не найден.');
    setProfiles((old) => old.filter((item) => item.id !== profileId));
    setAllMeals((old) => old.filter((meal) => meal.profileId !== profileId));
    setTemplates((old) => old.filter((item) => item.profileId !== profileId));
    setTargetHistory((old) => old.filter((item) => item.profileId !== profileId));
    const key = `vellium:queue:${user.id}`;
    const queued = JSON.parse(localStorage.getItem(key) ?? '[]') as FamilyMeal[];
    localStorage.setItem(key, JSON.stringify(queued.filter((item) => item.profileId !== profileId)));
    setProfileId(profiles.find((item) => item.id !== profileId)?.id ?? null);
    localStorage.removeItem(`vellium:profile:${user.id}`);
  }

  async function saveTemplate(meal: Meal, kind: 'saved' | 'recipe' = 'saved', ingredients: string[] = [], servings = 1) {
    if (!supabase || !user || !profileId) throw new Error('Выберите профиль.');
    const owner = profiles.find((item) => item.id === profileId)?.ownerUserId;
    if (!owner) throw new Error('Профиль не найден.');
    const result = await supabase.from('meal_templates').insert({
      profile_id: profileId, owner_user_id: owner, name: meal.name,
      kind, favorite: true, meal_type: meal.type, grams: meal.grams,
      kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs,
      ingredients, servings,
    }).select('*').single();
    if (result.error || !result.data) throw result.error ?? new Error('Не удалось сохранить шаблон.');
    const row = result.data;
    setTemplates((old) => [{ ...meal, id: row.id, profileId, kind, favorite: true, ingredients, servings }, ...old]);
  }

  async function removeTemplate(id: string) {
    if (!supabase || !profileId) throw new Error('Выберите профиль.');
    const { error: removeError } = await supabase.from('meal_templates').delete().eq('id', id).eq('profile_id', profileId);
    if (removeError) throw removeError;
    setTemplates((old) => old.filter((item) => item.id !== id));
  }

  return { configured: Boolean(supabase), user, authReady, loaded, data, profiles,
    allMeals, templates, targetHistory, pending, profileId, error, setError, selectProfile, newProfile,
    saveProfile, inviteAdult, createInviteLink, addMeal, addMeals, updateMeal, removeMeal,
    deleteSelectedProfile, saveTemplate, removeTemplate };
}
