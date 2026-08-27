# V1 — Input vocal → Devis

Date : 27 août 2026

## Goal

Ajouter un cinquième mode d'entrée `Vocal` dans `Input → Devis`, avec dictée, transcription modifiable et passage dans le pipeline déterministe existant, sans rupture visuelle avec l'UI certifiée Factea.

## Goal visuel

Le Vocal doit sembler natif au produit existant : mêmes surfaces glass, vert premium, rayons, ombres, typographie, bottom-sheet et touch targets que `Visual Polish V1`.

Référence : `src/polish.css` + `docs/mockups/VOICE_INPUT_V1.svg`.

## Succès

- [x] baseline BEFORE pré-Vocal issue de la certification F3 ;
- [x] mockup cible 390 px figé avant implémentation ;
- [x] cinquième source `Vocal` intégrée ;
- [x] état écoute / arrêt / reprise ;
- [x] transcription visible et modifiable ;
- [x] fallback saisie manuelle si SpeechRecognition indisponible ;
- [x] extraction déterministe quantité + désignation + PU + TVA ;
- [x] réutilisation dictionnaire F4 + normalisation + revue ciblée + JSON canonique ;
- [x] tests + build ;
- [x] runtime Chromium 390 / 430 / 768 ;
- [x] 0 overflow / 0 erreur console ;
- [x] touch targets critiques >=45 px, actions Vocal >=48 px ;
- [x] E2E Vocal → revue date → DEVIS brouillon éditable ;
- [x] captures AFTER picker + écoute sur 390 / 430 / 768 ;
- [x] comparaison BEFORE → mockup → AFTER effectuée ;
- [x] permission / dictée micro réelle sur iPhone ;
- [x] transcription réelle Safari ;
- [x] `Analyser` réel Safari → ligne canonique ;
- [x] human gate V1 réel : utilisateur confirme « Ça marche maintenant ! ».

## Preuve web

Run avant closeout : `33120907970` — **SUCCESS**.

Artifact : `9666431062` (`voice-input-v1-captures`).

Ce run confirme notamment :

- tests repo : **53/53** ;
- build TypeScript + Vite/PWA : SUCCESS ;
- runtime Chromium 390 / 430 / 768 : SUCCESS ;
- 0 overflow horizontal ;
- 0 erreur console/page ;
- E2E structuré : client `Pierre`, quantité `6`, PU HT `150`, total HT `900`.

## Preuve iPhone réel

Preview testé sur iPhone Safari / WebKit.

Transcription réellement capturée :

`Client Pierra article draps de 2,30 m sur deux 2,20 m quantité cinq prix unitaire 150 dirhams`

Résultat parser réellement observé :

- client : `Pierra` ;
- désignation : `draps de 2,30 m sur deux 2,20 m` ;
- quantité : `5` ;
- PU HT : `150` ;
- TVA : `20` ;
- lignes : `1`.

Le moteur conserve `Pierra` tel que Safari l'a transcrit au lieu d'inventer `Pierre`.

## Régressions verrouillées

Le closeout final conserve :

- les **34 tests parser historiques** ;
- **6 tests Safari réels** dédiés à `article`, aux nombres parlés, à l'ordre prix/quantité et aux dimensions ;
- fail-closed si désignation, quantité ou prix manque ou reste ambigu.

## Sécurité / confidentialité

L'endpoint temporaire `api/voice-debug.js` et l'envoi de transcription vers les logs Vercel sont uniquement des instruments de diagnostic Preview. Ils sont supprimés du closeout V1 et ne doivent pas être mergés.

`SpeechRecognition` reste un progressive enhancement. Aucun fournisseur STT externe n'est ajouté au projet. La transcription peut dépendre du service de reconnaissance du navigateur et ne doit pas être présentée comme strictement locale/offline.

## Validation visuelle

Aucun changement visuel n'est introduit par le correctif Safari ou le closeout. Les captures et la comparaison BEFORE → mockup → AFTER déjà certifiées restent valides.

**Score visuel V1 : 9,6/10.**

## État

**V1 VOCAL VALIDÉE SUR WEB + IPHONE RÉEL.**

Le closeout exact-head doit rester vert après suppression du diagnostic et synchronisation de `vercel/latest` (`5bd8755…`). Production ne doit pas être promue sans autorisation explicite.
