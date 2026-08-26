import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineSubtotalHT, lineTotalHT } from './lib'
import { companyLegalLine } from './types'
import type { CommercialDocument, CompanySettings } from './types'

export type PdfTemplate = 'original' | 'premium'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(value)
    .replace(/[\u202f\u00a0]/g, ' ')

const originalMoney = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

const formattedDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T12:00:00`))

const formattedOriginalDate = (iso: string) => {
  const value = formattedDate(iso)
  return value.replace(/\b([a-zà-ÿ])/u, letter => letter.toUpperCase())
}

const imageFormat = (dataUrl: string) =>
  dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'

const addImageSafe = (pdf: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) => {
  if (!dataUrl) return
  try {
    pdf.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h, undefined, 'FAST')
  } catch {
    // Une image locale invalide ne doit jamais bloquer la génération.
  }
}

const showPricing = (document: CommercialDocument) =>
  document.type !== 'BL' || document.blShowPrices

const vatLabel = (document: CommercialDocument) => {
  const rates = [...new Set(document.lines.map(line => line.vatRate))]
  if (rates.length !== 1) return 'TVA'
  return `TVA ${String(rates[0]).replace('.', ',')}%`
}

const stoppedAtLabel = (document: CommercialDocument) => {
  if (document.type === 'FACTURE') return 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
  if (document.type === 'DEVIS') return 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
  if (document.type === 'BL') return 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
  return 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'
}

const setMetadata = (pdf: jsPDF, document: CommercialDocument, company: CompanySettings) => {
  pdf.setProperties({
    title: `${documentLabel(document.type)} ${document.number}`,
    subject: document.object || documentLabel(document.type),
    author: company.name,
    creator: 'Facture PWA'
  })
}

const addPageNumbers = (pdf: jsPDF) => {
  const count = pdf.getNumberOfPages()
  for (let page = 1; page <= count; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(110, 120, 114)
    pdf.text(`Page ${page} / ${count}`, 195, 291, { align: 'right' })
  }
}

const addOriginalPageNumbers = (pdf: jsPDF) => {
  if (pdf.getNumberOfPages() <= 1) return
  addPageNumbers(pdf)
}

const originalFooter = (pdf: jsPDF, company: CompanySettings) => {
  const legalLine = companyLegalLine(company)
  pdf.setDrawColor(82, 82, 82)
  pdf.setLineWidth(0.28)
  pdf.line(63, 270, 147, 270)
  pdf.setLineWidth(0.12)
  pdf.line(63, 271.2, 147, 271.2)

  pdf.setTextColor(62, 62, 62)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.8)
  const address = company.address ? `ADRESSE : ${company.address}` : ''
  if (address) pdf.text(address, 105, 280, { align: 'center', maxWidth: 190 })
  pdf.setFontSize(5.6)
  if (legalLine) {
    const legal = pdf.splitTextToSize(legalLine, 198)
    pdf.text(legal, 105, 286.5, { align: 'center' })
  }
}

const premiumFooter = (pdf: jsPDF, company: CompanySettings) => {
  const legalLine = companyLegalLine(company)
  pdf.setDrawColor(222, 231, 225)
  pdf.line(15, 268, 195, 268)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(42, 57, 48)
  pdf.setFontSize(7.2)
  if (company.address) pdf.text(company.address, 15, 276, { maxWidth: 178 })
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(102, 114, 106)
  pdf.setFontSize(6)
  if (legalLine) pdf.text(pdf.splitTextToSize(legalLine, 170), 15, 282)
}

const rows = (document: CommercialDocument) =>
  document.lines.map(line => {
    const base = [line.designation || '—', line.unit || '—', String(line.quantity)]
    return showPricing(document)
      ? [...base, money(line.unitPriceHT), money(lineTotalHT(line))]
      : base
  })

const premiumRows = (document: CommercialDocument) =>
  document.lines.map(line => {
    const discount = line.discountPercent ?? 0
    const designation = discount > 0
      ? `${line.designation || '—'}\nRemise ${String(discount).replace('.', ',')} %`
      : line.designation || '—'
    const base = [designation, line.unit || '—', String(line.quantity)]
    return showPricing(document)
      ? [...base, money(line.unitPriceHT), money(lineTotalHT(line))]
      : base
  })

const head = (document: CommercialDocument) => showPricing(document)
  ? [['DÉSIGNATION', 'UNITÉ', 'QUANTITÉ', 'PRIX UNITAIRE HT', 'PRIX TOTAL HT']]
  : [['DÉSIGNATION', 'UNITÉ', 'QUANTITÉ']]

const setBlack = (pdf: jsPDF) => pdf.setTextColor(24, 24, 24)

const drawOriginalHeader = (pdf: jsPDF, document: CommercialDocument, company: CompanySettings) => {
  setBlack(pdf)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(document.type === 'BL' ? 18 : 18.5)
  const title = documentLabel(document.type).toUpperCase()
  if ('setCharSpace' in pdf) pdf.setCharSpace(1.25)
  pdf.text(title, 13, 18)
  if ('setCharSpace' in pdf) pdf.setCharSpace(0)

  pdf.setFontSize(16)
  pdf.text(`#${document.number}`, 13, 29)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11.7)
  pdf.setTextColor(76, 76, 76)
  pdf.text(company.name, 166, 9.5, { align: 'center' })
  addImageSafe(pdf, company.logoDataUrl, 149, 14, 34, 30)
  if (company.brand && !company.logoDataUrl) {
    pdf.setFontSize(6.2)
    pdf.setTextColor(84, 84, 84)
    pdf.text(company.brand, 166, 48, { align: 'center' })
  }

  let leftY = 39
  if (document.client) {
    setBlack(pdf)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    const clientLines = pdf.splitTextToSize(`Client : ${document.client}`, 118)
    pdf.text(clientLines, 13, leftY)
    leftY += clientLines.length * 4.1 + 2

    const clientDetails = [
      document.clientAddress,
      [document.clientIce && `ICE : ${document.clientIce}`, document.clientIfNumber && `IF : ${document.clientIfNumber}`].filter(Boolean).join(' · ')
    ].filter(Boolean)
    if (clientDetails.length) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.2)
      pdf.setTextColor(65, 65, 65)
      for (const detail of clientDetails) {
        const detailLines = pdf.splitTextToSize(detail, 118)
        pdf.text(detailLines, 13, leftY)
        leftY += detailLines.length * 3.5
      }
      leftY += 1
    }
  }

  const objectY = Math.max(59, leftY + 6)
  setBlack(pdf)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.4)
  const objectLines = pdf.splitTextToSize(`OBJET : ${document.object || '—'}`, 121)
  pdf.text(objectLines, 13, objectY)
  pdf.setDrawColor(37, 37, 37)
  pdf.setLineWidth(0.18)
  objectLines.forEach((line: string, index: number) => {
    const y = objectY + index * 4.2 + 0.8
    pdf.line(13, y, 13 + Math.min(121, pdf.getTextWidth(line)), y)
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.2)
  pdf.text(`${company.cityLabel} LE:`, 166, 59, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.6)
  pdf.text(formattedOriginalDate(document.date), 166, 65, { align: 'center' })
  pdf.setDrawColor(214, 214, 214)
  pdf.setLineWidth(0.25)
  pdf.line(143, 67, 195, 67)

  return Math.max(72, objectY + objectLines.length * 4.2 + 5)
}

const originalColumnXs = (priced: boolean) => priced
  ? [15, 64, 89, 122, 158, 195]
  : [9, 94, 137, 195]

const originalHeaders = (priced: boolean) => priced
  ? ['DESIGNATION', 'UNITÉ', 'QUANTITÉ', 'PRIX UNITAIRE HT', 'PRIX TOTAL HT']
  : ['DESIGNATION', 'UNITÉ', 'QUANTITÉ']

const drawCenteredCellText = (
  pdf: jsPDF,
  text: string | string[],
  left: number,
  right: number,
  top: number,
  bottom: number,
  fontSize = 7.2,
  bold = true
) => {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal')
  pdf.setFontSize(fontSize)
  setBlack(pdf)
  const width = Math.max(8, right - left - 5)
  const lines = Array.isArray(text) ? text : pdf.splitTextToSize(text, width)
  const lineHeight = fontSize * 0.42
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight)
  const firstY = top + ((bottom - top - totalHeight) / 2) + lineHeight * 0.84
  pdf.text(lines, (left + right) / 2, firstY, { align: 'center' })
}

const hasDiscounts = (document: CommercialDocument) =>
  document.globalDiscountPercent > 0 || document.lines.some(line => (line.discountPercent ?? 0) > 0)

const lineDiscountTotal = (document: CommercialDocument) =>
  Math.max(0, document.lines.reduce((sum, line) => sum + lineSubtotalHT(line) - lineTotalHT(line), 0))

const drawOriginalSourceTable = (
  pdf: jsPDF,
  document: CommercialDocument,
  startY: number
) => {
  const priced = showPricing(document)
  const totals = documentTotals(document)
  const xs = originalColumnXs(priced)
  const headers = originalHeaders(priced)
  const headerHeight = 18
  const rowHeight = 33
  const rowsHeight = Math.max(1, document.lines.length) * rowHeight
  const discountRows = priced && hasDiscounts(document) ? 2 : 0
  const totalsHeight = priced ? 51 + discountRows * 6 : 0
  const bodyBottom = startY + headerHeight + rowsHeight
  const tableBottom = bodyBottom + totalsHeight

  pdf.setDrawColor(20, 20, 20)
  pdf.setLineWidth(0.42)
  pdf.rect(xs[0], startY, xs[xs.length - 1] - xs[0], tableBottom - startY)
  pdf.line(xs[0], startY + headerHeight, xs[xs.length - 1], startY + headerHeight)

  for (let i = 1; i < xs.length - 1; i += 1) {
    pdf.line(xs[i], startY, xs[i], bodyBottom)
  }

  document.lines.forEach((line, index) => {
    if (index > 0) {
      const y = startY + headerHeight + index * rowHeight
      pdf.line(xs[0], y, xs[xs.length - 1], y)
    }
  })

  if (priced) pdf.line(xs[0], bodyBottom, xs[xs.length - 1], bodyBottom)

  headers.forEach((label, index) => {
    drawCenteredCellText(pdf, label, xs[index], xs[index + 1], startY, startY + headerHeight, 7.1, true)
  })

  document.lines.forEach((line, index) => {
    const top = startY + headerHeight + index * rowHeight
    const bottom = top + rowHeight
    drawCenteredCellText(pdf, line.designation || '—', xs[0], xs[1], top, bottom, 7.1, true)
    drawCenteredCellText(pdf, line.unit || '—', xs[1], xs[2], top, bottom, 7.1, true)
    drawCenteredCellText(pdf, String(line.quantity), xs[2], xs[3], top, bottom, 7.2, true)
    if (priced) {
      drawCenteredCellText(pdf, originalMoney(line.unitPriceHT), xs[3], xs[4], top, bottom, 7.2, true)
      drawCenteredCellText(pdf, originalMoney(lineTotalHT(line)), xs[4], xs[5], top, bottom, 7.2, true)
    }
  })

  if (priced) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.8)
    setBlack(pdf)
    let y = bodyBottom + 22
    const lineDiscount = lineDiscountTotal(document)
    if (lineDiscount > 0) {
      pdf.text(`REMISES LIGNES : ${originalMoney(lineDiscount)}`, 92, y)
      y += 6
    }
    if (totals.globalDiscount > 0) {
      pdf.text(`REMISE GLOBALE : ${originalMoney(totals.globalDiscount)}`, 92, y)
      y += 6
    }
    pdf.text(`TOTAL HT : ${originalMoney(totals.totalHT)}`, 92, y)
    pdf.text(`${vatLabel(document)} : ${originalMoney(totals.totalVAT)}`, 92, y + 8)
    pdf.setFontSize(9.2)
    pdf.text(`TOTAL TTC : ${originalMoney(totals.totalTTC)}`, 194, y + 20, { align: 'right' })
  }

  return tableBottom
}

const buildOriginalFallback = (
  pdf: jsPDF,
  document: CommercialDocument,
  company: CompanySettings,
  startY: number
) => {
  const totals = documentTotals(document)
  const priced = showPricing(document)
  autoTable(pdf, {
    startY,
    head: head(document),
    body: rows(document),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, minCellHeight: 18, valign: 'middle', halign: 'center', overflow: 'linebreak', lineColor: [20,20,20], lineWidth: 0.35 },
    headStyles: { fillColor: [255,255,255], textColor: [20,20,20], fontStyle: 'bold', minCellHeight: 16 },
    columnStyles: priced
      ? { 0:{cellWidth:55}, 1:{cellWidth:27}, 2:{cellWidth:30}, 3:{cellWidth:37}, 4:{cellWidth:38} }
      : { 0:{cellWidth:88}, 1:{cellWidth:47}, 2:{cellWidth:52} },
    margin: { left: 11.5, right: 11.5, top: 18, bottom: 36 },
    didDrawPage: () => originalFooter(pdf, company)
  })

  let end = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 105)
  if (priced) {
    if (end > 160) {
      pdf.addPage()
      originalFooter(pdf, company)
      end = 25
    }
    const y = Math.max(end + 10, 118)
    const lineDiscount = lineDiscountTotal(document)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    let summaryY = y
    if (lineDiscount > 0) {
      pdf.text(`REMISES LIGNES : ${originalMoney(lineDiscount)}`, 103, summaryY)
      summaryY += 8
    }
    if (totals.globalDiscount > 0) {
      pdf.text(`REMISE GLOBALE : ${originalMoney(totals.globalDiscount)}`, 103, summaryY)
      summaryY += 8
    }
    pdf.text(`TOTAL HT : ${originalMoney(totals.totalHT)}`, 103, summaryY)
    pdf.text(`${vatLabel(document)} : ${originalMoney(totals.totalVAT)}`, 103, summaryY + 8)
    pdf.text(`TOTAL TTC : ${originalMoney(totals.totalTTC)}`, 190, summaryY + 20, { align: 'right' })
    end = summaryY + 34
  }
  return end
}

const drawOriginalSignatures = (pdf: jsPDF, company: CompanySettings, y = 248) => {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.1)
  pdf.setTextColor(82, 82, 82)
  pdf.text('Le Client', 18, y)
  pdf.text('Le gérant', 171, y)
  addImageSafe(pdf, company.managerSignatureDataUrl, 153, y - 9, 34, 17)
}

const buildOriginal = (document: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const priced = showPricing(document)
  const totals = documentTotals(document)
  setMetadata(pdf, document, company)

  const headerEnd = drawOriginalHeader(pdf, document, company)
  const sourceLike = document.lines.length <= 3
  const tableStart = !priced && document.type === 'BL'
    ? Math.max(118, headerEnd + 38)
    : Math.max(78, headerEnd + 4)

  let tableEnd = sourceLike
    ? drawOriginalSourceTable(pdf, document, tableStart)
    : buildOriginalFallback(pdf, document, company, tableStart)

  if (priced) {
    if (tableEnd > 192) {
      pdf.addPage()
      originalFooter(pdf, company)
      tableEnd = 28
    }
    const wordsY = Math.max(211, tableEnd + 26)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.3)
    setBlack(pdf)
    const words = `${stoppedAtLabel(document)} ${amountToFrenchDirhams(totals.totalTTC)} TTC`
    pdf.text(pdf.splitTextToSize(words, 174), 18, wordsY)
  }

  drawOriginalSignatures(pdf, company, priced ? 247 : 250)
  originalFooter(pdf, company)
  addOriginalPageNumbers(pdf)
  return pdf
}

const drawPremiumPage = (pdf: jsPDF) => {
  pdf.setFillColor(247, 251, 248)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(10, 10, 190, 247, 4, 4, 'F')
}

const drawPremiumHeader = (pdf: jsPDF, document: CommercialDocument, company: CompanySettings) => {
  addImageSafe(pdf, company.logoDataUrl, 16, 16, 24, 20)
  pdf.setTextColor(26, 43, 33)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(company.name, company.logoDataUrl ? 45 : 16, 21)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(103, 115, 108)
  pdf.setFontSize(7.5)
  pdf.text(company.brand, company.logoDataUrl ? 45 : 16, 27)

  pdf.setFillColor(232, 248, 239)
  pdf.roundedRect(151, 15, 41, 8, 4, 4, 'F')
  pdf.setTextColor(10, 151, 80)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text(documentLabel(document.type).toUpperCase(), 171.5, 20.2, { align: 'center' })
  pdf.setTextColor(22, 39, 29)
  pdf.setFontSize(17)
  pdf.text(`#${document.number}`, 192, 32, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(112, 123, 116)
  pdf.setFontSize(7.5)
  pdf.text(formattedDate(document.date), 192, 38, { align: 'right' })

  pdf.setDrawColor(22, 188, 101)
  pdf.setLineWidth(0.8)
  pdf.line(16, 46, 82, 46)
  pdf.setDrawColor(229, 237, 232)
  pdf.setLineWidth(0.3)
  pdf.line(82, 46, 194, 46)
}

const drawPremiumInfo = (pdf: jsPDF, document: CommercialDocument) => {
  pdf.setFillColor(249, 251, 250)
  pdf.roundedRect(16, 53, 76, 31, 3, 3, 'F')
  pdf.roundedRect(98, 53, 96, 31, 3, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(135, 146, 139)
  pdf.setFontSize(6.5)
  pdf.text('FACTURÉ À', 20, 60)
  pdf.text('OBJET', 102, 60)

  pdf.setTextColor(26, 43, 33)
  pdf.setFontSize(8.2)
  const clientLines = pdf.splitTextToSize(document.client || 'Client à renseigner', 67)
  pdf.text(clientLines, 20, 67)
  let detailY = 67 + clientLines.length * 3.6 + 1
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.2)
  pdf.setTextColor(93, 106, 98)
  const details = [
    document.clientAddress,
    document.clientIce && `ICE : ${document.clientIce}`,
    document.clientIfNumber && `IF : ${document.clientIfNumber}`
  ].filter(Boolean)
  for (const detail of details) {
    if (detailY > 81) break
    const detailLines = pdf.splitTextToSize(detail, 67)
    pdf.text(detailLines, 20, detailY)
    detailY += detailLines.length * 3.1
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.2)
  pdf.setTextColor(26, 43, 33)
  pdf.text(pdf.splitTextToSize(document.object || 'Objet du document', 87), 102, 67)
}

const buildPremium = (document: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const totals = documentTotals(document)
  const priced = showPricing(document)
  const lineDiscount = lineDiscountTotal(document)
  setMetadata(pdf, document, company)

  drawPremiumPage(pdf)
  drawPremiumHeader(pdf, document, company)
  drawPremiumInfo(pdf, document)

  autoTable(pdf, {
    startY: 92,
    head: head(document),
    body: premiumRows(document),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, minCellHeight: 13, valign: 'middle', halign: 'center', overflow: 'linebreak', lineColor: [232,239,234], lineWidth: 0.25, textColor: [32,46,37] },
    headStyles: { fillColor: [22,48,36], textColor: [255,255,255], fontStyle: 'bold', minCellHeight: 12 },
    alternateRowStyles: { fillColor: [250,252,251] },
    columnStyles: priced
      ? { 0:{cellWidth:68,halign:'left'}, 1:{cellWidth:25}, 2:{cellWidth:20}, 3:{cellWidth:32}, 4:{cellWidth:35} }
      : { 0:{cellWidth:100,halign:'left'}, 1:{cellWidth:40}, 2:{cellWidth:40} },
    margin: { left: 15, right: 15, top: 18, bottom: 37 },
    willDrawPage: data => {
      if (data.pageNumber > 1) drawPremiumPage(pdf)
    },
    didDrawPage: () => premiumFooter(pdf, company)
  })

  let end = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 114)
  if (priced) {
    const summaryRows: Array<[string, string]> = []
    if (lineDiscount > 0) summaryRows.push(['Remises lignes', `- ${money(lineDiscount)} MAD`])
    if (totals.globalDiscount > 0) summaryRows.push(['Remise globale', `- ${money(totals.globalDiscount)} MAD`])
    summaryRows.push(['Total HT', `${money(totals.totalHT)} MAD`])
    summaryRows.push([vatLabel(document), `${money(totals.totalVAT)} MAD`])

    const summaryHeight = 17 + summaryRows.length * 8 + 12
    if (end + summaryHeight > 246) {
      pdf.addPage()
      drawPremiumPage(pdf)
      premiumFooter(pdf, company)
      end = 28
    }

    const y = Math.max(end + 10, 136)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(137,147,141)
    pdf.setFontSize(6.5)
    pdf.text('MONTANT EN LETTRES', 16, y)
    pdf.setTextColor(32,46,37)
    pdf.setFontSize(8)
    pdf.text(pdf.splitTextToSize(amountToFrenchDirhams(totals.totalTTC), 78), 16, y + 7)

    pdf.setFillColor(249,252,250)
    pdf.setDrawColor(230,237,232)
    pdf.roundedRect(111, y - 5, 83, summaryHeight, 3, 3, 'FD')
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(91,104,96)
    pdf.setFontSize(7.2)
    let rowY = y + 3
    for (const [label, value] of summaryRows) {
      pdf.text(label, 117, rowY)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30,45,36)
      pdf.text(value, 188, rowY, { align: 'right' })
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(91,104,96)
      rowY += 8
    }

    pdf.setDrawColor(224, 233, 227)
    pdf.line(117, rowY - 3, 188, rowY - 3)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(91,104,96)
    pdf.setFontSize(7.5)
    pdf.text('Total TTC', 117, rowY + 5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(7,154,81)
    pdf.setFontSize(9.5)
    pdf.text(`${money(totals.totalTTC)} MAD`, 188, rowY + 5, { align: 'right' })
    end = y - 5 + summaryHeight
  }

  const signatureY = Math.max(220, Math.min(end + 25, 238))
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(103,114,107)
  pdf.setFontSize(7.5)
  pdf.text('Le Client', 34, signatureY)
  pdf.text('Le gérant', 174, signatureY)
  pdf.setDrawColor(186,198,190)
  pdf.line(17, signatureY + 18, 62, signatureY + 18)
  pdf.line(148, signatureY + 18, 193, signatureY + 18)
  addImageSafe(pdf, company.managerSignatureDataUrl, 153, signatureY - 1, 34, 17)
  premiumFooter(pdf, company)
  addPageNumbers(pdf)
  return pdf
}

export const createPdf = (
  document: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => template === 'premium' ? buildPremium(document, company) : buildOriginal(document, company)

export const pdfFileName = (document: CommercialDocument, template: PdfTemplate = 'original') => {
  const label = documentLabel(document.type).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const number = document.number.replace(/[^a-zA-Z0-9_-]+/g, '-')
  return `${label}-${number}-${template}.pdf`
}

export const getPdfBlob = (document: CommercialDocument, company: CompanySettings, template: PdfTemplate = 'original') =>
  createPdf(document, company, template).output('blob')

export const downloadPdf = (document: CommercialDocument, company: CompanySettings, template: PdfTemplate = 'original') =>
  createPdf(document, company, template).save(pdfFileName(document, template))

export const generatePdf = (commercialDocument: CommercialDocument, company: CompanySettings) => {
  window.dispatchEvent(new CustomEvent('facture:preview', { detail: { commercialDocument, company } }))
}

export const sharePdf = async (document: CommercialDocument, company: CompanySettings, template: PdfTemplate = 'original') => {
  const blob = getPdfBlob(document, company, template)
  const file = new File([blob], pdfFileName(document, template), { type: 'application/pdf' })
  const data: ShareData = { title: `${documentLabel(document.type)} ${document.number}`, text: document.object || documentLabel(document.type), files: [file] }
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }
  downloadPdf(document, company, template)
  return false
}

export const printPdf = (document: CommercialDocument, company: CompanySettings, template: PdfTemplate = 'original') => {
  const url = URL.createObjectURL(getPdfBlob(document, company, template))
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    URL.revokeObjectURL(url)
    downloadPdf(document, company, template)
    return
  }
  printWindow.addEventListener('load', () => window.setTimeout(() => printWindow.print(), 350), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
