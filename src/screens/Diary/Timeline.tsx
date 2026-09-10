import type { Meal, Supplement, Workout } from '@/api/types'
import { Icon } from '@/components/Icon'
import { doseValue, minutesLabel, num } from '@/lib/format'
import { MEAL_TYPE_ICONS } from '@/lib/nutrition'
import { groupSupplements, substancesLabel, type SupplementGroup } from '@/lib/supplements'
import './diary.css'

type Event =
  | { kind: 'meal'; time: string; meal: Meal }
  | { kind: 'workout'; time: string; workout: Workout }
  | { kind: 'supplement'; time: string; group: SupplementGroup }

/** Записи без времени уезжают в конец дня — так лента остаётся читаемой. */
const NO_TIME = '99:99'

export function buildEvents(
  meals: Meal[],
  workouts: Workout[],
  supplements: Supplement[],
): Event[] {
  const events: Event[] = [
    ...meals.map<Event>((meal) => ({ kind: 'meal', time: meal.eaten_at ?? NO_TIME, meal })),
    ...workouts.map<Event>((workout) => ({
      kind: 'workout',
      time: workout.done_at ?? NO_TIME,
      workout,
    })),
    // Банка идёт одной строкой: десять веществ с этикетки не должны занимать
    // десять строк ленты.
    ...groupSupplements(supplements).map<Event>((group) => ({
      kind: 'supplement',
      time: NO_TIME,
      group,
    })),
  ]
  return events.sort((a, b) => a.time.localeCompare(b.time))
}

function EventRow({
  icon,
  time,
  accent = false,
  onClick,
  children,
}: {
  icon: string
  time: string
  accent?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const cardClass = onClick ? 'event__card event__card--food' : 'event__card'
  return (
    <div className="event">
      <div className="event__gutter">
        <span className={accent ? 'event__badge event__badge--workout' : 'event__badge'}>
          <Icon
            name={icon}
            size={12}
            color={accent ? 'var(--color-accent-400)' : 'var(--color-neutral-400)'}
          />
        </span>
        <span className="event__time">{time === NO_TIME ? '—' : time}</span>
      </div>
      {onClick ? (
        <button type="button" className={cardClass} onClick={onClick}>
          {children}
        </button>
      ) : (
        <div className="event__card">{children}</div>
      )}
    </div>
  )
}

export function Timeline({
  meals,
  workouts,
  supplements,
  onOpenMeal,
}: {
  meals: Meal[]
  workouts: Workout[]
  supplements: Supplement[]
  onOpenMeal: (id: number) => void
}) {
  const events = buildEvents(meals, workouts, supplements)

  return (
    <div className="timeline">
      {events.map((event) => {
        if (event.kind === 'meal') {
          const { meal } = event
          return (
            <EventRow
              key={`meal-${meal.id}`}
              icon={MEAL_TYPE_ICONS[meal.meal_type] ?? 'fork-knife'}
              time={event.time}
              onClick={() => onOpenMeal(meal.id)}
            >
              <div className="event__head">
                <span className="event__title">{meal.name}</span>
                <span className="event__kcal mn">{num(meal.calories_kcal)}</span>
              </div>
              {meal.ingredients && <p className="event__caption">{meal.ingredients}</p>}
              <div className="event__tags">
                <span className="event__tag" style={{ color: 'var(--color-accent-300)' }}>
                  Б{num(meal.protein_g)}
                </span>
                <span className="event__tag" style={{ color: 'var(--color-neutral-400)' }}>
                  Ж{num(meal.fat_g)}
                </span>
                <span className="event__tag" style={{ color: 'var(--color-accent-400)' }}>
                  У{num(meal.carbs_g)}
                </span>
              </div>
            </EventRow>
          )
        }

        if (event.kind === 'workout') {
          const { workout } = event
          return (
            <EventRow
              key={`workout-${workout.id}`}
              icon={workout.icon}
              time={event.time}
              accent
            >
              <div className="event__head">
                <span className="event__title">{workout.kind_name}</span>
                <span className="event__kcal mn" style={{ color: 'var(--color-accent-400)' }}>
                  −{num(workout.kcal)}
                </span>
              </div>
              <p className="event__caption">
                {minutesLabel(workout.minutes)}
                {workout.note ? ` · ${workout.note}` : ''}
              </p>
            </EventRow>
          )
        }

        const { group } = event
        const single = group.items.length === 1 ? group.items[0] : null
        return (
          <EventRow key={`supplement-${group.key}`} icon="pill" time={event.time}>
            <div className="event__head">
              <span className="event__title">{group.name}</span>
              <span className="event__kcal mn" style={{ color: 'var(--color-neutral-600)' }}>
                —
              </span>
            </div>
            <p className="event__caption">
              {single
                ? `${doseValue(single.effective_dose)} ${single.unit}`
                : substancesLabel(group.items.length)}
              {group.whenLabel ? ` · ${group.whenLabel}` : ''}
            </p>
          </EventRow>
        )
      })}
    </div>
  )
}
