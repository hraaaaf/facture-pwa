# F2 — Input extractors

## Goal

Accepter localement les formats PDF, Excel, Word, image/screenshot et texte, puis produire un `ExtractedInput` exploitable par le broyeur F1.

## Pipeline

`File → detectInputKind() → extractInputFile() → ExtractedInput → extractedInputToRawQuote() → normalizeQuotePayload() → CanonicalQuoteJSON`

## Formats

- PDF : couche texte via PDF.js ; page sans texte rendue en canvas puis OCR.
- Excel / CSV : feuilles transformées en matrices avec SheetJS.
- Word `.docx` : texte brut via Mammoth.
- Image / screenshot : OCR via Tesseract.js.
- Texte : lecture navigateur native.

## Principes

- les documents restent dans le navigateur ;
- les bibliothèques lourdes sont chargées dynamiquement ;
- aucune donnée métier manquante n’est complétée par F2 ;
- le meilleur tableau est choisi par score d’en-têtes, sans suppression de lignes ;
- les erreurs et ambiguïtés restent destinées à F1/F3 pour revue utilisateur ;
- les modèles linguistiques OCR peuvent nécessiter leur téléchargement au premier usage avant mise en cache ; le document lui-même n’est pas envoyé à un service OCR distant.

## Dépendances verrouillées

- `pdfjs-dist` 6.2.108 ;
- `mammoth` 1.12.1 ;
- `tesseract.js` 7.0.0 ;
- SheetJS CE 0.20.3 depuis le tarball officiel SheetJS.

## Succès F2

- [x] détection PDF / Excel / Word / image / texte ;
- [x] extraction Excel multi-feuilles ;
- [x] extraction Word ;
- [x] extraction PDF couche texte ;
- [x] fallback OCR des pages PDF sans texte ;
- [x] OCR image/screenshot ;
- [x] conversion matrice → lignes brutes ;
- [x] extraction simple client/objet/date/devise ;
- [x] tests unitaires des fonctions déterministes ajoutés ;
- [ ] installation réelle des dépendances + `npm test` + `npm run build` exact-head ;
- [ ] fixtures binaires réelles PDF/XLSX/DOCX/image sur navigateur.

## Hors scope

L’écran d’import, la revue visuelle des champs incertains et l’action « Générer le devis » appartiennent à F3.
