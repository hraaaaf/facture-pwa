import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineTotalHT } from './lib'
import type { CommercialDocument, CompanySettings } from './types'

export type PdfTemplate = 'original' | 'premium'

const imageFormat = (dataUrl: string) =>
  dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const formattedDate = (iso: string) => {
  const date = new Date(`${iso}T12:00:00`)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

const pricingVisible = (commercialDocument: CommercialDocument) =>
  commercialDocument.type !== 'BL' || commercialDocument.blShowPrices

const vatLabel = (commercialDocument: CommercialDocument) => {
  const rates = [...new Set(commercialDocument.lines.map(line => line.vatRate))]
  if (rates.length !== 1) return 'TVA :'
  const rate = Number.isInteger(rates[0]) ? String(rates[0]) : String(rates[0]).replace('.', ',')
  return `TVA ${rate}% :`
}

const stoppedAtLabel = (commercialDocument: CommercialDocument) => {
  if (commercialDocument.type === 'FACTURE') return 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
  if (commercialDocument.type === 'DEVIS') return 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
  if (commercialDocument.type === 'BL') return 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
  return 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'
}

const addImageSafe = (
  pdf: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  if (!dataUrl) return
  try {
    pdf.addImage(dataUrl, imageFormat(dataUrl), x, y, width, height, undefined, 'FAST')
  } catch {
    // Une image locale invalide ne doit jamais bloquer le document.
  }
}

const originalFooter = (pdf: jsPDF, company: CompanySettings) => {
  pdf.setDrawColor(100)
  pdf.setLineWidth(0.2)
  pdf.line(62, 264, 148, 264)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(35, 35, 35)
  pdf.setFontSize(8)
  pdf.text(company.address, 105, 272, { align: 'center', maxWidth: 190 })
  pdf.setFontSize(6.5)
  pdf.text(pdf.splitTextToSize(company.legalLine, 190), 105, 279, { align: 'center' })
}

const premiumFooter = (pdf: jsPDF, company: CompanySettings) => {
  pdf.setDrawColor(220, 231, 224)
  pdf.setLineWidth(0.3)
  pdf.line(15, 268, 195, 268)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(40, 55, 46)
  pdf.setFontSize(7.5)
  pdf.text(company.address, 15, 276, { maxWidth: 180 })
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(105, 116, 109)
  pdf.setFontSize(6.1)
  pdf.text(pdf.splitTextToSize(company.legalLine, 170), 15, 282)
}

const addPageNumbers = (pdf: jsPDF, premium: boolean) => {
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(premium ? 119 : 100, premium ? 129 : 100, premium ? 122 : 100)
    pdf.text(`Page ${page} / ${pages}`, 195, 291, { align: 'right' })
  }
}

const setMetadata = (pdf: jsPDF, commercialDocument: CommercialDocument, company: CompanySettings) => {
  pdf.setProperties({
    title: `${documentLabel(commercialDocument.type)} ${commercialDocument.number}`,
    subject: commercialDocument.object || documentLabel(commercialDocument.type),
    author: company.name,
    creator: 'Facture PWA',
    keywords: `facture, devis, livraison, ${commercialDocument.number}`
  })
}

const buildOriginalPdf = (commercialDocument: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const typeLabel = documentLabel(commercialDocument.type).toUpperCase()
  const showPricing = pricingVisible(commercialDocument)
  const totals = documentTotals(commercialDocument)

  setMetadata(pdf, commercialDocument, company)
  pdf.setTextColor(17, 17, 17)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(18)
  pdf.text(typeLabel, 15, 17)
  pdf.setFontSize(13)
  pdf.text(`#${commercialDocument.number}`, 15, 27)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(company.name, 150, 14, { align: 'center' })
  pdf.setFontSize(8.5)
  pdf.text(company.brand, 150, 20, { align: 'center' })
  addImageSafe(pdf, company.logoDataUrl, 135, 23, 30, 24)

  if (commercialDocument.client) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    const clientLines = pdf.splitTextToSize(`Client : ${commercialDocument.client}`, 105)
    pdf.text(clientLines, 15, 40)
  }

  pdf.setFontSize(9.5)
  pdf.setFont('helvetica', 'bold')
  const objectLines = pdf.splitTextToSize(`OBJET : ${commercialDocument.object || '—'}`, 118)
  pdf.text(objectLines, 15, 53)

  pdf.setFontSize(8.5)
  pdf.text(`${company.cityLabel} LE :`, 165, 51, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.text(formattedDate(commercialDocument.date), 165, 57, { align: 'center' })
  pdf.setDrawColor(220)
  pdf.line(133, 60, 196, 60)

  const body = commercialDocument.lines.map(line => {
    const base = [line.designation || '—', line.unit || '—', String(line.quantity)]
    if (!showPricing) return base
    return [...base, money(line.unitPriceHT), money(lineTotalHT(line))]
  })

  const head = showPricing
    ? [['DÉSIGNATION', 'UNITÉ', 'QUANTITÉ', 'PRIX UNITAIRE HT', 'PRIX TOTAL HT']]
    : [['DÉSIGNATION', 'UNITÉ', 'QUANTITÉ']]

  autoTable(pdf, {
    startY: 72,
    head,
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      textColor: [20, 20, 20],
      lineColor: [20, 20, 20],
      lineWidth: 0.35,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 18,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      minCellHeight: 16
    },
    columnStyles: showPricing
      ? {
          0: { cellWidth: 55 },
          1: { cellWidth: 27 },
          2: { cellWidth: 30 },
          3: { cellWidth: 37 },
          4: { cellWidth: 38 }
        }
      : {
          0: { cellWidth: 88 },
          1: { cellWidth: 47 },
          2: { cellWidth: 52 }
        },
    margin: { left: 11.5, right: 11.5, top: 18, bottom: 36 },
    didDrawPage: () => originalFooter(pdf, company)
  })

  let tableEnd = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 105)
  let contentEnd = tableEnd

  if (showPricing) {
    if (tableEnd > 155) {
      pdf.addPage()
      originalFooter(pdf, company)
      tableEnd = 25
    }

    const totalsTop = Math.max(tableEnd + 10, 118)
    pdf.setTextColor(17, 17, 17)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(`TOTAL HT : ${money(totals.totalHT)}`, 103, totalsTop)
    pdf.text(`${vatLabel(commercialDocument)} ${money(totals.totalVAT)}`, 103, totalsTop + 8)
    pdf.text(`TOTAL TTC : ${money(totals.totalTTC)}`, 190, totalsTop + 18, { align: 'right' })

    pdf.setFontSize(10.5)
    const amountText = `${stoppedAtLabel(commercialDocument)} ${amountToFrenchDirhams(totals.totalTTC)} TTC`
    const amountLines = pdf.splitTextToSize(amountText, 170)
    pdf.text(amountLines, 15, totalsTop + 38)
    contentEnd = totalsTop + 38 + amountLines.length * 5
  }

  if (!showPricing && tableEnd > 205) {
    pdf.addPage()
    originalFooter(pdf, company)
    contentEnd = 25
  }

  const signatureY = Math.max(220, Math.min(contentEnd + 28, 238))
  pdf.setTextColor(17, 17, 17)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Le Client', 26, signatureY)
  pdf.text('Le gérant', 175, signatureY)
  addImageSafe(pdf, company.managerSignatureDataUrl, 150, signatureY - 5, 36, 18)

  addPageNumbers(pdf, false)
  return pdf
}

const buildPremiumPdf = (commercialDocument: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const showPricing = pricingVisible(commercialDocument)
  const totals = documentTotals(commercialDocument)
  const typeLabel = documentLabel(commercialDocument.type)

  setMetadata(pdf, commercialDocument, company)

  pdf.setFillColor(247, 251, 248)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(10, 10, 190, 247, 4, 4, 'F')

  addImageSafe(pdf, company.logoDataUrl, 16, 16, 24, 20)
  pdf.setTextColor(26, 43, 33)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(company.name, company.logoDataUrl ? 45 : 16, 21)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(104, 116, 109)
  pdf.setFontSize(7.5)
  pdf.text(company.brand, company.logoDataUrl ? 45 : 16, 27)

  pdf.setFillColor(232, 248, 239)
  pdf.roundedRect(151, 15, 41, 8, 4, 4, 'F')
  pdf.setTextColor(10, 151, 80)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text(typeLabel.toUpperCase(), 171.5, 20.2, { align: 'center' })
  pdf.setTextColor(22, 39, 29)
  pdf.setFontSize(17)
  pdf.text(`#${commercialDocument.number}`, 192, 32, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(112, 123, 116)
  pdf.setFontSize(7.5)
  pdf.text(formattedDate(commercialDocument.date), 192, 38, { align: 'right' })

  pdf.setDrawColor(22, 188, 101)
  pdf.setLineWidth(0.8)
  pdf.line(16, 46, 82, 46)
  pdf.setDrawColor(229, 237, 232)
  pdf.setLineWidth(0.3)
  pdf.line(82, 46, 194, 46)

  pdf.setFillColor(249, 251, 250)
  pdf.roundedRect(16, 53, 76, 28, 3, 3, 'F')
  pdf.roundedRect(98, 53, 96, 28, 3, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(135, 146, 139)
  pdf.setFontSize(6.5)
  pdf.text('FACTURÉ À', 20, 60)
  pdf.text('OBJET', 102, 60)
  pdf.setTextColor(26, 43, 33)
  pdf.setFontSize(8.5)
  pdf.text(pdf.splitTextToSize(commercialDocument.client || 'Client à renseigner', 67), 20, 68)
  pdf.text(pdf.splitTextToSize(commercialDocument.object || 'Objet du document', 87), 102, 68)

  const body = commercialDocument.lines.map(line => {
    const base = [line.designation || '—', line.unit || '—', String(line.quantity)]
    if (!showPricing) return base
    return [...base, money(line.unitPriceHT), money(lineTotalHT(line))]
  })
  const head = showPricing
    ? [['Désignation', 'Unité', 'Qté', 'PU HT', 'Total HT']]
    : [['Désignation', 'Unité', 'Qté']]

  autoTable(pdf, {
    startY: 90,
    head,
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      textColor: [32, 46, 37],
      lineColor: [232, 239, 234],
      lineWidth: 0.25,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 13,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [22, 48, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      minCellHeight: 12
    },
    alternateRowStyles: { fillColor: [250, 252, 251] },
    columnStyles: showPricing
      ? {
          0: { cellWidth: 68, halign: 'left' },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 32 },
          4: { cellWidth: 35 }
        }
      : {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 }
        },
    margin: { left: 15, right: 15, top: 18, bottom: 37 },
    didDrawPage: () => premiumFooter(pdf, company)
  })

  let tableEnd = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 112)
  let contentEnd = tableEnd

  if (showPricing) {
    if (tableEnd > 190) {
      pdf.addPage()
      pdf.setFillColor(247, 251, 248)
      pdf.rect(0, 0, 210, 297, 'F')
      premiumFooter(pdf, company)
      tableEnd = 28
    }

    const totalsTop = Math.max(tableEnd + 10, 136)
    const amountText = amountToFrenchDirhams(totals.totalTTC)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(137, 147, 141)
    pdf.setFontSize(6.5)
    pdf.text('MONTANT EN LETTRES', 16, totalsTop)
    pdf.setTextColor(32, 46, 37)
    pdf.setFontSize(8)
    pdf.text(pdf.splitTextToSize(amountText, 78), 16, totalsTop + 7)

    pdf.setFillColor(249, 252, 250)
    pdf.setDrawColor(230, 237, 232)
    pdf.roundedRect(111, totalsTop - 5, 83, 39, 3, 3, 'FD')
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(91, 104, 96)
    pdf.setFontSize(7.5)
    pdf.text('Total HT', 117, totalsTop + 3)
    pdf.text('TVA', 117, totalsTop + 11)
    pdf.text('Total TTC', 117, totalsTop + 25)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 45, 36)
    pdf.text(`${money(totals.totalHT)} MAD`, 188, totalsTop + 3, { align: 'right' })
    pdf.text(`${money(totals.totalVAT)} MAD`, 188, totalsTop + 11, { align: 'right' })
    pdf.setTextColor(7, 154, 81)
    pdf.setFontSize(9.5)
    pdf.text(`${money(totals.totalTTC)} MAD`, 188, totalsTop + 25, { align: 'right' })
    contentEnd = totalsTop + 39
  }

  if (!showPricing && tableEnd > 210) {
    pdf.addPage()
    pdf.setFillColor(247, 251, 248)
    pdf.rect(0, 0, 210, 297, 'F')
    premiumFooter(pdf, company)
    contentEnd = 28
  }

  const signatureY = Math.max(220, Math.min(contentEnd + 25, 238))
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(103, 114, 107)
  pdf.setFontSize(7.5)
  pdf.text('Le Client', 34, signatureY)
  pdf.text('Le gérant', 174, signatureY)
  pdf.setDrawColor(186, 198, 190)
  pdf.line(17, signatureY + 18, 62, signatureY + 18)
  pdf.line(148, signatureY + 18, 193, signatureY + 18)
  addImageSafe(pdf, company.managerSignatureDataUrl, 153, signatureY - 1, 34, 17)

  premiumFooter(pdf, company)
  addPageNumbers(pdf, true)
  return pdf
}

export const createPdf = (
  commercialDocument: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => template === 'premium'
  ? buildPremiumPdf(commercialDocument, company)
  : buildOriginalPdf(commercialDocument, company)

export const pdfFileName = (commercialDocument: CommercialDocument, template: PdfTemplate = 'original') => {
  const label = documentLabel(commercialDocument.type)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const number = commercialDocument.number.replace(/[^a-zA-Z0-9_-]+/g, '-')
  return `${label}-${number}-${template}.pdf`
}

export const getPdfBlob = (
  commercialDocument: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => createPdf(commercialDocument, company, template).output('blob')

export const downloadPdf = (
  commercialDocument: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => createPdf(commercialDocument, company, template).save(pdfFileName(commercialDocument, template))

export const generatePdf = downloadPdf

export const sharePdf = async (
  commercialDocument: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => {
  const blob = getPdfBlob(commercialDocument, company, template)
  const file = new File([blob], pdfFileName(commercialDocument, template), { type: 'application/pdf' })
  const data: ShareData = {
    title: `${documentLabel(commercialDocument.type)} ${commercialDocument.number}`,
    text: commercialDocument.object || documentLabel(commercialDocument.type),
    files: [file]
  }

  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }

  downloadPdf(commercialDocument, company, template)
  return false
}

export const printPdf = (
  commercialDocument: CommercialDocument,
  company: CompanySettings,
  template: PdfTemplate = 'original'
) => {
  const blob = getPdfBlob(commercialDocument, company, template)
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    URL.revokeObjectURL(url)
    downloadPdf(commercialDocument, company, template)
    return
  }
  printWindow.addEventListener('load', () => window.setTimeout(() => printWindow.print(), 350), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
