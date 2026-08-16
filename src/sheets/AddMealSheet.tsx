import { useRef, useState } from 'react'

import { useAddMeal, useParseMeal, useProducts } from '@/api/hooks'
import type { MealItem, Product } from '@/api/types'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, Field, Segment, Stepper } from '@/components/primitives'
import { num, nowTime } from '@/lib/format'
import { guessMealType, totalsFromItems } from '@/lib/nutrition'
import './sheets.css'

type Mode = 'ai' | 'search' | 'manual'

const MODES = [
  { value: 'ai' as const, label: 'ИИ-разбор' },
  { value: 'search' as const, label: 'Поиск' },
  { value: 'manual' as const, label: 'Вручную' },
]

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

interface ManualForm {
  name: string
  portion: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  fiber: string
}

const EMPTY_MANUAL: ManualForm = {
  name: '',
  portion: '',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  fiber: '',
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function AddMealSheet({ day, onClose }: { day: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('ai')
  const [aiText, setAiText] = useState('')
  const [items, setItems] = useState<MealItem[] | null>(null)
  const [parsedName, setParsedName] = useState('')
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState<ManualForm>(EMPTY_MANUAL)
  const [saveAsProduct, setSaveAsProduct] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const parseMeal = useParseMeal()
  const addMeal = useAddMeal(day)
  const { data: products = [], isFetching } = useProducts(query, mode === 'search')

  const time = nowTime()
  const totals = items ? totalsFromItems(items) : null

  const saveDisabled =
    addMeal.isPending ||
    (mode === 'manual' ? !manual.name.trim() : mode === 'ai' ? !items || items.length === 0 : true)

  const savePayload = () => {
    if (mode === 'ai' && items && totals) {
      return {
        name: parsedName || 'Блюдо',
        calories_kcal: totals.calories_kcal,
        protein_g: totals.protein_g,
        fat_g: totals.fat_g,
        carbs_g: totals.carbs_g,
        fiber_g: totals.fiber_g,
        portion_g: totals.portion_g,
        micros: totals.micros,
        items,
        ingredients: items.map((item) => `${item.name} ${num(item.grams)} г`).join(', '),
        meal_type: guessMealType(time),
        eaten_at: time,
        source: 'webapp_ai',
        save_as_product: saveAsProduct,
      }
    }

    const kcal = toNumber(manual.kcal)
    return {
      name: manual.name.trim(),
      calories_kcal: kcal,
      protein_g: toNumber(manual.protein) ?? 0,
      fat_g: toNumber(manual.fat),
      carbs_g: toNumber(manual.carbs),
      fiber_g: toNumber(manual.fiber),
      portion_g: toNumber(manual.portion),
      meal_type: guessMealType(time),
      eaten_at: time,
      source: 'webapp_manual',
      save_as_product: saveAsProduct,
    }
  }

  const onSave = () => {
    if (mode === 'manual') {
      if (!manual.name.trim()) {
        setFormError('Укажите название блюда')
        return
      }
      const kcal = toNumber(manual.kcal)
      if (kcal === null || kcal <= 0) {
        setFormError('Калории должны быть больше нуля')
        return
      }
    }
    setFormError(null)
    addMeal.mutate(savePayload(), { onSuccess: onClose })
  }

  const addProduct = (product: Product) => {
    const grams = product.portion_g ?? 100
    addMeal.mutate(
      {
        name: product.name,
        calories_kcal: product.calories_kcal,
        protein_g: product.protein_g,
        fat_g: product.fat_g,
        carbs_g: product.carbs_g,
        fiber_g: product.fiber_g,
        portion_g: grams,
        micros: product.micros,
        meal_type: guessMealType(time),
        eaten_at: time,
        source: 'webapp_product',
      },
      { onSuccess: onClose },
    )
  }

  const runParse = (imageBase64?: string) => {
    parseMeal.mutate(
      { text: aiText, image_base64: imageBase64 },
      {
        onSuccess: (result) => {
          setItems(result.items)
          setParsedName(result.name)
        },
      },
    )
  }

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('Фото больше 8 МБ — выберите файл поменьше')
      return
    }
    setFormError(null)
    const reader = new FileReader()
    reader.onload = () => runParse(String(reader.result))
    reader.readAsDataURL(file)
  }

  const footerLabel = totals
    ? `Сохранить ${num(totals.calories_kcal)} ккал`
    : mode === 'manual' && toNumber(manual.kcal)
      ? `Сохранить ${num(toNumber(manual.kcal) ?? 0)} ккал`
      : 'Сохранить'

  return (
    <Sheet
      title="Добавить блюдо"
      onClose={onClose}
      footer={
        mode === 'search' ? undefined : (
          <>
            <button type="button" className="btn btn--neutral" style={{ width: 96 }} onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn--accent"
              style={{ flex: 1 }}
              disabled={saveDisabled}
              onClick={onSave}
            >
              {footerLabel}
            </button>
          </>
        )
      }
    >
      <div className="sheet-segment">
        <Segment options={MODES} value={mode} onChange={setMode} label="Способ добавления" />
      </div>

      {mode === 'ai' && (
        <>
          <textarea
            className="textarea"
            value={aiText}
            placeholder="Опишите блюдо: «омлет из трёх яиц с сыром и тост с авокадо»"
            onChange={(event) => setAiText(event.target.value)}
          />

          <div className="ai-actions">
            <button
              type="button"
              className="btn btn--sm btn--neutral"
              onClick={() => fileInput.current?.click()}
              disabled={parseMeal.isPending}
            >
              <Icon name="magnifying-glass" size={14} />
              Фото
            </button>
            <button
              type="button"
              className="btn btn--sm btn--accent"
              onClick={() => runParse()}
              disabled={parseMeal.isPending || !aiText.trim()}
            >
              <Icon name="sparkle" size={14} color="var(--color-accent-300)" />
              {parseMeal.isPending ? 'Разбираю…' : 'Разобрать'}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => onPickPhoto(event.target.files?.[0])}
          />

          {parseMeal.isError && <ErrorNote message={parseMeal.error.message} />}

          {items && items.length > 0 && (
            <>
              <p className="ai-note">
                <Icon name="sparkle" size={14} weight="fill" color="var(--color-accent)" />
                ИИ разобрал — проверьте граммовку
              </p>
              {items.map((item, index) => (
                <div className="parsed-item" key={`${item.name}-${index}`}>
                  <div className="parsed-item__body">
                    <div className="parsed-item__name">{item.name}</div>
                    <div className="parsed-item__detail">
                      {num((item.per100.calories_kcal ?? 0) * (item.grams / 100))} ккал · Б
                      {num((item.per100.protein_g ?? 0) * (item.grams / 100))}
                    </div>
                  </div>
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
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={saveAsProduct}
                  onChange={(event) => setSaveAsProduct(event.target.checked)}
                />
                Сохранить как своё блюдо для повторов
              </label>
            </>
          )}

          {items && items.length === 0 && (
            <ErrorNote message="ИИ не нашёл в описании ни одного продукта. Попробуйте описать подробнее или введите вручную." />
          )}
        </>
      )}

      {mode === 'search' && (
        <>
          <div className="search-field">
            <Icon name="magnifying-glass" size={15} color="var(--color-neutral-600)" />
            <input
              value={query}
              placeholder="Поиск по своим продуктам"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="sheet-section">
            {isFetching && <p className="footnote">Ищем…</p>}
            {!isFetching && products.length === 0 && (
              <p className="footnote">
                Ничего не нашлось. Продукты появляются здесь, когда вы отмечаете «сохранить как своё
                блюдо» при добавлении.
              </p>
            )}
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className="result-card"
                onClick={() => addProduct(product)}
              >
                <div className="result-card__body">
                  <div className="result-card__name">{product.name}</div>
                  <div className="result-card__detail">
                    Б{num(product.protein_g)}
                    {product.fat_g !== null ? ` Ж${num(product.fat_g)}` : ''}
                    {product.carbs_g !== null ? ` У${num(product.carbs_g)}` : ''}
                    {product.portion_g ? ` · ${num(product.portion_g)} г` : ''}
                  </div>
                </div>
                <span className="result-card__kcal">{num(product.calories_kcal ?? 0)}</span>
                <Icon name="plus" size={14} color="var(--color-accent)" />
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'manual' && (
        <>
          <Field
            label="Название блюда"
            value={manual.name}
            onChange={(name) => setManual((form) => ({ ...form, name }))}
            placeholder="Например, творог с ягодами"
          />
          <div className="manual-grid">
            <Field
              label="Порция, г"
              value={manual.portion}
              mono
              inputMode="decimal"
              onChange={(portion) => setManual((form) => ({ ...form, portion }))}
            />
            <Field
              label="Ккал"
              value={manual.kcal}
              mono
              accent
              inputMode="decimal"
              onChange={(kcal) => setManual((form) => ({ ...form, kcal }))}
            />
            <Field
              label="Белки, г"
              value={manual.protein}
              mono
              inputMode="decimal"
              onChange={(protein) => setManual((form) => ({ ...form, protein }))}
            />
            <Field
              label="Жиры, г"
              value={manual.fat}
              mono
              inputMode="decimal"
              onChange={(fat) => setManual((form) => ({ ...form, fat }))}
            />
            <Field
              label="Углеводы, г"
              value={manual.carbs}
              mono
              inputMode="decimal"
              onChange={(carbs) => setManual((form) => ({ ...form, carbs }))}
            />
            <Field
              label="Клетчатка, г"
              value={manual.fiber}
              mono
              inputMode="decimal"
              onChange={(fiber) => setManual((form) => ({ ...form, fiber }))}
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={saveAsProduct}
              onChange={(event) => setSaveAsProduct(event.target.checked)}
            />
            Сохранить как своё блюдо для повторов
          </label>
          <p className="footnote">
            У блюда, внесённого вручную, нет микронутриентов — в отчёте оно попадёт в «покрытие
            данными», но не добавит витаминов.
          </p>
        </>
      )}

      {formError && <ErrorNote message={formError} />}
      {addMeal.isError && <ErrorNote message={addMeal.error.message} />}
    </Sheet>
  )
}
