# F2 — Input extractors

## Goal

Accepter localement PDF, Excel, Word, image/screenshot et texte, puis produire un `ExtractedInput` exploitable par le broyeur F1.

## Pipeline

`File → detectInputKind() → extractInputFile() → ExtractedInput → extractedInputToRawQuote() → normalizeQuotePayload() → CanonicalQuoteJSON`

## Formats

- PDF : couche texte via PDF.js ; page sans texte rendue en canvas puis OCR.
- Excel / CSV : feuilles transformées en matrices avec SheetJS.
- Word `.docx` : texte et tableaux via Mammoth.
- Image / screenshot : OCR via Tesseract.js.
- Texte : lecture navigateur native.

## Principes

- documents traités dans le navigateur ;
- bibliothèques lourdes chargées dynamiquement ;
- aucune donnée métier manquante inventée par F2 ;
- ambiguïtés remontées à F1/F3 ;
- modèles OCR téléchargeables au premier usage, sans envoi du document vers un service OCR distant.

## Succès F2

- [x] détection PDF / Excel / Word / image / texte ;
- [x] extraction Excel multi-feuilles ;
- [x] extraction Word + tableaux ;
- [x] extraction PDF couche texte ;
- [x] fallback OCR pages PDF sans texte ;
- [x] OCR image/screenshot ;
- [x] reconstruction matrice/texte → lignes brutes ;
- [x] extraction client/objet/date/devise ;
- [x] tests unitaires déterministes ;
- [x] `npm test` + `npm run build` exact-head ;
- [x] fixtures binaires réelles XLSX/DOCX/PDF/image/PDF scanné dans Chromium.

## Preuve finale

Run `33034659498` : SUCCESS sur `aacbb85f40057c6c2870a9f22cb5450f5e4bec9d`.

- 32/32 tests PASS ;
- build production PASS ;
- Chromium PASS ;
- Excel / Word / PDF texte / image OCR / PDF scanné OCR → `CanonicalQuoteJSON READY` ;
- 2 lignes exactes pour chaque fixture ;
- warning OCR attendu sur PDF scanné ;
- 0 erreur console.

Le dernier changement du harness ne modifie pas le moteur : il termine proprement le groupe de processus Vite après certification.

## Hors scope

L’écran d’import, la revue visuelle des champs incertains et l’action « Créer le devis » appartiennent à F3.
