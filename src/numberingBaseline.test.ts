import { describe, expect, it } from 'vitest'
import { nextSequenceFromBaseline, normalizeNumberingBaseline, sanitizeLastUsed } from './numberingBaseline'
import type { NumberingBaseline } from './types'

const baseline: NumberingBaseline = {
  year: 2026,
  lastUsed: {
    DEVIS: 7,
    FACTURE: 13,
    BL: 22,
    BC: 4
  }
}

describe('numbering baseline', () => {
  it('starts at the next real-world number for the configured year', () => {
    expect(nextSequenceFromBaseline(baseline, 'FACTURE', 2026)).toBe(14)
    expect(nextSequenceFromBaseline(baseline, 'DEVIS', 2026)).toBe(8)
  })

  it('starts a fresh yearly sequence outside the baseline year', () => {
    expect(nextSequenceFromBaseline(baseline, 'FACTURE', 2027)).toBe(1)
  })

  it('sanitizes negative, decimal and excessive values', () => {
    expect(sanitizeLastUsed(-12)).toBe(0)
    expect(sanitizeLastUsed(13.9)).toBe(13)
    expect(sanitizeLastUsed(2_000_000)).toBe(999999)
  })

  it('normalizes every document family independently', () => {
    const normalized = normalizeNumberingBaseline({
      year: 2026,
      lastUsed: { DEVIS: -1, FACTURE: 13.8, BL: 0, BC: 2 }
    })
    expect(normalized.lastUsed).toEqual({ DEVIS: 0, FACTURE: 13, BL: 0, BC: 2 })
  })
})
