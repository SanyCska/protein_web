import { useEffect, useState } from 'react'

import {
  useAddMeal,
  useAddProduct,
  useEstimateMicros,
  useParseLabel,
  useParseMeal,
  useProducts,
} from '@/api/hooks'
import type { AiLabelResult, MealItem, Micros, Per100, PortionUnit, Product } from '@/api/types'
import { Icon } from '@/components/Icon'
import { MicrosEditor } from '@/components/MicrosEditor'
import { Sheet } from '@/components/Sheet'
import {
  ErrorNote,
  Field,
  PhotoButton,
  PortionField,
  Segment,
  Stepper,
} from '@/components/primitives'
import { num, nowTime, roundTo, toNumber } from '@/lib/format'
import {
  guessMealType,
  portionFactor,
  portionFromPer100,
  totalsFromItems,
} from '@/lib/nutrition'
import './sheets.css'

type Mode = 'ai' | 'search' | 'manual'

const MODES = [
  { value: 'ai' as const, label: 'ИИ-разбор' },
  { value: 'search' as const, label: 'Поиск' },
  { value: 'manual' as const, label: 'Вручную' },
]

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'точность низкая',
  medium: 'точность средняя',
  high: 'точность высокая',
}

interface ManualForm {
  name: string
  /** На какую порцию указаны КБЖУ ниже — как на упаковке. */
  portion: string
  /** Сколько съедено сейчас; пусто — съедена ровно та порция, что указана. */
  eaten: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  fiber: string
}

const EMPTY_MANUAL: ManualForm = {
  name: '',
  portion: '',
  eaten: '',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  fiber: '',
}

export function AddMealSheet({ day, onClose }: { day: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('ai')
  const [aiText, setAiText] = useState('')
  const [items, setItems] = useState<MealItem[] | null>(null)
  // Что вернул разбор до правок: удалённую по ошибке позицию надо уметь вернуть,
  // не тратя ещё один вызов модели.
  const [parsedItems, setParsedItems] = useState<MealItem[] | null>(null)
  const [parsedName, setParsedName] = useState('')
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState<ManualForm>(EMPTY_MANUAL)
  // Выбранный в поиске продукт ждёт, пока укажут съеденное количество.
  const [picked, setPicked] = useState<Product | null>(null)
  const [pickedAmount, setPickedAmount] = useState('')
  const [portionUnit, setPortionUnit] = useState<PortionUnit>('г')
  // Состав на 100 г со снятой этикетки: пока он есть, правка граммовки пересчитывает
  // КБЖУ сама. Ручная правка любого макроса его сбрасывает — дальше цифры пользователя.
  const [labelPer100, setLabelPer100] = useState<Per100 | null>(null)
  const [saveAsProduct, setSaveAsProduct] = useState(false)
  // Состав блюда, внесённого вручную: заполняется ИИ или руками и уходит
  // и в запись дня, и в сохранённый продукт — это один и тот же продукт.
  const [manualMicros, setManualMicros] = useState<Micros>({})
  const [formError, setFormError] = useState<string | null>(null)

  const parseMeal = useParseMeal()
  const parseLabel = useParseLabel()
  const saveProduct = useAddProduct()
  const estimateMicros = useEstimateMicros()
  const addMeal = useAddMeal(day)
  // Поиск идёт по каждому нажатию — сглаживаем, чтобы не слать запрос на каждую букву.
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const {
    data: products = [],
    isFetching,
    error: searchError,
  } = useProducts(debouncedQuery, mode === 'search')

  const removedCount = Math.max((parsedItems?.length ?? 0) - (items?.length ?? 0), 0)

  const time = nowTime()

  // КБЖУ в форме описывают порцию-основу («данные на 100 г»), а засчитать надо
  // съеденное. Пустое «съел» — значит съедена ровно та порция, что указана.
  const basisAmount = toNumber(manual.portion)
  const eatenAmount = toNumber(manual.eaten) ?? basisAmount
  const eatenFactor = portionFactor(basisAmount, eatenAmount)
  const manualBasis = {
    calories_kcal: toNumber(manual.kcal),
    protein_g: toNumber(manual.protein) ?? 0,
    fat_g: toNumber(manual.fat),
    carbs_g: toNumber(manual.carbs),
    fiber_g: toNumber(manual.fiber),
  }
  const scale = (value: number | null) =>
    value === null ? null : roundTo(value * eatenFactor, 1)
  const manualEaten = {
    calories_kcal: scale(manualBasis.calories_kcal),
    protein_g: scale(manualBasis.protein_g) ?? 0,
    fat_g: scale(manualBasis.fat_g),
    carbs_g: scale(manualBasis.carbs_g),
    fiber_g: scale(manualBasis.fiber_g),
    micros: Object.fromEntries(
      Object.entries(manualMicros).map(([key, value]) => [key, roundTo(value * eatenFactor, 3)]),
    ),
  }
  // Разобранный ИИ состав относится только к режиму ИИ — в ручном режиме сохраняется форма.
  const totals = mode === 'ai' && items && items.length > 0 ? totalsFromItems(items) : null

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

    return {
      name: manual.name.trim(),
      ...manualEaten,
      portion_g: eatenAmount,
      portion_unit: portionUnit,
      meal_type: guessMealType(time),
      eaten_at: time,
      source: 'webapp_manual',
      // Продукт сохраняем сами: в справочник должна лечь порция-основа с её КБЖУ,
      // а не то, сколько съели сегодня.
      save_as_product: false,
    }
  }

  const onSave = () => {
    if (mode === 'manual') {
      if (!manual.name.trim()) {
        setFormError('Укажите название блюда')
        return
      }
      if (manualBasis.calories_kcal === null || manualBasis.calories_kcal <= 0) {
        setFormError('Калории должны быть больше нуля')
        return
      }
      if (saveAsProduct) {
        // В справочник кладём порцию-основу: завтра её съедят в другом количестве.
        saveProduct.mutate({
          name: manual.name.trim(),
          calories_kcal: manualBasis.calories_kcal,
          protein_g: manualBasis.protein_g,
          fat_g: manualBasis.fat_g,
          carbs_g: manualBasis.carbs_g,
          fiber_g: manualBasis.fiber_g,
          portion_g: basisAmount,
          portion_unit: portionUnit,
          micros: manualMicros,
        })
      }
    }
    setFormError(null)
    addMeal.mutate(savePayload(), { onSuccess: onClose })
  }

  /**
   * Продукт из справочника с пересчётом на съеденное. КБЖУ продукта относятся к его
   * сохранённой порции; если она неизвестна, пересчитывать не от чего — добавляем как есть.
   */
  const addProduct = (product: Product, amount: number | null) => {
    const basis = product.portion_g ?? 0
    const factor = portionFactor(basis, amount)
    const scale = (value: number | null) =>
      value === null ? null : roundTo(value * factor, 1)
    addMeal.mutate(
      {
        name: product.name,
        calories_kcal: scale(product.calories_kcal),
        protein_g: scale(product.protein_g) ?? 0,
        fat_g: scale(product.fat_g),
        carbs_g: scale(product.carbs_g),
        fiber_g: scale(product.fiber_g),
        portion_g: basis > 0 ? (amount ?? basis) : product.portion_g,
        portion_unit: product.portion_unit,
        micros: Object.fromEntries(
          Object.entries(product.micros).map(([key, value]) => [key, roundTo(value * factor, 3)]),
        ),
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
          setParsedItems(result.items)
          setParsedName(result.name)
        },
      },
    )
  }

  const runMicroEstimate = () => {
    if (!manual.name.trim()) {
      setFormError('Сначала укажите название — иначе ИИ нечего оценивать')
      return
    }
    setFormError(null)
    estimateMicros.mutate(
      {
        name: manual.name.trim(),
        portion_g: toNumber(manual.portion),
        calories_kcal: toNumber(manual.kcal),
        protein_g: toNumber(manual.protein),
        fat_g: toNumber(manual.fat),
        carbs_g: toNumber(manual.carbs),
      },
      {
        onSuccess: (result) => {
          setManualMicros(result.micros)
          // Клетчатку модель считает заодно; своё значение пользователя не трогаем.
          if (!toNumber(manual.fiber) && result.fiber_g) {
            setManual((form) => ({ ...form, fiber: String(result.fiber_g) }))
          }
        },
      },
    )
  }

  /** Ответ модели по фото упаковки — в форму целиком: за этим кнопку и нажимают. */
  const applyLabel = (result: AiLabelResult) => {
    // Без порции на упаковке таблица дана на 100 г — с ней форма и остаётся согласованной.
    const portion = result.portion_g ?? 100
    setManual({
      name: result.name,
      portion: String(portion),
      eaten: String(portion),
      kcal: String(result.calories_kcal),
      protein: String(result.protein_g),
      fat: String(result.fat_g),
      carbs: String(result.carbs_g),
      fiber: result.fiber_g ? String(result.fiber_g) : '',
    })
    setPortionUnit(result.portion_unit)
    setManualMicros(result.micros)
    setLabelPer100(result.per100)
    setFormError(null)
  }

  const runLabelParse = (imageBase64: string) => {
    setFormError(null)
    parseLabel.mutate({ image_base64: imageBase64 }, { onSuccess: applyLabel })
  }

  const onPortionChange = (portion: string) => {
    setManual((form) => ({ ...form, portion }))
    if (!labelPer100) return
    const grams = toNumber(portion)
    if (grams === null) return
    const scaled = portionFromPer100(labelPer100, grams)
    setManual((form) => ({
      ...form,
      portion,
      kcal: String(roundTo(scaled.calories_kcal)),
      protein: String(scaled.protein_g),
      fat: String(scaled.fat_g),
      carbs: String(scaled.carbs_g),
      fiber: scaled.fiber_g ? String(roundTo(scaled.fiber_g, 1)) : '',
    }))
    setManualMicros(scaled.micros)
  }

  /** Правка КБЖУ руками отменяет автопересчёт: дальше в форме цифры пользователя. */
  const setMacro = (key: keyof ManualForm) => (value: string) => {
    setManual((form) => ({ ...form, [key]: value }))
    setLabelPer100(null)
  }

  const footerLabel = totals
    ? `Сохранить ${num(totals.calories_kcal)} ккал`
    : mode === 'manual' && manualEaten.calories_kcal
      ? `Сохранить ${num(manualEaten.calories_kcal)} ккал`
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
            <PhotoButton
              label="Фото"
              disabled={parseMeal.isPending}
              onPick={runParse}
              onError={setFormError}
            />
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

          {parseMeal.isError && <ErrorNote message={parseMeal.error.message} />}

          {items && items.length > 0 && (
            <>
              <p className="ai-note">
                <Icon name="sparkle" size={14} weight="fill" color="var(--color-accent)" />
                ИИ разобрал — проверьте состав и граммовку
              </p>
              {/* Название даёт модель, но состав можно поправить — тогда «омлет
                  с тостом» без тоста надо уметь переименовать. */}
              <Field label="Название блюда" value={parsedName} onChange={setParsedName} />
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
                  {/* ИИ часто добавляет то, чего в тарелке не было: гарнир, соус, хлеб. */}
                  <button
                    type="button"
                    className="parsed-item__remove"
                    aria-label={`Убрать ${item.name} из разбора`}
                    onClick={() =>
                      setItems((current) =>
                        (current ?? []).filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                  >
                    <Icon name="trash" size={13} />
                  </button>
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
              {saveAsProduct && (
                <p className="footnote">
                  Витамины и минералы ИИ уже оценил при разборе — они сохранятся вместе
                  с продуктом.
                </p>
              )}
            </>
          )}

          {/* Живёт вне списка: последнюю позицию тоже можно убрать, и вернуть её
              должно быть чем — иначе остаётся только повторный вызов модели. */}
          {removedCount > 0 && (
            <button
              type="button"
              className="link-btn parsed-restore"
              onClick={() => setItems(parsedItems)}
            >
              Вернуть убранное ({removedCount})
            </button>
          )}

          {items && items.length === 0 && (
            <ErrorNote
              message={
                removedCount > 0
                  ? 'Вы убрали все позиции. Верните что-нибудь из разбора или опишите блюдо заново.'
                  : 'ИИ не нашёл в описании ни одного продукта. Попробуйте описать подробнее или введите вручную.'
              }
            />
          )}
        </>
      )}

      {mode === 'search' && (
        <>
          <div className="search-field">
            <Icon name="magnifying-glass" size={15} color="var(--color-neutral-600)" />
            <input
              value={query}
              maxLength={100}
              placeholder="Поиск по своим продуктам"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {picked && (
            <div className="picked-product">
              <div className="picked-product__head">
                <span className="result-card__name">{picked.name}</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setPicked(null)}
                >
                  Отмена
                </button>
              </div>
              <p className="footnote">
                Данные сохранены на {num(picked.portion_g ?? 0)} {picked.portion_unit} ·{' '}
                {num(picked.calories_kcal ?? 0)} ккал.
              </p>
              <div className="portion-field">
                <Field
                  label={`Съел сейчас, ${picked.portion_unit}`}
                  value={pickedAmount}
                  mono
                  accent
                  inputMode="decimal"
                  onChange={setPickedAmount}
                />
                <div className="field">
                  <span className="field__label">Засчитаем</span>
                  <div className="field__input serving-unit mn">
                    {num(
                      (picked.calories_kcal ?? 0) *
                        ((toNumber(pickedAmount) ?? picked.portion_g ?? 0) /
                          (picked.portion_g || 1)),
                    )}{' '}
                    ккал
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--sm btn--accent btn--block"
                style={{ marginTop: 10 }}
                disabled={addMeal.isPending}
                onClick={() => addProduct(picked, toNumber(pickedAmount))}
              >
                {addMeal.isPending ? 'Добавляю…' : 'Добавить в день'}
              </button>
            </div>
          )}

          <div className="sheet-section">
            {isFetching && <p className="footnote">Ищем…</p>}
            {searchError && <ErrorNote message={searchError.message} />}
            {!isFetching && !searchError && products.length === 0 && (
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
                onClick={() => {
                  // Порция продукта известна — спрашиваем, сколько съели; иначе добавляем как есть.
                  if (product.portion_g) {
                    setPicked(product)
                    setPickedAmount(String(product.portion_g))
                  } else {
                    addProduct(product, null)
                  }
                }}
              >
                <div className="result-card__body">
                  <div className="result-card__name">{product.name}</div>
                  <div className="result-card__detail">
                    Б{num(product.protein_g)}
                    {product.fat_g !== null ? ` Ж${num(product.fat_g)}` : ''}
                    {product.carbs_g !== null ? ` У${num(product.carbs_g)}` : ''}
                    {product.portion_g ? ` · ${num(product.portion_g)} ${product.portion_unit}` : ''}
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
          <div className="ai-actions">
            <PhotoButton
              accent
              label={parseLabel.isPending ? 'Читаю этикетку…' : 'Состав с фото'}
              disabled={parseLabel.isPending}
              onPick={runLabelParse}
              onError={setFormError}
            />
          </div>
          <p className="footnote">
            Снимите таблицу пищевой ценности на упаковке — ИИ заполнит форму сам.
          </p>
          {parseLabel.isError && <ErrorNote message={parseLabel.error.message} />}
          {parseLabel.data && (
            <p className="ai-note">
              <Icon name="sparkle" size={14} weight="fill" color="var(--color-accent)" />
              С упаковки ·{' '}
              {CONFIDENCE_LABELS[parseLabel.data.confidence] ?? 'точность неизвестна'}
              {parseLabel.data.comment ? ` · ${parseLabel.data.comment}` : ''}
            </p>
          )}

          <Field
            label="Название блюда"
            value={manual.name}
            onChange={(name) => setManual((form) => ({ ...form, name }))}
            placeholder="Например, творог с ягодами"
          />
          <PortionField
            label="Данные указаны на"
            value={manual.portion}
            unit={portionUnit}
            onChange={onPortionChange}
            onUnitChange={setPortionUnit}
          />
          <p className="footnote">
            {labelPer100
              ? `Состав снят с упаковки на 100 ${portionUnit} — поменяйте это число, и КБЖУ пересчитается.`
              : `Столько, на сколько написаны КБЖУ ниже: порция с упаковки или 100 ${portionUnit}.`}
          </p>
          <div className="manual-grid">
            <Field
              label="Ккал"
              value={manual.kcal}
              mono
              accent
              inputMode="decimal"
              onChange={setMacro('kcal')}
            />
            <Field
              label="Белки, г"
              value={manual.protein}
              mono
              inputMode="decimal"
              onChange={setMacro('protein')}
            />
            <Field
              label="Жиры, г"
              value={manual.fat}
              mono
              inputMode="decimal"
              onChange={setMacro('fat')}
            />
            <Field
              label="Углеводы, г"
              value={manual.carbs}
              mono
              inputMode="decimal"
              onChange={setMacro('carbs')}
            />
            <Field
              label="Клетчатка, г"
              value={manual.fiber}
              mono
              inputMode="decimal"
              onChange={setMacro('fiber')}
            />
          </div>
          <section className="sheet-section">
            <h3 className="section-label sheet-section__label">Сколько съедено</h3>
            <div className="portion-field">
              <Field
                label={`Съел сейчас, ${portionUnit}`}
                value={manual.eaten}
                mono
                accent
                inputMode="decimal"
                onChange={(eaten) => setManual((form) => ({ ...form, eaten }))}
              />
              <div className="field">
                <span className="field__label">Засчитаем</span>
                <div className="field__input serving-unit mn">
                  {num(manualEaten.calories_kcal ?? 0)} ккал
                </div>
              </div>
            </div>
            <p className="footnote">
              {eatenFactor === 1
                ? 'Пусто — засчитаем ровно ту порцию, на которую указаны данные.'
                : `Это ${Math.round(eatenFactor * 100)}% от указанной порции: Б${num(
                    manualEaten.protein_g,
                    1,
                  )} Ж${num(manualEaten.fat_g ?? 0, 1)} У${num(manualEaten.carbs_g ?? 0, 1)}.`}
            </p>
          </section>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={saveAsProduct}
              onChange={(event) => setSaveAsProduct(event.target.checked)}
            />
            Сохранить как своё блюдо для повторов
          </label>
          {saveAsProduct && (
            <p className="footnote">
              В справочник попадёт порция-основа, а не сегодняшняя: {num(basisAmount ?? 0)}{' '}
              {portionUnit} и КБЖУ на неё.
            </p>
          )}

          {/* Форму состава предлагаем там, где она окупается: продукт сохраняется
              надолго, и без витаминов он будет портить отчёт при каждом повторе. */}
          {(saveAsProduct || Object.keys(manualMicros).length > 0) && (
          <section className="sheet-section">
            <div className="sheet-section__head">
              <h3 className="section-label">Витамины и минералы</h3>
              <button
                type="button"
                className="btn btn--sm btn--accent"
                disabled={estimateMicros.isPending}
                onClick={runMicroEstimate}
              >
                <Icon name="sparkle" size={13} color="var(--color-accent-300)" />
                {estimateMicros.isPending ? 'Оцениваю…' : 'Заполнить ИИ'}
              </button>
            </div>

            <MicrosEditor
              value={manualMicros}
              onChange={setManualMicros}
              disabled={estimateMicros.isPending}
            />

            {estimateMicros.isError && <ErrorNote message={estimateMicros.error.message} />}
            {estimateMicros.data && (
              <p className="footnote">
                Оценка ИИ на {num(estimateMicros.data.portion_g)} г ·{' '}
                {CONFIDENCE_LABELS[estimateMicros.data.confidence] ?? 'точность неизвестна'}
                {estimateMicros.data.comment ? ` · ${estimateMicros.data.comment}` : ''}
              </p>
            )}
            <p className="footnote">
              Это оценка, а не лабораторный анализ. Без неё блюдо попадёт в отчёт только
              по КБЖУ и снизит «покрытие данными».
            </p>
          </section>
          )}
        </>
      )}

      {formError && <ErrorNote message={formError} />}
      {addMeal.isError && <ErrorNote message={addMeal.error.message} />}
    </Sheet>
  )
}
