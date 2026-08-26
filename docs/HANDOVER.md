# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## Reprise

Lire dans cet ordre :

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/MOBILE_RUNTIME_AUDIT.md`
4. `docs/PDF_RUNTIME_CERTIFICATION.md`
5. `docs/PDF_ORIGINAL_REFERENCE.md`
6. `docs/PDF_ORIGINAL_GEOMETRY.md`
7. `docs/PDF_PREMIUM_VALIDATION.md`
8. `docs/UI_V1_MOBILE_SPEC.md`
9. `docs/mockups/MOCKUPS_LOCK.md`
10. `docs/VISUAL_POLISH_V1.md`

## Goal

PWA mobile-first Devis / Factures / BL / BC, local-first, simple en surface, avec moteur métier robuste, mémoire clients/catalogue, autosave et PDF Original/Premium.

## Repo

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- aucun merge avant preuves
- workflows lourds manuels uniquement
- aucun Vercel sans autorisation explicite

## Avancement global

**76 critères implémentés/observés sur 116 = 65,5 %.**

Pourcentage mécanique depuis `docs/ROADMAP.md`. Pas de DONE implicite.

## Preuve runtime PDF

Run `32956883264`, job `98140389945` : 13/13 tests ✅, `tsc -b && vite build` ✅, PWA manifest/SW ✅, 5 PDF runtime ✅, artifact `9602313604`, commit produit vérifié `b818ee14b35e54749fa8370971aea89945b8044f`.

Le run global était rouge uniquement sur le push final du bot refusé pour permission workflow ; les étapes produit étaient vertes.

## Preuve runtime mobile

Run `32959150633`, HEAD audité `f69c6f6630afaf5ff9b3cb3de6705b079819712e`, artifact `9603634672 — mobile-runtime-audit`.

Le statut GitHub du run est resté anormalement `in_progress`, mais l'artifact a bien été créé et contient **24 captures + report.json**.

Résultats vérifiés :

- E0 → E6 capturés en 390 / 430 / 768 ;
- 0 overflow horizontal ;
- 0 erreur page ;
- 0 erreur console ;
- autosave récupéré après reload sur 390 / 430 / 768 ;
- score visuel runtime : **9,3/10**.

Réserve tactile mesurée : `.sheet-close` = 42×42 px ; actions Historique `Ouvrir`, `Dupliquer`, `Supprimer` = 40 px de haut. Gate >=44 non fermée.

Référence : `docs/MOBILE_RUNTIME_AUDIT.md`.

## LOT 1 — moteur métier

**CANDIDAT TECHNIQUE, parcours runtime restant.**

Brouillon sans numéro, séquences type+année, finalisation atomique, lifecycle, validations, remises/TVA/arrondis, conversions tracées, suppression brouillon atomique.

Reste : `001→002→annulation→003`, séquences indépendantes, reset annuel, double tap, stale draft, migration legacy, exact HEAD final.

## LOT 2 — clients & catalogue

**CANDIDAT TECHNIQUE, runtime ciblé restant.**

DB v3, clients réutilisables, autocomplete, snapshot adresse/ICE/IF, catalogue appris après finalisation, dernier PU/TVA/unité, backup v2 + restore v1.

Reste : client/snapshot/catalogue/déduplication/backup runtime et suggestions/sheets mobiles.

## LOT 3 — PDF Original

**RUNTIME RENDU — 9,3/10.**

Facture, BL détaillé et BL simple rendus et comparés aux sources. Reste multi-page + micro-polish jusqu'à 9,5.

## LOT 4 — PDF Premium

**RUNTIME RENDU — 9,4/10.**

Cas normal 9 600 TTC + cas stress 8 208 TTC propres. Reste multi-page, partage réel et polish 9,5.

## LOT 5 — PWA / mobile

**RUNTIME WEB AUDITÉ, appareil réel restant.**

Icônes/manifest/SW présents. Autosave 800 ms implémenté et récupéré après reload sur les trois viewports.

Reste : cibles tactiles >=44, finalisation + réouverture, LOT1/2, offline, backup/restore, partage PDF iOS/Android, appareil réel.

## NEXT EXACT

1. Corriger `.sheet-close` 42→>=44 et actions Historique 40→>=44 ; recapture AFTER ciblée.
2. Gates runtime LOT1 / LOT2 / backup / offline.
3. Finalisation + réouverture et lifecycle complet.
4. PDF multi-page + partage réel + polish Original/Premium >=9,5.
5. Un seul run final exact HEAD.
6. Human gate → merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur m0/pwa-foundation. Avancement 76/116 = 65,5 %. PDF runtime prouvé par run 32956883264/artifact 9602313604 : Original 9,3, Premium 9,4. Mobile runtime prouvé par artifact 9603634672 du run 32959150633 : 24 captures E0→E6 en 390/430/768, 0 overflow, 0 erreurs console/page, autosave reload OK aux 3 tailles, score UI 9,3. Réserve : sheet-close 42px et actions Historique 40px, à passer >=44 puis recapture ciblée. Ensuite LOT1/2/backup/offline, finalisation+reopen, multi-page/partage, polish PDF >=9,5, run final, human gate. Aucun Vercel sans autorisation.`
