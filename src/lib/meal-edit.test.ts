import { describe, expect, it } from 'vitest'

import type { Meal } from '@/api/types'
import { formFromMeal, mealPatch } from './meal-edit'

function meal(patch: Partial<Meal> = {}): Meal {
  return {
    id: 1,
    day: '2026-09-10',
    name: 'Обед',
    calories_kcal: 640,
    protein_g: 52,
    fat_g: 18,
    carbs_g: 61,
    fiber_g: 6,
    portion_g: 400,
    portion_unit: 'г',
    meal_type: 'lunch',
    eaten_at: '12:40',
    ingredients: null,
    source: 'webapp',
    micros: { iron: 3.1 },
    items: [],
    ...patch,
  }
}

describe('mealPatch', () => {
  it('без правок патч пустой', () => {
    const base = meal()
    expect(mealPatch(base, formFromMeal(base))).toEqual({})
  })

  it('видит правку названия, времени и типа', () => {
    const base = meal()
    const patch = mealPatch(base, {
      ...formFromMeal(base),
      name: 'Плов',
      eatenAt: '13:15',
      mealType: 'dinner',
    })
    expect(patch).toEqual({ name: 'Плов', eaten_at: '13:15', meal_type: 'dinner' })
  })

  it('правит КБЖУ записи без состава', () => {
    const base = meal()
    const patch = mealPatch(base, { ...formFromMeal(base), kcal: '700', protein: '55' })
    expect(patch).toEqual({ calories_kcal: 700, protein_g: 55 })
  })

  it('пустое поле КБЖУ не обнуляет сохранённое значение', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), kcal: '' })).toEqual({})
  })

  it('очистка порции сбрасывает её в null', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), portion: '' })).toEqual({ portion_g: null })
  })

  it('видит смену единицы порции', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), portionUnit: 'мл' })).toEqual({
      portion_unit: 'мл',
    })
  })

  it('видит правку микронутриентов', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), micros: { iron: 5 } })).toEqual({
      micros: { iron: 5 },
    })
  })

  const withItems = meal({
    items: [
      { id: 1, name: 'Яйцо', grams: 100, per100: { calories_kcal: 155, protein_g: 13 } },
      { id: 2, name: 'Сыр', grams: 50, per100: { calories_kcal: 350, protein_g: 25 } },
    ],
  })

  it('видит правку граммовки и обновляет подпись состава', () => {
    const form = formFromMeal(withItems)
    const items = [{ ...form.items![0]!, grams: 150 }, form.items![1]!]
    expect(mealPatch(withItems, { ...form, items })).toEqual({
      items,
      ingredients: 'Яйцо 150 г, Сыр 50 г',
    })
  })

  it('видит удалённый ингредиент', () => {
    const form = formFromMeal(withItems)
    const items = [form.items![0]!]
    expect(mealPatch(withItems, { ...form, items })).toEqual({
      items,
      ingredients: 'Яйцо 100 г',
    })
  })

  it('при составе КБЖУ в патч не попадают', () => {
    const form = formFromMeal(withItems)
    const patch = mealPatch(withItems, { ...form, kcal: '999', micros: { iron: 9 } })
    expect(patch).toEqual({})
  })

  it('название и время правятся и при составе', () => {
    const form = formFromMeal(withItems)
    expect(mealPatch(withItems, { ...form, name: 'Омлет' })).toEqual({ name: 'Омлет' })
  })

  it('видит перенос на другую дату', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), day: '2026-09-11' })).toEqual({
      day: '2026-09-11',
    })
  })

  it('пустая дата не переносит запись', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), day: '' })).toEqual({})
  })

  it('пустое название не стирает сохранённое', () => {
    const base = meal()
    expect(mealPatch(base, { ...formFromMeal(base), name: '  ' })).toEqual({})
  })
})
