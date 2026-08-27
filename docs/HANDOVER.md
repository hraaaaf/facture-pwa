# Factea — HANDOVER CANONIQUE

Date : 27 août 2026

## Goal global

PWA mobile-first Devis / Factures / BL / BC, local-first, simple en surface, avec moteur métier robuste, mémoire clients/catalogue, PDF professionnels et Input → Devis multi-source.

## État vérifié

- avancement mécanique historique PWA : **110/116 = 94,8 %** ;
- core Input → Devis F1–F4 : **37/37 = 100 %** ;
- extension V1 Vocal : **11/11 = 100 %** ;
- iPhone réel : micro **PASS**, transcription **PASS**, `Analyser` **PASS**, création d'une ligne canonique **PASS** ;
- confirmation utilisateur réelle : **« Ça marche maintenant ! »** ;
- Production Vercel : non modifiée par V1.

## Repo / Git

- repository : `hraaaaf/facture-pwa` ;
- base PR : `vercel/latest` ;
- base synchronisée dans le closeout V1 : `5bd8755629b8f40c4b92d0aedd6e9d88ffabe88d` (`Fix PDF table extraction for wrapped rows`) ;
- branche V1 : `v1/voice-input` ;
- PR : `#7 — V1 — Input vocal → Devis`, draft tant que le closeout exact-head n'est pas certifié ;
- dernier HEAD appareil réel avant closeout : `d4e40524460d9a5c31b78ff65c1f9c02356706d2` ;
- run correspondant : `33120907970` — **SUCCESS** ;
- artifact : `9666431062` (`voice-input-v1-captures`).

## V1 Vocal — preuve appareil réel

Flow :

`Vocal → transcription modifiable → extraction déterministe → dictionnaire F4 → normalisation/revue canonique → DEVIS DRAFT`.

Transcription Safari capturée sur iPhone :

`Client Pierra article draps de 2,30 m sur deux 2,20 m quantité cinq prix unitaire 150 dirhams`

Résultat parser observé dans le Preview :

- client : `Pierra` ;
- désignation : `draps de 2,30 m sur deux 2,20 m` ;
- quantité : `5` ;
- PU HT : `150` ;
- TVA : `20` ;
- lignes : `1`.

Le correctif ajoute `article` comme frontière/champ naturel sans corriger arbitrairement `Pierra` en `Pierre`.

## Closeout V1

Le commit final de closeout doit, dans un seul commit :

1. supprimer l'instrumentation temporaire `/api/voice-debug` et tout envoi de transcription vers les logs ;
2. restaurer la matrice parser historique **34 tests** et ajouter **6 régressions Safari réelles** ;
3. synchroniser la base `5bd8755…` ;
4. garder Production inchangée ;
5. faire passer la certification exact-head de la PR #7.

La preuve finale exact-head est la check-suite GitHub attachée au HEAD de closeout de `v1/voice-input` et le Preview associé, sans promotion Production.

## UI / référence

- design system : `src/polish.css` ;
- styles V1 : `src/voice-input.css` ;
- mockup cible : `docs/mockups/VOICE_INPUT_V1.svg` ;
- spec/certification : `docs/VOICE_INPUT_V1.md` ;
- score visuel V1 : **9,6/10**.

## Gates globales encore ouvertes

1. Installation réelle iPhone/Android.
2. Fermeture/réouverture sans perte sur appareil réel.
3. Partage PDF iOS/Android et partage/téléchargement/impression navigateur réel.
4. Human gate final de la PWA complète.
5. Merge/release uniquement après preuves et autorisations requises.

Le gate V1 Vocal appareil réel est fermé. Il ne ferme pas automatiquement les gates PWA globales ci-dessus.

## NEXT EXACT

Certifier le HEAD de closeout de la PR #7, vérifier le Preview sans instrumentation de diagnostic, puis préparer le merge. **Aucune promotion Production sans autorisation explicite.**

## Prompt de reprise

`Reprends Factea depuis docs/HANDOVER.md, docs/ROADMAP.md et docs/VOICE_INPUT_V1.md. V1 Vocal est validée sur iPhone réel : micro, transcription et Analyser PASS. La transcription Safari réelle "Client Pierra article draps de 2,30 m sur deux 2,20 m quantité cinq prix unitaire 150 dirhams" produit client Pierra, 1 ligne, quantité 5, PU 150. Le closeout final doit être exact-head, sans voice-debug, avec les 34 tests historiques + 6 régressions Safari, base 5bd8755 synchronisée, Preview seulement. PWA historique 110/116 = 94,8 %, core Input→Devis F1-F4 37/37. Aucun déploiement Production sans autorisation explicite.`
