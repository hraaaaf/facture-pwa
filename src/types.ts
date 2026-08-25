export type DocumentType = 'DEVIS' | 'FACTURE' | 'BL' | 'BC'
export type PdfTemplatePreference = 'original' | 'premium'

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
}

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
  logoDataUrl: '',
  managerSignatureDataUrl: '',
  pdfTemplate: 'premium',
  onboardingCompleted: false
}

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

  // Les anciennes installations stockaient tout dans legalLine. On la conserve
  // uniquement en fallback pour éviter de dupliquer les mêmes identifiants.
  return structured.length > 0 ? structured.join(' · ') : company.legalLine
}
