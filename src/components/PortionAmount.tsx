import { useRef, type ReactNode } from 'react'

import { num, toNumber } from '@/lib/format'
import { portionFactor } from '@/lib/nutrition'
import { Segment } from './primitives'
import './ui.css'

/** Часть — доля порции-основы; граммы и миллилитры — абсолютное количество. */
export const PORTION_PICK_UNITS = ['часть', 'г', 'мл'] as const
export type PortionPickUnit = (typeof PORTION_PICK_UNITS)[number]

/**
 * Во сколько раз съеденное отличается от порции-основы.
 *
 * Граммы и миллилитры между собой не переводим — в приложении это подпись к числу,
 * а не мера плотности; пустое поле значит «съел ровно порцию».
 */
export function pickedFactor(
  amount: string,
  unit: PortionPickUnit,
  basis: number | null,
): number {
  const value = toNumber(amount)
  if (value === null || value <= 0) return 1
  if (unit === 'часть') return value
  return portionFactor(basis, value)
}

/**
 * Сколько съедено: доля порции или абсолютное количество. Единицу выбирают здесь же —
 * «полбанки» и «70 граммов» одинаково нормальные способы сказать одно и то же.
 */
export function PortionAmount({
  label = 'Съел сейчас',
  amount,
  unit,
  basis,
  basisUnit = 'г',
  onChange,
  counted,
  action,
  hint,
}: {
  label?: string
  amount: string
  unit: PortionPickUnit
  /** Порция, к которой относятся КБЖУ; null — известна только доля. */
  basis: number | null
  basisUnit?: string
  onChange: (amount: string, unit: PortionPickUnit) => void
  /** Что засчитается — обычно калории. */
  counted?: ReactNode
  /** Кнопка «применить», если правка не сохраняется сама собой. */
  action?: ReactNode
  hint?: ReactNode
}) {
  const factor = pickedFactor(amount, unit, basis)
  const known = basis !== null && basis > 0

  // Точная доля до округления: «70 г» — это 0,538 порции, показать её надо как 0,54,
  // а вернуться из неё в граммы — ровно в 70, а не в 70,2. Обновляем только при вводе,
  // иначе округлённая подпись затрёт точное значение на следующем же рендере.
  const exact = useRef(factor)
  const type = (value: string, nextUnit: PortionPickUnit) => {
    exact.current = pickedFactor(value, nextUnit, basis)
    onChange(value, nextUnit)
  }

  /** Смена единицы не должна менять количество: пересчитываем поле под новую меру. */
  const switchUnit = (next: PortionPickUnit) => {
    if (next === unit) return
    if (!known) {
      onChange(amount, next)
      return
    }
    // Если поле изменили снаружи, точная доля устарела — доверяем показанному числу.
    const base = Math.abs(exact.current - factor) < 0.01 ? exact.current : factor
    const value = next === 'часть' ? base : basis * base
    const rounded = next === 'часть' ? Math.round(value * 100) / 100 : Math.round(value * 10) / 10
    onChange(String(rounded), next)
  }

  return (
    <>
      <div className="sheet-segment">
        <Segment
          quiet
          label="Чем меряем съеденное"
          options={PORTION_PICK_UNITS.map((option) => ({ value: option, label: option }))}
          value={unit}
          onChange={switchUnit}
        />
      </div>

      <div className="portion-field">
        <label className="field">
          <span className="field__label">
            {label}
            {unit === 'часть' ? ', частей' : `, ${unit}`}
          </span>
          <input
            className="field__input field__input--mono field__input--accent"
            inputMode="decimal"
            aria-label={`${label}, ${unit}`}
            value={amount}
            onChange={(event) => type(event.target.value, unit)}
          />
        </label>
        <div className="field">
          <span className="field__label">{action ? 'Итого' : 'Засчитаем'}</span>
          <div className="field__input serving-unit mn">{counted}</div>
        </div>
      </div>

      {action && <div className="portion-amount__action">{action}</div>}

      <p className="footnote">
        {hint ??
          (known
            ? unit === 'часть'
              ? `Это ${num(basis * factor, 1)} ${basisUnit} из порции в ${num(basis)} ${basisUnit}.`
              : `Это ${num(factor, 2)} от порции в ${num(basis)} ${basisUnit}.`
            : 'Порция-основа неизвестна, поэтому считаем долями: 0,5 — половина записанного.')}
      </p>
    </>
  )
}
