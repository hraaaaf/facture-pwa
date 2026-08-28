# Reprise de numérotation à l'onboarding

Date : 28 août 2026

## Goal

À la première configuration, demander où se sont arrêtés les vrais documents de la société afin que Factea poursuive chaque série au numéro suivant au lieu de repartir systématiquement à 1.

## Succès

- [x] Devis, Facture, BL et BC ont chacun leur dernier numéro réel.
- [x] `0` signifie aucun document antérieur.
- [x] Exemple cible : dernier numéro Facture `13` en 2026 → première facture Factea `F-2026-014`.
- [x] La reprise s'applique uniquement à l'année indiquée dans l'onboarding.
- [x] Les années suivantes repartent sur leur propre séquence.
- [x] Un compteur déjà supérieur n'est jamais diminué.
- [x] La baseline est conservée avec les réglages société et resynchronisée au démarrage si le store compteur doit être reconstruit.
- [x] BEFORE / AFTER : 390 / 430 / 768 / 1280.
- [x] Zéro erreur page/console sur la certification navigateur.

## Implémentation

Branche : `feat/onboarding-numbering-baseline`

PR : `#10`

Le bloc de reprise est intégré à l'étape 5 `Documents`. Les valeurs saisies initialisent les compteurs IndexedDB avant la fin de l'onboarding. La logique est monotone : une valeur existante plus élevée gagne toujours.

La baseline est également persistée dans `CompanySettings` et réappliquée au démarrage / refresh de l'application. Cela évite qu'une restauration ou une reconstruction locale du store `counters` ne fasse repartir une série à 1.

## Preuve finale

HEAD produit certifié : `85c2ba826474c4459341c2c2b50c847640625533`.

Workflow : `Numbering Baseline Certification`.

Run exact-head : `33186834796` — **SUCCESS**.

Artifact : `9692194956` (`numbering-baseline-before-after`).

Digest : `sha256:c34184d19d53b0b90d3868b5ea059181620839964d2bd0459e22a837c0b6cbc1`.

Le run prouve :

- **100/100 tests PASS** sur 17 fichiers ;
- build TypeScript + Vite/PWA : SUCCESS ;
- build de la baseline `main` : SUCCESS ;
- BEFORE / AFTER sur 390 / 430 / 768 / 1280 ;
- `FACTURE:2026.last === 13` après onboarding ;
- suppression du compteur puis reload → compteur resynchronisé à `13` ;
- finalisation réelle → `F-2026-014` ;
- 0 erreur page ;
- 0 erreur console.

Comparaison visuelle BEFORE → AFTER effectuée sur les quatre viewports. Le nouveau bloc reste cohérent avec le design glass existant, sans clipping visible, et garde les quatre séries lisibles sur mobile.

**Score visuel du changement : 9,5/10.**

Preview Vercel du HEAD produit : `dpl_5dnMYncdjjuqv4LiCT6YjGyjnTRr` — **READY**, branche feature, sans promotion manuelle.

## État

**CERTIFIÉ — AUTORISÉ AU MERGE VERS `main` PAR L'UTILISATEUR LE 28 AOÛT 2026.**

Le merge peut déclencher automatiquement le déploiement Production via l'intégration Git Vercel. Aucun appel manuel à l'API de déploiement Vercel n'est nécessaire.
