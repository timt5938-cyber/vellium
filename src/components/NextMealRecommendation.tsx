import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { suggestMeal, totals } from '../lib/nutrition';
import type { Meal, Targets } from '../lib/nutrition';
import { recommendMeal } from '../services/recommendation';
import type { Recommendation } from '../services/recommendation';

export default function NextMealRecommendation({ target, meals }: { target: Targets; meals: Meal[] }) {
  const [suggestion, setSuggestion] = useState<Recommendation | null>(null);
  const [avoid, setAvoid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const eaten = totals(meals);
  const fallback = suggestMeal(target, eaten);
  const left = Math.max(0, target.kcal - eaten.kcal);
  const mealKey = meals.map((meal) => `${meal.id}:${meal.kcal}:${meal.protein}:${meal.fat}:${meal.carbs}`).join('|');

  useEffect(() => { setSuggestion(null); setError(''); }, [mealKey, target.kcal, target.protein, target.fat, target.carbs]);

  async function generate() {
    setLoading(true);
    setError('');
    try { setSuggestion(await recommendMeal(target, meals, avoid.trim())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось подобрать блюдо.'); }
    finally { setLoading(false); }
  }

  return <aside className="suggest-card next-meal-card">
    <div className="suggest-icon"><Sparkles size={21}/></div>
    <span className="card-overline">ЧТО СЪЕСТЬ ДАЛЬШЕ</span>
    {left >= 150 ? <>
      <h3>{suggestion?.name || fallback?.name || 'Подберём блюдо под ваш день'}</h3>
      <p>{suggestion ? `${suggestion.detail}. Примерно ${Math.round(suggestion.kcal)} ккал · Б ${Math.round(suggestion.protein)} · Ж ${Math.round(suggestion.fat)} · У ${Math.round(suggestion.carbs)} г.` : fallback ? `${fallback.detail}. Около ${fallback.nutrition.kcal} ккал.` : 'Запишите еду и посмотрите баланс дня.'}</p>
      {suggestion && <p className="recommend-reason">{suggestion.reason}</p>}
      <div className="recommend-balance"><span>Осталось на день</span><strong>{Math.round(left)} ккал</strong><small>Б {Math.max(0, Math.round(target.protein - eaten.protein))} · Ж {Math.max(0, Math.round(target.fat - eaten.fat))} · У {Math.max(0, Math.round(target.carbs - eaten.carbs))} г</small></div>
      <label className="recommend-avoid">Что исключить из подсказки<input value={avoid} maxLength={240} onChange={(event) => setAvoid(event.target.value)} placeholder="Например, рыбу или орехи"/></label>
      <button type="button" className="recommend-action" onClick={() => void generate()} disabled={loading}>{loading ? 'Подбираем…' : suggestion ? 'Подобрать ещё' : 'Подобрать с ИИ'} <ArrowRight size={16}/></button>
      <span className="suggest-note">При нажатии записи этого дня и исключения передаются Gemini для подбора. КБЖУ предложения приблизительны; проверьте порцию перед записью.</span>
    </> : <><h3>Ориентир на день достигнут</h3><p>За день записано {Math.round(eaten.kcal)} ккал. Если вы ещё голодны, ориентируйтесь и на самочувствие.</p></>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </aside>;
}
