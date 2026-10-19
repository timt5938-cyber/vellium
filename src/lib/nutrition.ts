export type Goal = 'lose' | 'maintain' | 'gain';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Profile {
  name: string;
  sex: 'male' | 'female';
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  manualTarget?: number;
}

export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Meal extends Nutrition {
  id: string;
  name: string;
  grams: number;
  type: MealType;
  eatenAt: string;
  source?: 'legacy' | 'manual' | 'photo_ai' | 'text_ai' | 'voice_ai' | 'catalog' | 'repeat' | 'recipe' | 'offline';
  sourceDetail?: string;
  sourceUrl?: string;
}

export interface Targets extends Nutrition {
  source: 'formula' | 'manual';
}

const activityFactor: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

export function ageOnDate(birthDate: string, date = new Date()): number {
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = date.getFullYear() - birth.getFullYear();
  if (date.getMonth() < birth.getMonth() ||
    (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate())) age--;
  return age;
}

export function calculateTargets(profile: Profile, date = new Date()): Targets | null {
  const age = ageOnDate(profile.birthDate, date);
  if (age < 18 || age > 100 || profile.heightCm < 100 || profile.heightCm > 250 ||
    profile.weightKg < 25 || profile.weightKg > 350) return null;

  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age +
    (profile.sex === 'male' ? 5 : -161);
  const tdee = bmr * activityFactor[profile.activity];
  const bmi = profile.weightKg / ((profile.heightCm / 100) ** 2);
  const multiplier = profile.goal === 'gain' ? 1.1 : profile.goal === 'lose' && bmi >= 18.5 ? 0.85 : 1;
  const floor = profile.sex === 'male' ? 1500 : 1200;
  const validManualTarget = profile.manualTarget !== undefined && profile.manualTarget >= 1000 && profile.manualTarget <= 6000;
  const kcal = validManualTarget
    ? Math.round(profile.manualTarget!)
    : Math.round(Math.max(floor, tdee * multiplier) / 10) * 10;
  const protein = Math.round(profile.weightKg * (profile.goal === 'maintain' ? 1.2 : 1.6));
  const fat = Math.round(kcal * 0.28 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs, source: validManualTarget ? 'manual' : 'formula' };
}

export function nutritionForGrams(per100: Nutrition, grams: number): Nutrition {
  const factor = grams / 100;
  return {
    kcal: Math.round(per100.kcal * factor),
    protein: Math.round(per100.protein * factor * 10) / 10,
    fat: Math.round(per100.fat * factor * 10) / 10,
    carbs: Math.round(per100.carbs * factor * 10) / 10,
  };
}

export function totals(meals: Meal[]): Nutrition {
  return meals.reduce((sum, meal) => ({
    kcal: sum.kcal + meal.kcal,
    protein: Math.round((sum.protein + meal.protein) * 10) / 10,
    fat: Math.round((sum.fat + meal.fat) * 10) / 10,
    carbs: Math.round((sum.carbs + meal.carbs) * 10) / 10,
  }), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
}

export const mealLabels: Record<MealType, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
};

const ideas: { name: string; detail: string; nutrition: Nutrition }[] = [
  { name: 'Греческий йогурт с ягодами', detail: '200 г йогурта и горсть ягод', nutrition: { kcal: 210, protein: 20, fat: 5, carbs: 21 } },
  { name: 'Омлет с овощами', detail: '2 яйца, томаты и зелень', nutrition: { kcal: 310, protein: 21, fat: 22, carbs: 9 } },
  { name: 'Рис, курица и овощи', detail: 'Порция около 350 г', nutrition: { kcal: 490, protein: 38, fat: 12, carbs: 55 } },
  { name: 'Рыба с картофелем и салатом', detail: 'Порция около 380 г', nutrition: { kcal: 520, protein: 35, fat: 18, carbs: 48 } },
  { name: 'Творог и яблоко', detail: '180 г творога и одно яблоко', nutrition: { kcal: 280, protein: 27, fat: 8, carbs: 25 } },
];

export function suggestMeal(targets: Targets, eaten: Nutrition) {
  const left = Math.max(0, targets.kcal - eaten.kcal);
  const proteinLeft = Math.max(0, targets.protein - eaten.protein);
  if (left < 150) return null;
  return [...ideas]
    .filter((item) => item.nutrition.kcal <= Math.max(left * 1.15, 220))
    .sort((a, b) => {
      const score = (item: typeof a) => Math.abs(item.nutrition.kcal - Math.min(left * 0.42, 520)) / 100 -
        Math.min(item.nutrition.protein, proteinLeft) / 15;
      return score(a) - score(b);
    })[0] ?? null;
}
