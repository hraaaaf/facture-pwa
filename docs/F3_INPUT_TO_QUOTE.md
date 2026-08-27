# F3 — UX Input → Devis

## Goal

Permettre depuis « Nouveau document » d'importer Photo/PDF/Excel/Word, traiter localement le fichier, afficher uniquement les champs incertains, puis ouvrir un **devis brouillon modifiable** dans l'éditeur existant.

## Goal visuel

Référence : `docs/mockups/F3_INPUT_TO_QUOTE_390.svg`.

- conserver le bottom-sheet glass existant ;
- mettre `Importer → devis` en premier, sans supprimer la création manuelle ;
- rendre Photo / PDF / Excel / Word immédiatement identifiables ;
- afficher clairement le traitement local ;
- revue ciblée, sans recopier tout le formulaire ;
- CTA final unique : `Créer le devis` ;
- conserver les cibles tactiles ≥ 44 px ;
- zéro overflow horizontal sur 390 / 430 / 768.

## Flow

`Nouveau document → Importer → source → extraction F2 → CanonicalQuoteJSON F1 → revue des ERROR uniquement → canonicalQuoteToDocumentFields() → DEVIS DRAFT → éditeur existant`

## Sécurité métier

- aucun prix, quantité, unité, TVA, ligne ou conversion de devise n'est inventé silencieusement ;
- les erreurs bloquantes restent visibles jusqu'à correction ;
- devise non supportée / absence de lignes : correction de la source requise ;
- les documents restent dans le navigateur ;
- le brouillon importé reste modifiable avant finalisation.

## Critères de certification

- [x] BEFORE 390 / 430 / 768 figé ;
- [x] Goal visuel écrit ;
- [x] mockup 390 px verrouillé avant implémentation ;
- [x] entrée Importer → devis + Photo/PDF/Excel/Word prouvée en navigateur ;
- [x] état de traitement local-first prouvé ;
- [x] revue limitée aux champs incertains prouvée ;
- [x] création du brouillon DEVIS via bridge F1 prouvée ;
- [x] erreur/cancel/retry sans invention prouvé ;
- [x] AFTER 390 / 430 / 768, 0 overflow / 0 erreur console ;
- [x] E2E réel import → revue → devis modifiable + score visuel.

## Preuve finale

- PR : `#5` ;
- HEAD certifié : `cd5b0cf4e61e3ef43ef3bc3bb2cf791bef925d1a` ;
- run exact-head : `33057697395` — SUCCESS ;
- artifact : `9640352345` ;
- tests : 32/32 PASS ;
- build : PASS ;
- Chromium E2E : PASS ;
- 390 / 430 / 768 : `scrollWidth === viewport`, donc 0 overflow horizontal ;
- scénario réel : XLSX → 2 champs incertains → READY → DEVIS brouillon éditable, 2 lignes, client `Hotel Atlas` ;
- erreurs console : 0 ;
- score visuel final : **9,4/10**.

## État

**CLOSED — mergé dans `m0/pwa-foundation` via `656c919da7e4dd7f59087bc3839533026cb0ffff`.**
