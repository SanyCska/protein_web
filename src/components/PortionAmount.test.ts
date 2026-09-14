import { describe, expect, it } from 'vitest'

import { pickedFactor } from './PortionAmount'

describe('pickedFactor', () => {
  it('часть — это множитель как есть', () => {
    expect(pickedFactor('0,5', 'часть', 200)).toBe(0.5)
    expect(pickedFactor('1,5', 'часть', 200)).toBe(1.5)
  })

  it('граммы считаются от порции-основы', () => {
    expect(pickedFactor('70', 'г', 130)).toBeCloseTo(70 / 130)
    expect(pickedFactor('260', 'г', 130)).toBe(2)
  })

  it('миллилитры считаются так же: единица — подпись, а не плотность', () => {
    expect(pickedFactor('100', 'мл', 200)).toBe(0.5)
  })

  it('пустое поле означает «съел ровно порцию»', () => {
    expect(pickedFactor('', 'г', 130)).toBe(1)
    expect(pickedFactor('  ', 'часть', 130)).toBe(1)
  })

  it('без известной основы граммы не пересчитываются', () => {
    expect(pickedFactor('70', 'г', null)).toBe(1)
    expect(pickedFactor('70', 'г', 0)).toBe(1)
  })

  it('ноль и мусор не обнуляют запись', () => {
    expect(pickedFactor('0', 'г', 130)).toBe(1)
    expect(pickedFactor('много', 'часть', 130)).toBe(1)
  })
})
