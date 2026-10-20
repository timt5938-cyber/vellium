import { useState } from 'react';
import { X } from 'lucide-react';
import { mealLabels, nutritionForGrams } from '../lib/nutrition';
import type { Meal, MealType, Nutrition } from '../lib/nutrition';
import { trustedProductUrl } from '../utils/trustedProductUrl';

const fields = { kcal: 'Ккал', protein: 'Белки, г', fat: 'Жиры, г', carbs: 'Углеводы, г' } as const;

export default function EditMealDialog({ meal, onClose, onSave }: {
  meal: Meal; onClose: () => void; onSave: (meal: Meal) => Promise<void>;
}) {
  const [name, setName] = useState(meal.name);
  const [type, setType] = useState<MealType>(meal.type);
  const [grams, setGrams] = useState(String(meal.grams));
  const [per100, setPer100] = useState<Record<keyof Nutrition, string>>({
    kcal: String(Math.round(meal.kcal * 100 / meal.grams * 10) / 10),
    protein: String(Math.round(meal.protein * 100 / meal.grams * 10) / 10),
    fat: String(Math.round(meal.fat * 100 / meal.grams * 10) / 10),
    carbs: String(Math.round(meal.carbs * 100 / meal.grams * 10) / 10),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const values: Nutrition = { kcal: Number(per100.kcal), protein: Number(per100.protein), fat: Number(per100.fat), carbs: Number(per100.carbs) };
  const valid = name.trim().length > 0 && Number(grams) > 0 && Number(grams) <= 3000 &&
    Object.values(values).every((value) => Number.isFinite(value) && value >= 0 && value <= 1000);
  const calculated = valid ? nutritionForGrams(values, Number(grams)) : null;
  const sourceUrl = trustedProductUrl(meal.sourceUrl);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !calculated) return setError('Проверьте название, порцию и значения на 100 г.');
    setBusy(true); setError('');
    try { await onSave({ ...meal, name: name.trim(), type, grams: Number(grams), ...calculated }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обновить запись.'); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="meal-modal" role="dialog" aria-modal="true" aria-labelledby="edit-meal-title">
      <div className="modal-head"><div><span className="section-kicker">ЗАПИСЬ ДНЕВНИКА</span><h2 id="edit-meal-title">Изменить еду</h2></div><button type="button" aria-label="Закрыть" onClick={onClose}><X size={22}/></button></div>
      <form onSubmit={(event) => void submit(event)}>
        <div className="meal-source"><strong>Откуда взят расчёт</strong><p>{meal.source === 'catalog' ? 'Каталог Open Food Facts' : meal.source?.includes('ai') ? 'Оценка ИИ' : meal.source === 'recipe' ? 'Свой рецепт' : meal.source === 'repeat' ? 'Повторённая запись' : 'Данные пользователя'} · порция {meal.grams} г. {meal.sourceDetail}</p>{sourceUrl && <a href={sourceUrl} rel="noreferrer">Открыть источник ↗</a>}</div>
        <label>Название блюда или продукта<input autoFocus required maxLength={160} value={name} onChange={(event) => setName(event.target.value)}/></label>
        <div className="form-grid"><label>Приём пищи<select value={type} onChange={(event) => setType(event.target.value as MealType)}>{Object.entries(mealLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Порция, г<input required type="number" min="1" max="3000" step=".1" value={grams} onChange={(event) => setGrams(event.target.value)}/></label></div>
        <div className="form-divider">ПИЩЕВАЯ ЦЕННОСТЬ НА 100 Г</div>
        <div className="form-grid">{(Object.keys(fields) as (keyof Nutrition)[]).map((key) => <label key={key}>{fields[key]}<input required type="number" min="0" max="1000" step=".1" value={per100[key]} onChange={(event) => setPer100((old) => ({ ...old, [key]: event.target.value }))}/></label>)}</div>
        <p className="edit-calculated" aria-live="polite">Новый итог: <strong>{calculated?.kcal ?? '—'} ккал</strong> · Б {calculated?.protein ?? '—'} · Ж {calculated?.fat ?? '—'} · У {calculated?.carbs ?? '—'} г</p>
        <p className="form-help">При изменении порции итог пересчитывается по значениям на 100 г. История и баланс дня обновятся после сохранения.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary modal-submit" type="submit" disabled={busy || !valid}>{busy ? 'Сохраняем…' : 'Сохранить изменения'}</button>
      </form>
    </div>
  </div>;
}
