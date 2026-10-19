import { totals } from '../lib/nutrition';
import type { Meal, Targets } from '../lib/nutrition';
import type { TargetRecord } from '../hooks/useCloudDiary';

function dateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function NutritionTrends({ meals, targets, history = [] }: { meals: Meal[]; targets: Targets | null; history?: TargetRecord[] }) {
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
  const macroAverage = active.length ? {
    protein: Math.round(active.reduce((sum, day) => sum + day.nutrition.protein, 0) / active.length),
    fat: Math.round(active.reduce((sum, day) => sum + day.nutrition.fat, 0) / active.length),
    carbs: Math.round(active.reduce((sum, day) => sum + day.nutrition.carbs, 0) / active.length),
  } : { protein: 0, fat: 0, carbs: 0 };
  const missing = 7 - active.length;
  const sparse = active.filter((day) => day.entries === 1).length;
  const score = Math.max(0, 100 - missing * 10 - sparse * 5);
  const changes = history.filter((item) => item.recordedAt.slice(0, 10) >= days[0].key).length;
  const groups = [
    ['Овощи и фрукты', /овощ|салат|помид|огур|яблок|ягод|банан|фрукт|капуст/i],
    ['Злаки и картофель', /рис|греч|овсян|хлеб|картo|карто|макарон|круп/i],
    ['Белковые продукты', /рыб|куриц|мяс|яйц|фасол|чечевиц|творог/i],
    ['Молочные продукты', /йогурт|молок|сыр|кефир|творог/i],
  ] as const;
  const seen = groups.filter(([, test]) => meals.some((meal) => meal.eatenAt.slice(0, 10) >= days[0].key && test.test(meal.name)));

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
    <div className="weekly-details"><div><strong>Среднее БЖУ за дни с записями</strong><p>Б {macroAverage.protein} г · Ж {macroAverage.fat} г · У {macroAverage.carbs} г</p></div><div><strong>Регулярность записей: {score}/100 — {score >= 70 ? 'хорошо' : 'нужно догнать'}</strong><p>{missing ? `Штраф −${missing * 10} баллов за ${missing} дн. без записей. ` : ''}{sparse ? `Ещё −${sparse * 5} за ${sparse} дн. с одной записью — проверьте их полноту.` : ''} Баллы относятся только к заполнению дневника; они не меняют цели питания.</p></div><div><strong>Изменения ориентира: {changes}</strong><p>Учитываются изменения целевой энергии и БЖУ за эту неделю.</p></div><div><strong>Разнообразие: {seen.length} из {groups.length} групп</strong><p>{seen.length ? seen.map(([name]) => name).join(' · ') : 'Пока не удалось определить группы по названиям блюд.'} Это подсказка по записям, без оценки качества питания.</p></div></div>
  </section>;
}
