import {
  parseNumber,
  formatNumber,
  combineQuantities,
  scaleQuantity,
  formatIngredient,
} from '../../utils/quantity'

describe('parseNumber', () => {
  it('parses whole numbers', () => {
    expect(parseNumber('5')).toBe(5)
    expect(parseNumber('10')).toBe(10)
    expect(parseNumber('0')).toBe(0)
  })

  it('parses decimal numbers', () => {
    expect(parseNumber('2.5')).toBe(2.5)
    expect(parseNumber('0.25')).toBe(0.25)
    expect(parseNumber('3.75')).toBe(3.75)
  })

  it('parses simple fractions', () => {
    expect(parseNumber('1/2')).toBe(0.5)
    expect(parseNumber('1/4')).toBe(0.25)
    expect(parseNumber('3/4')).toBe(0.75)
    expect(parseNumber('1/3')).toBeCloseTo(0.333, 2)
  })

  it('parses mixed numbers', () => {
    expect(parseNumber('1 1/2')).toBe(1.5)
    expect(parseNumber('2 1/4')).toBe(2.25)
    expect(parseNumber('3 3/4')).toBe(3.75)
  })

  it('handles whitespace', () => {
    expect(parseNumber('  5  ')).toBe(5)
    expect(parseNumber(' 1/2 ')).toBe(0.5)
  })

  it('returns null for invalid input', () => {
    expect(parseNumber('')).toBe(null)
    expect(parseNumber('abc')).toBe(null)
    expect(parseNumber('1/0')).toBe(null) // Division by zero
  })
})

describe('formatNumber', () => {
  it('formats whole numbers', () => {
    expect(formatNumber(5)).toBe('5')
    expect(formatNumber(10)).toBe('10')
    expect(formatNumber(0)).toBe('0')
  })

  it('formats common fractions', () => {
    expect(formatNumber(0.5)).toBe('1/2')
    expect(formatNumber(0.25)).toBe('1/4')
    expect(formatNumber(0.75)).toBe('3/4')
  })

  it('formats mixed numbers', () => {
    expect(formatNumber(1.5)).toBe('1 1/2')
    expect(formatNumber(2.25)).toBe('2 1/4')
    expect(formatNumber(3.75)).toBe('3 3/4')
  })

  it('converts close decimals to fractions', () => {
    // 1.7 is close to 1 2/3 (1.667), so it converts
    expect(formatNumber(1.7)).toBe('1 2/3')
    // 2.15 is close to 2 1/8 (2.125), so it converts
    expect(formatNumber(2.15)).toBe('2 1/8')
  })

  it('falls back to decimal for values not close to fractions', () => {
    // 1.43 is not close to any common fraction (0.43 is between 3/8=0.375 and 1/2=0.5)
    expect(formatNumber(1.43)).toBe('1.4')
  })
})

describe('combineQuantities', () => {
  it('combines numeric quantities', () => {
    expect(combineQuantities('1', '2')).toBe('3')
    expect(combineQuantities('1/2', '1/2')).toBe('1')
    expect(combineQuantities('1 1/2', '2')).toBe('3 1/2')
  })

  it('handles fractions that result in nice numbers', () => {
    expect(combineQuantities('1/4', '3/4')).toBe('1')
    expect(combineQuantities('1/2', '1/4')).toBe('3/4')
  })

  it('concatenates non-numeric quantities', () => {
    expect(combineQuantities('a pinch', 'a dash')).toBe('a pinch + a dash')
    expect(combineQuantities('to taste', '1')).toBe('to taste + 1')
  })
})

describe('scaleQuantity', () => {
  it('scales numeric quantities', () => {
    expect(scaleQuantity('2', 2)).toBe('4')
    expect(scaleQuantity('1/2', 2)).toBe('1')
    expect(scaleQuantity('1 1/2', 2)).toBe('3')
  })

  it('scales down quantities', () => {
    expect(scaleQuantity('4', 0.5)).toBe('2')
    expect(scaleQuantity('1', 0.5)).toBe('1/2')
  })

  it('returns original for non-numeric quantities', () => {
    expect(scaleQuantity('a pinch', 2)).toBe('a pinch')
    expect(scaleQuantity('to taste', 0.5)).toBe('to taste')
  })
})

describe('formatIngredient', () => {
  it('formats full ingredient with quantity and unit', () => {
    expect(formatIngredient('flour', '2', 'cups')).toBe('2 cups flour')
    expect(formatIngredient('salt', '1/2', 'tsp')).toBe('1/2 tsp salt')
  })

  it('formats ingredient with just quantity', () => {
    expect(formatIngredient('eggs', '3', null)).toBe('3 eggs')
    expect(formatIngredient('lemon', '1', null)).toBe('1 lemon')
  })

  it('formats ingredient with just unit', () => {
    expect(formatIngredient('olive oil', null, 'tbsp')).toBe('tbsp olive oil')
  })

  it('formats ingredient with no quantity or unit', () => {
    expect(formatIngredient('salt', null, null)).toBe('salt')
    expect(formatIngredient('fresh herbs', null, null)).toBe('fresh herbs')
  })
})
