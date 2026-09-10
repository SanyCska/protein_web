export type Sex = 'm' | 'f'
export type Goal = 'lose' | 'maintain' | 'gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
export type Frequency = 'daily' | 'every_other_day' | 'course'
export type PeriodRange = 'week' | 'month'
/** Порцию меряем массой или объёмом; пересчёта между ними нет — плотность неизвестна. */
export type PortionUnit = 'г' | 'мл'

/** КБЖУ и микронутриенты на 100 г продукта. */
export type Per100 = Record<string, number>
export type Micros = Record<string, number>

export interface Norms {
  bmr: number
  calories: number
  /** Что даёт формула — показываем рядом со своей нормой. */
  calories_computed: number
  calories_source: 'computed' | 'manual'
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  activity_factor: number
  goal: Goal
  micros: Micros
}

export interface MealItem {
  id?: number
  name: string
  grams: number
  per100: Per100
}

export interface Meal {
  id: number
  day: string
  name: string
  calories_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  portion_g: number | null
  portion_unit: PortionUnit
  meal_type: MealType
  eaten_at: string | null
  ingredients: string | null
  source: string
  micros: Micros
  items: MealItem[]
}

export interface MealInput {
  name: string
  calories_kcal?: number | null
  protein_g?: number
  fat_g?: number | null
  carbs_g?: number | null
  fiber_g?: number | null
  portion_g?: number | null
  portion_unit?: PortionUnit
  meal_type?: MealType
  eaten_at?: string | null
  ingredients?: string | null
  micros?: Micros
  items?: MealItem[]
  source?: string
  save_as_product?: boolean
}

export interface Workout {
  id: number
  day: string
  kind: string
  kind_name: string
  icon: string
  minutes: number
  kcal: number
  note: string | null
  done_at: string | null
}

export interface WorkoutTemplate {
  id: number
  name: string
  kind: string
  minutes: number
  icon: string
  kcal: number
}

export interface Supplement {
  id: number
  name: string
  nutrient_key: string | null
  dose: number
  unit: string
  when_label: string | null
  frequency: Frequency
  active: boolean
}

export interface Profile {
  user_id: number
  sex: Sex
  age: number
  height_cm: number
  weight_kg: number
  activity: number
  body_fat_pct: number | null
  /** Своя норма калорий; null — считать по формуле. */
  calories_override: number | null
  goal: Goal
  first_name: string | null
  norms: Norms
}

export interface ProductMicroEstimate {
  portion_g: number
  per100: Micros
  micros: Micros
  fiber_g: number
  confidence: string
  comment: string
}

export interface ProductsEstimateResult {
  updated: Product[]
  failed: number
  remaining: number
  error: string | null
}

export interface Product {
  id: number
  name: string
  protein_g: number
  calories_kcal: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  portion_g: number | null
  portion_unit: PortionUnit
  micros: Micros
}

export interface DayTotals {
  calories_eaten: number
  calories_burned: number
  calories_net: number
  calories_remaining: number
  balance_vs_norm: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
}

export interface DayView {
  day: string
  meals: Meal[]
  workouts: Workout[]
  supplements: Supplement[]
  totals: DayTotals
  norms: Norms
}

export interface WeekStripDay {
  day: string
  calories: number
  is_today: boolean
}

export interface WeekStrip {
  days: WeekStripDay[]
  norm_calories: number
}

export interface NutrientRow {
  key: string
  name: string
  unit: string
  value: number
  norm: number
  pct: number
  over_limit: boolean
}

export interface MacroRow {
  key: string
  name: string
  unit: string
  value: number
  norm: number
  pct: number
}

export interface Deficit {
  key: string
  name: string
  unit: string
  gap: number
  pct: number
  sources: string[]
  advice: string
}

export interface DayReport {
  day: string
  totals: Omit<DayTotals, 'calories_remaining'> & { meals_count: number; workouts_count: number }
  norms: Norms
  macros: MacroRow[]
  micros: NutrientRow[]
  deficits: Deficit[]
  excesses: { key: string; name: string; unit: string; value: number; pct: number }[]
  supplements_taken: Supplement[]
  micro_coverage: number
}

export interface PeriodReport {
  range: PeriodRange
  start: string
  end: string
  days: string[]
  day_count: number
  logged_days: number
  averages: {
    calories_eaten: number
    calories_burned: number
    calories_net: number
    protein_g: number
  }
  norms: Norms
  micros: NutrientRow[]
  deficits: Deficit[]
  excesses: { key: string; name: string; unit: string; value: number; pct: number }[]
  micro_coverage: number
}

export interface ProgressTile {
  key: string
  label: string
  value: number
  unit: string
  delta: number | null
  hint: string
}

export interface Progress {
  range: PeriodRange
  start: string
  end: string
  days: string[]
  calories: number[]
  protein: number[]
  burned: number[]
  net: number[]
  norms: Norms
  avg_calories: number
  avg_protein: number
  burned_by_kind: { name: string; kcal: number }[]
  tiles: ProgressTile[]
  summary: string
}

export interface AiParsedItem {
  name: string
  grams: number
  per100: Per100
}

export interface AiParseResult {
  name: string
  calories_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  micros: Micros
  items: AiParsedItem[]
  confidence: string
  comment: string
}

/** Состав продукта, снятый ИИ с фото упаковки. */
export interface AiLabelResult {
  name: string
  /** Порция с упаковки в единицах portion_unit; null — на упаковке её нет. */
  portion_g: number | null
  portion_unit: PortionUnit
  /** КБЖУ и микронутриенты на 100 г или 100 мл. */
  per100: Per100
  /** КБЖУ порции — то, что подставляем в форму. */
  calories_kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  micros: Micros
  confidence: string
  comment: string
}

export interface AiSupplementItem {
  name: string
  nutrient_key: string | null
  dose: number
  unit: string
}

/** Этикетка банки: у мультивитаминов это сразу десяток веществ. */
export interface AiSupplementLabelResult {
  name: string
  items: AiSupplementItem[]
  when_label: string | null
  confidence: string
  comment: string
}

export interface WorkoutKind {
  key: string
  name: string
  met: number
  icon: string
}

export interface ActivityLevel {
  key: string
  factor: number
  name: string
}

export interface NutrientMeta {
  key: string
  name: string
  unit: string
  rda_male: number
  rda_female: number
}

export interface Reference {
  nutrients: NutrientMeta[]
  activity_levels: ActivityLevel[]
  workout_kinds: WorkoutKind[]
}
