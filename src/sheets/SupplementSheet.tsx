import { useState } from 'react'

import { useAddSupplement, useReference } from '@/api/hooks'
import type { Frequency } from '@/api/types'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, Field, Segment } from '@/components/primitives'
import './sheets.css'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'every_other_day', label: 'Через день' },
  { value: 'course', label: 'Курс' },
]

const WHEN_OPTIONS = ['утром', 'днём', 'вечером', 'с едой', 'после тренировки']

export function SupplementSheet({ onClose }: { onClose: () => void }) {
  const { data: reference } = useReference()
  const addSupplement = useAddSupplement()

  const [name, setName] = useState('')
  const [nutrientKey, setNutrientKey] = useState('')
  const [dose, setDose] = useState('')
  const [unit, setUnit] = useState('мг')
  const [whenLabel, setWhenLabel] = useState('утром')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [formError, setFormError] = useState<string | null>(null)

  const nutrients = reference?.nutrients ?? []
  const selected = nutrients.find((item) => item.key === nutrientKey)

  const onPickNutrient = (key: string) => {
    setNutrientKey(key)
    const nutrient = nutrients.find((item) => item.key === key)
    if (nutrient) {
      setUnit(nutrient.unit)
      if (!name.trim()) setName(nutrient.name)
    }
  }

  const onSave = () => {
    const parsed = Number(dose.replace(',', '.'))
    if (!name.trim()) {
      setFormError('Укажите название добавки')
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Доза должна быть больше нуля')
      return
    }
    setFormError(null)
    addSupplement.mutate(
      {
        name: name.trim(),
        nutrient_key: nutrientKey || null,
        dose: parsed,
        unit,
        when_label: whenLabel,
        frequency,
        active: true,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Sheet
      title="Новая добавка"
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
            disabled={addSupplement.isPending}
            onClick={onSave}
          >
            Сохранить
          </button>
        </>
      }
    >
      <label className="select-row" style={{ marginBottom: 10 }}>
        <select
          value={nutrientKey}
          onChange={(event) => onPickNutrient(event.target.value)}
          aria-label="Вещество"
        >
          <option value="">Без привязки к нутриенту</option>
          {nutrients.map((nutrient) => (
            <option key={nutrient.key} value={nutrient.key}>
              {nutrient.name}
            </option>
          ))}
        </select>
        <Icon name="caret-down" size={14} color="var(--color-neutral-600)" />
      </label>

      <Field
        label="Название"
        value={name}
        onChange={setName}
        placeholder="Например, D3+K2"
      />

      <div className="manual-grid">
        <Field
          label={`Доза, ${unit}`}
          value={dose}
          onChange={setDose}
          mono
          accent
          inputMode="decimal"
        />
        <label className="field">
          <span className="field__label">Когда</span>
          <select
            className="field__input"
            value={whenLabel}
            onChange={(event) => setWhenLabel(event.target.value)}
          >
            {WHEN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sheet-section">
        <Segment
          quiet
          label="Частота приёма"
          options={FREQUENCIES}
          value={frequency}
          onChange={setFrequency}
        />
      </div>

      <p className="footnote">
        {selected
          ? `Добавка попадёт в ленту дня и будет учитываться в норме по «${selected.name}» — в отчёте останется дефицит только от еды.`
          : 'Без привязки к нутриенту добавка будет видна в ленте дня, но не повлияет на отчёт по микронутриентам.'}
      </p>

      {formError && <ErrorNote message={formError} />}
      {addSupplement.isError && <ErrorNote message={addSupplement.error.message} />}
    </Sheet>
  )
}
