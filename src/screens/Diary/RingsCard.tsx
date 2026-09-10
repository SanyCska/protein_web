import type { DayTotals, Norms } from '@/api/types'
import { Bar, Card } from '@/components/primitives'
import { clamp, num } from '@/lib/format'
import './diary.css'

const SIZE = 116
const CENTER = SIZE / 2

interface Ring {
  radius: number
  width: number
  color: string
  percent: number
  label: string
}

function RingArc({ ring }: { ring: Ring }) {
  const circumference = 2 * Math.PI * ring.radius
  const filled = (clamp(ring.percent, 0, 100) / 100) * circumference
  return (
    <>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={ring.radius}
        fill="none"
        stroke="var(--color-neutral-900)"
        strokeWidth={ring.width}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={ring.radius}
        fill="none"
        stroke={ring.color}
        strokeWidth={ring.width}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 400ms ease-out' }}
      />
    </>
  )
}

function MacroColumn({
  label,
  value,
  norm,
  unit,
  color,
}: {
  label: string
  value: number
  norm: number
  unit: string
  color: string
}) {
  const percent = norm > 0 ? (value / norm) * 100 : 0
  return (
    <div>
      <div>
        <span className="macro-grid__label">{label} </span>
        <span className="macro-grid__norm mn">/{num(norm)}</span>
      </div>
      <div className="macro-grid__value mn">
        {num(value)}
        <span style={{ fontSize: 10, color: 'var(--color-neutral-600)' }}> {unit}</span>
      </div>
      <div style={{ marginTop: 5 }}>
        <Bar percent={percent} color={color} height={4} />
      </div>
    </div>
  )
}

export function RingsCard({ totals, norms }: { totals: DayTotals; norms: Norms }) {
  const rings: Ring[] = [
    {
      radius: 51,
      width: 7,
      color: 'var(--color-accent)',
      percent: norms.calories > 0 ? (totals.calories_eaten / norms.calories) * 100 : 0,
      label: 'Калории',
    },
    {
      radius: 40,
      width: 6,
      color: 'var(--color-accent-400)',
      percent: norms.fat_g > 0 ? (totals.fat_g / norms.fat_g) * 100 : 0,
      label: 'Жиры',
    },
    {
      radius: 30,
      width: 6,
      color: 'var(--color-accent-700)',
      percent: norms.carbs_g > 0 ? (totals.carbs_g / norms.carbs_g) * 100 : 0,
      label: 'Углеводы',
    },
  ]

  const lines: { label: string; value: string; color: string }[] = [
    { label: 'Съедено', value: num(totals.calories_eaten), color: 'var(--color-text)' },
    {
      // Без минуса: расход не вычитается из съеденного, он идёт справочной строкой.
      label: 'Нагрузка',
      value: num(totals.calories_burned),
      color: 'var(--color-accent-400)',
    },
    { label: 'Норма', value: num(norms.calories), color: 'var(--color-neutral-400)' },
    {
      label: 'Баланс дня',
      value: totals.balance_vs_norm > 0 ? `+${num(totals.balance_vs_norm)}` : num(totals.balance_vs_norm),
      color: 'var(--color-accent-300)',
    },
  ]

  return (
    <Card style={{ padding: 17 }}>
      <div className="rings">
        <svg
          className="rings__svg"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={rings
            .map((ring) => `${ring.label}: ${Math.round(ring.percent)}% нормы`)
            .join(', ')}
        >
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {rings.map((ring) => (
              <RingArc key={ring.label} ring={ring} />
            ))}
          </g>
          <text
            className="rings__center-value"
            x={CENTER}
            y={CENTER + 2}
            textAnchor="middle"
          >
            {num(totals.calories_remaining)}
          </text>
          <text className="rings__center-label" x={CENTER} y={CENTER + 16} textAnchor="middle">
            ккал ост.
          </text>
        </svg>

        <div className="rings__lines">
          {lines.map((line) => (
            <div key={line.label} className="rings__line">
              <span className="rings__line-label">{line.label}</span>
              <span className="rings__line-value mn" style={{ color: line.color }}>
                {line.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="macro-grid">
        <MacroColumn
          label="Белки"
          value={totals.protein_g}
          norm={norms.protein_g}
          unit="г"
          color="var(--color-accent)"
        />
        <MacroColumn
          label="Жиры"
          value={totals.fat_g}
          norm={norms.fat_g}
          unit="г"
          color="var(--color-accent-400)"
        />
        <MacroColumn
          label="Углеводы"
          value={totals.carbs_g}
          norm={norms.carbs_g}
          unit="г"
          color="var(--color-accent-700)"
        />
      </div>
    </Card>
  )
}
