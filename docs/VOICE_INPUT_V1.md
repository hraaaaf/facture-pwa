# V1 — Input vocal → Devis

Date : 28 août 2026

## Goal

Ajouter et maintenir un mode `Vocal` fiable dans `Input → Devis`, avec dictée Safari, transcription modifiable, extraction déterministe et revue stable jusqu'à la création du devis.

## Succès

- [x] dictée et transcription Safari réelles sur iPhone ;
- [x] fragments SpeechRecognition séparés proprement ;
- [x] frontière Safari collée de type `cinqLe prix unitaire` réparée ;
- [x] `article` conservé lorsqu'il appartient réellement à la désignation ;
- [x] date locale du jour appliquée au devis vocal lorsqu'elle n'est pas dictée ;
- [x] champs de revue stables pendant toute la saisie ;
- [x] passage à l'étape suivante uniquement via validation explicite ;
- [x] régression Safari réelle ajoutée ;
- [x] télémétrie temporaire Vercel supprimée du candidat ;
- [x] human gate iPhone : utilisateur confirme `Validé !` ;
- [x] tests, build et runtime Chromium certifiés.

## Preuve finale automatique

Run : `33180522924` — **SUCCESS**.

HEAD code + certification : `82abf1243c24b330364504ff2cd1f6463848ce03`.

Artifact : `9689523190` (`voice-input-v1-captures`), SHA-256 `d508111397df2aa5b29c36bad94bc6e215b392b5ab7d290d11730ff84fa8615c`.

Le run confirme :

- **96/96 tests PASS** sur 16 fichiers ;
- parser historique : **34/34** ;
- régressions Safari : **7/7** ;
- TypeScript + Vite/PWA build : **SUCCESS** ;
- runtime Chromium : **390 / 430 / 768 PASS** ;
- `scrollWidth === viewport` sur les trois viewports ;
- touch target fermeture : **45 × 45 px** ;
- actions Vocal : **>= 48 px** ;
- orb : **74 px** ;
- 5 sources d'import présentes ;
- **0 erreur console/page** ;
- E2E : client `Pierre`, 1 ligne, quantité `6`, PU HT `150`, total HT `900`, création d'un DEVIS éditable.

## Preuve iPhone réelle

Le diagnostic Vercel a capturé le comportement Safari réel et a montré deux causes distinctes :

1. Safari pouvait concaténer des segments sans espace, par exemple `cinqLe prix unitaire` ;
2. l'ancienne revue supprimait un champ dès qu'il devenait valide, ce qui fermait visuellement la saisie avant validation explicite.

Le correctif final :

- joint les fragments Safari avec un espace normalisé ;
- restaure les frontières de champs collées ;
- garde la liste de champs de revue stable pendant l'édition ;
- exige `Valider les corrections` avant de quitter la revue lorsqu'une revue est nécessaire ;
- évite une revue de date inutile en appliquant la date locale du jour au devis vocal.

Le parcours a ensuite été testé sur iPhone réel et explicitement validé par l'utilisateur le 28 août 2026.

## Sécurité / confidentialité

L'endpoint temporaire `api/voice-debug.js` et l'envoi de transcription vers les logs Vercel ont été supprimés avant closeout. `src/importDebug.ts` est revenu au no-op. Aucune télémétrie de transcription n'est destinée au merge final.

`SpeechRecognition` reste un progressive enhancement dépendant du navigateur. Aucun fournisseur STT externe n'est ajouté au projet et la dictée ne doit pas être présentée comme strictement locale/offline.

## Validation visuelle

Le correctif conserve l'identité visuelle Vocal existante. La certification runtime confirme l'absence d'overflow et les dimensions critiques sur 390 / 430 / 768.

**Score visuel conservé : 9,6/10.**

## État

**V1 VOCAL IPHONE — RÉGRESSION CORRIGÉE, VALIDÉE SUR APPAREIL RÉEL ET CERTIFIÉE AUTOMATIQUEMENT.**

PR de closeout : `#9`. Le merge vers `main` reste le gate qui peut déclencher la Production Vercel et nécessite donc l'autorisation explicite correspondante.
