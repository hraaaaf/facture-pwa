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

1. **Dashboard annuel fiable** — CERTIFIÉ, MERGE PR #11 RESTANT
   - « Cette année » filtre réellement l’année courante ;
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

**État : CERTIFIÉ — PR #11 à merger.**

Repo : `hraaaaf/facture-pwa`
Branche : `fix/dashboard-year-stats`
PR : `#11`
HEAD certifié avant ce commit documentaire : `4f988c01b9dbeb361ecddbefcc3314376db06870`
Run de certification : `33274002642` — **SUCCESS**.
Artefact : `dashboard-stats-before-after`, ID `9720952874`, SHA-256 `766d8287196bebab96646b510c1c4ef856bf97fd9254efe1832f3b00e1c9d58e`.

Changements produit :
- `src/dashboardStats.ts` : agrégation annuelle métier isolée ;
- `src/App.tsx` : dashboard branché sur cette agrégation ;
- `src/dashboardStats.test.ts` : régressions dédiées.

Certification :
- `102/102` tests unitaires verts ;
- build TypeScript/Vite/PWA vert ;
- build de la baseline `main` vert ;
- navigateur : `7/7` assertions ;
- baseline : Facture `4 / 1 900 MAD` ;
- AFTER : Facture `2 / 300 MAD` ;
- BL sans prix : `1 / 0 MAD` ;
- 390/430/768/1280 : scrollWidth = innerWidth ;
- 0 erreur page ;
- 0 erreur console ;
- captures BEFORE/AFTER présentes aux 4 viewports ;
- diff pixel BEFORE/AFTER : 390 = 0,157 %, 430 = 0,143 %, 768 = 0,090 %, 1280 = 0,054 % ;
- score visuel du lot : **10/10 conformité à la référence**, changement visible limité aux KPI attendus.

Incidents de harnais et résolution :
- run `33272762635` : assertions 7/7 puis annulation pendant teardown ;
- run `33272928812` : assertions 7/7 puis timeout 180 s, serveurs `npm preview` persistants ;
- après deux échecs similaires, stratégie changée : serveurs enfants supprimés et remplacés par deux serveurs HTTP statiques gérés dans le même process Node ;
- run `33274002642` : teardown, rapport et upload d’artefact terminés avec succès.

Aucun critère métier ou visuel n’a été affaibli pour obtenir le vert.

## Avancement audit remediation

Avant merge : **0/7 clos, étape 1 certifiée**.
Après merge vérifié de la PR #11 sur `main` : **1/7 clos = 14,3 %**.

## Next exact

Exiger une CI verte sur le HEAD documentaire final de la PR #11, rendre la PR prête, merger avec contrôle du SHA, vérifier `main` post-merge et l’état du déploiement automatique. Ensuite passer à l’étape 2 : continuité / sauvegarde des données.
