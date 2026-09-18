import type { CommercialDocument, DocumentLine } from './types'
import type { CanonicalQuoteJSON, CanonicalQuoteLine } from './quoteImport'

export type ImportedQuoteFields = Pick<CommercialDocument,
  'client' | 'clientAddress' | 'clientIce' | 'clientIfNumber' | 'object' | 'date' | 'lines' | 'globalDiscountPercent'>

export type QuoteSelectionField =
  | 'client'
  | 'object'
  | 'date'
  | 'clientAddress'
  | 'clientIce'
  | 'clientIfNumber'
  | 'globalDiscountPercent'

export interface QuoteImportSelection {
  fields: Record<QuoteSelectionField, boolean>
  lines: boolean[]
}

const nonEmpty = (value: string | null | undefined) => Boolean(value?.trim())

export const isImportableQuoteLine = (line: CanonicalQuoteLine) =>
  nonEmpty(line.designation)
  && nonEmpty(line.unit)
  && line.quantity !== null
  && line.quantity > 0
  && line.unitPriceHT !== null
  && line.unitPriceHT >= 0
  && line.vatRate !== null
  && line.vatRate >= 0
  && line.vatRate <= 100

export const defaultQuoteImportSelection = (quote: CanonicalQuoteJSON): QuoteImportSelection => ({
  fields: {
    client: nonEmpty(quote.client.name),
    object: nonEmpty(quote.quote.object),
    date: nonEmpty(quote.quote.date),
    clientAddress: nonEmpty(quote.client.address),
    clientIce: nonEmpty(quote.client.ice),
    clientIfNumber: nonEmpty(quote.client.ifNumber),
    globalDiscountPercent: quote.quote.globalDiscountPercent > 0
  },
  lines: quote.lines.map(isImportableQuoteLine)
})

export const selectedQuoteImportCount = (selection: QuoteImportSelection) =>
  Object.values(selection.fields).filter(Boolean).length + selection.lines.filter(Boolean).length

export const quoteImportSelectableCount = (quote: CanonicalQuoteJSON) => {
  const selection = defaultQuoteImportSelection(quote)
  return selectedQuoteImportCount(selection)
}

export const selectedQuoteToDraftFields = (
  quote: CanonicalQuoteJSON,
  selection: QuoteImportSelection,
  lineId: (index: number) => string = index => `import-${index + 1}`
): ImportedQuoteFields => {
  const lines: DocumentLine[] = quote.lines.flatMap((line, index) => {
    if (!selection.lines[index] || !isImportableQuoteLine(line)) return []
    return [{
      id: lineId(index),
      designation: line.designation!,
      unit: line.unit!,
      quantity: line.quantity!,
      unitPriceHT: line.unitPriceHT!,
      vatRate: line.vatRate!,
      discountPercent: line.discountPercent
    }]
  })

  return {
    client: selection.fields.client ? quote.client.name ?? '' : '',
    clientAddress: selection.fields.clientAddress ? quote.client.address ?? '' : '',
    clientIce: selection.fields.clientIce ? quote.client.ice ?? '' : '',
    clientIfNumber: selection.fields.clientIfNumber ? quote.client.ifNumber ?? '' : '',
    object: selection.fields.object ? quote.quote.object ?? '' : '',
    date: selection.fields.date ? quote.quote.date ?? '' : '',
    lines,
    globalDiscountPercent: selection.fields.globalDiscountPercent ? quote.quote.globalDiscountPercent : 0
  }
}
