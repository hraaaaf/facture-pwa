# Factea — HANDOVER CANONIQUE

Date : 27 août 2026

## Goal global

PWA mobile-first Devis / Factures / BL / BC, local-first, simple en surface, avec moteur métier robuste, mémoire clients/catalogue, PDF professionnels et Input → Devis multi-source.

## État vérifié

- avancement mécanique historique PWA : **110/116 = 94,8 %** ;
- core Input → Devis F1–F4 : **37/37 = 100 %** ;
- extension V1 Vocal : **10/11**, web certifiée ;
- gate Vocal restant : permission + dictée micro réelle sur iPhone et human gate ;
- aucun déploiement Vercel autorisé/effectué pour V1.

## Repo / Git

- repository : `hraaaaf/facture-pwa` ;
- base PR : `vercel/latest` ;
- base observée pendant V1 : `270acbb2ca60cfc1521e686d8c123d50ad7df371` (`Brand PWA as Factea`) ;
- branche V1 : `v1/voice-input` ;
- PR : `#7 — V1 — Input vocal → Devis`, draft ;
- commit produit/certification V1 : `35c1fc6352ea6a0c3c98134891ae9786889fd424` ;
- run V1 : `33104675409` SUCCESS ;
- artifact V1 : `9659978460` (`voice-input-v1-captures`).

Les commits de closeout documentaire postérieurs à `35c1fc…` ne modifient pas le code produit certifié ; ne pas les présenter comme HEAD runtime certifié.

## V1 Vocal — preuve

Le Vocal ajoute une cinquième source dans `Input → Devis` :

`Vocal → transcription modifiable → extraction déterministe → dictionnaire F4 → normalisation/revue canonique → DEVIS DRAFT`.

Architecture : `SpeechRecognition`/`webkitSpeechRecognition` en progressive enhancement uniquement, fallback texte, aucun fournisseur STT externe ajouté.

Run `33104675409` :

- tests : **35/35** ;
- build TypeScript + Vite/PWA : SUCCESS ;
- runtime Chromium : 390 / 430 / 768 ;
- `scrollWidth === viewport` aux 3 tailles ;
- 5 sources visibles ;
- fermer : 45×45 px ;
- CTA Vocal : 110 px ;
- actions Vocal : >=48 px ;
- orb écoute : 74 px ;
- 0 erreur page/console ;
- E2E : `Hôtel Atlas`, 200 draps × 85 MAD + 40 serviettes × 22,5 MAD, TVA 20 % → une revue date → DEVIS brouillon éditable 2 lignes.

Captures artifact : picker + écoute sur 390/430/768, READY 390, éditeur 390.

**Score visuel web V1 : 9,6/10.**

## UI / référence

- design system : `src/polish.css` ;
- styles V1 : `src/voice-input.css` ;
- mockup cible : `docs/mockups/VOICE_INPUT_V1.svg` ;
- spec/certification : `docs/VOICE_INPUT_V1.md`.

V1 est aligné sur les surfaces glass, le vert premium, les rayons, ombres, typographie et touch targets existants.

## Gates globales encore ouvertes

1. Permission + dictée micro réelle iPhone pour V1.
2. Installation réelle iPhone/Android.
3. Fermeture/réouverture sans perte sur appareil réel.
4. Partage PDF iOS/Android et partage/téléchargement/impression navigateur réel.
5. Human gate final.
6. Merge uniquement après validation humaine et preuves requises.

## NEXT EXACT

Ne pas relancer de benchmark V1 : le web est certifié. Le prochain gate utile nécessite un iPhone réel avec une version accessible sur appareil. **Aucun Vercel sans autorisation explicite.**

## Prompt de reprise

`Reprends Factea depuis docs/HANDOVER.md, docs/ROADMAP.md et docs/VOICE_INPUT_V1.md. V1 Vocal est web-certifiée : produit/cert commit 35c1fc6352ea6a0c3c98134891ae9786889fd424, run 33104675409 SUCCESS, artifact 9659978460, 35/35 tests, build vert, runtime 390/430/768 sans overflow ni erreur, E2E Vocal → revue date → devis 2 lignes, score visuel 9,6/10. PR #7 draft sur v1/voice-input. Reste le gate permission/dictée micro iPhone réelle + human gate. PWA historique 110/116 = 94,8 %, core Input→Devis F1-F4 37/37. Aucun Vercel sans autorisation explicite.`
