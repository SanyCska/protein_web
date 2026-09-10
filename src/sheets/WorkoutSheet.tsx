import { useEffect, useRef, useState } from 'react'

import {
  useAddWorkout,
  useDay,
  useDeleteWorkout,
  useProfile,
  useReference,
  useTemplates,
  useUpdateWorkout,
} from '@/api/hooks'
import { haptic } from '@/api/telegram'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { Chip, ErrorNote, Field } from '@/components/primitives'
import { minutesLabel, num, nowTime } from '@/lib/format'
import './sheets.css'

const PRESETS = [20, 30, 45, 60]

export function WorkoutSheet({
  day,
  workoutId = null,
  onClose,
}: {
  day: string
  /** Правим уже записанную нагрузку; null — заводим новую. */
  workoutId?: number | null
  onClose: () => void
}) {
  const { data: templates = [] } = useTemplates()
  const { data: reference } = useReference()
  const { data: profile } = useProfile()
  const { data: dayView } = useDay(day)
  const addWorkout = useAddWorkout(day)
  const updateWorkout = useUpdateWorkout()
  const deleteWorkout = useDeleteWorkout()

  const [kind, setKind] = useState('swimming')
  const [minutes, setMinutes] = useState(45)
  const [doneAt, setDoneAt] = useState('')
  const [asTemplate, setAsTemplate] = useState(false)

  // Нагрузка уже есть в ленте дня — отдельный запрос за ней не нужен.
  const editing = workoutId ? dayView?.workouts.find((w) => w.id === workoutId) : undefined
  const filled = useRef(false)

  useEffect(() => {
    if (!editing || filled.current) return
    filled.current = true
    setKind(editing.kind)
    setMinutes(Math.round(editing.minutes))
    setDoneAt(editing.done_at ?? '')
  }, [editing])

  const kinds = reference?.workout_kinds ?? []
  const weight = profile?.weight_kg ?? 75
  const met = kinds.find((item) => item.key === kind)?.met ?? 5
  // Та же формула, что на сервере — слайдер должен пересчитывать расход мгновенно.
  const kcal = Math.round(met * weight * (minutes / 60))

  const submit = (payload: { kind: string; minutes: number; save_as_template?: boolean }) => {
    haptic()
    addWorkout.mutate({ ...payload, done_at: nowTime() }, { onSuccess: onClose })
  }

  const save = () => {
    if (!editing) {
      submit({ kind, minutes, save_as_template: asTemplate })
      return
    }
    haptic()
    updateWorkout.mutate(
      // Расход не шлём: сервер пересчитает его сам по виду, минутам и текущему весу.
      { id: editing.id, payload: { kind, minutes, done_at: doneAt || null } },
      { onSuccess: onClose },
    )
  }

  const busy = addWorkout.isPending || updateWorkout.isPending || deleteWorkout.isPending

  return (
    <Sheet
      title={editing ? 'Нагрузка' : 'Физическая нагрузка'}
      onClose={onClose}
      footer={
        <>
          {editing ? (
            <button
              type="button"
              className="btn btn--danger"
              style={{ width: 108 }}
              disabled={busy}
              onClick={() => deleteWorkout.mutate(editing.id, { onSuccess: onClose })}
            >
              Удалить
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--neutral"
              style={{ width: 108 }}
              onClick={() => setAsTemplate((value) => !value)}
              aria-pressed={asTemplate}
            >
              {asTemplate ? 'В шаблоне ✓' : 'В шаблон'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--accent"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={save}
          >
            {editing ? `Сохранить · ${num(kcal)}` : `Добавить в день · ${num(kcal)}`}
          </button>
        </>
      }
    >
      {editing && (
        <Field
          label="Время"
          type="time"
          value={doneAt}
          mono
          onChange={setDoneAt}
        />
      )}

      {!editing && (
      <section>
        <h3 className="section-label sheet-section__label">Шаблоны — один тап</h3>
        <div className="template-picker">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="template-tile"
              onClick={() => submit({ kind: template.kind, minutes: template.minutes })}
            >
              <Icon name={template.icon} size={16} color="var(--color-accent)" />
              <span className="template-tile__name">{template.name}</span>
              <span className="template-tile__meta">
                {minutesLabel(template.minutes)} · {num(template.kcal)} ккал
              </span>
            </button>
          ))}
        </div>
      </section>
      )}

      <section className="sheet-section">
        <h3 className="section-label sheet-section__label">
          {editing ? 'Вид и длительность' : 'Или вручную'}
        </h3>

        <label className="select-row">
          <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Вид нагрузки">
            {kinds.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
          <Icon name="caret-down" size={14} color="var(--color-neutral-600)" />
        </label>

        <input
          className="slider"
          type="range"
          min={5}
          max={120}
          step={5}
          value={minutes}
          aria-label="Длительность, минут"
          onChange={(event) => setMinutes(Number(event.target.value))}
        />

        <div className="preset-row">
          {PRESETS.map((preset) => (
            <Chip key={preset} selected={preset === minutes} onClick={() => setMinutes(preset)}>
              {preset} мин
            </Chip>
          ))}
        </div>

        <div className="burn-tile">
          <div>
            <div className="burn-tile__label">Расход по вашему весу</div>
            <div className="burn-tile__meta">
              {num(weight, 1)} кг · {minutesLabel(minutes)} · MET {met}
            </div>
          </div>
          <span className="burn-tile__value">{num(kcal)}</span>
        </div>
      </section>

      {addWorkout.isError && <ErrorNote message={addWorkout.error.message} />}
      {updateWorkout.isError && <ErrorNote message={updateWorkout.error.message} />}
      {deleteWorkout.isError && <ErrorNote message={deleteWorkout.error.message} />}
    </Sheet>
  )
}
