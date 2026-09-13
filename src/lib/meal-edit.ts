import type { Meal, MealInput, MealItem, MealType, Micros, PortionUnit } from '@/api/types'
import { num, toNumber } from './format'

/** Состояние формы правки блюда: числа держим строками, поле можно очистить. */
export interface MealForm {
  name: string
  /** День записи, YYYY-MM-DD: блюдо можно перенести на другую дату. */
  day: string
  mealType: MealType
  eatenAt: string
  /** Состав; null — у записи его нет и правятся КБЖУ напрямую. */
  items: MealItem[] | null
  kcal: string
  protein: string
  fat: string
  carbs: string
  fiber: string
  portion: string
  portionUnit: PortionUnit
  micros: Micros
}

export function formFromMeal(meal: Meal): MealForm {
  return {
    name: meal.name,
    day: meal.day,
    mealType: meal.meal_type,
    eatenAt: meal.eaten_at ?? '',
    items: meal.items.length > 0 ? meal.items : null,
    kcal: String(meal.calories_kcal),
    protein: String(meal.protein_g),
    fat: String(meal.fat_g),
    carbs: String(meal.carbs_g),
    fiber: String(meal.fiber_g),
    portion: meal.portion_g !== null ? String(meal.portion_g) : '',
    portionUnit: meal.portion_unit,
    micros: meal.micros,
  }
}

function sameItems(left: MealItem[], right: MealItem[]): boolean {
  if (left.length !== right.length) return false
  return left.every(
    (item, index) => item.name === right[index]!.name && item.grams === right[index]!.grams,
  )
}

/**
 * Чем форма отличается от сохранённого блюда. Пустой объект — правок нет.
 *
 * Шлём только изменённые поля: PATCH с составом заставляет сервер пересчитать итоги
 * из него, и лишний `items` в запросе затёр бы правку КБЖУ, сделанную руками.
 */
export function mealPatch(meal: Meal, form: MealForm): Partial<MealInput> & { day?: string } {
  const patch: Partial<MealInput> & { day?: string } = {}

  const name = form.name.trim()
  if (name && name !== meal.name) patch.name = name
  if (form.day && form.day !== meal.day) patch.day = form.day
  if (form.mealType !== meal.meal_type) patch.meal_type = form.mealType
  if (form.eatenAt !== (meal.eaten_at ?? '')) patch.eaten_at = form.eatenAt || null

  // Состав — источник истины для итогов, поэтому КБЖУ при нём не правятся вовсе.
  if (form.items !== null) {
    if (!sameItems(form.items, meal.items)) {
      patch.items = form.items
      // Подпись состава в ленте дня — отдельное текстовое поле, и без неё лента
      // показывала бы старую граммовку рядом с новыми итогами.
      patch.ingredients = form.items.map((item) => `${item.name} ${num(item.grams)} г`).join(', ')
    }
    return patch
  }

  const macros: [keyof MealForm, keyof MealInput, number][] = [
    ['kcal', 'calories_kcal', meal.calories_kcal],
    ['protein', 'protein_g', meal.protein_g],
    ['fat', 'fat_g', meal.fat_g],
    ['carbs', 'carbs_g', meal.carbs_g],
    ['fiber', 'fiber_g', meal.fiber_g],
  ]
  for (const [field, key, saved] of macros) {
    const value = toNumber(form[field] as string)
    // Пустое поле — «не трогать»: обнулить калории случайной очисткой поля нельзя.
    if (value !== null && value !== saved) Object.assign(patch, { [key]: value })
  }

  const portion = toNumber(form.portion)
  if (portion !== meal.portion_g) patch.portion_g = portion
  if (form.portionUnit !== meal.portion_unit) patch.portion_unit = form.portionUnit
  if (JSON.stringify(form.micros) !== JSON.stringify(meal.micros)) patch.micros = form.micros

  return patch
}
