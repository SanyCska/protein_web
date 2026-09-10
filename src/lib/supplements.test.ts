import { describe, expect, it } from 'vitest'

import type { Supplement } from '@/api/types'
import { groupSupplements, substancesLabel } from './supplements'

function supplement(patch: Partial<Supplement> & { id: number }): Supplement {
  return {
    name: 'Магний',
    group_name: null,
    nutrient_key: 'magnesium',
    dose: 400,
    unit: 'мг',
    when_label: 'утром',
    frequency: 'daily',
    active: true,
    ...patch,
  }
}

describe('groupSupplements', () => {
  it('собирает вещества одной банки в одну запись', () => {
    const groups = groupSupplements([
      supplement({ id: 1, name: 'D3', group_name: 'Мультивитамины' }),
      supplement({ id: 2, name: 'Магний', group_name: 'Мультивитамины' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.name).toBe('Мультивитамины')
    expect(groups[0]!.ids).toEqual([1, 2])
  })

  it('добавка без банки называется своим именем', () => {
    const groups = groupSupplements([supplement({ id: 7, name: 'Магний хелат' })])
    expect(groups[0]!.name).toBe('Магний хелат')
    expect(groups[0]!.items).toHaveLength(1)
  })

  it('не слепляет одноимённые добавки, заведённые по отдельности', () => {
    const groups = groupSupplements([
      supplement({ id: 1, name: 'Магний' }),
      supplement({ id: 2, name: 'Магний' }),
    ])
    expect(groups).toHaveLength(2)
  })

  it('разные банки остаются разными', () => {
    const groups = groupSupplements([
      supplement({ id: 1, group_name: 'Утренние' }),
      supplement({ id: 2, group_name: 'Вечерние' }),
    ])
    expect(groups.map((g) => g.name)).toEqual(['Утренние', 'Вечерние'])
  })

  it('банка активна, пока активно хоть одно вещество', () => {
    const groups = groupSupplements([
      supplement({ id: 1, group_name: 'Банка', active: false }),
      supplement({ id: 2, group_name: 'Банка', active: true }),
    ])
    expect(groups[0]!.active).toBe(true)
  })
})

describe('substancesLabel', () => {
  it('склоняет по числу', () => {
    expect(substancesLabel(1)).toBe('1 вещество')
    expect(substancesLabel(3)).toBe('3 вещества')
    expect(substancesLabel(11)).toBe('11 веществ')
  })
})
