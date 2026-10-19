import { totals } from '../lib/nutrition';
import type { Meal, Targets } from '../lib/nutrition';

function dateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function NutritionTrends({ meals, targets }: { meals: Meal[]; targets: Targets | null }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const entries = meals.filter((meal) => dateKey(new Date(meal.eatenAt)) === dateKey(date));
    return { key: dateKey(date), label: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
      dateLabel: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
      entries: entries.length, nutrition: totals(entries) };
  });
  const active = days.filter((day) => day.entries);
  const average = active.length ? Math.round(active.reduce((sum, day) => sum + day.nutrition.kcal, 0) / active.length) : 0;
  const scale = Math.max(targets?.kcal ?? 0, ...days.map((day) => day.nutrition.kcal), 1);

  return <section className="trends-panel" aria-labelledby="trends-title">
    <div className="trends-head"><div><span className="card-overline">ПОСЛЕДНИЕ 7 ДНЕЙ</span><h2 id="trends-title">Ритм питания</h2></div><div className="trends-metric"><strong>{average.toLocaleString('ru-RU')}</strong><span>ккал в среднем за день с записями</span></div></div>
    <div className="trends-bars" role="list" aria-label="Калории по дням">
      {days.map((day) => <div className="trends-day" role="listitem" key={day.key} aria-label={`${day.dateLabel}: ${day.nutrition.kcal} ккал, ${day.entries} записей`}>
        <span className="trends-value">{day.entries ? day.nutrition.kcal : '—'}</span>
        <div className="trends-track"><span style={{ height: `${Math.max(day.entries ? 4 : 0, day.nutrition.kcal / scale * 100)}%` }}/>{targets && <i style={{ bottom: `${targets.kcal / scale * 100}%` }}/>}</div>
        <span className="trends-label">{day.label}</span>
      </div>)}
    </div>
    <p className="trends-note">{active.length ? `Записи есть за ${active.length} из 7 дней. Пустой день означает отсутствие данных, а не отсутствие еды.` : 'Добавьте приёмы пищи, и здесь появится недельная картина.'}</p>
  </section>;
}
