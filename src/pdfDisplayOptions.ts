export type PdfDisplayOptionKey =
  | 'object'
  | 'unit'
  | 'unitPriceHT'
  | 'lineTotalHT'
  | 'summaryTotalHT'
  | 'vat'
  | 'amountInWords'
  | 'signatures'
  | 'footer'

export type PdfDisplayOptions = Record<PdfDisplayOptionKey, boolean>

export const defaultPdfDisplayOptions: PdfDisplayOptions = {
  object: true,
  unit: true,
  unitPriceHT: true,
  lineTotalHT: true,
  summaryTotalHT: true,
  vat: true,
  amountInWords: true,
  signatures: true,
  footer: true
}

export const pdfDisplayOptionLabels: Array<{ key: PdfDisplayOptionKey; label: string }> = [
  { key: 'object', label: 'Objet' },
  { key: 'unit', label: 'Unité' },
  { key: 'unitPriceHT', label: 'Prix unitaire HT' },
  { key: 'lineTotalHT', label: 'Total HT par ligne' },
  { key: 'summaryTotalHT', label: 'Total HT' },
  { key: 'vat', label: 'TVA' },
  { key: 'amountInWords', label: 'Montant en lettres' },
  { key: 'signatures', label: 'Signatures' },
  { key: 'footer', label: 'Pied de page' }
]

export const withPdfDisplayOption = (
  options: PdfDisplayOptions,
  key: PdfDisplayOptionKey,
  visible: boolean
): PdfDisplayOptions => ({ ...options, [key]: visible })

export const resolvedPdfDisplayOptions = (options?: Partial<PdfDisplayOptions>): PdfDisplayOptions => ({
  ...defaultPdfDisplayOptions,
  ...options
})
