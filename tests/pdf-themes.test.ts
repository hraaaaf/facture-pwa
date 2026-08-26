import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createThemedPdf, premiumThemeOptions, type PremiumThemeId } from '../src/pdfThemes'
import { sourceReferenceCompany, sourceReferenceInvoice } from '../src/referenceFixture'
import type { CommercialDocument, DocumentType } from '../src/types'

const customThemes = premiumThemeOptions.map(option => option.id).filter((id): id is Exclude<PremiumThemeId, 'original' | 'premium'> => id !== 'original' && id !== 'premium')
const artifactDir = 'artifacts/pdf-themes'

const makeDocument = (type: DocumentType): CommercialDocument => {
  const source = sourceReferenceInvoice()
  return {
    ...source,
    id: `theme-${type.toLowerCase()}`,
    type,
    number: `${type}-2026-001`,
    client: 'ATLAS DESIGN & HOSPITALITY',
    clientAddress: 'Casablanca, Maroc',
    clientIce: '002345678000012',
    clientIfNumber: '87654321',
    object: 'Collection de documents premium haut de gamme',
    lines: [
      { ...source.lines[0], id: 'l1', designation: 'Conception et fourniture premium', quantity: 2, unitPriceHT: 1250 },
      { ...source.lines[0], id: 'l2', designation: 'Installation et mise en service', quantity: 1, unitPriceHT: 1800 }
    ],
    blShowPrices: type === 'BL' ? false : true
  }
}

describe('premium PDF themes', () => {
  it('exposes six new high-end themes in addition to Original/Premium', () => {
    expect(customThemes).toEqual(['majestic', 'lumiere', 'terracotta', 'innova', 'platine', 'atlas'])
    expect(premiumThemeOptions).toHaveLength(8)
  })

  it('generates every custom theme for Facture, Devis, BL and BC and writes proof PDFs', () => {
    mkdirSync(artifactDir, { recursive: true })
    for (const theme of customThemes) {
      for (const type of ['FACTURE', 'DEVIS', 'BL', 'BC'] as DocumentType[]) {
        const pdf = createThemedPdf(makeDocument(type), sourceReferenceCompany, theme)
        const bytes = new Uint8Array(pdf.output('arraybuffer'))
        expect(bytes.byteLength, `${theme}/${type}`).toBeGreaterThan(3000)
        expect(pdf.getNumberOfPages(), `${theme}/${type}`).toBeGreaterThanOrEqual(1)
        if (type === 'FACTURE') writeFileSync(`${artifactDir}/${theme}-facture.pdf`, bytes)
      }
    }
  })
})
