export type DocumentType = 'DEVIS' | 'FACTURE' | 'BL' | 'BC'

export interface DocumentLine {
  id: string
  designation: string
  unit: string
  quantity: number
  unitPriceHT: number
  vatRate: number
}

export interface CommercialDocument {
  id: string
  type: DocumentType
  number: string
  date: string
  client: string
  object: string
  lines: DocumentLine[]
  blShowPrices: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanySettings {
  name: string
  brand: string
  address: string
  legalLine: string
  cityLabel: string
  defaultVatRate: number
  logoDataUrl: string
  managerSignatureDataUrl: string
}

export const defaultCompany: CompanySettings = {
  name: 'Benmoussa Rachid',
  brand: 'TAPISTOR SABRE',
  address: '484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT',
  legalLine: 'RC : 82972 RABAT, PATENTE : 26450045, CNSS : 7121982, ICE : 001806241000086, IF : 35789182, RIB : 181 810 21211 52654410108 03',
  cityLabel: 'RABAT',
  defaultVatRate: 20,
  logoDataUrl: '',
  managerSignatureDataUrl: ''
}
