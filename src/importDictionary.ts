import type { QuoteDictionary, RawQuotePayload } from './quoteImport'

const normalizeToken = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')

const WORD_CORRECTIONS: Record<string, string> = {
  drapp: 'Drap',
  serviete: 'Serviette',
  serviettte: 'Serviette',
  bainn: 'bain',
  bainnn: 'bain',
  rectangulair: 'rectangulaire',
  renouvelement: 'Renouvellement',
  hotellerie: 'hôtellerie',
  hotelerie: 'hôtellerie'
}

const DESIGNATION_KEYS = new Set([
  'designation', 'désignation', 'libelle', 'libellé', 'article', 'description', 'produit', 'service'
].map(normalizeToken))

export const correctImportText = (value: string): string => value.replace(/\p{L}+/gu, token => (
  WORD_CORRECTIONS[normalizeToken(token)] ?? token
))

export const prepareImportDictionary = (raw: RawQuotePayload): { raw: RawQuotePayload; dictionary: QuoteDictionary } => {
  const prepared = structuredClone(raw)
  const designations: Record<string, string> = {}

  if (typeof prepared.object === 'string') prepared.object = correctImportText(prepared.object)

  for (const row of prepared.lines ?? []) {
    for (const [key, value] of Object.entries(row)) {
      if (!DESIGNATION_KEYS.has(normalizeToken(key)) || typeof value !== 'string') continue
      const corrected = correctImportText(value)
      if (corrected !== value) designations[value] = corrected
    }
  }

  return { raw: prepared, dictionary: { designations } }
}
