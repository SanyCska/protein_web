import { useWeekStrip } from '@/api/hooks'
import { Icon } from '@/components/Icon'
import { addDays, dayNumber, mondayOf, today, weekRange, weekdayShort } from '@/lib/format'
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

  const monday = mondayOf(day)
  const thisMonday = mondayOf(today())
  // Вперёд за текущую неделю не пускаем: будущих записей не бывает.
  const canGoForward = monday < thisMonday
  // Листаем неделями, сохраняя день недели: из вторника попадаем во вторник.
  const shift = (weeks: number) => onSelect(addDays(day, weeks * 7))

  const header = (
    <div className="week-nav">
      <button
        type="button"
        className="week-nav__arrow"
        aria-label="Предыдущая неделя"
        onClick={() => shift(-1)}
      >
        <Icon name="caret-left" size={14} />
      </button>

      <div className="week-nav__title">
        <span className="week-nav__range">{weekRange(monday)}</span>
        {day !== today() && (
          <button type="button" className="link-btn" onClick={() => onSelect(today())}>
            Сегодня
          </button>
        )}
      </div>

      {/* Прыжок на дальнюю дату: листать до прошлого месяца стрелкой — так себе занятие. */}
      <label className="week-nav__jump">
        <span className="sr-only">Перейти к дате</span>
        <Icon name="calendar" size={14} />
        <input
          type="date"
          value={day}
          max={today()}
          aria-label="Перейти к дате"
          onChange={(event) => event.target.value && onSelect(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="week-nav__arrow"
        aria-label="Следующая неделя"
        disabled={!canGoForward}
        onClick={() => shift(1)}
      >
        <Icon name="caret-right" size={14} />
      </button>
    </div>
  )

  if (!data) {
    return (
      <>
        {header}
        <div className="week-strip" aria-hidden style={{ height: 60 }} />
      </>
    )
  }

  return (
    <>
      {header}
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
    </>
  )
}
