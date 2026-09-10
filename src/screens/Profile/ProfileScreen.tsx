import {
  useAddWorkout,
  useDeleteProduct,
  useDeleteSupplements,
  useDeleteTemplate,
  useEstimateProducts,
  useProducts,
  useProfile,
  useSaveProfile,
  useSupplements,
  useTemplates,
} from '@/api/hooks'
import { useState } from 'react'

import { useUi } from '@/app/store'
import { Icon } from '@/components/Icon'
import {
  Card,
  CardHead,
  ErrorNote,
  Field,
  LoadingScreen,
  Segment,
  Tile,
} from '@/components/primitives'
import { haptic } from '@/api/telegram'
import { doseValue, minutesLabel, nowTime, num, toNumber, today } from '@/lib/format'
import { groupSupplements, servingRatioLabel, substancesLabel } from '@/lib/supplements'
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

/** Границы своей нормы совпадают с серверными: ниже 800 это уже не диета, выше 8000 — опечатка. */
const NORM_MIN = 800
const NORM_MAX = 8000

export function ProfileScreen() {
  const openSheet = useUi((state) => state.openSheet)
  // Строка — значит норму правят прямо на карточке; null — показываем её как есть.
  const [normDraft, setNormDraft] = useState<string | null>(null)
  const [normError, setNormError] = useState<string | null>(null)

  const { data: profile, isLoading, error } = useProfile()
  const { data: supplements = [] } = useSupplements()
  const { data: templates = [] } = useTemplates()
  const { data: products = [] } = useProducts('')

  const saveProfile = useSaveProfile()
  const deleteSupplements = useDeleteSupplements()
  const deleteTemplate = useDeleteTemplate()
  const deleteProduct = useDeleteProduct()
  const estimateProducts = useEstimateProducts()
  // Из профиля тренировка всегда идёт в сегодняшний день: выбранный в дневнике день здесь не виден.
  const addWorkout = useAddWorkout(today())

  if (isLoading) return <LoadingScreen label="Загружаем профиль" />
  if (error) return <ErrorNote message={error.message} />
  if (!profile) return null

  const { norms } = profile
  const manualNorm = norms.calories_source === 'manual'
  const withoutMicros = products.filter((product) => Object.keys(product.micros).length === 0)

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
<CardHead
          title={manualNorm ? 'Своя норма' : 'Расчётная норма'}
          meta={
            normDraft === null ? (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setNormError(null)
                  setNormDraft(String(Math.round(norms.calories)))
                }}
              >
                {manualNorm ? 'Изменить' : 'Задать свою'}
              </button>
            ) : undefined
          }
        />

        {normDraft === null ? (
          <div>
            <span className="norm-card__value">{num(norms.calories)}</span>
            <span className="norm-card__unit">ккал / день</span>
          </div>
        ) : (
          <div className="norm-edit">
            <Field
              label="Ккал в день"
              value={normDraft}
              onChange={setNormDraft}
              mono
              accent
              inputMode="numeric"
            />
            <div className="norm-edit__actions">
              <button
                type="button"
                className="btn btn--sm btn--neutral"
                onClick={() => {
                  setNormDraft(null)
                  setNormError(null)
                }}
              >
                Отмена
              </button>
              {manualNorm && (
                <button
                  type="button"
                  className="btn btn--sm btn--neutral"
                  disabled={saveProfile.isPending}
                  onClick={() => {
                    setNormDraft(null)
                    setNormError(null)
                    saveProfile.mutate({ calories_override: null })
                  }}
                >
                  Вернуть расчётную
                </button>
              )}
              <button
                type="button"
                className="btn btn--sm btn--accent"
                disabled={saveProfile.isPending}
                onClick={() => {
                  const value = toNumber(normDraft)
                  if (value === null || value < NORM_MIN || value > NORM_MAX) {
                    setNormError(`Норма должна быть от ${NORM_MIN} до ${NORM_MAX} ккал`)
                    return
                  }
                  setNormError(null)
                  saveProfile.mutate(
                    { calories_override: value },
                    { onSuccess: () => setNormDraft(null) },
                  )
                }}
              >
                {saveProfile.isPending ? 'Сохраняю…' : 'Сохранить'}
              </button>
            </div>
            {normError && <ErrorNote message={normError} />}
            <p className="footnote">
              Заменяет только калории: белок и жиры остаются привязаны к весу, а разницу
              забирают углеводы. Формула даёт {num(norms.calories_computed)} ккал.
            </p>
          </div>
        )}

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
          {manualNorm ? (
            <>
              Норма задана вручную. Формула для ваших параметров даёт{' '}
              {num(norms.calories_computed)} ккал, разницу забирают углеводы. Нагрузка
              норму не поднимает — она идёт отдельной строкой и графиком.
            </>
          ) : (
            <>
              BMR {num(norms.bmr)} ккал × {norms.activity_factor.toFixed(2)} активности,{' '}
              {GOAL_NOTE[profile.goal]}. Нагрузка норму не поднимает — она идёт отдельной
              строкой и графиком.
            </>
          )}
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
          // Банка — одна строка, даже если веществ в ней десяток: состав раскрывается
          // под названием, а удаляется она целиком.
          groupSupplements(supplements).map((group) => {
            const single = group.items.length === 1 ? group.items[0] : null
            return (
              <div
                key={group.key}
                className={
                  group.active ? 'supplement-row' : 'supplement-row supplement-row--inactive'
                }
              >
                {/* Карточка целиком открывает правку: тапают и по названию, и по составу,
                    и по дозе — угадывать, где именно нажать, пользователь не должен. */}
                <button
                  type="button"
                  className="supplement-row__open"
                  onClick={() => openSheet('supplement', { supplementKey: group.key })}
                >
                  <Icon name="pill" size={15} color="var(--color-accent)" />
                  <span className="supplement-row__body">
                    <span className="supplement-row__name">
                      {group.name}
                      <Icon name="caret-right" size={11} color="var(--color-neutral-600)" />
                    </span>
                    <span className="supplement-row__meta">
                      {group.whenLabel ?? 'в любое время'}
                      {group.frequency === 'every_other_day' && ' · через день'}
                      {group.frequency === 'course' && ' · курс'}
                      {/* Доза на этикетке и приём различаются — в отчёт идёт доля. */}
                      {servingRatioLabel(group) && ` · ${servingRatioLabel(group)}`}
                      {!group.active && ' · выключена'}
                    </span>
                    {!single && (
                      <span className="supplement-row__parts">
                        {group.items.map((item) => (
                          <span className="supplement-row__part" key={item.id}>
                            <span>{item.name}</span>
                            <span className="mn">
                              {doseValue(item.effective_dose)} {item.unit}
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="supplement-row__dose">
                    {single
                      ? `${doseValue(single.effective_dose)} ${single.unit}`
                      : substancesLabel(group.items.length)}
                  </span>
                </button>
                <button
                  type="button"
                  className="supplement-row__remove"
                  aria-label={`Удалить ${group.name}`}
                  onClick={() => {
                    if (single || window.confirm(`Удалить «${group.name}» со всем составом?`)) {
                      deleteSupplements.mutate(group.ids)
                    }
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            )
          })
        )}
        <p className="footnote">
          Учитываются в дневной норме и в отчётах по микронутриентам. Тап по добавке —
          поправить состав, дозы и долю приёма.
        </p>
      </Card>

      <Card>
        <CardHead
          title="Свои продукты"
          meta={
            withoutMicros.length > 0 ? (
              <button
                type="button"
                className="link-btn"
                disabled={estimateProducts.isPending}
                onClick={() => estimateProducts.mutate(undefined)}
              >
                {estimateProducts.isPending
                  ? 'Оцениваю…'
                  : `Оценить состав (${withoutMicros.length})`}
              </button>
            ) : undefined
          }
        />
        {products.length === 0 ? (
          <p className="footnote">
            Пока пусто. Отметьте «сохранить как своё блюдо» при добавлении — продукт
            появится здесь и в поиске.
          </p>
        ) : (
          products.map((product) => {
            const known = Object.keys(product.micros).length
            return (
              <div className="product-row" key={product.id}>
                <div className="product-row__body">
                  <div className="product-row__name">{product.name}</div>
                  <div className="product-row__meta">
                    {product.calories_kcal !== null ? `${num(product.calories_kcal)} ккал` : 'без ккал'}
                    {product.portion_g ? ` · ${num(product.portion_g)} ${product.portion_unit}` : ''}
                    {known ? ` · ${known} нутриентов` : ' · состав неизвестен'}
                  </div>
                </div>
                <button
                  type="button"
                  className="supplement-row__remove"
                  aria-label={`Удалить ${product.name}`}
                  onClick={() => {
                    if (window.confirm(`Удалить продукт «${product.name}»?`)) {
                      deleteProduct.mutate(product.id)
                    }
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            )
          })
        )}
        {estimateProducts.isError && <ErrorNote message={estimateProducts.error.message} />}
        {estimateProducts.data && (
          <p className="footnote">
            {estimateProducts.data.error
              ? `ИИ недоступен: ${estimateProducts.data.error}`
              : `Оценено продуктов: ${estimateProducts.data.updated.length}.`}
            {estimateProducts.data.failed > 0 &&
              ` Не удалось разобрать: ${estimateProducts.data.failed}.`}
            {estimateProducts.data.remaining > 0 &&
              ` Осталось без состава: ${estimateProducts.data.remaining} — запустите ещё раз.`}
          </p>
        )}
        <p className="footnote">
          Состав нужен, чтобы продукт приносил в отчёт витамины и минералы, а не только КБЖУ.
        </p>
      </Card>

      <Card>
        <CardHead title="Шаблоны нагрузки" meta="тап — добавить в сегодня" />
        <div className="template-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-tile">
              <button
                type="button"
                className="template-tile__main"
                disabled={addWorkout.isPending}
                onClick={() => {
                  haptic()
                  addWorkout.mutate({
                    kind: template.kind,
                    minutes: template.minutes,
                    done_at: nowTime(),
                  })
                }}
              >
                <Icon name={template.icon} size={16} color="var(--color-accent)" />
                <span className="template-tile__name">{template.name}</span>
                <span className="template-tile__meta">
                  {minutesLabel(template.minutes)} · −{num(template.kcal)}
                </span>
              </button>
              {/* Долгий тап в iOS-вебвью не даёт contextmenu — удаление только явной кнопкой. */}
              <button
                type="button"
                className="template-tile__remove"
                aria-label={`Удалить шаблон ${template.name}`}
                onClick={() => {
                  if (window.confirm(`Удалить шаблон «${template.name}»?`)) {
                    deleteTemplate.mutate(template.id)
                  }
                }}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
        {addWorkout.isError && <ErrorNote message={addWorkout.error.message} />}
        {addWorkout.isSuccess && (
          <p className="footnote">Тренировка добавлена в сегодняшний день.</p>
        )}
        {deleteTemplate.isError && <ErrorNote message={deleteTemplate.error.message} />}
        <p className="footnote">Расход пересчитывается по вашему текущему весу.</p>
      </Card>
    </>
  )
}
