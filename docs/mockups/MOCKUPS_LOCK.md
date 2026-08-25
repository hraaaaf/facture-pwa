# Mockups Lock — Facture PWA

Date de verrouillage : 25 août 2026

## Statut

**APPROUVÉ ET VERROUILLÉ COMME CIBLE UI V1**

Mockup visuel canonique :

`docs/mockups/UI_V1_MASTER.jpg`

Spec complémentaire :

`docs/UI_V1_MOBILE_SPEC.md`

## Ce que le mockup verrouille

Le mockup n’est pas une illustration marketing. Il fixe la direction produit à respecter pendant l’implémentation.

### Navigation

- bottom navigation flottante ;
- architecture `Accueil | + | Historique` ;
- bouton + central, proéminent et accessible au pouce ;
- actions contextuelles en bas sur les écrans métier.

### Direction visuelle

- mobile-first ;
- glassmorphism moderne ;
- surfaces claires/translucides ;
- accent vert ;
- cartes très arrondies ;
- ombres diffuses ;
- blur modéré ;
- hiérarchie typographique forte ;
- interface dense seulement quand cela améliore la vitesse de saisie ;
- pas d’apparence ERP / back-office desktop compressé sur mobile.

### Interaction

- cibles tactiles >= 44 px ;
- feedback press court ;
- safe areas iOS ;
- bottom sheets pour les choix rapides ;
- actions principales accessibles au pouce ;
- pas de menus labyrinthiques.

### Écrans

Le mockup et la spec servent de cible pour :

1. Accueil ;
2. Nouveau document ;
3. Éditeur ;
4. Aperçu / PDF ;
5. Historique ;
6. Réglages.

## Écarts autorisés

Un écart est autorisé uniquement s’il améliore clairement :

- lisibilité ;
- accessibilité ;
- ergonomie mobile ;
- robustesse ;
- fidélité des données ;
- performance.

Un écart purement esthétique doit être comparé au mockup avant validation.

## Écarts non autorisés sans nouvelle validation

- supprimer la bottom navigation ;
- remplacer le bouton + central par un CTA secondaire discret ;
- revenir à une UI grise/admin classique ;
- réduire les cibles tactiles ;
- transformer l’éditeur en tableau desktop horizontal ;
- ajouter une navigation complexe ou plusieurs niveaux inutiles ;
- supprimer l’alternative Original / Premium pour le PDF.

## Règle de comparaison

À chaque gate visuel important :

**BEFORE → Mockup verrouillé → AFTER**

Viewports minimum :

- 390 px ;
- 430 px ;
- 768 px.

Score cible UI globale : **>= 9,3/10**.

Les PDF ont leur propre cible :

- Original >= 9,5/10 de fidélité ;
- Premium >= 9,5/10 visuellement.

## Note sur l’image stockée

`UI_V1_MASTER.jpg` est une copie de référence optimisée pour le repository. Les décisions détaillées de mise en page et de comportement sont définies dans `docs/UI_V1_MOBILE_SPEC.md`; en cas de conflit d’interprétation, la spec et les décisions verrouillées de ce fichier priment sur les micro-détails de compression de l’image.
