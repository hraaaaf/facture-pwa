# V1 — Input vocal → Devis

Date : 27 août 2026

## Goal

Ajouter un cinquième mode d'entrée `Vocal` dans `Input → Devis`, avec dictée, transcription modifiable et passage dans le pipeline déterministe existant, sans créer de rupture visuelle avec l'UI certifiée Factea.

## Goal visuel

Le Vocal doit sembler natif au produit existant : mêmes surfaces glass, vert premium, rayons, ombres, typographie, bottom-sheet et touch targets que `Visual Polish V1`.

Référence : `src/polish.css` + `docs/mockups/VOICE_INPUT_V1.svg`.

## Succès

- [x] baseline BEFORE pré-Vocal issue de la certification F3 ;
- [x] mockup cible 390 px figé avant implémentation ;
- [x] mockup réaligné sur Visual Polish V1 ;
- [x] cinquième source `Vocal` intégrée ;
- [x] état écoute / arrêt / reprise ;
- [x] transcription visible et modifiable ;
- [x] fallback saisie manuelle si SpeechRecognition indisponible ;
- [x] extraction déterministe quantité + désignation + PU + TVA ;
- [x] réutilisation dictionnaire F4 + normalisation + revue ciblée + JSON canonique ;
- [x] tests + build exact commit de certification ;
- [x] runtime Chromium 390 / 430 / 768 ;
- [x] 0 overflow / 0 erreur console ;
- [x] touch targets critiques >= 45 px, actions Vocal >= 48 px ;
- [x] E2E Vocal → revue date → DEVIS brouillon éditable 2 lignes ;
- [x] captures AFTER picker + écoute sur 390 / 430 / 768 ;
- [x] comparaison BEFORE → mockup → AFTER effectuée ;
- [ ] permission / dictée micro réelle sur iPhone ;
- [ ] human gate final.

## Preuve web certifiée

Commit produit/certification : `35c1fc6352ea6a0c3c98134891ae9786889fd424`.

Run : `33104675409` — **SUCCESS**.

Artifact : `9659978460` (`voice-input-v1-captures`).

Le run confirme :

- tests : **35/35** ;
- build TypeScript + Vite/PWA : SUCCESS ;
- 5 sources visibles ;
- 390 px : `scrollWidth=390`, sheet 376 px, fermer 45×45, Vocal 110 px, actions 48 px ;
- 430 px : `scrollWidth=430`, sheet 416 px, fermer 45×45, Vocal 110 px, actions 48 px ;
- 768 px : `scrollWidth=768`, sheet 560 px, fermer 45×45, Vocal 110 px, actions 48 px ;
- orb écoute : 74 px sur les trois viewports ;
- E2E : `Client Hôtel Atlas, 200 draps à 85 dirhams, 40 serviettes à 22,5 MAD, TVA 20 %` → une seule revue demandée (date) → DEVIS DRAFT éditable, 2 lignes ;
- erreurs console/page : **0**.

## Validation visuelle

La comparaison visuelle confirme la continuité avec l'UI Factea : mêmes surfaces glass, densité, rayons, CTA verts, hiérarchie et bottom-sheet. Le Vocal se distingue par sa fonction sans créer un design concurrent.

**Score visuel web V1 : 9,6/10.**

## Doctrine technique

`SpeechRecognition` est utilisé en progressive enhancement uniquement. La fonctionnalité détecte sa disponibilité au runtime et conserve un fallback texte. Aucun fournisseur STT externe ni dépendance cloud n'est ajouté au projet.

La certification Chromium émule l'API vocale pour rendre le test déterministe. Elle valide le flow applicatif, pas l'accès matériel au micro ni le moteur de reconnaissance d'un iPhone réel.

La transcription peut dépendre du service de reconnaissance du navigateur ; elle ne doit donc pas être présentée comme strictement locale/offline tant qu'un moteur on-device n'est pas explicitement activé et certifié.

## État

**WEB CERTIFIÉ — GATE IPHONE RÉEL + HUMAN GATE RESTANTS.**

Aucun déploiement Vercel. Aucun merge tant que le gate appareil réel/human gate n'est pas franchi.
