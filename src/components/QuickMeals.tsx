import { useMemo, useState } from 'react';
import { Bookmark, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Meal, MealType, Nutrition } from '../lib/nutrition';
import { mealLabels } from '../lib/nutrition';
import type { MealTemplate } from '../hooks/useCloudDiary';

type Props = {
  meals: Meal[]; templates: MealTemplate[]; date: string;
  onAdd: (meal: Meal) => Promise<void>;
  onSave: (meal: Meal, kind?: 'saved' | 'recipe', ingredients?: string[], servings?: number) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};
const blank = { name: '', grams: 300, kcal: 400, protein: 25, fat: 14, carbs: 43, type: 'dinner' as MealType, servings: 1, ingredients: '' };

export default function QuickMeals({ meals, templates, date, onAdd, onSave, onRemove }: Props) {
  const [recipe, setRecipe] = useState(blank);
  const [showRecipe, setShowRecipe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recent = useMemo(() => [...meals].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt)).filter((meal, index, all) => all.findIndex((item) => item.name.toLowerCase() === meal.name.toLowerCase() && item.grams === meal.grams) === index).slice(0, 5), [meals]);
  const repeat = async (meal: Meal) => {
    setBusy(true); setError('');
    try { await onAdd({ ...meal, id: crypto.randomUUID(), eatenAt: new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString(), source: 'repeat', sourceDetail: `Повторено из ${meal.source === 'recipe' ? 'своего рецепта' : 'предыдущей записи'}; порция ${meal.grams} г.` }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось повторить блюдо.'); }
    finally { setBusy(false); }
  };
  const saveRecipe = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const meal: Meal = { id: crypto.randomUUID(), name: recipe.name.trim(), grams: recipe.grams,
        kcal: recipe.kcal, protein: recipe.protein, fat: recipe.fat, carbs: recipe.carbs,
        type: recipe.type, eatenAt: new Date().toISOString(), source: 'recipe', sourceDetail: `Свой рецепт: ${recipe.servings} порц.` };
      await onSave(meal, 'recipe', recipe.ingredients.split(',').map((item) => item.trim()).filter(Boolean), recipe.servings);
      setRecipe(blank); setShowRecipe(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить рецепт.'); }
    finally { setBusy(false); }
  };
  return <section className="quick-meals"><div className="card-heading"><div><span className="card-overline">БЫСТРОЕ ДОБАВЛЕНИЕ</span><h3>Знакомые блюда</h3></div><button className="mini-action" onClick={() => setShowRecipe((value) => !value)}><Plus size={16}/> Свой рецепт</button></div>
    {templates.length > 0 && <div className="quick-group"><strong>Избранное и рецепты</strong><div className="quick-scroll">{templates.map((item) => <div className="quick-item" key={item.id}><span>{item.kind === 'recipe' ? 'Рецепт' : 'Избранное'} · {item.name}<small>{item.grams} г · {item.kcal} ккал</small></span><button disabled={busy} onClick={() => void repeat(item)} aria-label={`Добавить ${item.name}`}><RotateCcw size={16}/> Повторить</button><button disabled={busy} onClick={() => void onRemove(item.id).catch((cause) => setError(cause instanceof Error ? cause.message : 'Не удалось удалить.'))} aria-label={`Убрать ${item.name}`}><Trash2 size={16}/></button></div>)}</div></div>}
    <div className="quick-group"><strong>Недавние порции</strong>{recent.length ? <div className="quick-scroll">{recent.map((item) => <div className="quick-item" key={item.id}><span>{item.name}<small>{item.grams} г · {item.kcal} ккал</small></span><button disabled={busy} onClick={() => void repeat(item)} aria-label={`Повторить ${item.name}`}><RotateCcw size={16}/> Повторить</button><button disabled={busy || templates.some((saved) => saved.name === item.name)} onClick={() => void onSave(item).catch((cause) => setError(cause instanceof Error ? cause.message : 'Не удалось сохранить.'))} aria-label={`В избранное ${item.name}`}><Bookmark size={16}/></button></div>)}</div> : <p>Здесь появятся блюда, которые вы уже добавляли.</p>}</div>
    {showRecipe && <form className="recipe-form" onSubmit={(event) => void saveRecipe(event)}><h4>Свой рецепт</h4><p>Укажите значения всей готовой порции. Их можно сверить с упаковкой и затем менять в дневнике.</p><label>Название<input required maxLength={160} value={recipe.name} onChange={(event) => setRecipe({ ...recipe, name: event.target.value })}/></label><label>Ингредиенты через запятую<input value={recipe.ingredients} onChange={(event) => setRecipe({ ...recipe, ingredients: event.target.value })} placeholder="Рыба, картофель, овощи"/></label><div className="form-grid"><label>Вес порции, г<input required type="number" min="1" max="3000" value={recipe.grams} onChange={(event) => setRecipe({ ...recipe, grams: Number(event.target.value) })}/></label><label>Количество порций<input required type="number" min="1" max="30" value={recipe.servings} onChange={(event) => setRecipe({ ...recipe, servings: Number(event.target.value) })}/></label><label>Приём пищи<select value={recipe.type} onChange={(event) => setRecipe({ ...recipe, type: event.target.value as MealType })}>{Object.entries(mealLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{(['kcal', 'protein', 'fat', 'carbs'] as (keyof Nutrition)[]).map((key) => <label key={key}>{({ kcal: 'Ккал на порцию', protein: 'Белки, г', fat: 'Жиры, г', carbs: 'Углеводы, г' })[key]}<input required type="number" min="0" max="5000" step=".1" value={recipe[key]} onChange={(event) => setRecipe({ ...recipe, [key]: Number(event.target.value) })}/></label>)}</div><button className="button button-primary" disabled={busy}>Сохранить рецепт</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
