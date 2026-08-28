# Reprise de numérotation à l'onboarding

Date : 28 août 2026

## Goal

À la première configuration, demander où se sont arrêtés les vrais documents de la société afin que Factea poursuive chaque série au numéro suivant au lieu de repartir systématiquement à 1.

## Succès

- Devis, Facture, BL et BC ont chacun leur dernier numéro réel.
- `0` signifie aucun document antérieur.
- Exemple cible : dernier numéro Facture `13` en 2026 → première facture Factea `F-2026-014`.
- La reprise s'applique uniquement à l'année indiquée dans l'onboarding.
- Les années suivantes repartent sur leur propre séquence.
- Un compteur déjà supérieur n'est jamais diminué.
- La baseline est conservée avec les réglages société et reste donc présente dans les sauvegardes locales.
- BEFORE / AFTER requis : 390 / 430 / 768 / 1280.

## Implémentation

Branche : `feat/onboarding-numbering-baseline`

PR : `#10`

État : **IMPLÉMENTÉ — CERTIFICATION EN ATTENTE**

Le bloc de reprise est intégré à l'étape 5 `Documents`. Les valeurs saisies alimentent les compteurs IndexedDB avant la fin de l'onboarding. La logique est monotone : une valeur existante plus élevée gagne toujours.

## Validation prévue

Workflow dédié : `Numbering Baseline Certification`.

Preuves attendues :

- tests unitaires ;
- build TypeScript + Vite/PWA ;
- capture BEFORE depuis `main` ;
- capture AFTER depuis la branche ;
- mêmes viewports 390 / 430 / 768 / 1280 ;
- assertion IndexedDB `FACTURE:<année>.last === 13` ;
- finalisation réelle d'une facture → `F-<année>-014` ;
- zéro erreur console/page.

## Gate

Le merge vers `main` n'est pas autorisé tant qu'il peut déclencher un déploiement Vercel sans autorisation explicite.
