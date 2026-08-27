# F2 — Input extractors — CLOSEOUT

## Goal

Accepter localement PDF, Excel, Word, image/screenshot et texte, reconstruire les lignes de devis, puis produire un `RawQuotePayload` exploitable par F1 jusqu'au `CanonicalQuoteJSON`.

## Résultat

F2 est fermé.

- PDF texte : reconstruction spatiale via PDF.js ;
- PDF scanné : rendu canvas → OCR Tesseract.js ;
- Excel / CSV : matrices SheetJS ;
- Word `.docx` : texte + tableaux Mammoth ;
- image / screenshot : OCR local + reconstruction tabulaire ;
- texte : lecture locale + inférence déterministe.

## Preuves

- candidat propre : `80c0fc1a14425219269bceff4516c02ba3de7d67` ;
- run exact-head `33051422061` : SUCCESS ;
- tests : PASS ;
- build : PASS ;
- Chromium : PASS ;
- XLSX / DOCX / PDF texte / PNG / PDF scanné : `CanonicalQuoteJSON READY` ;
- 2 lignes attendues sur les cinq fixtures ;
- warning OCR présent sur PDF scanné ;
- zéro erreur navigateur ;
- merge final : `9132f9134cb87c6205a462802c547d8d4bf11486`.

## Sécurité métier

Aucune donnée critique manquante n'est inventée par F2. F1 reste l'autorité de normalisation et validation. Les documents sont traités dans le navigateur ; les modèles OCR peuvent être téléchargés au premier usage, sans envoi du document vers un service OCR distant.

## Next

F3 — UX Input → Devis : mockup mobile verrouillé → import → revue des incertitudes → création du brouillon devis → AFTER 390/430/768 → E2E.
