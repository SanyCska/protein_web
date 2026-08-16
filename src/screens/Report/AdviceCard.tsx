import type { Deficit } from '@/api/types'
import { Icon } from '@/components/Icon'
import { Card, CardHead } from '@/components/primitives'
import { nutrientValue } from '@/lib/format'
import './report.css'

export function AdviceCard({
  deficits,
  onAddSupplement,
}: {
  deficits: Deficit[]
  onAddSupplement: () => void
}) {
  if (deficits.length === 0) {
    return (
      <Card accent>
        <CardHead
          title={
            <>
              <Icon name="lightbulb" size={15} weight="fill" color="var(--color-accent)" />
              Всё добрано
            </>
          }
        />
        <p className="advice__text">
          По имеющимся данным недоборов нет. Если блюда вносились вручную без разбора состава,
          картина может быть неполной.
        </p>
      </Card>
    )
  }

  return (
    <Card accent>
      <CardHead
        title={
          <>
            <Icon name="lightbulb" size={15} weight="fill" color="var(--color-accent)" />
            Что стоит добрать
          </>
        }
      />

      {deficits.map((item) => (
        <div key={item.key} className="advice">
          <div className="advice__head">
            <span className="advice__name">{item.name}</span>
            <span className="advice__gap">
              −{nutrientValue(item.gap)} {item.unit}
            </span>
          </div>
          <p className="advice__text">{item.advice}</p>
          {item.sources.length > 0 && (
            <p className="advice__sources">Где взять: {item.sources.join(', ')}.</p>
          )}
        </div>
      ))}

      <div className="sheet__footer">
        <button type="button" className="btn btn--sm btn--neutral btn--block" onClick={onAddSupplement}>
          Добавить в добавки
        </button>
      </div>
    </Card>
  )
}
