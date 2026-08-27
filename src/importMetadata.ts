const normalizedLine = (value: string) => value.replace(/\s+/g, ' ').trim()

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

const metadataBoundary = /^(?:rabat\s+le|date|objet|object|facture|devis|bon\s+de\s+livraison|designation|désignation|quantite|quantité|prix|total|rc\b|rib\b|ice\b|if\b|adresse\b)/i

export const extractMultilineClientName = (text: string): string | undefined => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizedLine(lines[index])
    const match = line.match(/^(?:client|raison sociale|customer)\s*[:\-]\s*(.+)$/i)
    if (!match?.[1]) continue
    const parts = [normalizedLine(match[1])]
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = normalizedLine(lines[index + offset] ?? '')
      if (!next || metadataBoundary.test(normalizeSearchText(next))) break
      const letters = next.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '')
      if (!letters || next !== next.toUpperCase()) break
      parts.push(next)
    }
    return parts.join(' ')
  }
  return undefined
}

const frenchMonths: Record<string, string> = {
  janvier: '01', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07',
  aout: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12'
}

export const extractDocumentDate = (text: string): string | undefined => {
  const normalized = normalizeSearchText(text)
  const wordDate = normalized.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})\b/)
  if (wordDate) {
    const [, day, month, year] = wordDate
    return `${year}-${frenchMonths[month]}-${day.padStart(2, '0')}`
  }
  const numericDate = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/)
  if (numericDate) {
    const [, day, month, year] = numericDate
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return undefined
}
