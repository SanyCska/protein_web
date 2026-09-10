import { useDayReport, usePeriodReport } from '@/api/hooks'
import { useUi } from '@/app/store'
import {
  Bar,
  Card,
  CardHead,
  ErrorNote,
  LoadingScreen,
  Segment,
  Tile,
  ValueWithNorm,
} from '@/components/primitives'
import { num, shortDate } from '@/lib/format'
import { barColor } from '@/lib/nutrition'
import type { MacroRow } from '@/api/types'
import { AdviceCard } from './AdviceCard'
import { MicroCard } from './MicroCard'
import './report.css'

const PERIODS = [
  { value: 'day' as const, label: 'День' },
  { value: 'week' as const, label: 'Неделя' },
  { value: 'month' as const, label: 'Месяц' },
]

function MacroRowView({ row }: { row: MacroRow }) {
  const color = barColor(row.pct)
  return (
    <div className="macro-row">
      <div className="macro-row__head">
        <span className="macro-row__name">{row.name}</span>
        <ValueWithNorm value={row.value} norm={row.norm} unit={row.unit} color={color} />
      </div>
      <Bar percent={row.pct} color={color} height={5} />
    </div>
  )
}

function DayReport({ day, onAddSupplement }: { day: string; onAddSupplement: () => void }) {
  const { data, isLoading, error } = useDayReport(day)

  if (isLoading) return <LoadingScreen label="Считаем отчёт за день" />
  if (error) return <ErrorNote message={error.message} />
  if (!data) return null

  return (
    <>
      <Card>
        <CardHead title="Калории и БЖУ" meta={shortDate(day)} />
        {data.macros.map((row) => (
          <MacroRowView key={row.key} row={row} />
        ))}
      </Card>

      <MicroCard rows={data.micros} coverage={data.micro_coverage} subtitle="за день" />

      <AdviceCard deficits={data.deficits} onAddSupplement={onAddSupplement} />

      <Card>
        <CardHead title="Энергетический итог" />
        <div className="energy-grid">
          <Tile label="Съедено" value={num(data.totals.calories_eaten)} />
          <Tile
            label="Нагрузка"
            value={num(data.totals.calories_burned)}
            color="var(--color-accent-400)"
          />
          <Tile
            label="Итог к норме"
            value={num(data.totals.balance_vs_norm)}
            color="var(--color-accent-300)"
          />
        </div>
        <p className="coverage-note">
          Итог к норме — это съеденное минус дневная норма; отрицательное число означает
          дефицит калорий за день. Расход на нагрузке в него не входит и норму не поднимает —
          он показан отдельно и подробнее разложен на экране «Прогресс».
        </p>
      </Card>

      {data.excesses.length > 0 && (
        <Card>
          <CardHead title="Выше верхнего предела" />
          <p className="coverage-note">
            {data.excesses.map((item) => item.name).join(', ')} — превышен безопасный суточный
            предел. Обычно это добавки: стоит пересмотреть дозировку.
          </p>
        </Card>
      )}
    </>
  )
}

function PeriodReport({
  range,
  end,
  onAddSupplement,
}: {
  range: 'week' | 'month'
  end: string
  onAddSupplement: () => void
}) {
  const { data, isLoading, error } = usePeriodReport(range, end)

  if (isLoading) return <LoadingScreen label="Считаем отчёт за период" />
  if (error) return <ErrorNote message={error.message} />
  if (!data) return null

  const label = range === 'week' ? 'за неделю' : 'за месяц'

  return (
    <>
      <Card>
        <CardHead
          title="В среднем за день"
          meta={`${shortDate(data.start)} — ${shortDate(data.end)}`}
        />
        <div className="energy-grid">
          <Tile label="Съедено" value={num(data.averages.calories_eaten)} />
          <Tile
            label="Потрачено"
            value={num(data.averages.calories_burned)}
            color="var(--color-accent-400)"
          />
          <Tile
            label="Белок"
            value={num(data.averages.protein_g)}
            unit="г"
            color="var(--color-accent-300)"
          />
        </div>
        <p className="coverage-note">
          Записи есть за {data.logged_days} из {data.day_count} дней. Средние считаются на все дни
          периода — пропущенный день тянет среднее вниз, и это честно.
        </p>
      </Card>

      <MicroCard rows={data.micros} coverage={data.micro_coverage} subtitle={label} />

      <AdviceCard deficits={data.deficits} onAddSupplement={onAddSupplement} />
    </>
  )
}

export function ReportScreen() {
  const day = useUi((state) => state.day)
  const period = useUi((state) => state.reportPeriod)
  const setPeriod = useUi((state) => state.setReportPeriod)
  const openSheet = useUi((state) => state.openSheet)

  const onAddSupplement = () => openSheet('supplement')

  return (
    <>
      <div className="report-toolbar">
        <Segment options={PERIODS} value={period} onChange={setPeriod} label="Период отчёта" />
      </div>

      {period === 'day' ? (
        <DayReport day={day} onAddSupplement={onAddSupplement} />
      ) : (
        <PeriodReport range={period} end={day} onAddSupplement={onAddSupplement} />
      )}
    </>
  )
}
