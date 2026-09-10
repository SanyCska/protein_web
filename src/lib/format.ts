const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_LONG = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/** Дата как локальная, без сдвига часового пояса от `new Date('2026-08-10')`. */
export function parseDay(day: string): Date {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

export function toDayString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function today(): string {
  return toDayString(new Date())
}

export function addDays(day: string, delta: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + delta)
  return toDayString(date)
}

/** Индекс дня недели с понедельника (0) — в JS неделя начинается с воскресенья. */
/** Понедельник недели, в которую попадает день. */
export function mondayOf(day: string): string {
  const date = parseDay(day)
  return toDayString(new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayIndex(date)))
}

export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function weekdayShort(day: string): string {
  return WEEKDAYS_SHORT[weekdayIndex(parseDay(day))] ?? ''
}

export function dayNumber(day: string): number {
  return parseDay(day).getDate()
}

/** «Понедельник, 10 августа» — подзаголовок хедера. */
export function longDate(day: string): string {
  const date = parseDay(day)
  const weekday = WEEKDAYS_LONG[weekdayIndex(date)] ?? ''
  return `${weekday}, ${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`
}

/** «10 августа» — для подзаголовков карточек. */
export function shortDate(day: string): string {
  const date = parseDay(day)
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`
}

/** Дробные числа по-русски — через запятую, как во всём макете. */
export function num(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits))
  return rounded.toLocaleString('ru-RU', { maximumFractionDigits: digits })
}

/**
 * Компактная запись нутриента: 0,8 мг остаётся 0,8, а 740 мг не превращается в 740,0.
 * Без разделителей тысяч — колонка значений в отчёте узкая (70px), и «2 071 / 3 500 мг»
 * в неё не влезает, а перенос строки ломает выравнивание всей таблицы.
 */
/** Доза добавки: 2,5 г остаётся дробной, а 2000 МЕ читается как «2 000». */
export function doseValue(value: number): string {
  return num(value, Number.isInteger(value) ? 0 : 1)
}

export function nutrientValue(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) < 10) return num(value, 1).replace(/\s/g, '')
  return String(Math.round(value))
}

export function signed(value: number): string {
  return value > 0 ? `+${num(value)}` : num(value)
}

export function pct(value: number, of: number): number {
  return of > 0 ? Math.round((value / of) * 100) : 0
}

/**
 * Число из поля ввода: пустое поле и мусор — это «не указано», а не ноль.
 * Запятую принимаем наравне с точкой: на телефоне она и стоит в цифровой раскладке.
 */
export function toNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** Округление до знака: числа уходят в API и в поля ввода, где 0.30000000000000004 недопустим. */
export function roundTo(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/** «7 записей» / «1 запись» / «22 записи». */
export function plural(count: number, forms: [string, string, string]): string {
  const mod100 = Math.abs(count) % 100
  const mod10 = mod100 % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

export function entriesLabel(count: number): string {
  return `${count} ${plural(count, ['запись', 'записи', 'записей'])}`
}

export function minutesLabel(minutes: number): string {
  return `${num(minutes)} мин`
}

/** Текущее время как HH:MM — чем помечаем свежие записи. */
export function nowTime(): string {
  const now = new Date()
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`
}
