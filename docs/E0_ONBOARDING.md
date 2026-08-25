# E0 — Premier démarrage / identité société

## Statut

CANDIDAT FONCTIONNEL — non certifié visuellement/runtime.

## Objectif

Un utilisateur qui ouvre Facture PWA pour la première fois doit configurer l’identité de l’entreprise avant d’accéder au dashboard. Cette identité alimente ensuite automatiquement les Devis, Factures, BL, BC et PDF.

## Déclenchement

- stockage vierge / aucune société sauvegardée : E0 s’affiche ;
- après validation : `onboardingCompleted = true` est persisté ;
- fermeture/réouverture : E0 ne doit plus apparaître ;
- installation ancienne déjà configurée : migration considérée configurée pour éviter un blocage inattendu.

## Parcours verrouillé

### 1 — Identité

- Nom / raison sociale — requis
- Nom commercial / marque
- Logo PNG/JPEG local

### 2 — Coordonnées

- Adresse — requise
- Ville
- Téléphone
- Fax
- Email

### 3 — Identifiants légaux

- ICE
- IF
- RC
- Patente
- CNSS

### 4 — Banque

- Banque
- RIB

### 5 — Documents

- TVA par défaut, bornée 0..100
- Modèle PDF Original / Premium
- Signature gérant PNG/JPEG locale
- Résumé avant validation

## Persistance

Les champs sont stockés dans `CompanySettings` dans IndexedDB. Les champs structurés génèrent la ligne de pied de page compatible avec les moteurs PDF existants.

Tous les champs sont modifiables ensuite dans E6 Réglages.

## UX / UI

- mobile-first ;
- glassmorphism cohérent avec `docs/mockups/UI_V1_MASTER.jpg` ;
- progression 5 étapes ;
- bouton primaire sticky accessible au pouce ;
- safe-area iOS ;
- contrôles >= 44 px ;
- champs optionnels non bloquants ;
- pas de jargon comptable inutile.

## Gates avant certification

- stockage vierge → E0 visible ;
- nom vide → impossible de terminer ;
- adresse vide → impossible de terminer ;
- TVA hors 0..100 impossible côté UI ;
- logo conservé après fermeture ;
- signature conservée après fermeture ;
- ICE/IF/RC/Patente/CNSS/TEL/FAX/RIB visibles dans Réglages après onboarding ;
- identité présente dans le PDF ;
- E0 ne réapparaît pas après validation ;
- test 390 / 430 / 768 sans overflow ;
- 0 erreur console.

## Fichiers produit

- `src/OnboardingScreen.tsx`
- `src/onboarding.css`
- `src/main.tsx`
- `src/types.ts`
- `src/storage.ts`
- `src/SettingsScreen.tsx`

## NEXT

E0 est candidat. Le NEXT EXACT global reste LOT 1 — moteur métier production-grade.
