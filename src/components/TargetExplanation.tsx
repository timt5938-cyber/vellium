import { ageOnDate, calculateTargets } from '../lib/nutrition';
import type { Profile } from '../lib/nutrition';

const factor = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
export default function TargetExplanation({ profile }: { profile: Profile }) {
  const targets = calculateTargets(profile);
  if (!targets) return null;
  const age = ageOnDate(profile.birthDate);
  const base = Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age + (profile.sex === 'male' ? 5 : -161));
  const maintain = Math.round(base * factor[profile.activity]);
  return <section className="target-explanation"><span className="card-overline">ОТКУДА БЕРУТСЯ ЦИФРЫ</span><h3>Как мы считаем ваш ориентир</h3>
    <ol><li><strong>Расход в покое: около {base} ккал.</strong> Формула использует указанные вами вес, рост, возраст и пол. Это приблизительный расход организма без повседневной активности.</li>
      <li><strong>С учётом активности: около {maintain} ккал.</strong> Мы умножаем первый результат на коэффициент {factor[profile.activity]}. Это ориентир для поддержания текущего веса, а не точное измерение.</li>
      <li><strong>Ваша цель: {targets.kcal} ккал в день.</strong> {targets.source === 'manual' ? 'Вы указали это значение сами.' : profile.goal === 'lose' ? 'Для плавного снижения веса мы берём примерно на 15% меньше расчётного расхода, с нижней границей.' : profile.goal === 'gain' ? 'Для набора веса мы берём примерно на 10% больше расчётного расхода.' : 'Для поддержания веса берём расчётный расход.'} Фактический вес меняется не строго по формуле: ориентир можно уточнять по вашим наблюдениям.</li>
      <li><strong>БЖУ.</strong> Белок: {targets.protein} г по весу; жиры: {targets.fat} г (около 28% энергии); остальная энергия приходится на углеводы: {targets.carbs} г. 1 г белка и углеводов ≈ 4 ккал, 1 г жира ≈ 9 ккал.</li></ol>
    <p>Это математическая оценка для взрослого, не диагностика и не персональное назначение диеты. При заболеваниях, беременности, кормлении или риске расстройства пищевого поведения обсудите питание со специалистом.</p>
    <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">Исходная публикация формулы Миффлина — Сан Жеора ↗</a>
  </section>;
}
