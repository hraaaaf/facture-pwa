# Step 6 — Garde-fous OCR / imports lourds

## Goal
Empêcher un import local de bloquer ou saturer l’app sur mobile, avec refus clair des fichiers déraisonnables et possibilité d’annuler un traitement en cours.

## Succès observable
- taille maximale explicite avant lecture lourde ;
- limite de pages PDF explicite après ouverture du document, avant rendu/OCR de toutes les pages ;
- budget de traitement avec timeout contrôlé ;
- bouton Annuler visible pendant `PROCESSING` ;
- annulation réellement propagée aux boucles PDF/OCR quand le moteur le permet ;
- erreurs utilisateur distinctes : fichier trop lourd / PDF trop long / délai dépassé / annulé ;
- aucune création de devis après annulation ou dépassement ;
- flux normal PDF/image/Excel/Word inchangé sous les limites ;
- UI responsive 390/430/768/1280 sans overflow ni erreur navigateur.

## Seuils retenus
- fichier : 15 MiB maximum ;
- PDF : 20 pages maximum ;
- traitement : 45 s maximum.

Ces seuils sont des garde-fous produit, pas des limites théoriques des bibliothèques. Ils privilégient la fiabilité d’une PWA mobile local-first.

## Référence visuelle
BEFORE : écran `Analyse du document…` actuel avec spinner, nom du fichier et pipeline, sans action.

AFTER cible : même écran et même hiérarchie, avec une action secondaire `Annuler l’analyse` sous le pipeline et un court texte indiquant les limites avant sélection. Aucun redesign global.

## Preuve requise
Tests unitaires des règles, build, certification navigateur BEFORE/AFTER 390/430/768/1280, cas refus taille, cas timeout/annulation contrôlée, régression Dashboard/Search/Payment/Client Catalog, score visuel.