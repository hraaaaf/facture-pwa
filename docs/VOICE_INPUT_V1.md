# V1 — Input vocal → Devis

Date : 27 août 2026

## Goal

Ajouter un cinquième mode d'entrée `Vocal` dans `Input → Devis`, avec dictée, transcription modifiable et passage dans le pipeline déterministe existant, sans créer de rupture visuelle avec l'UI certifiée Factea.

## Goal visuel

Le Vocal doit sembler natif au produit existant : mêmes surfaces glass, vert premium, rayons, ombres, typographie, bottom-sheet et touch targets que `Visual Polish V1`.

Référence : `src/polish.css` + `docs/mockups/VOICE_INPUT_V1.svg`.

Critères :

- sheet cohérente avec les autres bottom-sheets ;
- bouton Vocal traité comme une carte premium du même design system ;
- vert `premium-green` / dégradé CTA existant ;
- rayons 15/20/24/34 px cohérents selon boutons/cartes/sheet ;
- surfaces translucides + blur/saturation déjà employés dans l'app ;
- contrôles tactiles >= 48 px dans le flow vocal ;
- aucun style visuel autonome ou concurrent.

## Succès

- [x] mockup cible 390 px figé (`docs/mockups/VOICE_INPUT_V1.svg`) ;
- [x] mockup réaligné sur Visual Polish V1 ;
- [x] bouton Vocal intégré à la sélection des sources ;
- [x] état d'écoute / arrêt / reprise ;
- [x] transcription toujours visible et modifiable ;
- [x] fallback saisie manuelle si SpeechRecognition indisponible ;
- [x] extraction déterministe simple quantité + désignation + PU + TVA ;
- [x] réutilisation dictionnaire F4 + normalisation + revue ciblée + JSON canonique ;
- [x] styles Vocal alignés sur les tokens/surfaces de `polish.css` ;
- [ ] build TypeScript exact HEAD ;
- [ ] runtime 390/430/768 ;
- [ ] permission micro iPhone réelle ;
- [ ] capture AFTER runtime ;
- [ ] comparaison BEFORE → mockup → AFTER ;
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
