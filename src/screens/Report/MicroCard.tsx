import { useState } from 'react'

import type { NutrientRow as NutrientRowData } from '@/api/types'
import { Card, CardHead, Chip, NutrientRow } from '@/components/primitives'
import './report.css'

type Filter = 'deficit' | 'ok' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'deficit', label: 'Дефицит' },
  { key: 'ok', label: 'Норма+' },
  { key: 'all', label: 'Все' },
]

const LEGEND = [
  { color: 'var(--color-neutral-700)', label: 'меньше 70%' },
  { color: 'var(--color-accent-700)', label: '70–95%' },
  { color: 'var(--color-accent-400)', label: '95% и выше' },
]

function applyFilter(rows: NutrientRowData[], filter: Filter): NutrientRowData[] {
  if (filter === 'deficit') return rows.filter((row) => row.pct < 80)
  if (filter === 'ok') return rows.filter((row) => row.pct >= 80)
  return rows
}

export function MicroCard({
  rows,
  coverage,
  subtitle,
}: {
  rows: NutrientRowData[]
  coverage: number
  subtitle?: string
}) {
  const [filter, setFilter] = useState<Filter>('deficit')
  const visible = applyFilter(rows, filter)

  return (
    <Card>
      <CardHead
        title="Витамины и минералы"
        meta={`${visible.length} из ${rows.length}`}
      />

      <div className="micro-filters" role="group" aria-label="Фильтр нутриентов">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            selected={item.key === filter}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="coverage-note">
          {filter === 'deficit'
            ? 'Ни одного дефицита — всё в норме.'
            : 'Ничего не подходит под фильтр.'}
        </p>
      ) : (
        visible.map((row) => (
          <NutrientRow
            key={row.key}
            name={row.name}
            value={row.value}
            norm={row.norm}
            unit={row.unit}
            percent={row.pct}
          />
        ))
      )}

      <div className="micro-legend">
        {LEGEND.map((item) => (
          <span key={item.label} className="micro-legend__item">
            <span className="micro-legend__marker" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      {coverage < 1 && (
        <p className="coverage-note">
          Микронутриенты известны только у {Math.round(coverage * 100)}% записей
          {subtitle ? ` ${subtitle}` : ''}. Блюда, внесённые вручную без разбора, в этих цифрах
          не учитываются — реальные значения выше.
        </p>
      )}
    </Card>
  )
}
