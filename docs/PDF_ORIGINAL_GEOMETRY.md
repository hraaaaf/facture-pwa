# PDF Original — géométrie source verrouillée

Statut : **cible LOT 3**.

Base : PDF fournis par l’utilisateur, juillet 2026.

Cette géométrie décrit la structure visuelle à reproduire dans `src/pdf.ts`. Elle ne modifie pas les données métier.

## Facture / BL détaillé

Page A4 portrait, 210 × 297 mm.

### En-tête

- titre document : x ≈ 13 mm, y ≈ 18 mm ;
- numéro : x ≈ 13 mm, y ≈ 29 mm ;
- client : x ≈ 13 mm, y ≈ 39 mm ;
- raison sociale : centrée autour de x ≈ 166 mm, y ≈ 9,5 mm ;
- logo : zone supérieure droite ; le logo temporaire TS remplace provisoirement le logo source ;
- objet : x ≈ 13 mm, y ≈ 59 mm, gras + soulignement ;
- bloc date : centré autour de x ≈ 166 mm, y ≈ 59–65 mm ;
- filet horizontal sous la date : y ≈ 67 mm.

### Tableau tarifé

Début ≈ y 78 mm.

Colonnes verrouillées :

- bord gauche : 15 mm ;
- séparation Désignation / Unité : 64 mm ;
- Unité / Quantité : 89 mm ;
- Quantité / PU HT : 122 mm ;
- PU HT / Total HT : 158 mm ;
- bord droit : 195 mm.

Hauteurs source V1 :

- en-tête tableau ≈ 18 mm ;
- ligne article de référence ≈ 33 mm ;
- zone totaux intégrée au même grand cadre ≈ 51 mm.

Le grand cadre doit donc inclure la zone `TOTAL HT / TVA / TOTAL TTC`, contrairement à l’ancien rendu où les totaux étaient dessinés hors tableau.

### Totaux

Pour le cas de référence :

- TOTAL HT : 8000 ;
- TVA 20% : 1600 ;
- TOTAL TTC : 9600.

Les remises ne sont affichées que si elles existent, sans modifier le rendu du cas source sans remise.

### Montant en lettres

Bloc vers y ≈ 211 mm, x ≈ 18 mm, gras.

Cas source :

`ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE NEUF MILLE SIX CENTS DIRHAMS TTC`

### Signatures

Repères vers y ≈ 247–250 mm :

- `Le Client` à gauche ;
- `Le gérant` à droite ;
- aucune signature manuscrite n’est fabriquée : elle n’apparaît que si l’utilisateur charge réellement une signature dans E0/E6.

### Footer

- double filet centré vers y ≈ 270 mm ;
- adresse vers y ≈ 280 mm ;
- RC / Patente / CNSS / ICE / IF / RIB vers y ≈ 286,5 mm.

Le template Original n’affiche `Page X / Y` que si le PDF est réellement multi-page, afin de préserver la fidélité du cas source une page.

## BL simple sans prix

Le PDF `BL.pdf` est différent du BL tarifé :

- aucun client affiché dans le document source ;
- objet/date dans la même zone haute ;
- grand espace vertical avant le tableau ;
- tableau démarrant vers y ≈ 118 mm ;
- seulement 3 colonnes : Désignation / Unité / Quantité ;
- aucun bloc HT / TVA / TTC ;
- aucun montant en lettres.

Colonnes :

- gauche : 9 mm ;
- Désignation / Unité : 94 mm ;
- Unité / Quantité : 137 mm ;
- droite : 195 mm.

## Données client snapshot

Si un document possède `clientAddress`, `clientIce` ou `clientIfNumber`, ils peuvent être ajoutés sous le nom du client. Le bloc Objet est alors repoussé vers le bas. Le fixture source n’en contient pas, donc la comparaison source reste inchangée.

## Logo temporaire

Le logo `TS` est fictif et temporaire. Il sert à stabiliser la mise en page tant que le vrai logo n’est pas fourni. Il ne doit pas être confondu avec l’identité officielle de TAPISTOR SABRE.

## Gate LOT 3

Avant fermeture :

1. générer les fixtures `sourceReferenceInvoice`, `sourceReferenceDetailedDeliveryNote`, `sourceReferenceSimpleDeliveryNote` avec le moteur jsPDF exact HEAD ;
2. rendre les PDF en PNG ;
3. comparer aux PDF source ;
4. corriger les écarts géométriques ;
5. vérifier remises + snapshot client ;
6. vérifier multi-page ;
7. score visuel Original >= 9,5/10.
