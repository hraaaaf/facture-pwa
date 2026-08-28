import { describe, expect, it } from 'vitest'
import { voiceToRawQuote } from './voiceQuoteParser'

const getLine = (raw: ReturnType<typeof voiceToRawQuote>) => raw.lines?.[0] as Record<string, unknown> | undefined

describe('voiceToRawQuote real Safari regressions', () => {
  it('parses the exact captured iPhone transcript', () => {
    const raw = voiceToRawQuote('Client Pierra article draps de 2,30 m sur deux 2,20 m quantité cinq prix unitaire 150 dirhams', 20)
    expect(raw.client?.name).toBe('Pierra')
    expect(raw.lines).toHaveLength(1)
    expect(getLine(raw)).toMatchObject({ designation: 'draps de 2,30 m sur deux 2,20 m', quantity: 5, unitPriceHT: 150, vatRate: 20 })
  })

  it('parses the latest iPhone transcript even when Safari glues a field boundary', () => {
    const raw = voiceToRawQuote('Client Pirat désignation premier article des nappes 250 cm quantité cinqLe prix unitaire 150 HT', 20)
    expect(raw.client?.name).toBe('Pirat')
    expect(raw.lines).toHaveLength(1)
    expect(getLine(raw)).toMatchObject({ designation: 'premier article des nappes 250 cm', quantity: 5, unitPriceHT: 150, vatRate: 20 })
  })

  it('does not invent Pierre when Safari transcribes Pierra', () => {
    expect(voiceToRawQuote('Client Pierra article draps quantité cinq prix unitaire 150 dirhams', 20).client?.name).toBe('Pierra')
  })

  it('accepts article as a natural designation field', () => {
    expect(getLine(voiceToRawQuote('Client Pierre article draps 250 cm quantité 6 prix unitaire 150 dirhams', 20))).toMatchObject({ designation: 'draps 250 cm', quantity: 6, unitPriceHT: 150 })
  })

  it('accepts spoken quantity and spoken price after article', () => {
    expect(getLine(voiceToRawQuote('client Pierre article serviettes quantité six prix unitaire vingt-deux dirhams', 20))).toMatchObject({ designation: 'serviettes', quantity: 6, unitPriceHT: 22 })
  })

  it('accepts price before quantity after article', () => {
    expect(getLine(voiceToRawQuote('client Pierre article draps de 2,30 m sur 2,20 m prix unitaire 150 quantité cinq', 20))).toMatchObject({ designation: 'draps de 2,30 m sur 2,20 m', quantity: 5, unitPriceHT: 150 })
  })

  it('keeps punctuation and dimensions bounded to the article', () => {
    expect(getLine(voiceToRawQuote('client Pierre, article draps de 2,30 m sur deux 2,20 m, quantité cinq, prix unitaire 150 dirhams', 20))).toMatchObject({ designation: 'draps de 2,30 m sur deux 2,20 m', quantity: 5, unitPriceHT: 150 })
  })
})
