# V1 — Input vocal → Devis

Date : 27 août 2026

## Goal

Ajouter un cinquième mode d'entrée `Vocal` dans `Input → Devis`, avec dictée, transcription modifiable et passage dans le pipeline déterministe existant.

## Succès

- [x] mockup cible 390 px figé (`docs/mockups/VOICE_INPUT_V1.svg`) ;
- [x] bouton Vocal intégré à la sélection des sources ;
- [x] état d'écoute / arrêt / reprise ;
- [x] transcription toujours visible et modifiable ;
- [x] fallback saisie manuelle si SpeechRecognition indisponible ;
- [x] extraction déterministe simple quantité + désignation + PU + TVA ;
- [x] réutilisation dictionnaire F4 + normalisation + revue ciblée + JSON canonique ;
- [ ] build TypeScript exact HEAD ;
- [ ] runtime 390/430/768 ;
- [ ] permission micro iPhone réelle ;
- [ ] capture AFTER runtime ;
- [ ] human gate.

## Doctrine technique

`SpeechRecognition` est utilisé en progressive enhancement uniquement. La fonctionnalité détecte sa disponibilité au runtime et conserve un fallback texte. Aucun fournisseur STT externe ni dépendance cloud n'est ajouté au projet.

La transcription peut dépendre du service de reconnaissance du navigateur ; elle ne doit donc pas être présentée comme strictement locale/offline tant qu'un moteur on-device n'est pas explicitement activé et certifié.

## Exemple déterministe

Entrée : `Client Hôtel Atlas, 200 draps à 85 dirhams, 40 serviettes à 22,5 MAD, TVA 20 %.`

Extraction attendue : client `Hôtel Atlas`, lignes `200 × draps × 85 MAD` et `40 × serviettes × 22,5 MAD`, TVA `20 %`.

## État

**CANDIDATE — non certifié runtime.**

Aucun déploiement Vercel. Aucun merge tant que build/runtime/captures/human gate ne sont pas prouvés.
