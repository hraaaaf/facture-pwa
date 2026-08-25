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

const drawFooter = (pdf: jsPDF, company: CompanySettings) => {
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

export const generatePdf = (commercialDocument: CommercialDocument, company: CompanySettings) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const typeLabel = documentLabel(commercialDocument.type).toUpperCase()
  const pricingVisible = commercialDocument.type !== 'BL' || commercialDocument.blShowPrices
  const totals = documentTotals(commercialDocument)

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

  if (company.logoDataUrl) {
    try {
      pdf.addImage(company.logoDataUrl, imageFormat(company.logoDataUrl), 135, 23, 30, 24, undefined, 'FAST')
    } catch {
      // Une image locale invalide ne doit jamais bloquer la génération du document.
    }
  }

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
      minCellHeight: 18,
      overflow: 'linebreak'
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
    margin: { left: 11.5, right: 11.5, top: 18, bottom: 36 },
    didDrawPage: () => drawFooter(pdf, company)
  })

  let tableEnd = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 105)
  let contentEnd = tableEnd

  if (pricingVisible) {
    if (tableEnd > 155) {
      pdf.addPage()
      drawFooter(pdf, company)
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

  if (!pricingVisible && tableEnd > 205) {
    pdf.addPage()
    drawFooter(pdf, company)
    contentEnd = 25
  }

  const signatureY = Math.max(220, Math.min(contentEnd + 28, 238))
  pdf.setTextColor(17, 17, 17)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Le Client', 26, signatureY)
  pdf.text('Le gérant', 175, signatureY)

  if (company.managerSignatureDataUrl) {
    try {
      pdf.addImage(
        company.managerSignatureDataUrl,
        imageFormat(company.managerSignatureDataUrl),
        150,
        signatureY - 5,
        36,
        18,
        undefined,
        'FAST'
      )
    } catch {
      // Une signature locale invalide ne doit jamais rendre le PDF inutilisable.
    }
  }

  pdf.save(`${typeLabel.toLowerCase().replaceAll(' ', '-')}-${commercialDocument.number}.pdf`)
}
