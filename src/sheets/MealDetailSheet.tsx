import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { api } from '@/api/client'
import { keys, useDeleteMeal, useProfile, useReference, useUpdateMeal } from '@/api/hooks'
import type { MealType } from '@/api/types'
import { Icon } from '@/components/Icon'
import { MicrosEditor } from '@/components/MicrosEditor'
import { Sheet } from '@/components/Sheet'
import { TotalWeight } from '@/components/TotalWeight'
import {
  Chip,
  ErrorNote,
  Field,
  NutrientRow,
  PortionField,
  Stepper,
  Tile,
} from '@/components/primitives'
import { num, roundTo, shortDate, toNumber } from '@/lib/format'
import { formFromMeal, mealPatch, type MealForm } from '@/lib/meal-edit'
import { MEAL_TYPE_LABELS, totalsFromItems } from '@/lib/nutrition'
import { MealProductSave } from './MealProductSave'
import './sheets.css'

const MEAL_TYPES = Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]

/** Ходовые доли: съел половину записанного, полторы порции, две. */
const FACTORS = [0.5, 1.5, 2]

/** Выше этого доля — опечатка: двадцать порций за раз не съедают. */
const MAX_FACTOR = 20

/** Умножить число в поле формы; пустое поле так и остаётся пустым. */
function scaleField(value: string, factor: number): string {
  const parsed = toNumber(value)
  return parsed === null ? value : String(roundTo(parsed * factor, 1))
}

/** Микронутриенты блюда, отсортированные по вкладу в дневную норму. */
function contributionRows(
  micros: Record<string, number>,
  norms: Record<string, number>,
  meta: { key: string; name: string; unit: string }[],
): { key: string; name: string; unit: string; value: number; norm: number; pct: number }[] {
  return meta
    .filter((item) => (micros[item.key] ?? 0) > 0)
    .map((item) => {
      const value = micros[item.key] ?? 0
      const norm = norms[item.key] ?? 0
      return { ...item, value, norm, pct: norm > 0 ? Math.round((value / norm) * 100) : 0 }
    })
    .sort((a, b) => b.pct - a.pct)
}

export function MealDetailSheet({ mealId, onClose }: { mealId: number; onClose: () => void }) {
  const { data: meal, isLoading, error } = useQuery({
    queryKey: keys.meal(mealId),
    queryFn: () => api.meal(mealId),
  })
  const { data: reference } = useReference()
  const { data: profile } = useProfile()
  const updateMeal = useUpdateMeal()
  const deleteMeal = useDeleteMeal()

  const [form, setForm] = useState<MealForm | null>(null)
  // Своя доля пересчёта: чипы закрывают ходовые случаи, но «съел 0,7 порции» бывает тоже.
  const [factorDraft, setFactorDraft] = useState('')
  const [factorError, setFactorError] = useState<string | null>(null)

  useEffect(() => {
    if (meal) setForm(formFromMeal(meal))
  }, [meal])

  if (isLoading) {
    return (
      <Sheet title="Блюдо" onClose={onClose}>
        <div className="skeleton" style={{ height: 220 }} aria-hidden />
      </Sheet>
    )
  }
  if (error) {
    return (
      <Sheet title="Блюдо" onClose={onClose}>
        <ErrorNote message={error.message} />
      </Sheet>
    )
  }
  if (!meal || !form) return null

  const patch = (fields: Partial<MealForm>) => setForm((current) => current && { ...current, ...fields })

  /**
   * Пересчитать запись целиком: «съел половину того, что записал». У блюда с составом
   * множим граммовку ингредиентов, у остальных — КБЖУ, порцию и микронутриенты.
   */
  const applyFactor = (factor: number) => {
    if (form.items) {
      patch({
        items: form.items.map((item) => ({ ...item, grams: roundTo(item.grams * factor, 1) })),
      })
      return
    }
    patch({
      kcal: scaleField(form.kcal, factor),
      protein: scaleField(form.protein, factor),
      fat: scaleField(form.fat, factor),
      carbs: scaleField(form.carbs, factor),
      fiber: scaleField(form.fiber, factor),
      portion: scaleField(form.portion, factor),
      micros: Object.fromEntries(
        Object.entries(form.micros).map(([key, value]) => [key, roundTo(value * factor, 3)]),
      ),
    })
  }

  const applyDraft = () => {
    const factor = toNumber(factorDraft)
    if (factor === null || factor <= 0 || factor > MAX_FACTOR) {
      setFactorError(`Доля должна быть больше нуля и не больше ${MAX_FACTOR}`)
      return
    }
    setFactorError(null)
    applyFactor(factor)
    setFactorDraft('')
  }

  const factorRow = (
    <>
      <div className="factor-row">
        <span className="factor-row__label">Пересчитать ×</span>
        <input
          className="factor-row__input mn"
          inputMode="decimal"
          placeholder="0,7"
          aria-label="Своя доля для пересчёта"
          value={factorDraft}
          onChange={(event) => setFactorDraft(event.target.value)}
        />
        <button
          type="button"
          className="btn btn--sm btn--neutral"
          disabled={!factorDraft.trim()}
          onClick={applyDraft}
        >
          Применить
        </button>
      </div>
      <div className="preset-row">
        {FACTORS.map((factor) => (
          <Chip key={factor} onClick={() => applyFactor(factor)}>
            ×{num(factor, factor === 2 ? 0 : 1)}
          </Chip>
        ))}
      </div>
      {factorError && <ErrorNote message={factorError} />}
    </>
  )

  const items = form.items
  // Пока пользователь двигает степперы, цифры пересчитываются локально —
  // ждать ответа сервера на каждый шаг было бы заметно медленно.
  const computed = items ? totalsFromItems(items) : null
  const shown = computed ?? {
    calories_kcal: toNumber(form.kcal) ?? meal.calories_kcal,
    protein_g: toNumber(form.protein) ?? meal.protein_g,
    fat_g: toNumber(form.fat) ?? meal.fat_g,
    carbs_g: toNumber(form.carbs) ?? meal.carbs_g,
    fiber_g: toNumber(form.fiber) ?? meal.fiber_g,
    micros: form.micros,
  }

  const changes = mealPatch(meal, form)
  const changed = Object.keys(changes).length > 0

  const microRows = contributionRows(
    shown.micros,
    profile?.norms.micros ?? {},
    reference?.nutrients ?? [],
  )

  const typeLabel = MEAL_TYPE_LABELS[form.mealType] ?? meal.name
  const subtitle = [form.eatenAt, shortDate(meal.day), `${num(shown.calories_kcal)} ккал`]
    .filter(Boolean)
    .join(' · ')

  return (
    <Sheet
      title={typeLabel}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--danger"
            style={{ width: 108 }}
            disabled={deleteMeal.isPending}
            onClick={() => deleteMeal.mutate(meal.id, { onSuccess: onClose })}
          >
            Удалить
          </button>
          <button
            type="button"
            className="btn btn--accent"
            style={{ flex: 1 }}
            disabled={!changed || updateMeal.isPending}
            onClick={() =>
              updateMeal.mutate({ id: meal.id, payload: changes }, { onSuccess: onClose })
            }
          >
            {changed ? 'Сохранить изменения' : 'Без изменений'}
          </button>
        </>
      }
    >
      <div className="meal-macros">
        <Tile label="Ккал" value={num(shown.calories_kcal)} color="var(--color-accent-300)" />
        <Tile label="Белки" value={num(shown.protein_g)} />
        <Tile label="Жиры" value={num(shown.fat_g)} />
        <Tile label="Углев." value={num(shown.carbs_g)} />
      </div>

      <Field label="Название" value={form.name} onChange={(name) => patch({ name })} />

      <div className="manual-grid">
        {/* Дату правим здесь же: запись нередко вносят на следующий день. */}
        <Field
          label="Дата"
          type="date"
          value={form.day}
          mono
          onChange={(day) => patch({ day })}
        />
        <Field
          label="Время"
          type="time"
          value={form.eatenAt}
          mono
          onChange={(eatenAt) => patch({ eatenAt })}
        />
        <label className="field">
          <span className="field__label">Приём</span>
          <select
            className="field__input"
            value={form.mealType}
            onChange={(event) => patch({ mealType: event.target.value as MealType })}
          >
            {MEAL_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items ? (
        <section className="sheet-section">
          <h3 className="section-label sheet-section__label">Состав</h3>
          {items.map((item, index) => (
            <div className="composition-row" key={index}>
              <input
                className="composition-row__name composition-row__input"
                value={item.name}
                aria-label={`Название: ${item.name}`}
                onChange={(event) =>
                  patch({
                    items: items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, name: event.target.value } : entry,
                    ),
                  })
                }
              />
              <Stepper
                label={`Граммовка: ${item.name}`}
                value={item.grams}
                suffix="г"
                onChange={(grams) =>
                  patch({
                    items: items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, grams } : entry,
                    ),
                  })
                }
              />
              {/* Последний ингредиент не убираем: без состава итоги считать неоткуда. */}
              {items.length > 1 && (
                <button
                  type="button"
                  className="parsed-item__remove"
                  aria-label={`Убрать ${item.name}`}
                  onClick={() =>
                    patch({ items: items.filter((_, entryIndex) => entryIndex !== index) })
                  }
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
          ))}
          <TotalWeight
            items={items}
            onChange={(next) => patch({ items: next })}
            hint="Поправьте общий вес — граммовка разойдётся по продуктам пропорционально."
          />
          {factorRow}
          <p className="footnote">
            КБЖУ и витамины пересчитываются из состава, поэтому править их отдельно нельзя —
            меняйте граммовку, общий вес или долю.
          </p>
        </section>
      ) : (
        <>
          <PortionField
            value={form.portion}
            unit={form.portionUnit}
            onChange={(portion) => patch({ portion })}
            onUnitChange={(portionUnit) => patch({ portionUnit })}
          />
          {factorRow}
          <p className="footnote">
            Доля пересчитывает всю запись: порцию, КБЖУ и витамины. Съели половину
            записанного — нажмите ×0,5.
          </p>
          <div className="manual-grid">
            <Field
              label="Ккал"
              value={form.kcal}
              mono
              accent
              inputMode="decimal"
              onChange={(kcal) => patch({ kcal })}
            />
            <Field
              label="Белки, г"
              value={form.protein}
              mono
              inputMode="decimal"
              onChange={(protein) => patch({ protein })}
            />
            <Field
              label="Жиры, г"
              value={form.fat}
              mono
              inputMode="decimal"
              onChange={(fat) => patch({ fat })}
            />
            <Field
              label="Углеводы, г"
              value={form.carbs}
              mono
              inputMode="decimal"
              onChange={(carbs) => patch({ carbs })}
            />
            <Field
              label="Клетчатка, г"
              value={form.fiber}
              mono
              inputMode="decimal"
              onChange={(fiber) => patch({ fiber })}
            />
          </div>

          <section className="sheet-section">
            <h3 className="section-label sheet-section__label">Витамины и минералы</h3>
            <MicrosEditor value={form.micros} onChange={(micros) => patch({ micros })} />
          </section>
        </>
      )}

      <MealProductSave
        defaultName={form.name}
        basisPortion={computed?.portion_g || toNumber(form.portion) || 0}
        basisUnit={form.portionUnit}
        totals={shown}
      />

      {items && microRows.length > 0 && (
        <section className="sheet-section">
          <h3 className="section-label sheet-section__label">Микронутриенты блюда</h3>
          {microRows.map((row) => (
            <NutrientRow
              key={row.key}
              name={row.name}
              value={row.value}
              norm={row.norm}
              unit={row.unit}
              percent={row.pct}
            />
          ))}
          <p className="footnote">Проценты — вклад блюда в дневную норму.</p>
        </section>
      )}

      {updateMeal.isError && <ErrorNote message={updateMeal.error.message} />}
      {deleteMeal.isError && <ErrorNote message={deleteMeal.error.message} />}
    </Sheet>
  )
}
