import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineTotalHT } from './lib'
import type { CommercialDocument, CompanySettings } from './types'

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

export const generatePdf = (commercialDocument: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const typeLabel = documentLabel(commercialDocument.type).toUpperCase()
  const pricingVisible = commercialDocument.type !== 'BL' || commercialDocument.blShowPrices
  const totals = documentTotals(commercialDocument)

  pdf.setTextColor(17, 17, 17)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(22)
  pdf.text(typeLabel, 15, 20)
  pdf.setFontSize(15)
  pdf.text(`#${commercialDocument.number}`, 15, 31)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(company.name, 145, 16, { align: 'center' })
  pdf.setFontSize(9)
  pdf.text(company.brand, 145, 22, { align: 'center' })

  if (company.logoDataUrl) {
    try {
      pdf.addImage(company.logoDataUrl, imageFormat(company.logoDataUrl), 130, 25, 30, 30, undefined, 'FAST')
    } catch {
      // A malformed local image must never block document generation.
    }
  }

  pdf.setFontSize(9)
  if (commercialDocument.client) {
    pdf.setFont('helvetica', 'bold')
    const clientLines = pdf.splitTextToSize(`Client : ${commercialDocument.client}`, 105)
    pdf.text(clientLines, 15, 42)
  }

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  const objectLines = pdf.splitTextToSize(`OBJET : ${commercialDocument.object || '—'}`, 120)
  pdf.text(objectLines, 15, 57)

  pdf.setFontSize(9)
  pdf.text(`${company.cityLabel} LE :`, 165, 54, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.text(formattedDate(commercialDocument.date), 165, 59, { align: 'center' })
  pdf.setDrawColor(220)
  pdf.line(130, 61, 195, 61)

  const body = commercialDocument.lines.map(line => {
    const base = [line.designation || '—', line.unit || '—', String(line.quantity)]
    if (!pricingVisible) return base
    return [...base, money(line.unitPriceHT), money(lineTotalHT(line))]
  })

  const head = pricingVisible
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
      minCellHeight: 18
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      minCellHeight: 16
    },
    columnStyles: pricingVisible
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
    margin: { left: 11.5, right: 11.5 }
  })

  const tableEnd = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 105)
  let contentEnd = tableEnd

  if (pricingVisible) {
    const totalsTop = Math.min(Math.max(tableEnd + 10, 118), 155)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(`TOTAL HT : ${money(totals.totalHT)}`, 103, totalsTop)
    pdf.text(`TVA : ${money(totals.totalVAT)}`, 103, totalsTop + 8)
    pdf.text(`TOTAL TTC : ${money(totals.totalTTC)}`, 190, totalsTop + 18, { align: 'right' })

    const wording =
      commercialDocument.type === 'FACTURE'
        ? 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
        : commercialDocument.type === 'DEVIS'
          ? 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
          : commercialDocument.type === 'BL'
            ? 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
            : 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'

    pdf.setFontSize(11)
    const amountText = `${wording} ${amountToFrenchDirhams(totals.totalTTC)} TTC`
    pdf.text(pdf.splitTextToSize(amountText, 170), 15, totalsTop + 38)
    contentEnd = totalsTop + 48
  }

  const signatureY = Math.max(225, Math.min(contentEnd + 28, 242))
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Le Client', 26, signatureY)
  pdf.text('Le gérant', 175, signatureY)

  if (company.managerSignatureDataUrl) {
    try {
      pdf.addImage(company.managerSignatureDataUrl, imageFormat(company.managerSignatureDataUrl), 150, signatureY - 5, 36, 18, undefined, 'FAST')
    } catch {
      // Keep the PDF usable even when a signature image cannot be decoded.
    }
  }

  pdf.setDrawColor(100)
  pdf.line(62, 275, 148, 275)
  pdf.setFontSize(8)
  pdf.text(company.address, 105, 282, { align: 'center', maxWidth: 190 })
  pdf.setFontSize(6.5)
  pdf.text(pdf.splitTextToSize(company.legalLine, 190), 105, 287, { align: 'center' })

  pdf.save(`${typeLabel.toLowerCase().replaceAll(' ', '-')}-${commercialDocument.number}.pdf`)
}
