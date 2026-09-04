import { describe, expect, it } from 'vitest'
import { stoppedAtTaxSuffix } from './pdf'

describe('BL arrêté — mention TTC', () => {
  it('omet TTC pour un BL sans TVA', () => {
    expect(stoppedAtTaxSuffix('BL', [0, 0])).toBe('')
  })

  it('conserve TTC pour un BL avec TVA', () => {
    expect(stoppedAtTaxSuffix('BL', [20])).toBe(' TTC')
  })

  it('ne change pas les autres documents', () => {
    expect(stoppedAtTaxSuffix('FACTURE', [0])).toBe(' TTC')
    expect(stoppedAtTaxSuffix('DEVIS', [0])).toBe(' TTC')
    expect(stoppedAtTaxSuffix('BC', [0])).toBe(' TTC')
  })
})
