import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'

const docxContentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const docxRootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const docxCell = (value: string) => `<w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc>`
const docxRow = (values: string[]) => `<w:tr>${values.map(docxCell).join('')}</w:tr>`

const docxDocument = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Client: Hotel Atlas</w:t></w:r></w:p>
    <w:p><w:r><w:t>Objet: Fourniture textile</w:t></w:r></w:p>
    <w:p><w:r><w:t>Date: 27/08/2026</w:t></w:r></w:p>
    <w:p><w:r><w:t>Devise: MAD</w:t></w:r></w:p>
    <w:tbl>
      ${docxRow(['Article', 'Qte', 'P.U', 'TVA'])}
      ${docxRow(['Drap blanc 240x300', '10', '50', '20'])}
      ${docxRow(['Serviette bain 70x140', '20', '25', '20'])}
    </w:tbl>
    <w:sectPr/>
  </w:body>
</w:document>`

const canvasBlob = (canvas: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossible de générer la fixture image.')), type)
})

const drawCanvasFixture = (context: CanvasRenderingContext2D) => {
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  context.fillStyle = '#111111'
  context.font = 'bold 42px Arial, sans-serif'
  ;['Client: Hotel Atlas', 'Objet: Fourniture textile', 'Date: 27/08/2026', 'Devise: MAD'].forEach((line, index) => {
    context.fillText(line, 50, 70 + index * 60)
  })

  const columns = [50, 680, 830, 980]
  context.font = 'bold 38px Arial, sans-serif'
  ;['Article', 'Qte', 'P.U', 'TVA'].forEach((value, index) => context.fillText(value, columns[index], 340))
  context.font = '36px Arial, sans-serif'
  ;[
    ['Drap blanc 240x300', '10', '50', '20'],
    ['Serviette bain 70x140', '20', '25', '20']
  ].forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => context.fillText(value, columns[columnIndex], 410 + rowIndex * 70))
  })
}

const buildImage = async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 620
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponible pour fixture F2.')
  drawCanvasFixture(context)
  return { canvas, blob: await canvasBlob(canvas), dataUrl: canvas.toDataURL('image/png') }
}

const buildDocx = async () => {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', docxContentTypes)
  zip.folder('_rels')?.file('.rels', docxRootRels)
  zip.folder('word')?.file('document.xml', docxDocument)
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

const buildExcel = () => {
  const workbook = XLSX.utils.book_new()
  const meta = XLSX.utils.aoa_to_sheet([
    ['Client: Hotel Atlas'],
    ['Objet: Fourniture textile'],
    ['Date: 27/08/2026'],
    ['Devise: MAD']
  ])
  const lines = XLSX.utils.aoa_to_sheet([
    ['Article', 'Qte', 'P.U', 'TVA'],
    ['Drap blanc 240x300', 10, 50, 20],
    ['Serviette bain 70x140', 20, 25, 20]
  ])
  XLSX.utils.book_append_sheet(workbook, meta, 'Meta')
  XLSX.utils.book_append_sheet(workbook, lines, 'Lignes')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
}

const drawPdfFixture = (pdf: jsPDF) => {
  ;['Client: Hotel Atlas', 'Objet: Fourniture textile', 'Date: 27/08/2026', 'Devise: MAD'].forEach((line, index) => {
    pdf.text(line, 15, 20 + index * 8)
  })
  const columns = [15, 115, 145, 170]
  ;['Article', 'Qte', 'P.U', 'TVA'].forEach((value, index) => pdf.text(value, columns[index], 60))
  ;[
    ['Drap blanc 240x300', '10', '50', '20'],
    ['Serviette bain 70x140', '20', '25', '20']
  ].forEach((row, rowIndex) => row.forEach((value, columnIndex) => pdf.text(value, columns[columnIndex], 70 + rowIndex * 10)))
}

export const buildF2RuntimeFixtures = async () => {
  const image = await buildImage()

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  drawPdfFixture(pdf)

  const scannedPdf = new jsPDF({ unit: 'mm', format: 'a4' })
  scannedPdf.addImage(image.dataUrl, 'PNG', 10, 20, 190, 98)

  return {
    excel: new File([buildExcel()], 'runtime.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    word: new File([await buildDocx()], 'runtime.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    pdf: new File([pdf.output('arraybuffer')], 'runtime.pdf', { type: 'application/pdf' }),
    image: new File([image.blob], 'runtime.png', { type: 'image/png' }),
    scannedPdf: new File([scannedPdf.output('arraybuffer')], 'runtime-scan.pdf', { type: 'application/pdf' })
  }
}
