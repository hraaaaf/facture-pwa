# Step 7 — Actions mortes / cohérence UX

## Goal

Supprimer les affordances visibles qui promettent une action sans résultat, sans ajouter de complexité ni dupliquer des fonctions déjà accessibles.

## Défaut confirmé BEFORE

Dans l’éditeur de document, le bouton `Plus d’options` est visible mais ne possède aucun handler. Toutes les actions utiles du document sont déjà exposées ailleurs (`Aperçu PDF`, `Enregistrer`, `Finaliser`, conversion, encaissement selon contexte).

Le bouton `Réglages` du dashboard paraît suspect dans `App.tsx` parce que son callback local est vide, mais le runtime racine intercepte explicitement `.profile-button` et ouvre `SettingsScreen`. Il doit donc être certifié comme fonctionnel, pas supprimé.

## Référence visuelle

### BEFORE
- header éditeur : Retour | titre/type/statut | bouton `…` visible et inactif.

### AFTER
- header éditeur : Retour | titre/type/statut | aucun bouton mort à droite ;
- titre reste centré grâce à la grille existante à 3 colonnes ;
- aucune autre action ni hiérarchie visuelle n’est déplacée ;
- barre basse `Aperçu PDF / Enregistrer / Finaliser` inchangée.

## Succès observable

1. `Plus d’options` n’est plus visible/focusable dans l’éditeur.
2. Les actions document existantes restent visibles et utilisables.
3. Le bouton `Réglages` ouvre bien l’écran `Réglages`.
4. BEFORE/AFTER aux viewports 390 / 430 / 768 / 1280 sans overflow, erreur page ou erreur console.
5. Le titre éditeur reste centré après retrait du bouton mort.
6. Tests unitaires et build TypeScript/Vite/PWA restent verts.
7. Les certifications fonctionnelles précédentes restent vertes.

## Preuve attendue

- certification navigateur dédiée avec captures BEFORE/AFTER ;
- rapport d’assertions ;
- artefact GitHub Actions ;
- comparaison visuelle ;
- merge puis déploiement Git automatique exact du merge ;
- alias public HTTP 200.
