import { describe, expect, it } from 'vitest'
import { defaultPdfDisplayOptions, resolvedPdfDisplayOptions, withPdfDisplayOption } from './pdfDisplayOptions'

describe('pdf display options', () => {
  it('keeps every optional presentation element visible by default', () => {
    expect(Object.values(defaultPdfDisplayOptions).every(Boolean)).toBe(true)
  })

  it('toggles one presentation field without mutating the others', () => {
    const next = withPdfDisplayOption(defaultPdfDisplayOptions, 'object', false)
    expect(next.object).toBe(false)
    expect(next.unitPriceHT).toBe(true)
    expect(defaultPdfDisplayOptions.object).toBe(true)
  })

  it('fills missing options with safe visible defaults', () => {
    expect(resolvedPdfDisplayOptions({ vat: false })).toEqual({
      ...defaultPdfDisplayOptions,
      vat: false
    })
  })
})
