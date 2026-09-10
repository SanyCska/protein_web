import { useMemo, useState } from 'react'

import { useReference } from '@/api/hooks'
import type { Micros } from '@/api/types'
import { Icon } from './Icon'
import './ui.css'

/**
 * Правка микронутриентов продукта. Показываем только заполненные строки: два
 * десятка пустых полей никто не заполнит, а список «добавить» держит остальные
 * под рукой. Значения — абсолютные, за порцию продукта.
 */
export function MicrosEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: Micros
  onChange: (next: Micros) => void
  disabled?: boolean
}) {
  const { data: reference } = useReference()
  const nutrients = useMemo(() => reference?.nutrients ?? [], [reference])
  // Ключи, добавленные вручную: их ещё нечем показать в value, но строка нужна.
  const [extra, setExtra] = useState<string[]>([])

  const shown = nutrients.filter((n) => value[n.key] !== undefined || extra.includes(n.key))
  const available = nutrients.filter((n) => !shown.some((s) => s.key === n.key))

  const setValue = (key: string, raw: string) => {
    const next = { ...value }
    if (!raw.trim()) {
      delete next[key]
    } else {
      const parsed = Number(raw.replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed < 0) return
      next[key] = parsed
    }
    onChange(next)
  }

  const remove = (key: string) => {
    const next = { ...value }
    delete next[key]
    setExtra((keys) => keys.filter((item) => item !== key))
    onChange(next)
  }

  return (
    <div className="micros-editor">
      {shown.length === 0 && (
        <p className="footnote">
          Состав пока не заполнен. Оцените его ИИ или добавьте нутриенты вручную.
        </p>
      )}

      {shown.map((nutrient) => (
        <div className="micros-editor__row" key={nutrient.key}>
          <span className="micros-editor__name">{nutrient.name}</span>
          <input
            className="micros-editor__input mn"
            inputMode="decimal"
            disabled={disabled}
            aria-label={`${nutrient.name}, ${nutrient.unit}`}
            value={value[nutrient.key] ?? ''}
            onChange={(event) => setValue(nutrient.key, event.target.value)}
          />
          <span className="micros-editor__unit">{nutrient.unit}</span>
          <button
            type="button"
            className="micros-editor__remove"
            aria-label={`Убрать ${nutrient.name}`}
            disabled={disabled}
            onClick={() => remove(nutrient.key)}
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      ))}

      {available.length > 0 && (
        <label className="select-row select-row--compact">
          <select
            value=""
            disabled={disabled}
            aria-label="Добавить нутриент"
            onChange={(event) => {
              if (event.target.value) setExtra((keys) => [...keys, event.target.value])
            }}
          >
            <option value="">Добавить нутриент…</option>
            {available.map((nutrient) => (
              <option key={nutrient.key} value={nutrient.key}>
                {nutrient.name}, {nutrient.unit}
              </option>
            ))}
          </select>
          <Icon name="caret-down" size={14} color="var(--color-neutral-600)" />
        </label>
      )}
    </div>
  )
}
