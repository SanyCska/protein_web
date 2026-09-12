import { useProgress } from '@/api/hooks'
import { useUi } from '@/app/store'
import {
  Card,
  CardHead,
  Chip,
  ErrorNote,
  LoadingScreen,
  Segment,
} from '@/components/primitives'
import { num, signed } from '@/lib/format'
import { calorieBarColor, proteinBarColor } from '@/lib/nutrition'
import { BarChart, NetChart, WeightChart, scaleMax } from './charts'
import './progress.css'

const RANGES = [
  { value: 'week' as const, label: 'Неделя' },
  { value: 'month' as const, label: 'Месяц' },
]

export function ProgressScreen() {
  const day = useUi((state) => state.day)
  const range = useUi((state) => state.progressRange)
  const setRange = useUi((state) => state.setProgressRange)
  const { data, isLoading, error } = useProgress(range, day)

  if (isLoading) return <LoadingScreen label="Считаем прогресс" />
  if (error) return <ErrorNote message={error.message} />
  if (!data) return null

  const norm = data.norms.calories
  const proteinTarget = data.norms.protein_g
  const burnedTotal = data.burned.reduce((sum, value) => sum + value, 0)
  const avgVsNorm = data.avg_calories - norm

  return (
    <>
      <div className="progress-toolbar">
        <Segment options={RANGES} value={range} onChange={setRange} label="Период прогресса" />
      </div>

      <Card>
        <CardHead title="Калории съедено" meta={`ср. ${num(data.avg_calories)} ккал`} />
        <BarChart
          days={data.days}
          values={data.calories}
          height={120}
          max={scaleMax([...data.calories, norm], 2900)}
          norm={norm}
          colorOf={(value) => calorieBarColor(value, norm)}
          showValues={range === 'week'}
        />
        <div className="chart__footer">
          <span>Норма {num(norm)}</span>
          <span style={{ color: 'var(--color-accent-400)' }}>
            {signed(Math.round(avgVsNorm))} к норме в среднем
          </span>
        </div>
      </Card>

      <Card>
        <CardHead
          title="Белок"
          meta={`ср. ${num(data.avg_protein)} г · цель ${num(proteinTarget)} г`}
        />
        <BarChart
          days={data.days}
          values={data.protein}
          height={96}
          max={scaleMax([...data.protein, proteinTarget], 200)}
          norm={proteinTarget}
          colorOf={(value) => proteinBarColor(value, proteinTarget)}
          showValues={range === 'week'}
        />
      </Card>

      <Card>
        <CardHead title="Потрачено на нагрузке" meta={`${num(burnedTotal)} ккал`} />
        <BarChart
          days={data.days}
          values={data.burned}
          height={86}
          max={scaleMax(data.burned, 900)}
          colorOf={() => 'var(--color-accent)'}
          showValues={range === 'week'}
        />
        {data.burned_by_kind.length > 0 && (
          <div className="kind-chips">
            {data.burned_by_kind.map((item) => (
              <Chip key={item.name}>
                {item.name}{' '}
                <span className="mn" style={{ color: 'var(--color-accent)' }}>
                  {num(item.kcal)}
                </span>
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHead
          title="Вес"
          meta={
            data.weight_avg !== null
              ? `в среднем ${num(data.weight_avg, 1)} кг`
              : 'нет взвешиваний'
          }
        />
        <WeightChart days={data.days} values={data.weight} />
        {data.weight_avg !== null && (
          <div className="weight-stats">
            <div className="weight-stats__item">
              <div className="stat-tile__label">За период</div>
              <div className="stat-tile__value mn">
                {data.weight_change === null ? '—' : `${signed(data.weight_change, 1)} кг`}
              </div>
              <div className="stat-tile__hint">
                {data.weight_change === null
                  ? 'нужно хотя бы два взвешивания'
                  : 'последнее взвешивание минус первое'}
              </div>
            </div>
            <div className="weight-stats__item">
              <div className="stat-tile__label">К прошлому периоду</div>
              <div className="stat-tile__value mn">
                {data.weight_delta === null ? '—' : `${signed(data.weight_delta, 1)} кг`}
              </div>
              <div className="stat-tile__hint">
                {data.weight_delta === null
                  ? 'тогда не взвешивались'
                  : 'разница средних значений'}
              </div>
            </div>
          </div>
        )}
        <p className="chart__footer" style={{ display: 'block', lineHeight: 1.5 }}>
          {data.weight_days > 0
            ? `Взвешиваний за период: ${data.weight_days} из ${data.days.length} дней.`
            : 'Вес записывается в дневнике, карточкой под кольцами.'}
        </p>
      </Card>

      <Card>
        <CardHead title="Баланс к норме" meta="съедено − норма" />
        <NetChart days={data.days} values={data.net} />
        <p className="chart__footer" style={{ display: 'block', lineHeight: 1.5 }}>
          {data.summary}
        </p>
      </Card>

      <div className="stat-tiles">
        {data.tiles.map((tile) => (
          <div className="stat-tile" key={tile.key}>
            <div className="stat-tile__label">{tile.label}</div>
            <div className="stat-tile__value mn">
              {num(tile.value)}
              {tile.unit && (
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
                  {tile.unit.startsWith('/') ? tile.unit : ` ${tile.unit}`}
                </span>
              )}
            </div>
            <div className="stat-tile__hint">{tile.hint}</div>
          </div>
        ))}
      </div>
    </>
  )
}
