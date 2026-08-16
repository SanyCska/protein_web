import { useWeekStrip } from '@/api/hooks'
import { dayNumber, weekdayShort } from '@/lib/format'
import './diary.css'

/** Цвет индикатора под числом: насколько день закрыт по калориям. */
function indicatorColor(calories: number, norm: number): string {
  if (norm <= 0 || calories === 0) return 'var(--color-neutral-800)'
  if (calories > norm) return 'var(--color-accent-400)'
  if (calories > norm * 0.8) return 'var(--color-accent-700)'
  return 'var(--color-neutral-800)'
}

export function WeekStrip({
  day,
  onSelect,
}: {
  day: string
  onSelect: (day: string) => void
}) {
  const { data } = useWeekStrip(day)

  if (!data) {
    return <div className="week-strip" aria-hidden style={{ height: 60 }} />
  }

  return (
    <div className="week-strip" role="group" aria-label="Дни недели">
      {data.days.map((item) => (
        <button
          key={item.day}
          type="button"
          className="day-chip"
          aria-pressed={item.day === day}
          aria-label={`${weekdayShort(item.day)} ${dayNumber(item.day)}, ${item.calories} ккал`}
          onClick={() => onSelect(item.day)}
        >
          <span className="day-chip__weekday">{weekdayShort(item.day)}</span>
          <span className="day-chip__number mn">{dayNumber(item.day)}</span>
          <span
            className="day-chip__indicator"
            style={{ background: indicatorColor(item.calories, data.norm_calories) }}
          />
        </button>
      ))}
    </div>
  )
}
