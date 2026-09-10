import { useDay } from '@/api/hooks'
import { useUi } from '@/app/store'
import { Icon } from '@/components/Icon'
import {
  EmptyState,
  ErrorNote,
  LoadingScreen,
  SectionHead,
} from '@/components/primitives'
import { entriesLabel } from '@/lib/format'
import { RingsCard } from './RingsCard'
import { Timeline } from './Timeline'
import { WeekStrip } from './WeekStrip'
import './diary.css'

export function DiaryScreen() {
  const day = useUi((state) => state.day)
  const setDay = useUi((state) => state.setDay)
  const openSheet = useUi((state) => state.openSheet)
  const { data, isLoading, error } = useDay(day)

  const strip = <WeekStrip day={day} onSelect={setDay} />

  if (isLoading)
    return (
      <>
        {strip}
        <LoadingScreen label="Загружаем дневник" />
      </>
    )
  if (error)
    return (
      <>
        {strip}
        <ErrorNote message={error.message} />
      </>
    )
  if (!data) return null

  const eventCount = data.meals.length + data.workouts.length + data.supplements.length

  return (
    <>
      {strip}

      <RingsCard totals={data.totals} norms={data.norms} />

      <div className="diary-actions">
        <button type="button" className="btn btn--accent" onClick={() => openSheet('add')}>
          <Icon name="plus" size={14} color="var(--color-accent-300)" />
          Блюдо
        </button>
        <button type="button" className="btn btn--neutral" onClick={() => openSheet('workout')}>
          <Icon name="person-simple-run" size={15} color="var(--color-neutral-400)" />
          Нагрузка
        </button>
      </div>

      <SectionHead title="Лента дня" meta={entriesLabel(eventCount)} />

      {eventCount === 0 ? (
        <EmptyState
          title="За этот день пока пусто"
          text="Добавьте блюдо или нагрузку — или просто скиньте фото еды боту, запись появится здесь."
        />
      ) : (
        <Timeline
          meals={data.meals}
          workouts={data.workouts}
          supplements={data.supplements}
          onOpenMeal={(id) => openSheet('meal', { mealId: id })}
        />
      )}

      <p className="hint" style={{ marginTop: 14 }}>
        <Icon name="sparkle" size={16} color="var(--color-accent)" />
        Блюда из бота попадают сюда автоматически — тут вы правите граммовку и смотрите разбор.
      </p>
    </>
  )
}
