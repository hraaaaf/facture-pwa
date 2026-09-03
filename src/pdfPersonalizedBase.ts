import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineTotalHT } from './lib'
import { resolvedPdfDisplayOptions, type PdfDisplayOptions } from './pdfDisplayOptions'
import { companyLegalLine } from './types'
import type { CommercialDocument, CompanySettings } from './types'
import type { PdfTemplate } from './pdf'

const money = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format(value).replace(/[\u202f\u00a0]/g, ' ')

const formattedDate = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  .format(new Date(`${iso}T12:00:00`))

const priced = (document: CommercialDocument) => document.type !== 'BL' || document.blShowPrices
const displayNumber = (document: CommercialDocument) => document.number.trim() || 'BROUILLON'
const imageFormat = (dataUrl: string) => dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'

const addImageSafe = (pdf: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) => {
  if (!dataUrl) return
  try { pdf.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, 'FAST') } catch { /* fallback texte */ }
}

const vatLabel = (document: CommercialDocument) => {
  const rates = [...new Set(document.lines.map(line => line.vatRate))]
  return rates.length === 1 ? `TVA ${String(rates[0]).replace('.', ',')}%` : 'TVA'
}

const stoppedAtLabel = (document: CommercialDocument) => {
  if (document.type === 'FACTURE') return 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
  if (document.type === 'DEVIS') return 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
  if (document.type === 'BL') return 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
  return 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'
}

const columns = (document: CommercialDocument, options: PdfDisplayOptions) => [
  { key: 'designation', label: 'DÉSIGNATION', weight: 2.6 },
  ...(options.unit ? [{ key: 'unit', label: 'UNITÉ', weight: 0.8 }] : []),
  { key: 'quantity', label: 'QTÉ', weight: 0.7 },
  ...(priced(document) && options.unitPriceHT ? [{ key: 'unitPriceHT', label: 'PU HT', weight: 1 }] : []),
  ...(priced(document) && options.lineTotalHT ? [{ key: 'lineTotalHT', label: 'TOTAL HT', weight: 1.1 }] : [])
]

const tableHead = (document: CommercialDocument, options: PdfDisplayOptions) => [columns(document, options).map(column => column.label)]
const tableRows = (document: CommercialDocument, options: PdfDisplayOptions) => document.lines.map(line => columns(document, options).map(column => {
  if (column.key === 'designation') return line.designation || '—'
  if (column.key === 'unit') return line.unit || '—'
  if (column.key === 'quantity') return String(line.quantity)
  if (column.key === 'unitPriceHT') return money(line.unitPriceHT)
  return money(lineTotalHT(line))
}))

const columnStyles = (document: CommercialDocument, options: PdfDisplayOptions, width: number) => {
  const model = columns(document, options)
  const total = model.reduce((sum, column) => sum + column.weight, 0)
  return Object.fromEntries(model.map((column, index) => [index, {
    cellWidth: width * column.weight / total,
    ...(column.key === 'designation' ? { halign: 'left' as const } : {})
  }]))
}

const drawOriginal = (document: CommercialDocument, company: CompanySettings, options: PdfDisplayOptions) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const totals = documentTotals(document)
  pdf.setProperties({ title: `${documentLabel(document.type)} ${displayNumber(document)}`, author: company.name, creator: 'Facture PWA' })
  pdf.setTextColor(24, 24, 24)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(18.5)
  if ('setCharSpace' in pdf) pdf.setCharSpace(1.25)
  pdf.text(documentLabel(document.type).toUpperCase(), 13, 18)
  if ('setCharSpace' in pdf) pdf.setCharSpace(0)
  pdf.setFontSize(16); pdf.text(`#${displayNumber(document)}`, 13, 29)

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5); pdf.setTextColor(76, 76, 76)
  pdf.text(company.name, 166, 9.5, { align: 'center' })
  addImageSafe(pdf, company.logoDataUrl, 149, 14, 34, 30)

  let infoY = 43
  pdf.setTextColor(24, 24, 24); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.2)
  pdf.text(`Client : ${document.client || '—'}`, 13, infoY)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(58, 58, 58)
  const clientDetails = [document.clientAddress, document.clientIce && `ICE : ${document.clientIce}`, document.clientIfNumber && `IF : ${document.clientIfNumber}`].filter(Boolean)
  if (clientDetails.length) { pdf.text(pdf.splitTextToSize(clientDetails.join(' · '), 118), 13, infoY + 6); infoY += 8 }
  if (options.object) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(24, 24, 24)
    pdf.text(pdf.splitTextToSize(`OBJET : ${document.object || '—'}`, 118), 13, infoY + 9)
    infoY += 9
  }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text(`${company.cityLabel} LE :`, 166, 58, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.4); pdf.text(formattedDate(document.date), 166, 65, { align: 'center' })

  autoTable(pdf, {
    startY: Math.max(78, infoY + 10),
    head: tableHead(document, options),
    body: tableRows(document, options),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4.2, minCellHeight: 14, valign: 'middle', halign: 'center', overflow: 'linebreak', lineColor: [30,30,30], lineWidth: 0.3 },
    headStyles: { fillColor: [255,255,255], textColor: [20,20,20], fontStyle: 'bold', minCellHeight: 13 },
    columnStyles: columnStyles(document, options, 183),
    margin: { left: 13.5, right: 13.5, bottom: options.footer ? 34 : 16 }
  })

  let y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110) + 10
  if (priced(document)) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.8); pdf.setTextColor(24, 24, 24)
    if (options.summaryTotalHT) { pdf.text(`TOTAL HT : ${money(totals.totalHT)}`, 105, y); y += 8 }
    if (options.vat) { pdf.text(`${vatLabel(document)} : ${money(totals.totalVAT)}`, 105, y); y += 8 }
    pdf.setFontSize(9.5); pdf.text(`TOTAL TTC : ${money(totals.totalTTC)} MAD`, 194, y + 5, { align: 'right' }); y += 16
    if (options.amountInWords) {
      pdf.setFontSize(10.2)
      pdf.text(pdf.splitTextToSize(`${stoppedAtLabel(document)} ${amountToFrenchDirhams(totals.totalTTC)} TTC`, 174), 18, y)
      y += 20
    }
  }

  if (options.signatures) {
    const signatureY = Math.min(246, Math.max(y + 10, 220))
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.6); pdf.setTextColor(72, 72, 72)
    pdf.text('Le Client', 18, signatureY); pdf.text('Le gérant', 171, signatureY)
    addImageSafe(pdf, company.managerSignatureDataUrl, 153, signatureY - 9, 34, 17)
  }

  if (options.footer) {
    const legalLine = companyLegalLine(company)
    pdf.setDrawColor(72, 72, 72); pdf.line(63, 270, 147, 270)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.2); pdf.setTextColor(52, 52, 52)
    if (company.address) pdf.text(`ADRESSE : ${company.address}`, 105, 280, { align: 'center', maxWidth: 190 })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.1)
    if (legalLine) pdf.text(pdf.splitTextToSize(legalLine, 194), 105, 286.5, { align: 'center' })
  }
  return pdf
}

const drawPremium = (document: CommercialDocument, company: CompanySettings, options: PdfDisplayOptions) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const totals = documentTotals(document)
  pdf.setProperties({ title: `${documentLabel(document.type)} ${displayNumber(document)}`, author: company.name, creator: 'Facture PWA' })
  pdf.setFillColor(247,251,248); pdf.rect(0,0,210,297,'F')
  pdf.setFillColor(255,255,255); pdf.roundedRect(10,10,190,247,4,4,'F')
  addImageSafe(pdf, company.logoDataUrl, 16, 16, 24, 20)
  pdf.setTextColor(26,43,33); pdf.setFont('helvetica','bold'); pdf.setFontSize(13); pdf.text(company.name, company.logoDataUrl ? 45 : 16, 21)
  pdf.setFont('helvetica','normal'); pdf.setTextColor(103,115,108); pdf.setFontSize(7.5); if (company.brand) pdf.text(company.brand, company.logoDataUrl ? 45 : 16, 27)
  pdf.setFillColor(232,248,239); pdf.roundedRect(151,15,41,8,4,4,'F')
  pdf.setTextColor(10,151,80); pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.text(documentLabel(document.type).toUpperCase(),171.5,20.2,{align:'center'})
  pdf.setTextColor(22,39,29); pdf.setFontSize(17); pdf.text(`#${displayNumber(document)}`,192,32,{align:'right'})
  pdf.setFont('helvetica','normal'); pdf.setTextColor(112,123,116); pdf.setFontSize(7.5); pdf.text(formattedDate(document.date),192,38,{align:'right'})
  pdf.setDrawColor(22,188,101); pdf.setLineWidth(.8); pdf.line(16,46,82,46); pdf.setDrawColor(229,237,232); pdf.setLineWidth(.3); pdf.line(82,46,194,46)

  pdf.setFillColor(249,251,250)
  if (options.object) {
    pdf.roundedRect(16,53,76,31,3,3,'F'); pdf.roundedRect(98,53,96,31,3,3,'F')
  } else pdf.roundedRect(16,53,178,31,3,3,'F')
  pdf.setFont('helvetica','bold'); pdf.setTextColor(135,146,139); pdf.setFontSize(6.5); pdf.text('FACTURÉ À',20,60)
  pdf.setTextColor(26,43,33); pdf.setFontSize(8.2); pdf.text(pdf.splitTextToSize(document.client || 'Client à renseigner', options.object ? 67 : 166),20,67)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(6.2); pdf.setTextColor(93,106,98)
  const details = [document.clientAddress, document.clientIce && `ICE : ${document.clientIce}`, document.clientIfNumber && `IF : ${document.clientIfNumber}`].filter(Boolean)
  if (details.length) pdf.text(pdf.splitTextToSize(details.join(' · '), options.object ? 67 : 166),20,74)
  if (options.object) {
    pdf.setFont('helvetica','bold'); pdf.setTextColor(135,146,139); pdf.setFontSize(6.5); pdf.text('OBJET',102,60)
    pdf.setTextColor(26,43,33); pdf.setFontSize(8.2); pdf.text(pdf.splitTextToSize(document.object || 'Objet du document',87),102,67)
  }

  autoTable(pdf, {
    startY: 92,
    head: tableHead(document, options),
    body: tableRows(document, options),
    theme: 'plain',
    styles: { font:'helvetica', fontSize:8, cellPadding:4, minCellHeight:13, valign:'middle', halign:'center', overflow:'linebreak', lineColor:[232,239,234], lineWidth:.25, textColor:[32,46,37] },
    headStyles: { fillColor:[22,48,36], textColor:[255,255,255], fontStyle:'bold', minCellHeight:12, cellPadding:2.5 },
    alternateRowStyles: { fillColor:[250,252,251] },
    columnStyles: columnStyles(document, options, 180),
    margin: { left:15, right:15, bottom: options.footer ? 37 : 18 }
  })

  let y = Math.max(((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 114) + 10, 136)
  if (priced(document)) {
    const summaryRows = Number(options.summaryTotalHT) + Number(options.vat) + 1
    const summaryHeight = 14 + summaryRows * 8
    if (options.amountInWords) {
      pdf.setFont('helvetica','bold'); pdf.setTextColor(32,46,37); pdf.setFontSize(7); pdf.text('Montant en lettres',16,y)
      pdf.setFont('helvetica','normal'); pdf.setFontSize(7.6); pdf.text(pdf.splitTextToSize(amountToFrenchDirhams(totals.totalTTC),78),16,y+8)
    }
    pdf.setFillColor(249,252,250); pdf.setDrawColor(230,237,232); pdf.roundedRect(111,y-5,83,summaryHeight,3,3,'FD')
    let rowY = y + 4
    pdf.setFont('helvetica','normal'); pdf.setTextColor(91,104,96); pdf.setFontSize(7.2)
    if (options.summaryTotalHT) { pdf.text('Total HT',117,rowY); pdf.setFont('helvetica','bold'); pdf.setTextColor(30,45,36); pdf.text(`${money(totals.totalHT)} MAD`,188,rowY,{align:'right'}); rowY += 8; pdf.setFont('helvetica','normal'); pdf.setTextColor(91,104,96) }
    if (options.vat) { pdf.text(vatLabel(document),117,rowY); pdf.setFont('helvetica','bold'); pdf.setTextColor(30,45,36); pdf.text(`${money(totals.totalVAT)} MAD`,188,rowY,{align:'right'}); rowY += 8; pdf.setFont('helvetica','normal'); pdf.setTextColor(91,104,96) }
    pdf.setDrawColor(224,233,227); pdf.line(117,rowY-3,188,rowY-3); pdf.setFont('helvetica','normal'); pdf.setTextColor(91,104,96); pdf.setFontSize(7.5); pdf.text('Total TTC',117,rowY+5)
    pdf.setFont('helvetica','bold'); pdf.setTextColor(7,154,81); pdf.setFontSize(9.5); pdf.text(`${money(totals.totalTTC)} MAD`,188,rowY+5,{align:'right'})
    y += summaryHeight + 15
  }

  if (options.signatures) {
    const signatureY = Math.min(238, Math.max(y + 10, 218))
    pdf.setFont('helvetica','normal'); pdf.setTextColor(103,114,107); pdf.setFontSize(7.5); pdf.text('Le Client',34,signatureY); pdf.text('Le gérant',174,signatureY)
    pdf.setDrawColor(186,198,190); pdf.line(17,signatureY+18,62,signatureY+18); pdf.line(148,signatureY+18,193,signatureY+18)
    addImageSafe(pdf, company.managerSignatureDataUrl,153,signatureY-1,34,17)
  }

  if (options.footer) {
    const legalLine = companyLegalLine(company)
    pdf.setDrawColor(222,231,225); pdf.line(15,268,195,268)
    pdf.setFont('helvetica','bold'); pdf.setTextColor(42,57,48); pdf.setFontSize(7.2); if (company.address) pdf.text(company.address,15,276,{maxWidth:178})
    pdf.setFont('helvetica','normal'); pdf.setTextColor(102,114,106); pdf.setFontSize(6); if (legalLine) pdf.text(pdf.splitTextToSize(legalLine,170),15,282)
  }
  return pdf
}

export const createPersonalizedBasePdf = (
  document: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate,
  rawOptions?: Partial<PdfDisplayOptions>
) => {
  const options = resolvedPdfDisplayOptions(rawOptions)
  return template === 'premium' ? drawPremium(document, company, options) : drawOriginal(document, company, options)
}
