import { useState } from 'react'

import { useDeleteSteps, useSetSteps } from '@/api/hooks'
import { Card, CardHead, ErrorNote, Field } from '@/components/primitives'
import { num, toNumber } from '@/lib/format'
import './diary.css'

/** Граница та же, что на сервере: двести тысяч шагов за день — опечатка, а не прогулка. */
const MAX = 200000

/**
 * Шаги за день. Рядом с весом и по тем же правилам: одна запись на день, правится
 * и удаляется. В расход калорий не идут — его считают записи тренировок, и приписывать
 * туда же шаги значило бы посчитать одну и ту же прогулку дважды.
 */
export function StepsCard({ day, steps }: { day: string; steps: number | null }) {
  const setSteps = useSetSteps(day)
  const deleteSteps = useDeleteSteps(day)

  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const value = toNumber(draft ?? '')
    if (value === null || value > MAX) {
      setError(`Шагов должно быть от 0 до ${num(MAX)}`)
      return
    }
    setError(null)
    setSteps.mutate(Math.round(value), { onSuccess: () => setDraft(null) })
  }

  const busy = setSteps.isPending || deleteSteps.isPending

  return (
    <Card>
      <CardHead
        title="Шаги"
        meta={
          draft === null ? (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setError(null)
                setDraft(steps === null ? '' : String(steps))
              }}
            >
              {steps === null ? 'Записать' : 'Изменить'}
            </button>
          ) : undefined
        }
      />

      {draft === null ? (
        <div className="weight-card__value">
          {steps === null ? (
            <span className="footnote">
              За этот день не записаны. Перенесите число из часов или телефона — в отчёте
              появится график и среднее за период.
            </span>
          ) : (
            <>
              <span className="norm-card__value">{num(steps)}</span>
              <span className="norm-card__unit">шагов</span>
            </>
          )}
        </div>
      ) : (
        <>
          <Field
            label="Шагов за день"
            value={draft}
            onChange={setDraft}
            mono
            accent
            inputMode="numeric"
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
            {steps !== null && (
              <button
                type="button"
                className="btn btn--sm btn--neutral"
                disabled={busy}
                onClick={() => deleteSteps.mutate(undefined, { onSuccess: () => setDraft(null) })}
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
              {setSteps.isPending ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
          {error && <ErrorNote message={error} />}
        </>
      )}
    </Card>
  )
}
