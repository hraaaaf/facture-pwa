# Facture PWA — Mobile Runtime Audit

Date : 26 août 2026

## Goal

Valider le parcours UI réel E0 → E6 sur 390 / 430 / 768 px, sans overflow horizontal ni erreur runtime, et vérifier que l’autosave du brouillon survit à un reload.

## Preuve

GitHub Actions run `32959150633`, HEAD audité `f69c6f6630afaf5ff9b3cb3de6705b079819712e`.

Artifact : `9603634672 — mobile-runtime-audit`.

Le statut GitHub du run est resté anormalement `in_progress`, mais l’artifact a été créé avec succès et contient les captures + `report.json`. La preuve se fonde sur l’artifact, pas sur le statut stale du run.

## Résultats observés

- 24 captures runtime : 8 étapes × 3 viewports.
- 390 × 844 : E0 onboarding, E1 dashboard, E2 nouveau document, E3 éditeur, E4 aperçu, dashboard après reload, E5 historique, E6 réglages.
- 430 × 932 : mêmes étapes.
- 768 × 1024 : mêmes étapes.
- overflow horizontal : 0 sur 24 captures.
- erreurs page : 0.
- erreurs console : 0.
- autosave récupéré après reload : 390 ✅ / 430 ✅ / 768 ✅.

## Défauts détectés

Le contrôle tactile >=44 px n’est pas encore fermé :

- bouton `.sheet-close` : 42 × 42 px sur 390 / 430 / 768 ;
- actions Historique `Ouvrir`, `Dupliquer`, `Supprimer` : hauteur 40 px sur 390 / 430 / 768.

Aucun autre contrôle visible <44 px n’a été détecté dans le parcours audité.

## Score visuel runtime

**9,3/10**.

Points forts : hiérarchie claire, glassmorphism cohérent, bottom nav/FAB propre, sheets lisibles, éditeur dense mais maîtrisé, réglages premium et cohérents, aucune rupture responsive visible.

Reste avant 9,5 : corriger les cibles tactiles 40/42 px, améliorer légèrement la densité 768 px et refaire une capture AFTER exacte du correctif.

## Gate

Audit mobile runtime : **PASS avec réserve tactile**.

Le chantier UI n’est pas DONE tant que les contrôles <44 px ne sont pas corrigés et recapturés.
