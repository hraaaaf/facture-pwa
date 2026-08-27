export type PdfLayoutMatrix = Array<Array<string | number | null>>

type PdfItem = { str: string; transform: number[]; width?: number }
type PositionedItem = { text: string; x: number; centerX: number; y: number }
type ParsedNumericRow = { nums: string[]; inlineDesignation: string }

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

const isItem = (value: unknown): value is PdfItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PdfItem>
  return typeof item.str === 'string' && Array.isArray(item.transform) && item.transform.length >= 6
}

const parseNumber = (value: string): number | null => {
  const raw = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(raw)) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const isNumeric = (value: string) => parseNumber(value) !== null

const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const cleanDesignation = (value: string) => value
  .replace(/\t+/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\s+([),.;:])/g, '$1')
  .trim()

const explode = (item: PdfItem): PositionedItem[] => {
  const raw = item.str.trim()
  if (!raw) return []
  const x = item.transform[4]
  const y = item.transform[5]
  const width = typeof item.width === 'number' && Number.isFinite(item.width) ? item.width : 0
  const parts = [...raw.matchAll(/\S+/g)]
  if (parts.length <= 1 || width <= 0) return [{ text: raw, x, centerX: x + width / 2, y }]
  const denominator = Math.max(raw.length, 1)
  return parts.map(match => {
    const text = match[0]
    const start = match.index ?? 0
    const end = start + text.length
    const partX = x + width * (start / denominator)
    const partWidth = width * ((end - start) / denominator)
    return { text, x: partX, centerX: partX + partWidth / 2, y }
  })
}

const groupByVisualLine = (items: PositionedItem[], tolerance: number) => {
  const groups: PositionedItem[][] = []
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const group = groups.find(existing => Math.abs(existing[0].y - item.y) <= tolerance)
    if (group) group.push(item)
    else groups.push([item])
  }
  return groups
}

const lineText = (line: PositionedItem[]) => [...line]
  .sort((a, b) => a.x - b.x)
  .map(item => item.text)
  .join(' ')

const itemsToText = (items: unknown[]) => {
  const positioned = items.filter(isItem).map(item => ({
    text: item.str.trim(),
    x: item.transform[4],
    centerX: item.transform[4] + ((typeof item.width === 'number' ? item.width : 0) / 2),
    y: item.transform[5]
  })).filter(item => item.text)
  return groupByVisualLine(positioned, 2)
    .map(line => [...line].sort((a, b) => a.x - b.x).map(item => item.text).join('\t'))
    .join('\n')
}

const findHeader = (lines: string[]) => {
  for (let start = 0; start < lines.length; start += 1) {
    for (let size = 1; size <= 4 && start + size <= lines.length; size += 1) {
      const value = normalize(lines.slice(start, start + size).join(' '))
      const isHeader = /\b(designation|article|description|libelle)\b/.test(value)
        && /\b(quantite|qte|qty)\b/.test(value)
        && /\b(prix|p\.?u\.?)\b/.test(value)
      if (isHeader) return { start, end: start + size - 1, text: value }
    }
  }
  return null
}

const parseNumericRow = (line: string, expectedCount: number, extraHeader: string | null): ParsedNumericRow | null => {
  const tabParts = line.split(/\t+/).map(value => value.trim()).filter(Boolean)
  const parts = tabParts.length > 1 ? tabParts : line.trim().split(/\s+/)
  if (parts.length < expectedCount) return null
  const tail = parts.slice(-expectedCount)
  const numbers = tail.map(parseNumber)
  if (numbers.some(value => value === null)) return null

  if (extraHeader === 'Total HT') {
    const [quantity, unitPrice, total] = numbers as number[]
    const tolerance = Math.max(0.1, Math.abs(total) * 0.02)
    if (Math.abs(quantity * unitPrice - total) > tolerance) return null
  }
  if (extraHeader === 'TVA') {
    const vat = numbers[2] as number
    if (vat < 0 || vat > 100) return null
  }

  return {
    nums: tail.map(value => value.replace(/[\s\u00a0\u202f]/g, '')),
    inlineDesignation: cleanDesignation(parts.slice(0, -expectedCount).join(' '))
  }
}

export const pdfTextToCandidateTables = (text: string): PdfLayoutMatrix[] => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(value => value.trim()).filter(Boolean)
  const header = findHeader(lines)
  if (!header) return []

  const extraHeader = /\btotal\b/.test(header.text) ? 'Total HT' : /\b(tva|vat)\b/.test(header.text) ? 'TVA' : null
  const expectedCount = extraHeader ? 3 : 2
  const stopPattern = /^(?:total\s+ht|tva\b|total\s+ttc|arret|le\s+client|rc\s*:|rib\s*:)/i
  let stopIndex = lines.length
  for (let index = header.end + 1; index < lines.length; index += 1) {
    if (stopPattern.test(normalize(lines[index]))) {
      stopIndex = index
      break
    }
  }

  const candidates: Array<ParsedNumericRow & { index: number; endIndex: number }> = []
  for (let index = header.end + 1; index < stopIndex; index += 1) {
    const sameLine = parseNumericRow(lines[index], expectedCount, extraHeader)
    if (sameLine) {
      candidates.push({ ...sameLine, index, endIndex: index })
      continue
    }

    if (!isNumeric(lines[index])) continue
    const numericLines = [lines[index]]
    let cursor = index + 1
    while (cursor < stopIndex && numericLines.length < expectedCount && isNumeric(lines[cursor])) {
      numericLines.push(lines[cursor])
      cursor += 1
    }
    if (numericLines.length !== expectedCount) continue
    const separated = parseNumericRow(numericLines.join('\t'), expectedCount, extraHeader)
    if (!separated) continue
    candidates.push({ ...separated, index, endIndex: cursor - 1 })
    index = cursor - 1
  }
  if (!candidates.length) return []

  const rows: typeof candidates = []
  for (const candidate of candidates) {
    if (rows.length && candidate.index - rows[rows.length - 1].index > 8) break
    rows.push(candidate)
  }

  const matrix: PdfLayoutMatrix = [[
    'Désignation',
    'Quantité',
    'Prix unitaire HT',
    ...(extraHeader ? [extraHeader] : [])
  ]]

  rows.forEach((row, rowIndex) => {
    const start = rowIndex === 0
      ? header.end + 1
      : Math.floor((rows[rowIndex - 1].endIndex + row.index) / 2) + 1
    const end = rowIndex + 1 < rows.length
      ? Math.floor((row.endIndex + rows[rowIndex + 1].index) / 2)
      : stopIndex - 1

    const designationParts: string[] = []
    if (row.inlineDesignation) designationParts.push(row.inlineDesignation)
    for (let index = start; index <= end; index += 1) {
      if (index >= row.index && index <= row.endIndex) continue
      const candidate = cleanDesignation(lines[index])
      if (!candidate || stopPattern.test(normalize(candidate)) || isNumeric(candidate)) continue
      if (parseNumericRow(candidate, expectedCount, extraHeader)) continue
      designationParts.push(candidate)
    }

    matrix.push([cleanDesignation(designationParts.join(' ')), ...row.nums])
  })

  return matrix.length > 1 ? [matrix] : []
}

const geometryTable = (items: unknown[]): PdfLayoutMatrix | null => {
  const positioned = items.filter(isItem).flatMap(explode)
  if (!positioned.length) return null
  const lines = groupByVisualLine(positioned, 3)
  const header = lines.find(line => {
    const text = normalize(lineText(line))
    return /\b(designation|article|description|libelle)\b/.test(text)
      && /\b(quantite|qte|qty)\b/.test(text)
      && /\b(prix|p\.?u\.?)\b/.test(text)
  })
  if (!header) return null

  const headerText = normalize(lineText(header))
  const extraHeader = /\btotal\b/.test(headerText) ? 'Total HT' : /\b(tva|vat)\b/.test(headerText) ? 'TVA' : null
  const headerY = header.reduce((sum, item) => sum + item.y, 0) / header.length

  type NumericRow = { y: number; nums: PositionedItem[]; distance: number; direction: 1 | -1 }
  const candidates: NumericRow[] = []
  for (const line of lines) {
    if (line === header) continue
    const nums = line.filter(item => isNumeric(item.text)).sort((a, b) => a.centerX - b.centerX)
    if (nums.length < 2) continue
    const y = line.reduce((sum, item) => sum + item.y, 0) / line.length
    const delta = y - headerY
    if (Math.abs(delta) <= 3) continue
    candidates.push({ y, nums, distance: Math.abs(delta), direction: delta > 0 ? 1 : -1 })
  }

  const side = (direction: 1 | -1) => candidates
    .filter(row => row.direction === direction && row.distance < 420)
    .sort((a, b) => a.distance - b.distance)
  const plus = side(1)
  const minus = side(-1)
  const minNumbers = extraHeader ? 3 : 2
  const rows = (plus.filter(row => row.nums.length >= minNumbers).length > minus.filter(row => row.nums.length >= minNumbers).length ? plus : minus)
    .filter(row => row.nums.length >= minNumbers)
  if (!rows.length) return null

  const contiguous: NumericRow[] = []
  const gaps: number[] = []
  for (const row of rows) {
    if (contiguous.length) {
      const gap = row.distance - contiguous[contiguous.length - 1].distance
      const typical = median(gaps)
      if (gaps.length >= 2 && typical > 0 && gap > typical * 2.1) break
      gaps.push(gap)
    }
    contiguous.push(row)
  }
  if (!contiguous.length) return null

  const quantityX = median(contiguous.map(row => row.nums[0].centerX))
  const priceX = median(contiguous.map(row => row.nums[1].centerX))
  if (!(priceX > quantityX + 6)) return null
  const leftQuantityBoundary = quantityX - (priceX - quantityX) / 2
  const direction = contiguous[0].direction
  const body = positioned.map(item => ({ ...item, t: (item.y - headerY) * direction }))
  const matrix: PdfLayoutMatrix = [[
    'Désignation', 'Quantité', 'Prix unitaire HT', ...(extraHeader ? [extraHeader] : [])
  ]]

  contiguous.forEach((row, index) => {
    const distance = Math.abs(row.y - headerY)
    const previous = index === 0 ? 0 : Math.abs(contiguous[index - 1].y - headerY)
    const next = index + 1 < contiguous.length
      ? Math.abs(contiguous[index + 1].y - headerY)
      : distance + Math.max(distance - previous, 24)
    const top = (previous + distance) / 2
    const bottom = (distance + next) / 2
    const designation = cleanDesignation(body
      .filter(item => item.t > top && item.t < bottom && item.centerX < leftQuantityBoundary)
      .sort((a, b) => Math.abs(a.t - b.t) > 1 ? a.t - b.t : a.x - b.x)
      .map(item => item.text)
      .join(' '))
    const nums = row.nums.map(item => item.text.replace(/[\s\u00a0\u202f]/g, ''))
    matrix.push([designation, nums[0], nums[1], ...(extraHeader ? [nums[2] ?? ''] : [])])
  })
  return matrix.length > 1 ? matrix : null
}

export const pdfItemsToCandidateTables = (items: unknown[]): PdfLayoutMatrix[] => {
  const geometry = geometryTable(items)
  const text = pdfTextToCandidateTables(itemsToText(items))[0] ?? null
  const best = !geometry ? text : !text ? geometry : text.length > geometry.length ? text : geometry
  return best ? [best] : []
}

export function matrixToObjects(matrix: PdfLayoutMatrix) {
  const headers = matrix[0].map(String)
  return matrix.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])))
}
