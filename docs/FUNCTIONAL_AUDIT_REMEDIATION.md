# Factea — Functional Audit Remediation

Date de départ : 29 août 2026

## Goal global

Faire passer Factea de l’audit fonctionnel initial **8,6/10** à un niveau >= 9/10 sur les usages réels, sans sacrifier la simplicité mobile, le local-first, la fiabilité métier ni la preuve.

## Doctrine

- chaque étape est close uniquement avec preuve ;
- aucune promotion/déploiement Vercel manuel sans autorisation explicite ;
- les changements UI conservent une preuve BEFORE/AFTER aux viewports pertinents ;
- une CI en cours ne bloque pas le travail indépendant ;
- `DONE` = code + tests + comportement observé + closeout cohérent.

## Séquence 1 → 7

1. **Dashboard annuel fiable** — EN COURS
   - « Cette année » doit réellement filtrer l’année courante ;
   - DRAFT/CANCELLED exclus des KPI ;
   - FINALIZED/PAID uniquement ;
   - BL sans prix : document compté, montant = 0.

2. **Continuité / sauvegarde des données** — À FAIRE
   - réduire le risque de perte lié au stockage uniquement local ;
   - conserver une solution simple, explicite et compatible PWA.

3. **Cycle facture / encaissement** — À FAIRE
   - échéance, retard, paiement partiel/acompte et mode de règlement selon le niveau minimal utile.

4. **Recherche / filtres** — À FAIRE
   - ICE, désignation, montant, période et filtres réellement utiles au volume.

5. **Gestion Clients / Catalogue** — À FAIRE
   - surfaces dédiées pour consulter, corriger et gérer la mémoire locale.

6. **Garde-fous OCR / imports lourds** — À FAIRE
   - limites de volume/pages, feedback et échec propre sur mobile.

7. **Actions mortes / cohérence UX** — À FAIRE
   - supprimer ou rendre fonctionnelle toute action visible sans comportement réel, notamment « Plus d’options ».

## Étape 1 — Dashboard annuel fiable

**Goal** : les cartes « Cette année » représentent uniquement l’activité métier valide de l’année courante.

**Succès** :
- baseline reproduit le défaut audité ;
- AFTER filtre l’année courante ;
- DRAFT/CANCELLED exclus ;
- FINALIZED/PAID inclus ;
- BL sans prix compte sans ajouter de montant ;
- 390/430/768/1280 sans overflow ni erreur console/page.

**État actuel : EN COURS — preuve métier acquise, CI finale en cours.**

Repo : `hraaaaf/facture-pwa`
Branche : `fix/dashboard-year-stats`
PR : `#11` draft
HEAD candidat : `70eb7fd9fdace804de20f863d54241014dec62f5`
Run courant : `33273982753` — en cours.

Changements produit :
- `src/dashboardStats.ts` : agrégation annuelle métier isolée ;
- `src/App.tsx` : dashboard branché sur cette agrégation ;
- `src/dashboardStats.test.ts` : régressions dédiées.

Certification :
- `.github/workflows/dashboard-stats-cert.yml` ;
- `scripts/dashboard-stats-certification.mjs` ;
- BEFORE/AFTER 390/430/768/1280 + assertions métier.

Preuves déjà obtenues :
- `102/102` tests unitaires verts sur les HEAD précédents ;
- build TypeScript/Vite/PWA vert ;
- navigateur : `7/7` assertions atteintes deux fois ;
- baseline : Facture `4 / 1 900 MAD` ;
- AFTER : Facture `2 / 300 MAD` ;
- BL sans prix : `1 / 0 MAD` ;
- 390/430/768/1280 sans overflow ;
- 0 erreur page / console ;
- captures BEFORE/AFTER produites.

Incidents de harnais :
- run `33272762635` : assertions 7/7 puis annulation du job pendant le teardown ;
- run `33272928812` : assertions 7/7 puis timeout 180 s, serveurs `npm preview` restés vivants ;
- stratégie changée : suppression des processus `npm preview`, remplacés au HEAD `70eb7fd9…` par deux serveurs HTTP statiques gérés dans le même process Node.

Aucune modification des critères métier ou visuels n’a été faite pour rendre la CI verte.

## Avancement audit remediation

**0/7 clos** tant que l’étape 1 n’a pas une CI finale verte puis son closeout/merge.

## Next exact

Vérifier le run `33273982753`. Si vert : inspecter rapport/artefact, marquer l’étape 1 close, rendre la PR prête, merger et vérifier `main` post-merge. Si rouge : diagnostiquer l’étape exacte sans affaiblir les critères.
