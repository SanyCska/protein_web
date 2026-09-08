import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { api } from '@/api/client'
import { keys, useDeleteMeal, useProfile, useReference, useUpdateMeal } from '@/api/hooks'
import type { MealItem } from '@/api/types'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, NutrientRow, Stepper, Tile } from '@/components/primitives'
import { num, shortDate } from '@/lib/format'
import { MEAL_TYPE_LABELS, totalsFromItems } from '@/lib/nutrition'
import './sheets.css'

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
      return {
        ...item,
        value,
        norm,
        pct: norm > 0 ? Math.round((value / norm) * 100) : 0,
      }
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

  const [items, setItems] = useState<MealItem[] | null>(null)

  useEffect(() => {
    if (meal) setItems(meal.items)
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
  if (!meal) return null

  const hasComposition = items !== null && items.length > 0
  // Пока пользователь двигает степперы, цифры пересчитываются локально —
  // ждать ответа сервера на каждый шаг было бы заметно медленно.
  const computed = hasComposition ? totalsFromItems(items) : null
  const shown = computed ?? {
    calories_kcal: meal.calories_kcal,
    protein_g: meal.protein_g,
    fat_g: meal.fat_g,
    carbs_g: meal.carbs_g,
    micros: meal.micros,
  }

  const changed =
    hasComposition &&
    JSON.stringify(items.map((item) => item.grams)) !==
      JSON.stringify(meal.items.map((item) => item.grams))

  const microRows = contributionRows(
    shown.micros,
    profile?.norms.micros ?? {},
    reference?.nutrients ?? [],
  )

  const subtitle = [
    meal.eaten_at,
    shortDate(meal.day),
    `${num(shown.calories_kcal)} ккал`,
  ]
    .filter(Boolean)
    .join(' · ')

  const typeLabel = MEAL_TYPE_LABELS[meal.meal_type] ?? meal.name

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
              items &&
              updateMeal.mutate({ id: meal.id, payload: { items } }, { onSuccess: onClose })
            }
          >
            {changed ? 'Сохранить изменения' : 'Без изменений'}
          </button>
        </>
      }
    >
      {/* Название показываем, только если оно несёт что-то сверх заголовка-типа. */}
      {meal.name !== typeLabel && (
        <p style={{ marginTop: -6, marginBottom: 12, fontSize: 12.5, fontWeight: 500 }}>
          {meal.name}
        </p>
      )}

      <div className="meal-macros">
        <Tile label="Ккал" value={num(shown.calories_kcal)} color="var(--color-accent-300)" />
        <Tile label="Белки" value={num(shown.protein_g)} />
        <Tile label="Жиры" value={num(shown.fat_g)} />
        <Tile label="Углев." value={num(shown.carbs_g)} />
      </div>

      {hasComposition ? (
        <section className="sheet-section">
          <h3 className="section-label sheet-section__label">Состав</h3>
          {items.map((item, index) => (
            <div className="composition-row" key={`${item.name}-${index}`}>
              <span className="composition-row__name">{item.name}</span>
              <Stepper
                label={`Граммовка: ${item.name}`}
                value={item.grams}
                suffix="г"
                onChange={(grams) =>
                  setItems((current) =>
                    (current ?? []).map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, grams } : entry,
                    ),
                  )
                }
              />
            </div>
          ))}
        </section>
      ) : (
        <p className="footnote">
          У этой записи нет разбора по ингредиентам — она внесена вручную или старым сценарием
          бота. Граммовку здесь не поправить, но запись можно удалить и добавить заново через
          ИИ-разбор.
        </p>
      )}

      {microRows.length > 0 && (
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
