import { describe, expect, it } from 'vitest'

import {
  addDays,
  doseValue,
  entriesLabel,
  mondayOf,
  longDate,
  nutrientValue,
  parseDay,
  toDayString,
  toNumber,
  weekdayShort,
} from './format'

describe('работа с датами', () => {
  it('парсит дату как локальную, без сдвига часового пояса', () => {
    const date = parseDay('2026-08-10')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(10)
  })

  it('round-trip строка → дата → строка', () => {
    expect(toDayString(parseDay('2026-01-01'))).toBe('2026-01-01')
  })

  it('сдвигает дату через границу месяца', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('неделя начинается с понедельника', () => {
    expect(weekdayShort('2026-08-10')).toBe('Пн')
    expect(weekdayShort('2026-08-16')).toBe('Вс')
  })

  it('длинная дата — с падежом месяца', () => {
    expect(longDate('2026-08-10')).toBe('Понедельник, 10 августа')
  })
})

describe('nutrientValue', () => {
  it('мелкие значения с одним знаком после запятой', () => {
    expect(nutrientValue(0.8)).toBe('0,8')
    expect(nutrientValue(9.24)).toBe('9,2')
  })

  it('крупные значения без дробей и без разделителей тысяч', () => {
    expect(nutrientValue(740)).toBe('740')
    expect(nutrientValue(3500)).toBe('3500')
  })

  it('ноль остаётся нулём', () => {
    expect(nutrientValue(0)).toBe('0')
  })
})

describe('entriesLabel', () => {
  it('склоняет «запись» по русским правилам', () => {
    expect(entriesLabel(1)).toBe('1 запись')
    expect(entriesLabel(3)).toBe('3 записи')
    expect(entriesLabel(7)).toBe('7 записей')
    expect(entriesLabel(11)).toBe('11 записей')
    expect(entriesLabel(22)).toBe('22 записи')
  })
})

describe('mondayOf', () => {
  it('returns the same day for a Monday', () => {
    expect(mondayOf('2026-09-07')).toBe('2026-09-07')
  })
  it('walks back to Monday from any weekday', () => {
    expect(mondayOf('2026-09-08')).toBe('2026-09-07')
    expect(mondayOf('2026-09-13')).toBe('2026-09-07')
  })
  it('crosses a month boundary', () => {
    expect(mondayOf('2026-09-01')).toBe('2026-08-31')
  })
})

describe('toNumber', () => {
  it('принимает запятую как разделитель', () => {
    expect(toNumber('12,5')).toBe(12.5)
  })

  it('пустое поле — это «не указано», а не ноль', () => {
    expect(toNumber('')).toBeNull()
    expect(toNumber('   ')).toBeNull()
  })

  it('отбрасывает мусор и отрицательные значения', () => {
    expect(toNumber('много')).toBeNull()
    expect(toNumber('-5')).toBeNull()
    expect(toNumber('Infinity')).toBeNull()
  })

  it('ноль остаётся нулём', () => {
    expect(toNumber('0')).toBe(0)
  })
})

describe('doseValue', () => {
  it('дробную дозу не округляет до целого', () => {
    expect(doseValue(2.5)).toBe('2,5')
  })

  it('целую дозу показывает с разделителем разрядов', () => {
    // Разделитель у ru-RU — неразрывный пробел, а не обычный.
    expect(doseValue(2000)).toBe('2\u00a0000')
  })

  it('ноль остаётся нулём', () => {
    expect(doseValue(0)).toBe('0')
  })
})
