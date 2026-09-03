# Factea — Options d’affichage PDF & typographies

## Goal
Permettre de masquer, document par document et depuis l’aperçu PDF, certains éléments non structurants sans rendre tout le document librement modifiable, et donner à chaque thème une signature typographique cohérente tout en conservant le niveau premium.

## Éléments masquables
- Objet
- Unité
- Prix unitaire HT
- Total HT par ligne
- Bloc Total HT
- Bloc TVA
- Montant en lettres
- Signatures
- Pied de page / coordonnées légales

## Éléments non masquables
- Type de document
- Numéro / état brouillon
- Date
- Client
- Désignation
- Quantité
- Total TTC lorsque les prix sont visibles

## Règles
- Masquer un élément ne supprime jamais sa donnée métier.
- Les options sont appliquées au rendu/partage/impression PDF du document courant.
- Le BL conserve sa règle historique `blShowPrices`; si les prix sont globalement masqués, les options PU/Total HT ne peuvent pas les réafficher.
- Aucun thème ne doit casser si une combinaison d’options est désactivée.
- Typographies sans dépendance réseau, compatibles offline/PWA/PDF.

## Référence UI
BEFORE : galerie des thèmes → aperçu → actions Partager/PDF/Imprimer, sans personnalisation d’affichage.
AFTER : même hiérarchie + bouton compact `Affichage` ouvrant un panneau de toggles contrôlés. Aucun redesign global.

## Typographie par thème
- Original : Helvetica, sobre et administratif.
- Premium : Helvetica avec hiérarchie plus généreuse et espacement contemporain.
- Majestic : Times pour les titres + Helvetica pour les données.
- Lumière : Times éditorial léger + Helvetica discret pour les métadonnées.
- Terracotta : Times gras/chaleureux + Helvetica pour les tableaux.
- Innova : Helvetica condensé visuellement par tailles/espacement, corporate.
- Platine : Times moderne pour les titres + Helvetica minimal.
- Atlas : Times gras pour la signature prestige + Helvetica pour la lisibilité métier.

## Succès observable
- panneau Affichage utilisable sur mobile ;
- chaque option masque uniquement sa cible dans preview et PDF exporté ;
- champs structurants restent présents ;
- partage/téléchargement/impression utilisent exactement les mêmes options ;
- 8 thèmes conservent leur identité et leur mise en page ;
- 390/430/768/1280 : aucun overflow ni erreur console/page ;
- tests existants + nouveaux tests de contrat passent.

## Preuve attendue
BEFORE/AFTER mêmes viewports, génération PDF sur les 8 thèmes avec combinaison d’options, tests unitaires/build, inspection visuelle et score.