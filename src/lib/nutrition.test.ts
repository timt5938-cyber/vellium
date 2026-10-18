import { describe, expect, it } from 'vitest';
import { calculateTargets, nutritionForGrams, suggestMeal, totals } from './nutrition';
import type { Profile } from './nutrition';

const date = new Date('2026-01-01T12:00:00');
const man: Profile = { name: 'Test', sex: 'male', birthDate: '1996-01-01', heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain' };

describe('nutrition calculations', () => {
  it('matches the reference daily targets and safety floor', () => {
    expect(calculateTargets(man, date)?.kcal).toBe(2760);
    expect(calculateTargets({ ...man, goal: 'lose' }, date)?.kcal).toBe(2350);
    expect(calculateTargets({ ...man, goal: 'gain' }, date)?.kcal).toBe(3030);
    expect(calculateTargets({ ...man, sex: 'female', birthDate: '1998-01-01', heightCm: 165, weightKg: 60, activity: 'light' }, date)?.kcal).toBe(1830);
    expect(calculateTargets({ ...man, sex: 'female', birthDate: '1976-01-01', heightCm: 155, weightKg: 48, activity: 'sedentary', goal: 'lose' }, date)?.kcal).toBe(1200);
  });

  it('scales a food label to the actual portion and updates the remaining balance', () => {
    const serving = nutritionForGrams({ kcal: 110, protein: 4, fat: 2, carbs: 19 }, 150);
    expect(serving).toEqual({ kcal: 165, protein: 6, fat: 3, carbs: 28.5 });
    const eaten = totals([{ ...serving, id: '1', name: 'Buckwheat', grams: 150, type: 'lunch', eatenAt: '2026-01-01T12:00:00' }]);
    const target = calculateTargets(man, date)!;
    expect(target.kcal - eaten.kcal).toBe(2595);
    expect(suggestMeal(target, eaten)?.nutrition.kcal).toBeLessThan(target.kcal - eaten.kcal);
  });

  it('does not produce an automatic target for minors', () => {
    expect(calculateTargets({ ...man, birthDate: '2012-01-01' }, date)).toBeNull();
  });
});
