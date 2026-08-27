import { describe, expect, it } from 'vitest'
import { extractDocumentDate, extractMultilineClientName } from './importMetadata'

describe('Import metadata — PDF PIRA', () => {
  const text = [
    'FACTURE',
    '#2408-2026',
    'Client : CLINIQUE',
    'NATIONS UNIS',
    'RABAT LE:',
    '24 AOUT 2026',
    'DESIGNATION QUANTITÉ PRIX UNITAIRE HT TOTAL HT'
  ].join('\n')

  it('conserve le nom client sur deux lignes', () => {
    expect(extractMultilineClientName(text)).toBe('CLINIQUE NATIONS UNIS')
  })

  it('convertit la date française en ISO', () => {
    expect(extractDocumentDate(text)).toBe('2026-08-24')
  })
})
