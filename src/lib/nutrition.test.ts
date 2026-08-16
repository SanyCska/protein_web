import { describe, expect, it } from 'vitest'

import { barColor, guessMealType, totalsFromItems } from './nutrition'

describe('totalsFromItems', () => {
  it('масштабирует значения per100 по граммовке', () => {
    const totals = totalsFromItems([
      {
        name: 'Куриная грудка',
        grams: 200,
        per100: { calories_kcal: 165, protein_g: 31, fat_g: 3.6, iron: 1 },
      },
    ])
    expect(totals.calories_kcal).toBeCloseTo(330)
    expect(totals.protein_g).toBeCloseTo(62)
    expect(totals.micros.iron).toBeCloseTo(2)
    expect(totals.portion_g).toBe(200)
  })

  it('складывает несколько ингредиентов', () => {
    const totals = totalsFromItems([
      { name: 'A', grams: 100, per100: { calories_kcal: 100, protein_g: 10, iron: 2 } },
      { name: 'B', grams: 50, per100: { calories_kcal: 200, protein_g: 5, iron: 4 } },
    ])
    expect(totals.calories_kcal).toBeCloseTo(200)
    expect(totals.protein_g).toBeCloseTo(12.5)
    expect(totals.micros.iron).toBeCloseTo(4)
  })

  it('держит клетчатку одинаковой в макросах и микронутриентах', () => {
    const totals = totalsFromItems([
      { name: 'Овсянка', grams: 100, per100: { fiber_g: 10 } },
    ])
    expect(totals.fiber_g).toBeCloseTo(10)
    expect(totals.micros.fiber).toBeCloseTo(10)
  })

  it('нулевая граммовка обнуляет вклад позиции', () => {
    const totals = totalsFromItems([
      { name: 'A', grams: 0, per100: { calories_kcal: 500, protein_g: 50 } },
    ])
    expect(totals.calories_kcal).toBe(0)
    expect(totals.portion_g).toBe(0)
  })

  it('пустой состав даёт нули, а не NaN', () => {
    const totals = totalsFromItems([])
    expect(totals.calories_kcal).toBe(0)
    expect(Number.isNaN(totals.protein_g)).toBe(false)
  })
})

describe('barColor', () => {
  it('различает три ступени шкалы', () => {
    expect(barColor(50)).toContain('neutral-700')
    expect(barColor(80)).toContain('accent-700')
    expect(barColor(100)).toContain('accent-400')
  })

  it('границы попадают в верхнюю ступень', () => {
    expect(barColor(70)).toContain('accent-700')
    expect(barColor(95)).toContain('accent-400')
  })
})

describe('guessMealType', () => {
  it('определяет приём пищи по времени', () => {
    expect(guessMealType('08:20')).toBe('breakfast')
    expect(guessMealType('12:40')).toBe('lunch')
    expect(guessMealType('16:30')).toBe('snack')
    expect(guessMealType('20:05')).toBe('dinner')
    expect(guessMealType('23:30')).toBe('snack')
  })

  it('на мусорном времени возвращает other', () => {
    expect(guessMealType('нет')).toBe('other')
  })
})
