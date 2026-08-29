import type { CommercialDocument, CompanySettings } from './types'
import { defaultNumberingBaseline, defaultNumberingPrefixes } from './types'
import { sourceTapistorLogoDataUrl } from './sourceReferenceLogo'

/**
 * Canonical visual/data fixture transcribed from the supplied July 2026 PDF references.
 * It is never auto-seeded into IndexedDB. It exists only for PDF fidelity tests/screenshots.
 */
export const sourceReferenceCompany: CompanySettings = {
  name: 'Benmoussa Rachid',
  brand: 'TAPISTOR SABRE',
  address: '484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT',
  cityLabel: 'RABAT',
  phone: '',
  fax: '',
  email: '',
  ice: '001806241000086',
  ifNumber: '35789182',
  rc: '82972 RABAT',
  patente: '26450045',
  cnss: '7121982',
  bankName: '',
  rib: '181 810 21211 52654410108 03',
  legalLine: 'RC : 82972 RABAT, PATENTE : 26450045, CNSS : 7121982, ICE : 001806241000086, IF : 35789182, RIB : 181 810 21211 52654410108 03',
  defaultVatRate: 20,
  logoDataUrl: sourceTapistorLogoDataUrl,
  managerSignatureDataUrl: '',
  pdfTemplate: 'original',
  onboardingCompleted: true,
  numberingPrefixes: defaultNumberingPrefixes,
  numberingBaseline: defaultNumberingBaseline()
}

const sourceBaseDocument = (): CommercialDocument => ({
  id: 'source-july-2026',
  type: 'FACTURE',
  number: '0107-2026',
  date: '2026-07-06',
  client: 'SECRÉTARIAT D’ETAT CHARGÉ DE L’ARTISANAT ET DE L’ECONOMIE SOCIALE ET SOLIDAIRE',
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  object: 'Enretien de batiment administratif: Capitonnage de porte en similicuir au niveau du secrétariat general',
  lines: [{
    id: 'source-line-1',
    designation: 'Capitonnage de porte en similicuir\n70cm/200cm',
    unit: 'Pièce',
    quantity: 10,
    unitPriceHT: 800,
    vatRate: 20,
    discountPercent: 0
  }],
  blShowPrices: true,
  globalDiscountPercent: 0,
  dueDate: '',
  paymentMethod: 'UNSPECIFIED',
  payments: [],
  status: 'FINALIZED',
  finalizedAt: '2026-07-06T12:00:00.000Z',
  paidAt: '',
  cancelledAt: '',
  sourceDocumentId: '',
  createdAt: '2026-07-06T12:00:00.000Z',
  updatedAt: '2026-07-06T12:00:00.000Z'
})

export const sourceReferenceInvoice = (): CommercialDocument => sourceBaseDocument()

export const sourceReferenceDetailedDeliveryNote = (): CommercialDocument => ({
  ...sourceBaseDocument(),
  id: 'source-july-2026-bl-priced',
  type: 'BL',
  blShowPrices: true
})

export const sourceReferenceSimpleDeliveryNote = (): CommercialDocument => ({
  ...sourceBaseDocument(),
  id: 'source-july-2026-bl-simple',
  type: 'BL',
  number: '06-07-2026',
  client: '',
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  blShowPrices: false
})
