# Step 5 — Gestion Clients / Catalogue

## Goal
Ajouter une gestion dédiée des clients et du catalogue déjà présents localement, sans changer le modèle local-first ni l'historique des documents finalisés.

## Succès observable
- vue dédiée accessible depuis le dashboard ;
- onglets Clients / Catalogue ;
- recherche locale ;
- créer / modifier / supprimer une fiche client ;
- créer / modifier / supprimer un article catalogue ;
- sélection dans l'éditeur continue de recopier un snapshot dans le document ;
- modifier/supprimer une fiche ne modifie jamais un document finalisé existant ;
- sauvegarde JSON conserve clients + catalogue ;
- UI responsive 390/430/768/1280 sans overflow ni erreur navigateur.

## Référence visuelle
Conserver le langage Factea actuel : cartes glass compactes, barre de recherche, tabs/pills, actions tactiles >= 44 px. Pas de redesign global.

## Preuve requise
Tests unitaires stockage + snapshot historique, build, certification navigateur BEFORE/AFTER 390/430/768/1280, score visuel, CI de régression Dashboard/Search/Payment.
