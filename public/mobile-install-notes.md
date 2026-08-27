# Factea — Mobile PWA

État candidat, non certifié sur appareil réel après le changement d'identité visuelle.

## Identité installable

- nom PWA : `Factea` ;
- `/apple-touch-icon.png` : 180×180 pour iOS ;
- `/pwa-192.png` : 192×192 ;
- `/pwa-512.png` : 512×512 ;
- `/pwa-512.png` est également déclaré `maskable` dans le manifest ;
- les trois PNG sont générés de façon déterministe par `scripts/generate-brand-icons.mjs` avant `dev`, `test` et `build`.

## Branchement

- `index.html` référence le nom Factea et l'icône Apple ;
- `vite.config.ts` expose `Factea` dans le manifest PWA ;
- `tests/pwa.test.ts` vérifie signature PNG, dimensions et références de configuration.

## Gates encore ouvertes

- vérifier le nouveau nom et la nouvelle icône sur un iPhone réel après déploiement autorisé ;
- lancement standalone ;
- offline réel après installation ;
- fermeture/réouverture sans perte ;
- partage PDF depuis appareil réel.

Aucun de ces comportements runtime n'est déclaré validé tant qu'il n'a pas été observé.
