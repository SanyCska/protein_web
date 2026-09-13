import { useEffect, useState } from 'react'

import type { MealItem } from '@/api/types'
import { toNumber } from '@/lib/format'
import { resizeItems } from '@/lib/nutrition'
import { ErrorNote } from './primitives'
import './ui.css'

/** Столько весит разве что кастрюля целиком — дальше это опечатка. */
const MAX_TOTAL = 10000

/**
 * Общий вес блюда с разбором: тарелку проще взвесить целиком, чем каждый кусок,
 * поэтому правится сумма, а граммовка расходится по ингредиентам пропорционально.
 */
export function TotalWeight({
  items,
  onChange,
  hint,
}: {
  items: MealItem[]
  onChange: (items: MealItem[]) => void
  hint?: string
}) {
  const current = Math.round(items.reduce((sum, item) => sum + item.grams, 0))
  const [draft, setDraft] = useState(String(current))
  const [error, setError] = useState<string | null>(null)

  // Правка граммовки степпером меняет сумму — поле должно за ней успевать.
  useEffect(() => setDraft(String(current)), [current])

  const apply = () => {
    const value = toNumber(draft)
    if (value === null || value > MAX_TOTAL) {
      setError(`Вес должен быть числом не больше ${MAX_TOTAL} г`)
      return
    }
    setError(null)
    onChange(resizeItems(items, value))
  }

  return (
    <>
      <div className="factor-row">
        <span className="factor-row__label">Общий вес, г</span>
        <input
          className="factor-row__input mn"
          inputMode="decimal"
          aria-label="Общий вес блюда, г"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && apply()}
        />
        <button
          type="button"
          className="btn btn--sm btn--neutral"
          disabled={draft.trim() === String(current)}
          onClick={apply}
        >
          Разложить
        </button>
      </div>
      {hint && <p className="footnote">{hint}</p>}
      {error && <ErrorNote message={error} />}
    </>
  )
}
