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
