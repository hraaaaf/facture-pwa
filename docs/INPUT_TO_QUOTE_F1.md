# F1 — Input → Devis / CanonicalQuoteJSON

## Goal

Transformer toute extraction future (image, PDF, Excel, Word ou texte) en un JSON canonique unique avant toute création de devis.

## Contrat

`RawQuotePayload → normalizeQuotePayload() → CanonicalQuoteJSON → canonicalQuoteToDocumentFields() → CommercialDocument → PDF`

Le PDF ne consomme jamais directement le fichier source.

## Règles de sécurité métier

- aucune donnée critique manquante n’est inventée ;
- prix absent = `null` + `REVIEW_REQUIRED` ;
- quantité absente = `null` + `REVIEW_REQUIRED` ;
- unité absente = `null` + `REVIEW_REQUIRED`, sauf défaut société explicitement fourni ;
- TVA absente = `null` + `REVIEW_REQUIRED`, sauf taux société explicitement fourni ;
- devise étrangère = `REVIEW_REQUIRED`, aucune conversion automatique ;
- corrections de désignation via dictionnaire exact, traçables par `origins` ;
- doublons identiques signalés en `WARNING` sans suppression automatique ;
- conversion vers `CommercialDocument` refusée tant qu’une erreur subsiste.

## Normalisation F1

Colonnes reconnues :

- désignation : `designation`, `désignation`, `libellé`, `article`, `description`, `produit`, `service` ;
- quantité : `quantity`, `quantité`, `qte`, `qté`, `qty` ;
- unité : `unit`, `unité`, `u` ;
- prix unitaire HT : `unitPriceHT`, `prix unitaire HT`, `prix unitaire`, `PU`, `P.U`, `prix/u` ;
- TVA : `vat`, `tva`, `taux tva` ;
- remise : `discount`, `remise`, `remise %`.

Formats monétaires FR et EN normalisés, notamment `1 250,50` et `1,250.50`.

## Succès F1

- [x] schéma `CanonicalQuoteJSON` versionné ;
- [x] alias de colonnes normalisés ;
- [x] nombres FR/EN normalisés ;
- [x] unités courantes normalisées ;
- [x] dictionnaire métier configurable ;
- [x] provenance `SOURCE / DICTIONARY / DEFAULT` ;
- [x] erreurs bloquantes et warnings structurés ;
- [x] fail-closed sur champs critiques absents ;
- [x] pont vers le moteur `CommercialDocument` existant ;
- [x] tests unitaires F1 ajoutés.

## Preuves locales avant publication

- TypeScript strict isolé : PASS.
- Smoke assertions du normaliseur : PASS.
- Revue fail-closed : correction effectuée pour empêcher TVA/unité implicites.
- Build complet repo / Vitest exact-head : à certifier par la CI GitHub manuelle.

## Hors scope F1

Les parseurs PDF, Excel, Word, image/OCR et l’UX d’import appartiennent respectivement à F2 et F3.
