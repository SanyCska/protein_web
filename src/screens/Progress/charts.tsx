import { clamp, num, weekdayShort } from '@/lib/format'
import './progress.css'

/** Подписи под столбцами: за неделю — дни, за месяц — только числа каждого пятого дня. */
function axisLabel(day: string, index: number, total: number): string {
  if (total <= 7) return weekdayShort(day)
  if (index % 5 === 0) return day.slice(-2)
  return ''
}

export function BarChart({
  days,
  values,
  height,
  max,
  colorOf,
  norm,
  showValues = true,
  emptyBarColor = 'var(--color-neutral-900)',
}: {
  days: string[]
  values: number[]
  height: number
  max: number
  colorOf: (value: number) => string
  norm?: number
  showValues?: boolean
  emptyBarColor?: string
}) {
  const scale = max > 0 ? max : 1
  const plotHeight = height - 16

  return (
    <>
      <div className="chart" style={{ height }}>
        {norm !== undefined && norm > 0 && (
          <div
            className="chart__norm-line"
            style={{ bottom: Math.round((norm / scale) * plotHeight) }}
            aria-hidden
          />
        )}
        {days.map((day, index) => {
          const value = values[index] ?? 0
          const barHeight = value > 0 ? Math.max((value / scale) * plotHeight, 3) : 2
          return (
            <div className="chart__col" key={day}>
              {showValues && value > 0 && <span className="chart__value">{num(value)}</span>}
              <div
                className="chart__bar"
                style={{
                  height: barHeight,
                  background: value > 0 ? colorOf(value) : emptyBarColor,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="chart__axis" aria-hidden>
        {days.map((day, index) => (
          <span className="chart__axis-label" key={day}>
            {axisLabel(day, index, days.length)}
          </span>
        ))}
      </div>
    </>
  )
}

/**
 * Чистый баланс: нулевая ось по центру, профицит вверх, дефицит вниз.
 * Шкала берётся от самого большого отклонения — при фиксированном максимуме все дни
 * с крупным дефицитом упираются в край и выглядят одинаково.
 */
/**
 * Линия веса. Отдельный график, а не столбцы: между 74 и 76 кг столбики от нуля
 * неразличимы, поэтому шкала строится по самим данным, а дни без взвешивания
 * рвут линию, а не падают в ноль.
 */
export function WeightChart({
  days,
  values,
  height = 132,
}: {
  days: string[]
  values: (number | null)[]
  height?: number
}) {
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => point.value !== null)

  if (points.length === 0) {
    return <p className="footnote">Взвешиваний за период нет — записать вес можно в дневнике.</p>
  }

  const numbers = points.map((point) => point.value)
  const low = Math.min(...numbers)
  const high = Math.max(...numbers)
  // Плоский период не должен превращаться в линию по краю: даём запас в полкило.
  const pad = Math.max((high - low) * 0.2, 0.5)
  const min = low - pad
  const span = high + pad - min

  const width = 100
  const x = (index: number) =>
    days.length > 1 ? (index / (days.length - 1)) * width : width / 2
  const y = (value: number) => 100 - ((value - min) / span) * 100

  const line = points.map((point) => `${x(point.index)},${y(point.value)}`).join(' ')

  return (
    <div className="weight-chart" style={{ height }}>
      <div className="weight-chart__plot">
        {/* Линия рисуется растянутым viewBox, а точки — обычными элементами поверх:
            в неравномерно растянутой системе координат круг превратился бы в эллипс. */}
        {points.length > 1 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline className="weight-chart__line" points={line} />
          </svg>
        )}
        {points.map((point) => (
          <span
            key={point.index}
            className="weight-chart__dot"
            style={{ left: `${x(point.index)}%`, top: `${y(point.value)}%` }}
          />
        ))}
        <div className="weight-chart__scale mn" aria-hidden>
          <span>{num(high, 1)}</span>
          <span>{num(low, 1)}</span>
        </div>
      </div>
      <div className="chart__axis">
        {days.map((day, index) => (
          <span key={day} className="chart__axis-label">
            {axisLabel(day, index, days.length)}
          </span>
        ))}
      </div>
      <span className="sr-only">
        Вес по дням: от {num(low, 1)} до {num(high, 1)} кг
      </span>
    </div>
  )
}

export function NetChart({ days, values }: { days: string[]; values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1) * 1.05

  return (
    <div className="net-chart">
      <div className="net-chart__zero" aria-hidden />
      {days.map((day, index) => {
        const value = values[index] ?? 0
        const ratio = clamp(Math.abs(value) / max, 0, 1) * 100
        return (
          <div className="net-chart__col" key={day}>
            <div className="net-chart__half net-chart__half--up">
              {value > 0 && (
                <div className="net-chart__bar net-chart__bar--up" style={{ height: `${ratio}%` }} />
              )}
            </div>
            <div className="net-chart__half">
              {value < 0 && (
                <div
                  className="net-chart__bar net-chart__bar--down"
                  style={{ height: `${ratio}%` }}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Максимум шкалы с запасом 15%, чтобы подписи над столбцами не упирались в край. */
export function scaleMax(values: number[], fallback: number): number {
  const peak = Math.max(...values, 0)
  return peak > 0 ? peak * 1.15 : fallback
}
