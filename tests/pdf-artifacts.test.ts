import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPdf } from '../src/pdf'
import {
  sourceReferenceCompany,
  sourceReferenceDetailedDeliveryNote,
  sourceReferenceInvoice,
  sourceReferenceSimpleDeliveryNote
} from '../src/referenceFixture'
import type { CommercialDocument } from '../src/types'

const artifactDir = resolve(process.cwd(), 'artifacts', 'pdf')

const writePdf = (name: string, document: CommercialDocument, template: 'original' | 'premium') => {
  mkdirSync(artifactDir, { recursive: true })
  const pdf = createPdf(document, sourceReferenceCompany, template)
  const bytes = new Uint8Array(pdf.output('arraybuffer'))
  const path = resolve(artifactDir, name)
  writeFileSync(path, bytes)
  expect(bytes.length).toBeGreaterThan(1000)
  expect(Buffer.from(bytes.subarray(0, 5)).toString('ascii')).toBe('%PDF-')
  return bytes.length
}

describe('exact-head PDF artifacts', () => {
  it('generates Original source-reference PDFs', () => {
    expect(writePdf('facture-original.pdf', sourceReferenceInvoice(), 'original')).toBeGreaterThan(1000)
    expect(writePdf('bl-detaille-original.pdf', sourceReferenceDetailedDeliveryNote(), 'original')).toBeGreaterThan(1000)
    expect(writePdf('bl-simple-original.pdf', sourceReferenceSimpleDeliveryNote(), 'original')).toBeGreaterThan(1000)
  })

  it('generates Premium normal and stress PDFs', () => {
    const normal = sourceReferenceInvoice()
    const stress: CommercialDocument = {
      ...sourceReferenceInvoice(),
      id: 'source-july-2026-premium-stress',
      clientAddress: 'Avenue Mohammed V, Rabat',
      clientIce: '001234567000089',
      clientIfNumber: '12345678',
      globalDiscountPercent: 5,
      lines: sourceReferenceInvoice().lines.map(line => ({ ...line, discountPercent: 10 }))
    }

    expect(writePdf('facture-premium.pdf', normal, 'premium')).toBeGreaterThan(1000)
    expect(writePdf('facture-premium-stress.pdf', stress, 'premium')).toBeGreaterThan(1000)
  })
})
