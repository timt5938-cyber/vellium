import { useMemo, useState } from 'react';
import { calculateTargets, suggestMeal, totals } from '../lib/nutrition';
import type { Meal, Profile } from '../lib/nutrition';

type Person = { id: string; profile: Profile };
const ingredients: Record<string, [string, number][]> = {
  'Рыба с картофелем и салатом': [['Рыба', 150], ['Картофель', 130], ['Салатные овощи', 100]],
  'Рис, курица и овощи': [['Рис', 90], ['Курица', 150], ['Овощи', 110]],
  'Омлет с овощами': [['Яйца', 120], ['Овощи', 180]],
  'Греческий йогурт с ягодами': [['Греческий йогурт', 200], ['Ягоды', 80]],
  'Творог и яблоко': [['Творог', 180], ['Яблоки', 130]],
};
function key(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }

export default function FamilyDinnerPlanner({ people, meals }: { people: Person[]; meals: (Meal & { profileId: string })[] }) {
  const [show, setShow] = useState(false);
  const today = key(new Date());
  const plan = useMemo(() => people.map(({ id, profile }) => {
    const target = calculateTargets(profile);
    const eaten = totals(meals.filter((meal) => meal.profileId === id && key(new Date(meal.eatenAt)) === today));
    const idea = target ? suggestMeal(target, eaten) : null;
    const remaining = target ? Math.max(0, target.kcal - eaten.kcal) : 0;
    const portion = idea ? Math.max(0.6, Math.min(1.5, remaining / Math.max(idea.nutrition.kcal, 1))) : 0;
    return { id, name: profile.name, idea, remaining, portion };
  }), [people, meals, today]);
  const selected = plan.find((item) => item.idea)?.idea;
  const shopping = selected ? ingredients[selected.name] ?? [[selected.name, 380] as [string, number]] : [];
  const selectedPortions = selected ? plan.map((item) => ({ ...item,
    portion: item.remaining < 150 ? 0 : Math.max(0.6, Math.min(1.5, item.remaining / selected.nutrition.kcal)),
  })) : [];
  const totalPortions = selectedPortions.reduce((sum, item) => sum + item.portion, 0);
  return <section className="family-planner"><div className="card-heading"><div><span className="card-overline">СЕМЕЙНЫЙ УЖИН</span><h3>Один план, свои порции</h3></div><button className="mini-action" onClick={() => setShow((value) => !value)}>{show ? 'Свернуть' : 'Составить план'}</button></div>
    <p>Идея учитывает уже записанное сегодня. Порции приблизительны и доступны только для взрослых с заполненными профилями.</p>
    {show && (selected ? <><h4>{selected.name}</h4><div className="family-portions">{selectedPortions.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{item.portion === 0 ? 'Ориентир на сегодня почти достигнут' : `Около ${Math.round(380 * item.portion)} г · ${Math.round(selected.nutrition.kcal * item.portion)} ккал`}</span></div>)}</div><strong>Список покупок на всех</strong><ul>{shopping.map(([name, grams]) => <li key={name}>{name} · около {Math.round(grams * totalPortions)} г</li>)}</ul><small>Количество ингредиентов и вес готовой порции примерные. Уточните состав, аллергены и КБЖУ перед приготовлением.</small></> : <p>Заполните хотя бы один профиль, чтобы получить семейную идею.</p>)}
  </section>;
}
