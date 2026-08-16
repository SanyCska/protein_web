import {
  useDeleteSupplement,
  useDeleteTemplate,
  useProfile,
  useSaveProfile,
  useSupplements,
  useTemplates,
  useAddWorkout,
} from '@/api/hooks'
import { useUi } from '@/app/store'
import { Icon } from '@/components/Icon'
import {
  Card,
  CardHead,
  ErrorNote,
  LoadingScreen,
  Segment,
  Tile,
} from '@/components/primitives'
import { haptic } from '@/api/telegram'
import { minutesLabel, num } from '@/lib/format'
import type { Goal } from '@/api/types'
import './profile.css'

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Снижение' },
  { value: 'maintain', label: 'Поддержание' },
  { value: 'gain', label: 'Набор' },
]

const GOAL_NOTE: Record<Goal, string> = {
  lose: 'минус 15% под цель «снижение»',
  maintain: 'без поправки под цель «поддержание»',
  gain: 'плюс 12% под цель «набор»',
}

export function ProfileScreen() {
  const day = useUi((state) => state.day)
  const openSheet = useUi((state) => state.openSheet)

  const { data: profile, isLoading, error } = useProfile()
  const { data: supplements = [] } = useSupplements()
  const { data: templates = [] } = useTemplates()

  const saveProfile = useSaveProfile()
  const deleteSupplement = useDeleteSupplement()
  const deleteTemplate = useDeleteTemplate()
  const addWorkout = useAddWorkout(day)

  if (isLoading) return <LoadingScreen label="Загружаем профиль" />
  if (error) return <ErrorNote message={error.message} />
  if (!profile) return null

  const { norms } = profile

  return (
    <>
      <Card>
        <CardHead
          title="Мои параметры"
          meta={
            <button type="button" className="link-btn" onClick={() => openSheet('params')}>
              Изменить
            </button>
          }
        />
        <div className="param-grid">
          <Tile label="Пол" value={profile.sex === 'f' ? 'Ж' : 'М'} />
          <Tile label="Возраст" value={num(profile.age)} />
          <Tile label="Рост" value={num(profile.height_cm)} unit="см" />
          <Tile label="Вес" value={num(profile.weight_kg, 1)} unit="кг" />
          <Tile label="Активность" value={profile.activity.toFixed(2)} />
          <Tile
            label="Жир %"
            value={profile.body_fat_pct !== null ? num(profile.body_fat_pct) : '—'}
          />
        </div>

        <div className="goal-segment">
          <Segment
            quiet
            label="Цель"
            options={GOALS}
            value={profile.goal}
            onChange={(goal) => saveProfile.mutate({ goal })}
          />
        </div>
        {saveProfile.isError && <ErrorNote message={saveProfile.error.message} />}
      </Card>

      <Card accent>
        <CardHead title="Расчётная норма" meta="Mifflin–St Jeor" />
        <div>
          <span className="norm-card__value">{num(norms.calories)}</span>
          <span className="norm-card__unit">ккал / день</span>
        </div>

        <div className="norm-card__macros">
          <div className="norm-card__macro">
            <div className="tile__label">Белки</div>
            <div className="tile__value mn" style={{ color: 'var(--color-accent-300)' }}>
              {num(norms.protein_g)} г
            </div>
          </div>
          <div className="norm-card__macro">
            <div className="tile__label">Жиры</div>
            <div className="tile__value mn" style={{ color: 'var(--color-neutral-400)' }}>
              {num(norms.fat_g)} г
            </div>
          </div>
          <div className="norm-card__macro">
            <div className="tile__label">Углеводы</div>
            <div className="tile__value mn" style={{ color: 'var(--color-accent-400)' }}>
              {num(norms.carbs_g)} г
            </div>
          </div>
        </div>

        <p className="norm-card__note">
          BMR {num(norms.bmr)} ккал × {norms.activity_factor.toFixed(2)} активности,{' '}
          {GOAL_NOTE[profile.goal]}. Нагрузка из дневника добавляется сверху в тот же день.
        </p>
      </Card>

      <Card>
        <CardHead
          title="Добавки и витамины"
          meta={
            <button type="button" className="link-btn" onClick={() => openSheet('supplement')}>
              Добавить
            </button>
          }
        />
        {supplements.length === 0 ? (
          <p className="footnote">
            Пока пусто. Добавьте витамины и минералы, которые пьёте — они будут учитываться
            в дневной норме и в отчётах.
          </p>
        ) : (
          supplements.map((supplement) => (
            <div
              key={supplement.id}
              className={
                supplement.active ? 'supplement-row' : 'supplement-row supplement-row--inactive'
              }
            >
              <Icon name="pill" size={15} color="var(--color-accent)" />
              <div className="supplement-row__body">
                <div className="supplement-row__name">{supplement.name}</div>
                <div className="supplement-row__meta">
                  {supplement.when_label ?? 'в любое время'}
                  {supplement.frequency === 'every_other_day' && ' · через день'}
                  {supplement.frequency === 'course' && ' · курс'}
                  {!supplement.active && ' · выключена'}
                </div>
              </div>
              <span className="supplement-row__dose">
                {num(supplement.dose)} {supplement.unit}
              </span>
              <button
                type="button"
                className="supplement-row__remove"
                aria-label={`Удалить ${supplement.name}`}
                onClick={() => deleteSupplement.mutate(supplement.id)}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))
        )}
        <p className="footnote">Учитываются в дневной норме и в отчётах по микронутриентам.</p>
      </Card>

      <Card>
        <CardHead title="Шаблоны нагрузки" meta="тап — добавить в день" />
        <div className="template-grid">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="template-tile"
              onClick={() => {
                haptic()
                addWorkout.mutate({ kind: template.kind, minutes: template.minutes })
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                deleteTemplate.mutate(template.id)
              }}
            >
              <Icon name={template.icon} size={16} color="var(--color-accent)" />
              <span className="template-tile__name">{template.name}</span>
              <span className="template-tile__meta">
                {minutesLabel(template.minutes)} · −{num(template.kcal)}
              </span>
            </button>
          ))}
        </div>
        {addWorkout.isError && <ErrorNote message={addWorkout.error.message} />}
        <p className="footnote">
          Расход пересчитывается по вашему текущему весу. Долгий тап (или правый клик) удаляет
          шаблон.
        </p>
      </Card>
    </>
  )
}
