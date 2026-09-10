import { useState } from 'react'

import { useAddSupplements, useParseSupplementLabel, useReference } from '@/api/hooks'
import type { AiSupplementLabelResult, Frequency, NutrientMeta } from '@/api/types'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, Field, PhotoButton, Segment } from '@/components/primitives'
import { num, plural, roundTo, toNumber } from '@/lib/format'
import './sheets.css'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'every_other_day', label: 'Через день' },
  { value: 'course', label: 'Курс' },
]

const WHEN_OPTIONS = ['утром', 'днём', 'вечером', 'с едой', 'после тренировки']

const DOSE_UNITS = ['г', 'мг', 'мкг', 'МЕ']

/** Формы для склонения единиц приёма; ключи — те же, что нормализует сервер. */
const SERVING_FORMS: Record<string, [string, string, string]> = {
  капсула: ['капсула', 'капсулы', 'капсул'],
  таблетка: ['таблетка', 'таблетки', 'таблеток'],
  'мерная ложка': ['мерная ложка', 'мерные ложки', 'мерных ложек'],
  пакетик: ['пакетик', 'пакетика', 'пакетиков'],
  порция: ['порция', 'порции', 'порций'],
}

function unitWord(count: number, unit: string): string {
  const forms = SERVING_FORMS[unit] ?? SERVING_FORMS.порция
  return plural(Math.round(count), forms!)
}

function servingLabel(count: number, unit: string): string {
  return `${num(count, 1)} ${unitWord(count, unit)}`
}

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'точность низкая',
  medium: 'точность средняя',
  high: 'точность высокая',
}

/** Строка формы. Доза хранится строкой: поле ввода можно очистить, а 0 — не «пусто». */
interface Row {
  key: number
  name: string
  nutrientKey: string
  dose: string
  unit: string
  /** Доза с этикетки на её же порцию. Пока она есть, строка едет за выбранным приёмом. */
  labelDose: number | null
}

let nextKey = 1

function emptyRow(): Row {
  return { key: nextKey++, name: '', nutrientKey: '', dose: '', unit: 'мг', labelDose: null }
}

export function SupplementSheet({ onClose }: { onClose: () => void }) {
  const { data: reference } = useReference()
  const addSupplements = useAddSupplements()
  const parseLabel = useParseSupplementLabel()

  // Название банки: одна добавка — одна запись в списке, сколько бы веществ
  // ни было в составе. Его же видно в ленте дня.
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  // Сколько единиц приёма принимает пользователь и на сколько их считает этикетка:
  // таблица на банке часто дана на две капсулы, а пьют одну.
  const [serving, setServing] = useState('')
  const [label, setLabel] = useState<{ serving: number; unit: string } | null>(null)
  const [whenLabel, setWhenLabel] = useState('утром')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [formError, setFormError] = useState<string | null>(null)

  const nutrients: NutrientMeta[] = reference?.nutrients ?? []

  const patchRow = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const onPickNutrient = (row: Row, nutrientKey: string) => {
    const nutrient = nutrients.find((item) => item.key === nutrientKey)
    patchRow(row.key, {
      nutrientKey,
      // Единица нутриента задана справочником — иначе доза попадёт в отчёт не в том масштабе.
      unit: nutrient ? nutrient.unit : row.unit,
      name: row.name.trim() || nutrient?.name || '',
    })
  }

  /** Этикетка банки — это сразу несколько веществ; они и становятся строками формы. */
  const applyLabel = (result: AiSupplementLabelResult) => {
    if (result.items.length === 0) {
      setFormError('На фото не удалось разобрать состав — введите вещества вручную')
      return
    }
    setFormError(null)
    setRows(
      result.items.map((item) => ({
        key: nextKey++,
        name: item.name,
        nutrientKey: item.nutrient_key ?? '',
        dose: String(item.dose),
        unit: item.unit,
        labelDose: item.dose,
      })),
    )
    setLabel({ serving: result.serving, unit: result.serving_unit })
    setServing(String(result.serving))
    if (!name.trim()) setName(result.name)
    if (result.when_label && WHEN_OPTIONS.includes(result.when_label)) {
      setWhenLabel(result.when_label)
    }
  }

  /**
   * Пользователь пьёт не то, на что посчитана таблица: одну капсулу вместо двух.
   * Дозы едут пропорционально, но только там, где их не правили руками.
   */
  const onServingChange = (value: string) => {
    setServing(value)
    const taken = toNumber(value)
    if (!label || label.serving <= 0 || taken === null) return
    const factor = taken / label.serving
    setRows((current) =>
      current.map((row) =>
        row.labelDose === null ? row : { ...row, dose: String(roundTo(row.labelDose * factor, 3)) },
      ),
    )
  }

  const onSave = () => {
    if (!name.trim()) {
      setFormError('Укажите название добавки')
      return
    }
    const payload = []
    for (const [index, row] of rows.entries()) {
      const dose = toNumber(row.dose)
      if (!row.name.trim()) {
        setFormError(`Строка ${index + 1}: укажите название вещества`)
        return
      }
      if (dose === null || dose <= 0) {
        setFormError(`Строка ${index + 1}: доза должна быть больше нуля`)
        return
      }
      payload.push({
        name: row.name.trim(),
        nutrient_key: row.nutrientKey || null,
        dose,
        unit: row.unit,
        when_label: whenLabel,
        frequency,
        active: true,
      })
    }
    setFormError(null)
    addSupplements.mutate({ name: name.trim(), items: payload }, { onSuccess: onClose })
  }

  const counted = rows.filter((row) => row.nutrientKey).length

  return (
    <Sheet
      title="Новая добавка"
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
            disabled={addSupplements.isPending}
            onClick={onSave}
          >
            {addSupplements.isPending ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="ai-actions">
        <PhotoButton
          accent
          label={parseLabel.isPending ? 'Читаю этикетку…' : 'Состав с фото'}
          disabled={parseLabel.isPending}
          onPick={(image) => {
            setFormError(null)
            parseLabel.mutate({ image_base64: image }, { onSuccess: applyLabel })
          }}
          onError={setFormError}
        />
      </div>
      <p className="footnote">
        Снимите состав на банке — ИИ прочитает все вещества сразу и разложит их по строкам.
      </p>
      {parseLabel.isError && <ErrorNote message={parseLabel.error.message} />}
      {parseLabel.data && (
        <p className="ai-note">
          <Icon name="sparkle" size={14} weight="fill" color="var(--color-accent)" />
          {parseLabel.data.name} ·{' '}
          {CONFIDENCE_LABELS[parseLabel.data.confidence] ?? 'точность неизвестна'} · проверьте
          дозы
        </p>
      )}

      <Field
        label="Название добавки"
        value={name}
        onChange={setName}
        placeholder="Например, Мультивитамины Solgar"
      />
      <p className="footnote">
        Под этим названием добавка встанет одной строкой в списке и в ленте дня, сколько бы
        веществ ни было в составе. В отчёт по микронутриентам попадёт каждое вещество.
      </p>

      {label && (
        <>
          <div className="portion-field">
            <label className="field">
              <span className="field__label">Принимаю за раз</span>
              <input
                className="field__input field__input--mono"
                inputMode="decimal"
                value={serving}
                aria-label="Сколько единиц приёма принимаю"
                onChange={(event) => onServingChange(event.target.value)}
              />
            </label>
            <div className="field">
              <span className="field__label">Единица</span>
              <div className="field__input serving-unit">
                {unitWord(toNumber(serving) ?? label.serving, label.unit)}
              </div>
            </div>
          </div>
          <p className="footnote">
            На этикетке дозы указаны на {servingLabel(label.serving, label.unit)}. Поменяйте
            число — дозы пересчитаются; поправленные руками останутся как есть.
          </p>
        </>
      )}

      <h3 className="section-label" style={{ marginTop: 14 }}>
        Состав{rows.length > 1 ? ` · ${rows.length}` : ''}
      </h3>

      {rows.map((row, index) => (
        <div className="supp-item" key={row.key}>
          <div className="supp-item__head">
            <label className="select-row select-row--compact">
              <select
                value={row.nutrientKey}
                aria-label={`Вещество, строка ${index + 1}`}
                onChange={(event) => onPickNutrient(row, event.target.value)}
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
            {/* Последнюю строку не убираем: пустая форма всё равно нужна. */}
            {rows.length > 1 && (
              <button
                type="button"
                className="parsed-item__remove"
                aria-label={`Убрать строку ${index + 1}`}
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              >
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>

          <div className="supp-item__grid">
            <Field
              label="Название"
              value={row.name}
              placeholder="Например, D3+K2"
              onChange={(name) => patchRow(row.key, { name })}
            />
            <Field
              label="Доза"
              value={row.dose}
              mono
              accent
              inputMode="decimal"
              onChange={(dose) => patchRow(row.key, { dose, labelDose: null })}
            />
            <label className="field">
              <span className="field__label">Ед.</span>
              <select
                className="field__input"
                value={row.unit}
                aria-label={`Единица дозы, строка ${index + 1}`}
                onChange={(event) => patchRow(row.key, { unit: event.target.value })}
              >
                {DOSE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn--sm btn--neutral btn--block"
        onClick={() => setRows((current) => [...current, emptyRow()])}
      >
        <Icon name="plus" size={13} />
        Добавить вещество
      </button>

      <div className="sheet-section">
        <label className="field">
          <span className="field__label">Когда принимать</span>
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
        {counted > 0
          ? `Веществ из справочника: ${counted} из ${rows.length} — они уменьшат дефицит в отчёте. Остальные будут видны только в ленте дня.`
          : 'Без привязки к нутриенту добавка будет видна в ленте дня, но не повлияет на отчёт по микронутриентам.'}
      </p>

      {formError && <ErrorNote message={formError} />}
      {addSupplements.isError && <ErrorNote message={addSupplements.error.message} />}
    </Sheet>
  )
}
