import { useUi } from '@/app/store'
import { AddMealSheet } from './AddMealSheet'
import { MealDetailSheet } from './MealDetailSheet'
import { ParamsSheet } from './ParamsSheet'
import { SupplementSheet } from './SupplementSheet'
import { WorkoutSheet } from './WorkoutSheet'

/** Одновременно открыт ровно один шит — так решено в дизайне. */
export function SheetHost() {
  const sheet = useUi((state) => state.sheet)
  const mealId = useUi((state) => state.mealId)
  const supplementKey = useUi((state) => state.supplementKey)
  const workoutId = useUi((state) => state.workoutId)
  const day = useUi((state) => state.day)
  const close = useUi((state) => state.closeSheet)

  if (sheet === null) return null

  switch (sheet) {
    case 'add':
      return <AddMealSheet day={day} onClose={close} />
    case 'meal':
      return mealId === null ? null : <MealDetailSheet mealId={mealId} onClose={close} />
    case 'workout':
      return <WorkoutSheet day={day} workoutId={workoutId} onClose={close} />
    case 'supplement':
      return <SupplementSheet groupKey={supplementKey} onClose={close} />
    case 'params':
      return <ParamsSheet onClose={close} />
    default:
      return null
  }
}
