export type PdfLayoutMatrix = Array<Array<string | number | null>>

type PdfPositionedTextItemLike = {
  str: string
  transform: number[]
  width?: number
}

type PositionedItem = {
  text: string
  x: number
  centerX: number
  y: number
}

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

const isPositionedTextItem = (item: unknown): item is PdfPositionedTextItemLike => {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Partial<PdfPositionedTextItemLike>
  return typeof candidate.str === 'string'
    && Array.isArray(candidate.transform)
    && candidate.transform.length >= 6
}

const groupByVisualLine = (items: PositionedItem[], tolerance = 3) => {
  const groups: PositionedItem[][] = []
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const group = groups.find(existing => Math.abs(existing[0].y - item.y) <= tolerance)
    if (group) group.push(item)
    else groups.push([item])
  }
  return groups
}

const lineText = (line: PositionedItem[]) => line
  .slice()
  .sort((a, b) => a.x - b.x)
  .map(item => item.text)
  .join(' ')

const cellText = (items: PositionedItem[]) => items
  .slice()
  .sort((a, b) => a.x - b.x)
  .map(item => item.text)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim()

const numericCell = (value: string) => /^[-+]?\d+(?:[.,]\d+)?$/.test(value.replace(/[\s\u00a0\u202f]/g, ''))

const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export const pdfItemsToCandidateTables = (items: Array<unknown>): PdfLayoutMatrix[] => {
  const positioned = items
    .filter(isPositionedTextItem)
    .map(item => {
      const text = item.str.trim()
      const width = typeof item.width === 'number' && Number.isFinite(item.width) ? item.width : 0
      return {
        text,
        x: item.transform[4],
        centerX: item.transform[4] + width / 2,
        y: item.transform[5]
      }
    })
    .filter(item => item.text)

  if (!positioned.length) return []
  const visualLines = groupByVisualLine(positioned)
  const header = visualLines.find(line => {
    const joined = normalizeSearchText(lineText(line))
    return /\b(designation|article|description|libelle)\b/.test(joined)
      && /\b(quantite|qte|qty)\b/.test(joined)
      && /\b(prix|p\.?u\.?)\b/.test(joined)
  })
  if (!header) return []

  const anchor = (pattern: RegExp) => {
    const matches = header.filter(item => pattern.test(normalizeSearchText(item.text)))
    if (!matches.length) return null
    return matches.sort((a, b) => a.x - b.x)[0].centerX
  }

  const quantityX = anchor(/\b(quantite|qte|qty)\b/)
  const priceX = anchor(/\b(prix|p\.?u\.?)\b/)
  const totalX = anchor(/\btotal\b/)
  if (quantityX === null || priceX === null || priceX <= quantityX + 8) return []

  const leftQuantityBoundary = quantityX - (priceX - quantityX) / 2
  const quantityPriceBoundary = (quantityX + priceX) / 2
  const priceTotalBoundary = totalX !== null && totalX > priceX
    ? (priceX + totalX) / 2
    : Number.POSITIVE_INFINITY

  const columnOf = (item: PositionedItem) => {
    if (item.centerX < leftQuantityBoundary) return 'designation' as const
    if (item.centerX < quantityPriceBoundary) return 'quantity' as const
    if (item.centerX < priceTotalBoundary) return 'unitPriceHT' as const
    return 'total' as const
  }

  const headerY = header.reduce((sum, item) => sum + item.y, 0) / header.length
  const numericRows = visualLines
    .filter(line => line !== header)
    .map(line => {
      const cells = { designation: [] as PositionedItem[], quantity: [] as PositionedItem[], unitPriceHT: [] as PositionedItem[], total: [] as PositionedItem[] }
      for (const item of line) cells[columnOf(item)].push(item)
      const quantity = cellText(cells.quantity)
      const unitPriceHT = cellText(cells.unitPriceHT)
      return {
        y: line.reduce((sum, item) => sum + item.y, 0) / line.length,
        cells,
        quantity,
        unitPriceHT
      }
    })
    .filter(row => numericCell(row.quantity) && numericCell(row.unitPriceHT))

  if (!numericRows.length) return []
  const closest = [...numericRows].sort((a, b) => Math.abs(a.y - headerY) - Math.abs(b.y - headerY))[0]
  const direction = closest.y >= headerY ? 1 : -1
  const rows = numericRows
    .map(row => ({ ...row, t: (row.y - headerY) * direction }))
    .filter(row => row.t > 3)
    .sort((a, b) => a.t - b.t)

  if (!rows.length) return []

  const contiguous: typeof rows = []
  const gaps: number[] = []
  for (const row of rows) {
    if (contiguous.length) {
      const gap = row.t - contiguous[contiguous.length - 1].t
      const typicalGap = median(gaps)
      if (gaps.length >= 2 && typicalGap > 0 && gap > typicalGap * 2.2) break
      gaps.push(gap)
    }
    contiguous.push(row)
  }

  const body = positioned.map(item => ({ ...item, t: (item.y - headerY) * direction }))
  const matrix: PdfLayoutMatrix = [[
    'Désignation',
    'Quantité',
    'Prix unitaire HT',
    ...(totalX !== null ? ['Total HT'] : [])
  ]]

  contiguous.forEach((row, index) => {
    const previousT = index === 0 ? 0 : contiguous[index - 1].t
    const nextT = index + 1 < contiguous.length
      ? contiguous[index + 1].t
      : row.t + Math.max(row.t - previousT, 24)
    const top = (previousT + row.t) / 2
    const bottom = (row.t + nextT) / 2
    const designation = body
      .filter(item => item.t > top && item.t < bottom && columnOf(item) === 'designation')
      .sort((a, b) => Math.abs(a.t - b.t) > 1 ? a.t - b.t : a.x - b.x)
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([),.;:])/g, '$1')
      .trim()

    matrix.push([
      designation,
      row.quantity,
      row.unitPriceHT,
      ...(totalX !== null ? [cellText(row.cells.total)] : [])
    ])
  })

  return matrix.length >= 2 ? [matrix] : []
}
