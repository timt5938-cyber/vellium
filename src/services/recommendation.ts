import { apiUrl } from './apiUrl';
import { supabase } from './supabase';
import { totals } from '../lib/nutrition';
import type { Meal, Targets } from '../lib/nutrition';

export interface Recommendation {
  name: string;
  detail: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  reason: string;
}

export async function recommendMeal(target: Targets, meals: Meal[], avoid: string): Promise<Recommendation> {
  if (!supabase) throw new Error('Сервис не настроен.');
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Войдите в аккаунт.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(apiUrl('/api/recommend'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, eaten: totals(meals), recent_meals: meals.slice(0, 12).map(({ name }) => name), avoid }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.detail || 'Не удалось подобрать блюдо.');
    return result as Recommendation;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Подбор занял слишком много времени. Попробуйте ещё раз.');
    if (error instanceof TypeError) throw new Error('Нет связи с сервером рекомендаций. Попробуйте позже.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
