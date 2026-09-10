import { useState } from 'react'

import { useProfile, useReference, useSaveProfile } from '@/api/hooks'
import type { Sex } from '@/api/types'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, Field, Segment } from '@/components/primitives'
import { num } from '@/lib/format'
import './sheets.css'

const SEXES: { value: Sex; label: string }[] = [
  { value: 'm', label: 'Мужской' },
  { value: 'f', label: 'Женский' },
]

interface Bounds {
  min: number
  max: number
  label: string
}

const BOUNDS: Record<string, Bounds> = {
  age: { min: 10, max: 110, label: 'Возраст' },
  height_cm: { min: 100, max: 250, label: 'Рост' },
  weight_kg: { min: 25, max: 350, label: 'Вес' },
  body_fat_pct: { min: 1, max: 70, label: 'Жир %' },
  // Границы совпадают с серверными: ниже 800 ккал это уже не диета, выше 8000 — опечатка.
  calories_override: { min: 800, max: 8000, label: 'Своя норма' },
}

function validate(field: keyof typeof BOUNDS, raw: string, required: boolean): string | null {
  if (!raw.trim()) return required ? `${BOUNDS[field]!.label}: укажите значение` : null
  const value = Number(raw.replace(',', '.'))
  const bounds = BOUNDS[field]!
  if (!Number.isFinite(value)) return `${bounds.label}: нужно число`
  if (value < bounds.min || value > bounds.max)
    return `${bounds.label}: от ${bounds.min} до ${bounds.max}`
  return null
}

export function ParamsSheet({ onClose }: { onClose: () => void }) {
  const { data: profile } = useProfile()
  const { data: reference } = useReference()
  const saveProfile = useSaveProfile()

  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'm')
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [height, setHeight] = useState(String(profile?.height_cm ?? ''))
  const [weight, setWeight] = useState(String(profile?.weight_kg ?? ''))
  const [bodyFat, setBodyFat] = useState(
    profile?.body_fat_pct !== null && profile?.body_fat_pct !== undefined
      ? String(profile.body_fat_pct)
      : '',
  )
  const [activity, setActivity] = useState(profile?.activity ?? 1.55)
  const [calories, setCalories] = useState(
    profile?.calories_override != null ? String(profile.calories_override) : '',
  )
  const [formError, setFormError] = useState<string | null>(null)

  const levels = reference?.activity_levels ?? []
  // Сервер принимает любой коэффициент 1.2–1.9, а select знает только уровни справочника —
  // прижимаем к ближайшему, иначе select молча показывает первый пункт.
  const selectedActivity = levels.length
    ? levels.reduce((best, level) =>
        Math.abs(level.factor - activity) < Math.abs(best.factor - activity) ? level : best,
      ).factor
    : activity

  const onSave = () => {
    const problem =
      validate('age', age, true) ??
      validate('height_cm', height, true) ??
      validate('weight_kg', weight, true) ??
      validate('body_fat_pct', bodyFat, false) ??
      validate('calories_override', calories, false)
    if (problem) {
      setFormError(problem)
      return
    }
    setFormError(null)
    saveProfile.mutate(
      {
        sex,
        age: Math.round(Number(age.replace(',', '.'))),
        height_cm: Number(height.replace(',', '.')),
        weight_kg: Number(weight.replace(',', '.')),
        activity: selectedActivity,
        body_fat_pct: bodyFat.trim() ? Number(bodyFat.replace(',', '.')) : null,
        // Пусто — вернуться к расчёту по формуле.
        calories_override: calories.trim() ? Number(calories.replace(',', '.')) : null,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Sheet
      title="Мои параметры"
      subtitle="От них считается дневная норма"
      short
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--neutral" style={{ width: 96 }} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn--accent"
            style={{ flex: 1 }}
            disabled={saveProfile.isPending}
            onClick={onSave}
          >
            Сохранить
          </button>
        </>
      }
    >
      <div className="sheet-segment">
        <Segment quiet label="Пол" options={SEXES} value={sex} onChange={setSex} />
      </div>

      <div className="manual-grid">
        <Field label="Возраст" value={age} onChange={setAge} mono inputMode="numeric" />
        <Field label="Рост, см" value={height} onChange={setHeight} mono inputMode="decimal" />
        <Field label="Вес, кг" value={weight} onChange={setWeight} mono inputMode="decimal" />
        <Field
          label="Жир, % (необязательно)"
          value={bodyFat}
          onChange={setBodyFat}
          mono
          inputMode="decimal"
        />
      </div>

      <div className="sheet-section">
        <h3 className="section-label sheet-section__label">Своя норма калорий</h3>
        <Field
          label="Ккал в день (пусто — считать по формуле)"
          value={calories}
          onChange={setCalories}
          mono
          accent
          inputMode="numeric"
          placeholder={profile ? String(profile.norms.calories_computed) : ''}
        />
        <p className="footnote">
          Заменяет только калории: белок и жиры остаются привязаны к весу, а разницу
          забирают углеводы. Формула даёт{' '}
          {profile ? num(profile.norms.calories_computed) : '—'} ккал.
        </p>
      </div>

      <div className="sheet-section">
        <h3 className="section-label sheet-section__label">Уровень активности</h3>
        <label className="select-row">
          <select
            value={selectedActivity}
            onChange={(event) => setActivity(Number(event.target.value))}
            aria-label="Уровень активности"
          >
            {levels.map((level) => (
              <option key={level.key} value={level.factor}>
                {level.name} — ×{level.factor}
              </option>
            ))}
          </select>
          <Icon name="caret-down" size={14} color="var(--color-neutral-600)" />
        </label>
        <p className="footnote">
          Уровень активности описывает обычный день без тренировок. Сами тренировки вносите в
          дневник — они добавляются к норме отдельно, чтобы не считать их дважды.
        </p>
      </div>

      {formError && <ErrorNote message={formError} />}
      {saveProfile.isError && <ErrorNote message={saveProfile.error.message} />}
    </Sheet>
  )
}
