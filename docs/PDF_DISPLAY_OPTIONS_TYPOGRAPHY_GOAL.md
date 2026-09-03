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

## Preuve vérifiée — 2026-09-04
- GitHub Actions `PDF Personalization Certification`, run `33817645504` : SUCCESS sur HEAD `310f33c4dda89a57db2b1bd3fe10eddc914c4b2c`.
- Étapes `Unit tests`, `Build feature`, `Build main baseline`, `Browser BEFORE AFTER certification` et `Verify proof` : SUCCESS.
- Tests : 25 fichiers / 135 tests passés.
- Certification navigateur : 7/7 assertions passées.
- BEFORE/AFTER vérifiés aux viewports 390 / 430 / 768 / 1280 sans overflow ni erreur console/page.
- 9 options contrôlées vérifiées ; les champs facultatifs se masquent indépendamment et Total TTC reste structurel lorsque les prix sont visibles.
- Les actions Partager / PDF / Imprimer restent disponibles avec les options actives.
- Les signatures typographiques des 8 thèmes sont vérifiées.
- Artifact visuel `pdf-personalization-before-after` : ID `9917157739`, SHA-256 `23bce1c30c71ee82f85ee9fad54c460284cbdabea5626bcc58f2faa03f67ee06`.
- Preview Vercel de la branche : READY.
- Inspection visuelle : panneau lisible, aucun clipping critique observé ; score visuel 9.2/10.
- PR #18 : MERGED le 2026-09-03T23:36:58Z.
- Merge commit main : `9ed4253957c40e2d395630250fe9886bcb106340`.
- Statut Vercel du merge commit : SUCCESS.

## État
CLOSED — Goal atteint et prouvé : feature certifiée, PR mergée sur main, déploiement automatique Vercel du merge commit réussi.
