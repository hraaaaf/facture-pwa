# LOT 4 — PDF Premium — validation intermédiaire

Date : 26 août 2026

## Goal

Produire un PDF Premium moderne sans modifier la vérité métier du document, avec client historisé, remises explicites, totaux fiables, footer légal et comportement multi-page propre.

## Succès attendu

- snapshot client visible quand disponible : adresse / ICE / IF ;
- remise par ligne visible sans masquer le PU d'origine ;
- remise globale visible séparément ;
- HT / TVA / TTC identiques au moteur métier ;
- footer reconstruit depuis les champs société structurés ;
- aucune signature manuscrite fabriquée ;
- pagination lisible ;
- aucun chevauchement sur les cas normaux et le cas stress ;
- score visuel final >= 9,5/10 après rendu jsPDF exact HEAD.

## Implémentation actuelle

`src/pdf.ts` :

- `companyLegalLine(company)` utilisé directement par Original et Premium ;
- snapshot client dans le bloc FACTURÉ À ;
- remise de ligne affichée sous la désignation ;
- récapitulatif dynamique : remises lignes, remise globale, Total HT, TVA, Total TTC ;
- fond/carte Premium répétés sur les pages AutoTable supplémentaires ;
- footer légal robuste ;
- Page X / Y ;
- partage, téléchargement et impression conservés.

`src/Preview.tsx` + `src/preview.css` ont été alignés sur les mêmes règles pour éviter un écart aperçu/PDF.

## Cas de contrôle

### Cas source sans remise

- 10 × 800 MAD HT ;
- Total HT : 8 000 MAD ;
- TVA 20 % : 1 600 MAD ;
- Total TTC : 9 600 MAD.

### Cas stress remises + snapshot

- brut lignes : 8 000 MAD ;
- remise ligne 10 % : -800 MAD ;
- sous-total après remise ligne : 7 200 MAD ;
- remise globale 5 % : -360 MAD ;
- Total HT : 6 840 MAD ;
- TVA 20 % : 1 368 MAD ;
- Total TTC : 8 208 MAD ;
- adresse + ICE client présents.

Les deux rendus oracle indépendants ont été inspectés visuellement : aucun chevauchement observé sur ces deux cas.

## Nature de la preuve

Le rendu oracle a été produit indépendamment du runtime jsPDF pour contrôler composition, densité, hiérarchie et cas stress. **Ce n'est pas une preuve du jsPDF exact HEAD.**

Le runtime local n'a pas les dépendances npm installées et les tentatives réseau de récupération des paquets ont été bloquées/ont expiré. Aucun GitHub Action n'a été consommé pour contourner ce point.

## Gates ouvertes

- [ ] rendu jsPDF exact HEAD ;
- [ ] cas multi-page réel avec beaucoup de lignes ;
- [ ] partage / téléchargement / impression sur navigateur réel ;
- [ ] revue 390 / 430 / 768 de l'aperçu ;
- [ ] tests/build exact HEAD ;
- [ ] score final Premium >= 9,5/10.

## Score intermédiaire

**Oracle visuel : 9,4/10 candidat.**

Ce score ne ferme pas LOT 4. Le score officiel attend le rendu jsPDF exact HEAD et la revue runtime.
