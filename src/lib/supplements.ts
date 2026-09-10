import type { Frequency, Supplement } from '@/api/types'
import { num, plural } from './format'

/** Банка: вещества, сохранённые под одним названием. */
export interface SupplementGroup {
  key: string
  name: string
  items: Supplement[]
  ids: number[]
  whenLabel: string | null
  frequency: Frequency
  active: boolean
  /** Доли приёма общие для банки: берём их у первого вещества. */
  labelServing: number
  takenServing: number
}

/**
 * Собрать вещества в банки. Записи без названия банки — самостоятельные добавки:
 * группируем их по id, а не по имени, чтобы два одноимённых «Магния», заведённых
 * по отдельности, не слиплись в одну строку задним числом.
 */
export function groupSupplements(supplements: Supplement[]): SupplementGroup[] {
  const groups = new Map<string, SupplementGroup>()
  for (const item of supplements) {
    const key = item.group_name ? `g:${item.group_name}` : `s:${item.id}`
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
      group.ids.push(item.id)
      // Банка активна, пока активно хоть одно вещество — так строка не пропадёт
      // из списка из-за одной выключенной позиции.
      group.active = group.active || item.active
    } else {
      groups.set(key, {
        key,
        name: item.group_name || item.name,
        items: [item],
        ids: [item.id],
        whenLabel: item.when_label,
        frequency: item.frequency,
        active: item.active,
        labelServing: item.label_serving,
        takenServing: item.taken_serving,
      })
    }
  }
  return [...groups.values()]
}

/** «1 из 3» — если принимают не всю порцию с этикетки. Иначе ничего показывать не надо. */
export function servingRatioLabel(group: SupplementGroup): string | null {
  if (group.takenServing === group.labelServing) return null
  return `${num(group.takenServing, 2)} из ${num(group.labelServing, 2)}`
}

export function substancesLabel(count: number): string {
  return `${count} ${plural(count, ['вещество', 'вещества', 'веществ'])}`
}
