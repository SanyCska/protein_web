import { useState } from 'react'

import { useDeleteWeight, useProfile, useSetWeight } from '@/api/hooks'
import { Card, CardHead, ErrorNote, Field } from '@/components/primitives'
import { num, toNumber } from '@/lib/format'
import './diary.css'

/** Границы те же, что на сервере: ниже 25 и выше 350 кг — опечатка, а не вес. */
const MIN = 25
const MAX = 350

/**
 * Взвешивание за день. Живёт в дневнике, а не в профиле: вес меряют утром вместе
 * с остальными записями дня, и ради него не должно приходиться идти в настройки.
 */
export function WeightCard({ day, weight }: { day: string; weight: number | null }) {
  const { data: profile } = useProfile()
  const setWeight = useSetWeight(day)
  const deleteWeight = useDeleteWeight(day)

  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = () => {
    setError(null)
    // Подставляем последний известный вес: обычно правка — это десятые доли.
    setDraft(String(weight ?? profile?.weight_kg ?? ''))
  }

  const save = () => {
    const value = toNumber(draft ?? '')
    if (value === null || value < MIN || value > MAX) {
      setError(`Вес должен быть от ${MIN} до ${MAX} кг`)
      return
    }
    setError(null)
    setWeight.mutate(value, { onSuccess: () => setDraft(null) })
  }

  const busy = setWeight.isPending || deleteWeight.isPending

  return (
    <Card>
      <CardHead
        title="Вес"
        meta={
          draft === null ? (
            <button type="button" className="link-btn" onClick={open}>
              {weight === null ? 'Записать' : 'Изменить'}
            </button>
          ) : undefined
        }
      />

      {draft === null ? (
        <div className="weight-card__value">
          {weight === null ? (
            <span className="footnote">
              За этот день не записан. Взвешиваться лучше утром натощак — так цифры
              сравнимы между собой.
            </span>
          ) : (
            <>
              <span className="norm-card__value">{num(weight, 1)}</span>
              <span className="norm-card__unit">кг</span>
            </>
          )}
        </div>
      ) : (
        <>
          <Field
            label="Вес, кг"
            value={draft}
            onChange={setDraft}
            mono
            accent
            inputMode="decimal"
          />
          <div className="weight-card__actions">
            <button
              type="button"
              className="btn btn--sm btn--neutral"
              onClick={() => {
                setDraft(null)
                setError(null)
              }}
            >
              Отмена
            </button>
            {weight !== null && (
              <button
                type="button"
                className="btn btn--sm btn--neutral"
                disabled={busy}
                onClick={() =>
                  deleteWeight.mutate(undefined, { onSuccess: () => setDraft(null) })
                }
              >
                Удалить
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm btn--accent"
              disabled={busy}
              onClick={save}
            >
              {setWeight.isPending ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
          {error && <ErrorNote message={error} />}
          <p className="footnote">
            Свежее взвешивание становится весом профиля: от него считаются нормы и расход
            на нагрузке.
          </p>
        </>
      )}
    </Card>
  )
}
