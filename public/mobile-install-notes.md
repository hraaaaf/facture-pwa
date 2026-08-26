# Mobile PWA

État candidat, non certifié sur appareil réel.

## Assets installables présents

- `/apple-touch-icon.png` : 180×180 pour iOS ;
- `/pwa-192.png` : 192×192 ;
- `/pwa-512.png` : 512×512 ;
- `/pwa-512.png` déclaré aussi en `maskable` dans le manifest ;
- `/icon.svg` conservé comme favicon navigateur.

## Branchement

- `index.html` référence `apple-touch-icon` ;
- `vite.config.ts` inclut les PNG dans les assets PWA et le manifest ;
- `src/pwa.test.ts` vérifie signature PNG, dimensions et références de configuration.

## Gates encore ouvertes

- installation réelle sur iPhone ;
- installation réelle sur Android ;
- lancement standalone ;
- offline réel après installation ;
- fermeture/réouverture sans perte ;
- partage PDF depuis appareil réel.

Aucun de ces comportements runtime n'est déclaré validé tant qu'il n'a pas été observé.
