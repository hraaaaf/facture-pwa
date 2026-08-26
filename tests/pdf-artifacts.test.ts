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
  return { bytes: bytes.length, pages: pdf.getNumberOfPages() }
}

const multiPageInvoice = (): CommercialDocument => {
  const source = sourceReferenceInvoice()
  const seed = source.lines[0]
  return {
    ...source,
    id: 'source-july-2026-multipage',
    number: 'MULTI-2026-001',
    object: 'Certification multi-page : pagination, footer, totaux et signatures sans chevauchement',
    lines: Array.from({ length: 28 }, (_, index) => ({
      ...seed,
      id: `multi-line-${index + 1}`,
      designation: `Article de certification ${String(index + 1).padStart(2, '0')}\nDescription longue pour exercer le retour à la ligne et la pagination`,
      quantity: (index % 3) + 1,
      unitPriceHT: 100 + index * 7,
      vatRate: index % 2 === 0 ? 20 : 10,
      discountPercent: index % 5 === 0 ? 5 : 0
    })),
    globalDiscountPercent: 3
  }
}

describe('exact-head PDF artifacts', () => {
  it('generates Original source-reference PDFs', () => {
    expect(writePdf('facture-original.pdf', sourceReferenceInvoice(), 'original').bytes).toBeGreaterThan(1000)
    expect(writePdf('bl-detaille-original.pdf', sourceReferenceDetailedDeliveryNote(), 'original').bytes).toBeGreaterThan(1000)
    expect(writePdf('bl-simple-original.pdf', sourceReferenceSimpleDeliveryNote(), 'original').bytes).toBeGreaterThan(1000)
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

    expect(writePdf('facture-premium.pdf', normal, 'premium').bytes).toBeGreaterThan(1000)
    expect(writePdf('facture-premium-stress.pdf', stress, 'premium').bytes).toBeGreaterThan(1000)
  })

  it('paginates long documents in Original and Premium', () => {
    const document = multiPageInvoice()
    const original = writePdf('facture-original-multipage.pdf', document, 'original')
    const premium = writePdf('facture-premium-multipage.pdf', document, 'premium')

    expect(original.pages).toBeGreaterThan(1)
    expect(premium.pages).toBeGreaterThan(1)
  })
})
