import { useEffect, useState } from 'react'

import type { MealItem } from '@/api/types'
import { num, roundTo } from '@/lib/format'
import { resizeItems } from '@/lib/nutrition'
import { PortionAmount, pickedFactor, type PortionPickUnit } from './PortionAmount'
import { ErrorNote } from './primitives'
import './ui.css'

/** Столько весит разве что кастрюля целиком — дальше это опечатка. */
const MAX_TOTAL = 10000

/**
 * Сколько съедено из блюда с разбором. ИИ считает граммовку каждой позиции сам,
 * но съесть можно половину тарелки или 70 г из распознанных 130 — вес задаётся
 * целиком, а по ингредиентам расходится пропорционально их долям.
 */
export function TotalWeight({
  items,
  onChange,
  label = 'Съел сейчас',
  hint,
}: {
  items: MealItem[]
  onChange: (items: MealItem[]) => void
  label?: string
  hint?: string
}) {
  const current = Math.round(items.reduce((sum, item) => sum + item.grams, 0))
  const [unit, setUnit] = useState<PortionPickUnit>('г')
  const [amount, setAmount] = useState(String(current))
  const [error, setError] = useState<string | null>(null)

  // Правка граммовки степпером меняет сумму — поле должно за ней успевать.
  useEffect(() => {
    setAmount((previous) => (unit === 'часть' ? previous : String(current)))
  }, [current, unit])

  const factor = pickedFactor(amount, unit, current)
  const target = roundTo(current * factor, 0)

  const apply = () => {
    if (target > MAX_TOTAL) {
      setError(`Вес должен быть не больше ${MAX_TOTAL} г`)
      return
    }
    setError(null)
    onChange(resizeItems(items, target))
    if (unit === 'часть') setAmount('1')
  }

  return (
    <>
      <PortionAmount
        label={label}
        amount={amount}
        unit={unit}
        basis={current > 0 ? current : null}
        onChange={(nextAmount, nextUnit) => {
          setAmount(nextAmount)
          setUnit(nextUnit)
        }}
        counted={`${num(target)} г`}
        action={
          <button
            type="button"
            className="btn btn--sm btn--neutral"
            disabled={target === current}
            onClick={apply}
          >
            Разложить по продуктам
          </button>
        }
        hint={hint}
      />
      {error && <ErrorNote message={error} />}
    </>
  )
}
