import { useRef, type CSSProperties, type ReactNode } from 'react'

import type { PortionUnit } from '@/api/types'
import { clamp, nutrientValue, num } from '@/lib/format'
import { PORTION_UNITS, barColor } from '@/lib/nutrition'
import { readPhoto } from '@/lib/photo'
import { Icon } from './Icon'
import './ui.css'

export function Card({
  children,
  accent = false,
  style,
}: {
  children: ReactNode
  accent?: boolean
  style?: CSSProperties
}) {
  return (
    <section className={accent ? 'card card--accent' : 'card'} style={style}>
      {children}
    </section>
  )
}

export function CardHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <header className="card__head">
      <h2 className="card__title">{title}</h2>
      {meta !== undefined && <span className="card__meta">{meta}</span>}
    </header>
  )
}

export function SectionHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-label">{title}</h2>
      {meta !== undefined && (
        <span className="mn" style={{ fontSize: 10.5, color: 'var(--color-neutral-700)' }}>
          {meta}
        </span>
      )}
    </div>
  )
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
  quiet = false,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  quiet?: boolean
  label: string
}) {
  return (
    <div className={quiet ? 'segment segment--quiet' : 'segment'} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className="segment__option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
}) {
  if (!onClick) {
    return (
      <span className="chip" aria-selected={selected}>
        {children}
      </span>
    )
  }
  return (
    <button type="button" className="chip" aria-selected={selected} onClick={onClick}>
      {children}
    </button>
  )
}

export function Bar({
  percent,
  color,
  height = 4,
}: {
  percent: number
  color?: string
  height?: number
}) {
  return (
    <div className="bar" style={{ height }}>
      <div
        className="bar__fill"
        style={{
          width: `${clamp(percent, 0, 100)}%`,
          background: color ?? barColor(percent),
        }}
      />
    </div>
  )
}

export function NutrientRow({
  name,
  value,
  norm,
  unit,
  percent,
}: {
  name: string
  value: number
  norm: number
  unit: string
  percent: number
}) {
  const color = barColor(percent)
  return (
    <div className="nutrient-row">
      <span className="nutrient-row__name" title={name}>
        {name}
      </span>
      <div className="nutrient-row__bar">
        <Bar percent={percent} color={color} />
      </div>
      <span className="nutrient-row__values mn">
        {nutrientValue(value)} / {nutrientValue(norm)} {unit}
      </span>
      <span className="nutrient-row__pct mn" style={{ color }}>
        {percent}
      </span>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
  max = 5000,
  suffix = '',
  label,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  label: string
}) {
  const set = (next: number) => onChange(clamp(Math.round(next), min, max))
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label={`${label}: убавить`}
      >
        −
      </button>
      <input
        className="stepper__value mn"
        type="number"
        inputMode="numeric"
        value={value}
        aria-label={label}
        onChange={(event) => {
          // Пустая строка даёт Number('') === 0 — стирание поля сбрасывало бы граммы в ноль.
          if (event.target.value === '') return
          const next = Number(event.target.value)
          if (!Number.isNaN(next)) set(next)
        }}
      />
      {suffix && (
        <span style={{ fontSize: 10, color: 'var(--color-neutral-600)', paddingRight: 6 }}>
          {suffix}
        </span>
      )}
      <button
        type="button"
        className="stepper__btn"
        onClick={() => set(value + step)}
        disabled={value >= max}
        aria-label={`${label}: прибавить`}
      >
        +
      </button>
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  mono = false,
  accent = false,
  placeholder,
  error,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  mono?: boolean
  accent?: boolean
  placeholder?: string
  error?: string
  inputMode?: 'numeric' | 'decimal' | 'text'
}) {
  const className = [
    'field__input',
    mono ? 'field__input--mono' : '',
    accent ? 'field__input--accent' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className={className}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="field__error">{error}</span>}
    </label>
  )
}

/**
 * Выбор фото этикетки. Скрытый input живёт внутри: снимок состава нужен в трёх
 * шитах, и каждый раз заводить свой ref с обработчиком — это три копии одного кода.
 */
export function PhotoButton({
  label,
  onPick,
  onError,
  disabled = false,
  accent = false,
}: {
  label: string
  onPick: (dataUrl: string) => void
  onError: (message: string) => void
  disabled?: boolean
  accent?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        className={accent ? 'btn btn--sm btn--accent' : 'btn btn--sm btn--neutral'}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Icon name="camera" size={14} color={accent ? 'var(--color-accent-300)' : undefined} />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Сбрасываем значение: без этого повторный выбор того же файла не даст change.
          event.target.value = ''
          if (!file) return
          readPhoto(file).then(onPick, (error: Error) => onError(error.message))
        }}
      />
    </>
  )
}

/** Порция с выбором единицы: еду считаем в граммах, напитки — в миллилитрах. */
export function PortionField({
  label = 'Порция',
  value,
  unit,
  onChange,
  onUnitChange,
  disabled = false,
}: {
  label?: string
  value: string
  unit: PortionUnit
  onChange: (value: string) => void
  onUnitChange: (unit: PortionUnit) => void
  disabled?: boolean
}) {
  return (
    <div className="portion-field">
      <label className="field">
        <span className="field__label">{label}</span>
        <input
          className="field__input field__input--mono"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <label className="field portion-field__unit">
        <span className="field__label">Единица</span>
        <select
          className="field__input"
          value={unit}
          disabled={disabled}
          aria-label="Единица порции"
          onChange={(event) => onUnitChange(event.target.value as PortionUnit)}
        >
          {PORTION_UNITS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function Tile({
  label,
  value,
  unit,
  hint,
  color,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  color?: string
}) {
  return (
    <div className="tile">
      <div className="tile__label">{label}</div>
      <div className="tile__value mn" style={color ? { color } : undefined}>
        {value}
        {unit && (
          <span style={{ fontSize: 10, color: 'var(--color-neutral-600)', marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--color-neutral-600)', marginTop: 2 }}>{hint}</div>
      )}
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__text">{text}</p>
    </div>
  )
}

export function CardSkeleton({ height = 120 }: { height?: number }) {
  return <div className="card skeleton" style={{ height, boxShadow: 'none' }} aria-hidden />
}

export function LoadingScreen({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div style={{ padding: '14px 0' }} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <CardSkeleton height={200} />
      <CardSkeleton height={120} />
      <CardSkeleton height={160} />
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="error-note" role="alert">
      {message}
    </p>
  )
}

export function ValueWithNorm({
  value,
  norm,
  unit,
  color,
}: {
  value: number
  norm: number
  unit?: string
  color?: string
}) {
  return (
    <span className="mn" style={{ fontSize: 11.5 }}>
      <span style={{ fontWeight: 600, color }}>{num(value)}</span>
      <span style={{ color: 'var(--color-neutral-600)' }}>
        {' / '}
        {num(norm)}
        {unit ? ` ${unit}` : ''}
      </span>
    </span>
  )
}
