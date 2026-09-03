import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineTotalHT } from './lib'
import { resolvedPdfDisplayOptions, type PdfDisplayOptions } from './pdfDisplayOptions'
import { companyLegalLine } from './types'
import type { CommercialDocument, CompanySettings } from './types'
import { createPdf as createBasePdf, type PdfTemplate as BasePdfTemplate } from './pdf'

export type PremiumThemeId = BasePdfTemplate | 'majestic' | 'lumiere' | 'terracotta' | 'innova' | 'platine' | 'atlas'

export const premiumThemeOptions: Array<{ id: PremiumThemeId; label: string; subtitle: string }> = [
  { id: 'original', label: 'Original', subtitle: 'Référence fidèle' },
  { id: 'premium', label: 'Premium', subtitle: 'Vert contemporain' },
  { id: 'majestic', label: 'Majestic', subtitle: 'Navy & or' },
  { id: 'lumiere', label: 'Lumière', subtitle: 'Éditorial minimal' },
  { id: 'terracotta', label: 'Terracotta', subtitle: 'Héritage chaleureux' },
  { id: 'innova', label: 'Innova', subtitle: 'Corporate bleu' },
  { id: 'platine', label: 'Platine', subtitle: 'Noir & argent' },
  { id: 'atlas', label: 'Atlas Prestige', subtitle: 'Vert & or marocain' }
]

type CustomTheme = Exclude<PremiumThemeId, BasePdfTemplate>
type RGB = [number, number, number]
type StandardPdfFont = 'helvetica' | 'times' | 'courier'
type FontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic'

type ThemeSpec = {
  id: CustomTheme
  variant: 'band' | 'editorial' | 'sidebar' | 'corporate' | 'split' | 'ornate'
  primary: RGB
  secondary: RGB
  accent: RGB
  paper: RGB
  muted: RGB
  titleFont: StandardPdfFont
  titleStyle: FontStyle
  bodyFont: StandardPdfFont
}

const THEMES: Record<CustomTheme, ThemeSpec> = {
  majestic: { id: 'majestic', variant: 'band', primary: [7, 37, 70], secondary: [255, 255, 255], accent: [200, 151, 53], paper: [255, 255, 255], muted: [92, 101, 112], titleFont: 'times', titleStyle: 'bold', bodyFont: 'helvetica' },
  lumiere: { id: 'lumiere', variant: 'editorial', primary: [28, 28, 28], secondary: [255, 255, 255], accent: [164, 153, 139], paper: [252, 250, 247], muted: [105, 101, 95], titleFont: 'times', titleStyle: 'normal', bodyFont: 'helvetica' },
  terracotta: { id: 'terracotta', variant: 'sidebar', primary: [172, 77, 46], secondary: [255, 248, 241], accent: [223, 169, 126], paper: [255, 252, 249], muted: [113, 91, 81], titleFont: 'times', titleStyle: 'bold', bodyFont: 'helvetica' },
  innova: { id: 'innova', variant: 'corporate', primary: [10, 49, 87], secondary: [245, 249, 252], accent: [49, 101, 151], paper: [255, 255, 255], muted: [93, 109, 123], titleFont: 'helvetica', titleStyle: 'bold', bodyFont: 'helvetica' },
  platine: { id: 'platine', variant: 'split', primary: [18, 18, 18], secondary: [243, 243, 241], accent: [151, 151, 145], paper: [255, 255, 255], muted: [99, 99, 95], titleFont: 'times', titleStyle: 'normal', bodyFont: 'helvetica' },
  atlas: { id: 'atlas', variant: 'ornate', primary: [4, 82, 59], secondary: [255, 253, 247], accent: [183, 141, 46], paper: [255, 254, 249], muted: [79, 103, 94], titleFont: 'times', titleStyle: 'bold', bodyFont: 'helvetica' }
}

const money = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format(value).replace(/[\u202f\u00a0]/g, ' ')

const formattedDate = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  .format(new Date(`${iso}T12:00:00`))

const showPricing = (document: CommercialDocument) => document.type !== 'BL' || document.blShowPrices
const displayNumber = (document: CommercialDocument) => document.number.trim() || 'BROUILLON'
const imageFormat = (dataUrl: string) => dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'

const addImageSafe = (pdf: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) => {
  if (!dataUrl) return
  try { pdf.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, 'FAST') } catch { /* asset local invalide: fallback texte */ }
}

const setColor = (pdf: jsPDF, color: RGB) => pdf.setTextColor(color[0], color[1], color[2])
const setFill = (pdf: jsPDF, color: RGB) => pdf.setFillColor(color[0], color[1], color[2])
const setDraw = (pdf: jsPDF, color: RGB) => pdf.setDrawColor(color[0], color[1], color[2])

const tableColumns = (document: CommercialDocument, options: PdfDisplayOptions) => [
  { key: 'designation', label: 'DÉSIGNATION', weight: 2.5 },
  ...(options.unit ? [{ key: 'unit', label: 'UNITÉ', weight: 0.8 }] : []),
  { key: 'quantity', label: 'QTÉ', weight: 0.65 },
  ...(showPricing(document) && options.unitPriceHT ? [{ key: 'unitPriceHT', label: 'PU HT', weight: 1 }] : []),
  ...(showPricing(document) && options.lineTotalHT ? [{ key: 'lineTotalHT', label: 'TOTAL HT', weight: 1.1 }] : [])
]

const head = (document: CommercialDocument, options: PdfDisplayOptions) => [tableColumns(document, options).map(column => column.label)]

const rows = (document: CommercialDocument, options: PdfDisplayOptions) => document.lines.map(line => {
  const designation = (line.discountPercent ?? 0) > 0
    ? `${line.designation || '—'}\nRemise ${line.discountPercent}%`
    : line.designation || '—'
  return tableColumns(document, options).map(column => {
    if (column.key === 'designation') return designation
    if (column.key === 'unit') return line.unit || '—'
    if (column.key === 'quantity') return String(line.quantity)
    if (column.key === 'unitPriceHT') return money(line.unitPriceHT)
    return money(lineTotalHT(line))
  })
})

const drawPattern = (pdf: jsPDF, theme: ThemeSpec) => {
  if (theme.variant !== 'ornate') return
  setDraw(pdf, theme.accent)
  pdf.setLineWidth(0.12)
  for (let i = 0; i < 5; i += 1) {
    const inset = 4 + i * 2.2
    pdf.line(inset, 3, inset + 12, 15)
    pdf.line(210 - inset, 3, 198 - inset, 15)
  }
}

const drawPageBase = (pdf: jsPDF, theme: ThemeSpec) => {
  setFill(pdf, theme.paper)
  pdf.rect(0, 0, 210, 297, 'F')
  if (theme.variant === 'sidebar') {
    setFill(pdf, theme.primary)
    pdf.rect(0, 0, 44, 297, 'F')
  }
  drawPattern(pdf, theme)
}

const drawIdentity = (pdf: jsPDF, company: CompanySettings, theme: ThemeSpec, x: number, y: number, color: RGB, maxWidth = 75) => {
  addImageSafe(pdf, company.logoDataUrl, x, y, 18, 16)
  const textX = company.logoDataUrl ? x + 22 : x
  setColor(pdf, color)
  pdf.setFont(theme.bodyFont, 'bold')
  pdf.setFontSize(11)
  pdf.text(pdf.splitTextToSize(company.name, maxWidth), textX, y + 4)
  pdf.setFont(theme.bodyFont, 'normal')
  pdf.setFontSize(6.5)
  if (company.brand) pdf.text(pdf.splitTextToSize(company.brand, maxWidth), textX, y + 10)
}

const setThemeTitle = (pdf: jsPDF, theme: ThemeSpec, size: number) => {
  pdf.setFont(theme.titleFont, theme.titleStyle)
  pdf.setFontSize(size)
  if ('setCharSpace' in pdf) pdf.setCharSpace(theme.id === 'innova' ? 0.45 : theme.id === 'majestic' ? 0.18 : 0)
}

const resetCharSpace = (pdf: jsPDF) => { if ('setCharSpace' in pdf) pdf.setCharSpace(0) }

const drawHeader = (pdf: jsPDF, document: CommercialDocument, company: CompanySettings, theme: ThemeSpec) => {
  const title = documentLabel(document.type).toUpperCase()
  const number = displayNumber(document)

  if (theme.variant === 'band') {
    setFill(pdf, theme.primary); pdf.rect(0, 0, 210, 58, 'F')
    drawIdentity(pdf, company, theme, 14, 13, theme.secondary)
    setColor(pdf, theme.secondary); setThemeTitle(pdf, theme, 24); pdf.text(title, 194, 24, { align: 'right' }); resetCharSpace(pdf)
    setColor(pdf, theme.accent); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(10); pdf.text(number, 194, 36, { align: 'right' })
    setColor(pdf, theme.secondary); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7); pdf.text(formattedDate(document.date), 194, 44, { align: 'right' })
    setFill(pdf, theme.accent); pdf.rect(0, 58, 210, 1.2, 'F')
    return 70
  }

  if (theme.variant === 'editorial') {
    drawIdentity(pdf, company, theme, 14, 12, theme.primary)
    setColor(pdf, theme.primary); setThemeTitle(pdf, theme, 29); pdf.text(title, 14, 54); resetCharSpace(pdf)
    pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(8); pdf.text(number, 194, 45, { align: 'right' })
    pdf.setFont(theme.bodyFont, 'normal'); pdf.text(formattedDate(document.date), 194, 53, { align: 'right' })
    setDraw(pdf, theme.accent); pdf.setLineWidth(0.3); pdf.line(14, 61, 196, 61)
    return 70
  }

  if (theme.variant === 'sidebar') {
    setColor(pdf, theme.secondary)
    addImageSafe(pdf, company.logoDataUrl, 10, 15, 24, 21)
    pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(11); pdf.text(pdf.splitTextToSize(company.name, 31), 7, 48)
    pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(6.2)
    const side = [company.brand, company.address, company.phone, company.email, company.ice && `ICE ${company.ice}`].filter(Boolean)
    pdf.text(pdf.splitTextToSize(side.join('\n\n'), 31), 7, 65)
    setColor(pdf, [44, 38, 34]); setThemeTitle(pdf, theme, 24); pdf.text(title, 52, 25); resetCharSpace(pdf)
    setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(9.5); pdf.text(number, 194, 25, { align: 'right' })
    setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7); pdf.text(formattedDate(document.date), 194, 34, { align: 'right' })
    return 44
  }

  if (theme.variant === 'corporate') {
    drawIdentity(pdf, company, theme, 13, 12, theme.primary)
    setColor(pdf, theme.primary); setThemeTitle(pdf, theme, 22); pdf.text(title, 195, 22, { align: 'right' }); resetCharSpace(pdf)
    pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(10); pdf.text(number, 195, 32, { align: 'right' })
    setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7); pdf.text(formattedDate(document.date), 195, 40, { align: 'right' })
    setDraw(pdf, theme.primary); pdf.setLineWidth(0.5); pdf.line(108, 25, 195, 25)
    return 50
  }

  if (theme.variant === 'split') {
    setFill(pdf, theme.primary); pdf.rect(0, 0, 122, 55, 'F')
    setFill(pdf, [224, 224, 220]); pdf.rect(122, 0, 6, 55, 'F')
    drawIdentity(pdf, company, theme, 13, 13, theme.secondary, 68)
    setColor(pdf, theme.primary); setThemeTitle(pdf, theme, 26); pdf.text(title, 194, 22, { align: 'right' }); resetCharSpace(pdf)
    setColor(pdf, theme.accent); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(10); pdf.text(number, 194, 34, { align: 'right' })
    setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7); pdf.text(formattedDate(document.date), 194, 43, { align: 'right' })
    return 65
  }

  drawIdentity(pdf, company, theme, 14, 12, theme.primary)
  setColor(pdf, theme.primary); setThemeTitle(pdf, theme, 25); pdf.text(title, 194, 20, { align: 'right' }); resetCharSpace(pdf)
  setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(10); pdf.text(number, 194, 31, { align: 'right' })
  setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7); pdf.text(formattedDate(document.date), 194, 39, { align: 'right' })
  setDraw(pdf, theme.accent); pdf.setLineWidth(0.35); pdf.line(14, 47, 196, 47)
  return 56
}

const contentBounds = (theme: ThemeSpec) => theme.variant === 'sidebar'
  ? { left: 52, right: 196, width: 144 }
  : { left: 15, right: 195, width: 180 }

const drawInfo = (pdf: jsPDF, document: CommercialDocument, theme: ThemeSpec, startY: number, options: PdfDisplayOptions) => {
  const { left, right, width } = contentBounds(theme)
  const gap = 5
  const boxY = startY
  const height = 34

  if (!options.object) {
    if (theme.variant === 'editorial') {
      setDraw(pdf, theme.accent); pdf.setLineWidth(0.2); pdf.line(left, boxY, right, boxY)
    } else {
      setFill(pdf, theme.secondary); setDraw(pdf, theme.accent); pdf.roundedRect(left, boxY, width, height, 2, 2, 'FD')
    }
    setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(6.5); pdf.text('CLIENT', left + 4, boxY + 7)
    pdf.setFontSize(8.2); pdf.text(pdf.splitTextToSize(document.client || 'Client à renseigner', width - 8), left + 4, boxY + 14)
    pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(6.2); setColor(pdf, theme.muted)
    const details = [document.clientAddress, document.clientIce && `ICE : ${document.clientIce}`, document.clientIfNumber && `IF : ${document.clientIfNumber}`].filter(Boolean)
    if (details.length) pdf.text(pdf.splitTextToSize(details.join('\n'), width - 8), left + 4, boxY + 20)
    return boxY + height + 8
  }

  const col = (width - gap) / 2
  if (theme.variant === 'editorial') {
    setDraw(pdf, theme.accent); pdf.setLineWidth(0.2)
    pdf.line(left, boxY, right, boxY)
    pdf.line(left + col, boxY + 4, left + col, boxY + height)
  } else {
    setFill(pdf, theme.secondary); setDraw(pdf, theme.accent)
    pdf.roundedRect(left, boxY, col, height, 2, 2, 'FD')
    pdf.roundedRect(left + col + gap, boxY, col, height, 2, 2, 'FD')
  }

  setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(6.5)
  pdf.text('CLIENT', left + 4, boxY + 7)
  pdf.text('OBJET', left + col + gap + 4, boxY + 7)
  pdf.setFontSize(8.2)
  pdf.text(pdf.splitTextToSize(document.client || 'Client à renseigner', col - 8), left + 4, boxY + 14)
  pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(6.2); setColor(pdf, theme.muted)
  const details = [document.clientAddress, document.clientIce && `ICE : ${document.clientIce}`, document.clientIfNumber && `IF : ${document.clientIfNumber}`].filter(Boolean)
  if (details.length) pdf.text(pdf.splitTextToSize(details.join('\n'), col - 8), left + 4, boxY + 20)
  pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(8); setColor(pdf, theme.primary)
  pdf.text(pdf.splitTextToSize(document.object || 'Objet du document', col - 8), left + col + gap + 4, boxY + 14)
  return boxY + height + 8
}

const footer = (pdf: jsPDF, company: CompanySettings, theme: ThemeSpec, options: PdfDisplayOptions) => {
  if (!options.footer) return
  const { left, right } = contentBounds(theme)
  setDraw(pdf, theme.accent); pdf.setLineWidth(0.2); pdf.line(left, 272, right, 272)
  setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(5.8)
  const legal = companyLegalLine(company)
  if (company.address) pdf.text(pdf.splitTextToSize(company.address, right - left), left, 278)
  if (legal) pdf.text(pdf.splitTextToSize(legal, right - left), left, 284)
}

const drawSummaryAndSignatures = (pdf: jsPDF, document: CommercialDocument, company: CompanySettings, theme: ThemeSpec, startY: number, options: PdfDisplayOptions) => {
  const priced = showPricing(document)
  const totals = documentTotals(document)
  const { left, right, width } = contentBounds(theme)
  const summaryRows = priced ? Number(options.summaryTotalHT) + Number(options.vat) + 1 : 0
  let y = Math.max(startY + 9, 176)
  const required = (priced ? 26 + summaryRows * 9 : 0) + (options.signatures ? 38 : 0)
  if (y + required > 262) {
    pdf.addPage(); drawPageBase(pdf, theme); y = 30
  }

  if (priced) {
    const boxWidth = Math.min(78, width * 0.46)
    const boxX = right - boxWidth
    const summaryHeight = 12 + summaryRows * 9
    setFill(pdf, theme.secondary); setDraw(pdf, theme.accent)
    pdf.roundedRect(boxX, y, boxWidth, summaryHeight, 2, 2, 'FD')
    setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(7)
    let rowY = y + 9
    if (options.summaryTotalHT) {
      pdf.text('Total HT', boxX + 5, rowY); pdf.text(`${money(totals.totalHT)} MAD`, right - 5, rowY, { align: 'right' }); rowY += 9
    }
    if (options.vat) {
      pdf.text('TVA', boxX + 5, rowY); pdf.text(`${money(totals.totalVAT)} MAD`, right - 5, rowY, { align: 'right' }); rowY += 9
    }
    setFill(pdf, theme.primary); pdf.rect(boxX, rowY - 6, boxWidth, 12, 'F')
    setColor(pdf, theme.secondary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(8.5)
    pdf.text('TOTAL TTC', boxX + 5, rowY + 2); pdf.text(`${money(totals.totalTTC)} MAD`, right - 5, rowY + 2, { align: 'right' })

    if (options.amountInWords) {
      setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(6.5); pdf.text('MONTANT EN LETTRES', left, y + 4)
      pdf.setFont(theme.titleFont, 'italic'); pdf.setFontSize(7.4); pdf.text(pdf.splitTextToSize(amountToFrenchDirhams(totals.totalTTC), Math.max(55, width - boxWidth - 12)), left, y + 12)
    }
    y += summaryHeight + 10
  }

  if (!options.signatures) return
  setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(7)
  pdf.text('POUR LE FOURNISSEUR', left, y + 5)
  pdf.text('POUR LE CLIENT', right - 42, y + 5)
  setDraw(pdf, theme.accent); pdf.line(left, y + 25, left + 47, y + 25); pdf.line(right - 47, y + 25, right, y + 25)
  addImageSafe(pdf, company.managerSignatureDataUrl, left + 6, y + 7, 30, 16)
}

const addPageNumbers = (pdf: jsPDF, theme: ThemeSpec) => {
  const count = pdf.getNumberOfPages()
  for (let page = 1; page <= count; page += 1) {
    pdf.setPage(page); setColor(pdf, theme.muted); pdf.setFont(theme.bodyFont, 'normal'); pdf.setFontSize(6)
    pdf.text(`Page ${page} / ${count}`, 196, 292, { align: 'right' })
  }
}

type ColumnStyle = { cellWidth: number; halign?: 'left' }
const columnStyles = (document: CommercialDocument, options: PdfDisplayOptions, width: number): Record<number, ColumnStyle> => {
  const columns = tableColumns(document, options)
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0)
  return Object.fromEntries(columns.map((column, index) => [index, {
    cellWidth: width * (column.weight / totalWeight),
    ...(column.key === 'designation' ? { halign: 'left' as const } : {})
  }]))
}

const buildCustomTheme = (document: CommercialDocument, company: CompanySettings, themeId: CustomTheme, rawOptions?: Partial<PdfDisplayOptions>) => {
  const options = resolvedPdfDisplayOptions(rawOptions)
  const theme = THEMES[themeId]
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  pdf.setProperties({ title: `${documentLabel(document.type)} ${displayNumber(document)}`, subject: document.object || documentLabel(document.type), author: company.name, creator: 'Facture PWA' })
  drawPageBase(pdf, theme)
  const headerEnd = drawHeader(pdf, document, company, theme)
  const tableY = drawInfo(pdf, document, theme, headerEnd, options)
  const { left, right, width } = contentBounds(theme)

  autoTable(pdf, {
    startY: tableY,
    head: head(document, options),
    body: rows(document, options),
    theme: theme.variant === 'editorial' ? 'plain' : 'grid',
    styles: { font: theme.bodyFont, fontSize: 7.2, cellPadding: 3.2, minCellHeight: 11, valign: 'middle', halign: 'center', overflow: 'linebreak', textColor: theme.primary, lineColor: theme.accent, lineWidth: theme.variant === 'editorial' ? 0.12 : 0.18 },
    headStyles: theme.variant === 'editorial'
      ? { fillColor: theme.paper, textColor: theme.primary, fontStyle: 'bold', lineColor: theme.primary, lineWidth: { bottom: 0.35 }, minCellHeight: 9 }
      : { fillColor: theme.primary, textColor: theme.secondary, fontStyle: 'bold', minCellHeight: 10 },
    alternateRowStyles: { fillColor: theme.variant === 'editorial' ? theme.paper : theme.secondary },
    columnStyles: columnStyles(document, options, width),
    margin: { left, right: 210 - right, top: 18, bottom: 32 },
    willDrawPage: data => {
      if (data.pageNumber > 1) {
        drawPageBase(pdf, theme)
        setColor(pdf, theme.primary); pdf.setFont(theme.bodyFont, 'bold'); pdf.setFontSize(8)
        pdf.text(`${documentLabel(document.type)} ${displayNumber(document)} · suite`, left, 14)
      }
    },
    didDrawPage: () => footer(pdf, company, theme, options)
  })

  const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableY
  drawSummaryAndSignatures(pdf, document, company, theme, finalY, options)
  footer(pdf, company, theme, options)
  addPageNumbers(pdf, theme)
  return pdf
}

export const createThemedPdf = (document: CommercialDocument, company: CompanySettings, template: PremiumThemeId = 'premium', options?: Partial<PdfDisplayOptions>) => {
  if (template === 'original' || template === 'premium') return createBasePdf(document, company, template, options)
  return buildCustomTheme(document, company, template, options)
}

export const themedPdfFileName = (document: CommercialDocument, template: PremiumThemeId = 'premium') => {
  const label = documentLabel(document.type).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const number = (document.number || 'brouillon').replace(/[^a-zA-Z0-9_-]+/g, '-')
  return `${label}-${number}-${template}.pdf`
}

export const downloadThemedPdf = (document: CommercialDocument, company: CompanySettings, template: PremiumThemeId = 'premium', options?: Partial<PdfDisplayOptions>) =>
  createThemedPdf(document, company, template, options).save(themedPdfFileName(document, template))

export const shareThemedPdf = async (document: CommercialDocument, company: CompanySettings, template: PremiumThemeId = 'premium', options?: Partial<PdfDisplayOptions>) => {
  const blob = createThemedPdf(document, company, template, options).output('blob')
  const file = new File([blob], themedPdfFileName(document, template), { type: 'application/pdf' })
  const data: ShareData = { title: `${documentLabel(document.type)} ${displayNumber(document)}`, text: document.object || documentLabel(document.type), files: [file] }
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try { await navigator.share(data); return true } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return false }
  }
  downloadThemedPdf(document, company, template, options)
  return false
}

export const printThemedPdf = (document: CommercialDocument, company: CompanySettings, template: PremiumThemeId = 'premium', options?: Partial<PdfDisplayOptions>) => {
  const url = URL.createObjectURL(createThemedPdf(document, company, template, options).output('blob'))
  const printWindow = window.open(url, '_blank')
  if (!printWindow) { URL.revokeObjectURL(url); downloadThemedPdf(document, company, template, options); return }
  printWindow.addEventListener('load', () => window.setTimeout(() => printWindow.print(), 350), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
