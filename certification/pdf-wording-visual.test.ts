import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createPdf } from '../src/pdf'
import { sourceReferenceCompany, sourceReferenceInvoice } from '../src/referenceFixture'
import type { CommercialDocument, DocumentType } from '../src/types'

const artifactDir = 'artifacts/pdf-wording'

const makeDocument = (type: DocumentType): CommercialDocument => ({
  ...sourceReferenceInvoice(),
  id: `wording-${type.toLowerCase()}`,
  type,
  number: `${type}-WORDING-001`,
  client: 'ATLAS DESIGN & HOSPITALITY',
  object: 'Preuve visuelle de la formule de montant en lettres',
  blShowPrices: true
})

describe('PDF wording visual proof', () => {
  it('writes Original and Premium PDFs for every document type', () => {
    mkdirSync(artifactDir, { recursive: true })
    for (const type of ['FACTURE', 'DEVIS', 'BL', 'BC'] as DocumentType[]) {
      for (const template of ['original', 'premium'] as const) {
        const pdf = createPdf(makeDocument(type), sourceReferenceCompany, template)
        const bytes = new Uint8Array(pdf.output('arraybuffer'))
        expect(bytes.byteLength, `${type}/${template}`).toBeGreaterThan(1000)
        writeFileSync(`${artifactDir}/${type.toLowerCase()}-${template}.pdf`, bytes)
      }
    }
  })
})
