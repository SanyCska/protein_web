import {
  Barbell,
  Bell,
  Bicycle,
  BowlFood,
  CaretDown,
  ChartLineUp,
  ChartPieSlice,
  Coffee,
  Cookie,
  ForkKnife,
  Lightbulb,
  MagnifyingGlass,
  PersonSimpleRun,
  PersonSimpleSwim,
  Pill,
  Plus,
  SneakerMove,
  SoccerBall,
  Sparkle,
  TennisBall,
  Trash,
  UserGear,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'

/** Только те глифы, что перечислены в дизайн-хендофе — иконки не заводятся «на всякий случай». */
const ICONS: Record<string, PhosphorIcon> = {
  barbell: Barbell,
  bell: Bell,
  bicycle: Bicycle,
  'bowl-food': BowlFood,
  'caret-down': CaretDown,
  'chart-line-up': ChartLineUp,
  'chart-pie-slice': ChartPieSlice,
  coffee: Coffee,
  cookie: Cookie,
  'fork-knife': ForkKnife,
  lightbulb: Lightbulb,
  'magnifying-glass': MagnifyingGlass,
  'person-simple-run': PersonSimpleRun,
  'person-simple-swim': PersonSimpleSwim,
  pill: Pill,
  plus: Plus,
  'sneaker-move': SneakerMove,
  'soccer-ball': SoccerBall,
  sparkle: Sparkle,
  'tennis-ball': TennisBall,
  trash: Trash,
  'user-gear': UserGear,
}

export function Icon({
  name,
  size = 16,
  color,
  weight = 'regular',
}: {
  name: string
  size?: number
  color?: string
  weight?: 'regular' | 'fill' | 'bold'
}) {
  const Glyph = ICONS[name] ?? ForkKnife
  return <Glyph size={size} color={color} weight={weight} aria-hidden />
}
