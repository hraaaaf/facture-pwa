import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src', 'pdf.ts'), 'utf8')

describe('PDF stopped-at wording', () => {
  it('covers every commercial document type', () => {
    expect(source).toContain("ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE")
    expect(source).toContain("ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE")
    expect(source).toContain("ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE")
    expect(source).toContain("ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE")
  })

  it('uses the document-specific wording in Original and Premium', () => {
    expect(source.match(/stoppedAtLabel\(document\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(source).not.toContain("pdf.text('MONTANT EN LETTRES'")
  })
})
