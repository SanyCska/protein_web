import { useState } from 'react'

import { useAddProduct } from '@/api/hooks'
import type { Micros, PortionUnit } from '@/api/types'
import { ErrorNote, Field, PortionField, Tile } from '@/components/primitives'
import { num, roundTo, toNumber } from '@/lib/format'
import './sheets.css'

interface Totals {
  calories_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  micros: Micros
}

/**
 * Сохранение записи дня в свои продукты с выбором порции.
 *
 * Живёт отдельно от шита блюда: у формы своё состояние и своя мутация, и в самом
 * шите она мешалась бы с правкой записи, у которой цель прямо противоположная.
 */
export function MealProductSave({
  defaultName,
  basisPortion,
  basisUnit,
  totals,
}: {
  defaultName: string
  /** Масса, к которой относятся `totals`; 0 — она неизвестна. */
  basisPortion: number
  basisUnit: PortionUnit
  totals: Totals
}) {
  const addProduct = useAddProduct()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [portion, setPortion] = useState(basisPortion ? String(Math.round(basisPortion)) : '')
  const [unit, setUnit] = useState<PortionUnit>(basisUnit)

  const target = toNumber(portion)
  // Без известной массы записи пересчитывать не от чего — сохраняем как есть.
  const factor = basisPortion > 0 && target !== null && target > 0 ? target / basisPortion : 1
  const values = {
    calories_kcal: roundTo(totals.calories_kcal * factor, 1),
    protein_g: roundTo(totals.protein_g * factor, 1),
    fat_g: roundTo(totals.fat_g * factor, 1),
    carbs_g: roundTo(totals.carbs_g * factor, 1),
    fiber_g: roundTo(totals.fiber_g * factor, 1),
    micros: Object.fromEntries(
      Object.entries(totals.micros).map(([key, value]) => [key, roundTo(value * factor, 3)]),
    ),
  }

  return (
    <section className="sheet-section">
      <div className="sheet-section__head">
        <h3 className="section-label">Свои продукты</h3>
        {!open && (
          <button type="button" className="link-btn" onClick={() => setOpen(true)}>
            Сохранить продукт
          </button>
        )}
      </div>

      {!open ? (
        <p className="footnote">
          Сохраните это блюдо продуктом — и в следующий раз добавляйте его из поиска,
          не описывая заново.
        </p>
      ) : (
        <>
          <Field label="Название продукта" value={name} onChange={setName} />
          <PortionField
            label="Порция"
            value={portion}
            unit={unit}
            onChange={setPortion}
            onUnitChange={setUnit}
          />

          <div className="meal-macros" style={{ marginTop: 10 }}>
            <Tile label="Ккал" value={num(values.calories_kcal)} color="var(--color-accent-300)" />
            <Tile label="Белки" value={num(values.protein_g, 1)} />
            <Tile label="Жиры" value={num(values.fat_g, 1)} />
            <Tile label="Углев." value={num(values.carbs_g, 1)} />
          </div>

          <p className="footnote">
            {basisPortion > 0
              ? `Состав пересчитан с ${num(basisPortion)} ${basisUnit} записи на порцию продукта — витамины и минералы тоже.`
              : 'У записи нет массы, поэтому пересчитывать не от чего: продукт сохранится с цифрами всей записи, а порция станет подписью.'}
          </p>

          <div className="ai-actions">
            <button type="button" className="btn btn--sm btn--neutral" onClick={() => setOpen(false)}>
              Свернуть
            </button>
            <button
              type="button"
              className="btn btn--sm btn--accent"
              disabled={addProduct.isPending || !name.trim()}
              onClick={() =>
                addProduct.mutate({
                  name: name.trim(),
                  ...values,
                  portion_g: target,
                  portion_unit: unit,
                })
              }
            >
              {addProduct.isPending ? 'Сохраняю…' : 'В свои продукты'}
            </button>
          </div>

          {addProduct.isError && <ErrorNote message={addProduct.error.message} />}
          {addProduct.isSuccess && (
            <p className="footnote">
              «{addProduct.data.name}» сохранён — ищите его во вкладке «Поиск» при добавлении
              блюда.
            </p>
          )}
        </>
      )}
    </section>
  )
}
