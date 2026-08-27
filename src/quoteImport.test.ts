import { describe, expect, it } from 'vitest'
import {
  canonicalQuoteToDocumentFields,
  normalizeQuoteNumber,
  normalizeQuotePayload
} from './quoteImport'

describe('F1 — CanonicalQuoteJSON', () => {
  it('normalise les nombres FR/EN sans perdre les décimales', () => {
    expect(normalizeQuoteNumber('1 250,50 DH')).toBe(1250.5)
    expect(normalizeQuoteNumber('1,250.50')).toBe(1250.5)
  })

  it('broie les alias de colonnes et applique le dictionnaire métier', () => {
    const quote = normalizeQuotePayload({
      source: { kind: 'EXCEL', name: 'client.xlsx' },
      client: { name: 'Hôtel Atlas', ice: '001' },
      object: 'Fourniture textile',
      date: '27/08/2026',
      currency: 'DHS',
      lines: [{ 'Libellé': 'serviette sdb', 'Qté': '100', 'Unité': 'pcs', 'P.U': '120,00', TVA: '20%' }]
    }, { dictionary: { designations: { 'serviette sdb': 'Serviette de bain 70 × 140 cm' } } })

    expect(quote.status).toBe('READY')
    expect(quote.quote.date).toBe('2026-08-27')
    expect(quote.quote.currency).toBe('MAD')
    expect(quote.lines[0]).toMatchObject({ designation: 'Serviette de bain 70 × 140 cm', unit: 'Pièce', quantity: 100, unitPriceHT: 120, vatRate: 20 })
    expect(quote.lines[0].origins.designation).toBe('DICTIONARY')
  })

  it('n’invente jamais un prix absent et bloque la conversion', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client' }, object: 'Test', date: '2026-08-27',
      lines: [{ designation: 'A', qte: 1 }]
    })
    expect(quote.status).toBe('REVIEW_REQUIRED')
    expect(quote.lines[0].unitPriceHT).toBeNull()
    expect(quote.issues.some(issue => issue.code === 'UNIT_PRICE_REQUIRED')).toBe(true)
    expect(() => canonicalQuoteToDocumentFields(quote)).toThrow('champs à vérifier')
  })

  it('n’invente ni unité ni TVA quand aucun défaut explicite n’est fourni', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client' }, object: 'Test', date: '2026-08-27',
      lines: [{ article: 'A', qty: 1, pu: 10 }]
    })
    expect(quote.status).toBe('REVIEW_REQUIRED')
    expect(quote.lines[0].unit).toBeNull()
    expect(quote.lines[0].vatRate).toBeNull()
    expect(quote.issues.some(issue => issue.code === 'UNIT_REQUIRED')).toBe(true)
    expect(quote.issues.some(issue => issue.code === 'VAT_REQUIRED')).toBe(true)
  })

  it('utilise les défauts société uniquement quand ils sont fournis explicitement', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client' }, object: 'Test', date: '2026-08-27',
      lines: [{ article: 'A', qty: 1, pu: 10 }]
    }, { defaultVatRate: 20, defaultUnit: 'Pièce' })
    expect(quote.status).toBe('READY')
    expect(quote.lines[0].unit).toBe('Pièce')
    expect(quote.lines[0].vatRate).toBe(20)
    expect(quote.lines[0].origins.unit).toBe('DEFAULT')
    expect(quote.lines[0].origins.vatRate).toBe('DEFAULT')
  })

  it('signale un doublon sans bloquer un devis autrement complet', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client' }, object: 'Test', date: '2026-08-27',
      lines: [{ article: 'A', qty: 1, pu: 10 }, { article: 'A', qty: 1, pu: 10 }]
    }, { defaultVatRate: 20, defaultUnit: 'Pièce' })
    expect(quote.status).toBe('READY')
    expect(quote.issues.some(issue => issue.code === 'DUPLICATE_LINE' && issue.severity === 'WARNING')).toBe(true)
  })

  it('refuse une devise non supportée au lieu de convertir silencieusement', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client' }, object: 'Test', date: '2026-08-27', currency: 'EUR',
      lines: [{ article: 'A', qty: 1, pu: 10, unite: 'Pièce', tva: 20 }]
    })
    expect(quote.status).toBe('REVIEW_REQUIRED')
    expect(quote.issues.some(issue => issue.code === 'CURRENCY_UNSUPPORTED')).toBe(true)
  })

  it('convertit uniquement un JSON READY vers le moteur CommercialDocument existant', () => {
    const quote = normalizeQuotePayload({
      client: { name: 'Client', address: 'Rabat', ice: '001', ifNumber: '357' },
      object: 'Test', date: '2026-08-27',
      lines: [{ article: 'A', qty: 2, pu: 10, tva: 20, remise: 5 }]
    }, { defaultUnit: 'Pièce' })

    expect(canonicalQuoteToDocumentFields(quote, index => `line-${index}`)).toEqual({
      client: 'Client', clientAddress: 'Rabat', clientIce: '001', clientIfNumber: '357',
      object: 'Test', date: '2026-08-27', globalDiscountPercent: 0,
      lines: [{ id: 'line-0', designation: 'A', unit: 'Pièce', quantity: 2, unitPriceHT: 10, vatRate: 20, discountPercent: 5 }]
    })
  })
})
