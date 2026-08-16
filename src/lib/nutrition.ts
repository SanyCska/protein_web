import type { MealItem, MealType, Per100 } from '@/api/types'

export const MACRO_KEYS = ['calories_kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const

export interface MealTotals {
  calories_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  micros: Record<string, number>
  portion_g: number
}

const MACRO_SET = new Set<string>(MACRO_KEYS)

/**
 * Пересчёт итогов блюда из состава — та же формула, что на сервере.
 * Нужна локально, чтобы степпер граммовки обновлял цифры мгновенно,
 * не дожидаясь ответа сервера.
 */
export function totalsFromItems(items: MealItem[]): MealTotals {
  const totals: MealTotals = {
    calories_kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fiber_g: 0,
    micros: {},
    portion_g: 0,
  }

  for (const item of items) {
    const factor = item.grams / 100
    totals.portion_g += item.grams
    for (const key of MACRO_KEYS) {
      totals[key] += (item.per100[key] ?? 0) * factor
    }
    for (const [key, value] of Object.entries(item.per100)) {
      if (MACRO_SET.has(key)) continue
      totals.micros[key] = (totals.micros[key] ?? 0) + value * factor
    }
  }

  // Клетчатка живёт и среди макросов, и среди микронутриентов — держим одно значение.
  totals.micros.fiber = Math.max(totals.micros.fiber ?? 0, totals.fiber_g)
  totals.fiber_g = totals.micros.fiber
  return totals
}

export function scalePer100(per100: Per100, grams: number): Record<string, number> {
  const factor = grams / 100
  return Object.fromEntries(Object.entries(per100).map(([key, value]) => [key, value * factor]))
}

/** Цвет полосы по проценту нормы — единая шкала для всех прогресс-баров. */
export function barColor(percent: number): string {
  if (percent >= 95) return 'var(--color-accent-400)'
  if (percent >= 70) return 'var(--color-accent-700)'
  return 'var(--color-neutral-700)'
}

/** Цвет столбца калорий: перебор — ярче, недобор — тусклее. */
export function calorieBarColor(value: number, norm: number): string {
  if (norm <= 0) return 'var(--color-accent-700)'
  if (value >= norm) return 'var(--color-accent-400)'
  if (value >= norm * 0.8) return 'var(--color-accent)'
  return 'var(--color-accent-700)'
}

export function proteinBarColor(value: number, target: number): string {
  if (target <= 0) return 'var(--color-accent-700)'
  if (value >= target) return 'var(--color-accent-400)'
  if (value >= target * 0.85) return 'var(--color-accent)'
  return 'var(--color-accent-700)'
}

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: 'coffee',
  lunch: 'bowl-food',
  dinner: 'bowl-food',
  snack: 'cookie',
  other: 'fork-knife',
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  other: 'Приём пищи',
}

/** Тип приёма по времени — чтобы не заставлять выбирать его вручную. */
export function guessMealType(time: string): MealType {
  const hour = Number(time.slice(0, 2))
  if (Number.isNaN(hour)) return 'other'
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 18) return 'snack'
  if (hour < 23) return 'dinner'
  return 'snack'
}
