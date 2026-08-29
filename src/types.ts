import { temporaryTapistorLogoDataUrl } from './brand'

export type DocumentType = 'DEVIS' | 'FACTURE' | 'BL' | 'BC'
export type PdfTemplatePreference = 'original' | 'premium'
export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED'
export type PaymentMethod = 'UNSPECIFIED' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CARD' | 'OTHER'

export interface PaymentRecord {
  id: string
  amount: number
  date: string
  method: PaymentMethod
  note: string
  createdAt: string
}

export interface DocumentLine {
  id: string
  designation: string
  unit: string
  quantity: number
  unitPriceHT: number
  vatRate: number
  /** Optional for compatibility with documents created before the discount engine. */
  discountPercent?: number
}

export interface ClientProfile {
  id: string
  name: string
  company: string
  address: string
  ice: string
  ifNumber: string
  phone: string
  email: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface CatalogItem {
  id: string
  designation: string
  unit: string
  lastUnitPriceHT: number
  vatRate: number
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface CommercialDocument {
  id: string
  type: DocumentType
  /** Empty while draft. Assigned atomically at finalization and never reused. */
  number: string
  date: string
  client: string
  /** Optional link to the local reusable client profile. */
  clientId: string
  /** Snapshot fields kept on the document so historical output does not change when a client profile changes later. */
  clientAddress: string
  clientIce: string
  clientIfNumber: string
  object: string
  lines: DocumentLine[]
  blShowPrices: boolean
  globalDiscountPercent: number
  /** Optional payment due date for invoices. Empty means no due date tracked. */
  dueDate: string
  /** Intended/default settlement method. Individual payments keep their own method. */
  paymentMethod: PaymentMethod
  /** Append-only settlement ledger for invoices. */
  payments: PaymentRecord[]
  status: DocumentStatus
  finalizedAt: string
  paidAt: string
  cancelledAt: string
  sourceDocumentId: string
  createdAt: string
  updatedAt: string
}

export interface NumberingPrefixes {
  DEVIS: string
  FACTURE: string
  BL: string
  BC: string
}

export interface NumberingBaseline {
  /** Calendar year to which the pre-existing document sequence belongs. */
  year: number
  /** Last number already consumed outside Factea. Zero means no previous document. */
  lastUsed: Record<DocumentType, number>
}

export interface CompanySettings {
  name: string
  brand: string
  address: string
  cityLabel: string
  phone: string
  fax: string
  email: string
  ice: string
  ifNumber: string
  rc: string
  patente: string
  cnss: string
  bankName: string
  rib: string
  /** Legacy/free footer line kept for compatibility with older local data. */
  legalLine: string
  defaultVatRate: number
  logoDataUrl: string
  managerSignatureDataUrl: string
  pdfTemplate: PdfTemplatePreference
  onboardingCompleted: boolean
  numberingPrefixes: NumberingPrefixes
  /** Initial real-world numbering state captured once during onboarding. */
  numberingBaseline: NumberingBaseline
}

export const defaultNumberingPrefixes: NumberingPrefixes = {
  DEVIS: 'DEV',
  FACTURE: 'F',
  BL: 'BL',
  BC: 'BC'
}

export const defaultNumberingBaseline = (): NumberingBaseline => ({
  year: new Date().getFullYear(),
  lastUsed: {
    DEVIS: 0,
    FACTURE: 0,
    BL: 0,
    BC: 0
  }
})

export const defaultCompany: CompanySettings = {
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
  legalLine: '',
  defaultVatRate: 20,
  // Temporary fictitious mark used until the real logo is uploaded in E0/E6.
  logoDataUrl: temporaryTapistorLogoDataUrl,
  managerSignatureDataUrl: '',
  pdfTemplate: 'premium',
  onboardingCompleted: false,
  numberingPrefixes: defaultNumberingPrefixes,
  numberingBaseline: defaultNumberingBaseline()
}

export const clientDisplayName = (client: Pick<ClientProfile, 'name' | 'company'>) =>
  client.company.trim() || client.name.trim()

export const companyLegalLine = (company: CompanySettings) => {
  const structured = [
    company.rc && `RC : ${company.rc}`,
    company.patente && `PATENTE : ${company.patente}`,
    company.cnss && `CNSS : ${company.cnss}`,
    company.ice && `ICE : ${company.ice}`,
    company.ifNumber && `IF : ${company.ifNumber}`,
    company.phone && `TEL : ${company.phone}`,
    company.fax && `FAX : ${company.fax}`,
    company.email && `EMAIL : ${company.email}`,
    company.rib && `RIB : ${company.rib}`
  ].filter(Boolean)
  return structured.length > 0 ? structured.join(' · ') : company.legalLine
}
