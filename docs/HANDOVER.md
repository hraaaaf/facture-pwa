# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## Goal

PWA mobile-first Devis / Factures / BL / BC, local-first, simple en surface, avec moteur métier robuste, mémoire clients/catalogue, autosave et PDF Original/Premium.

## Repo

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- HEAD produit certifié : `c2873b7c6ff6446aae8b797fb7e0233de4ea061d`
- run final : `33007119765`
- artifact : `9621115970`
- workflow lourd : `workflow_dispatch` uniquement après closeout
- aucun Vercel
- aucun merge avant human gate

## Avancement global

**110 critères implémentés/observés sur 116 = 94,8 %.**

Le chantier n'est pas DONE : 6 gates appareil réel / partage / human gate / merge restent ouvertes.

## Preuve finale exact-head

Run `33007119765` sur `c2873b7c6ff6446aae8b797fb7e0233de4ea061d` :

- CI : SUCCESS ;
- jsPDF `4.2.1` + AutoTable `5.0.8` ;
- `npm audit --omit=dev --audit-level=critical` : 0 vulnérabilité ;
- tests : 15/15 ;
- build + PWA SW/manifest : SUCCESS ;
- runtime v4 : 10 assertions, `offline=true`, 0 erreur page/console ;
- Premium/mobile : 2 assertions, 0 erreur page/console ;
- artifact final : `9621115970`, 27 fichiers.

## Runtime métier / stockage

Le run final confirme notamment : deux factures séquentielles, déduplication client sans perte adresse/ICE/IF, catalogue `usageCount=2` et dernier PU=100/TVA=20, préfixe dupliqué refusé, backup v2 cohérent, restore v1 + migration, restore v2, rejet backup avec numéro final dupliqué sans mutation, reload offline via SW.

## Mobile / tactile

Run final :

- sheet close pendant animation : **44,325 px** sur 390/430/768 ;
- actions Historique : **45 px** ;
- aperçu Premium : 390/430/768, aucune largeur > viewport ;
- actions Partager/PDF/Imprimer : **56 px** ;
- fiche client : bouton fermer **44×44 px** ;
- suggestions + fiche client revues aux 3 viewports ;
- 0 overflow, 0 erreur page/console.

**Score UI global conservé : 9,3/10.**
**Score visuel lot Premium/mobile : 9,5/10.**

## PDF

Artifact final :

- Original : 1 page normale + stress 4 pages ;
- Premium : 1 page normale + stress 3 pages ;
- rendu 200 dpi inspecté ;
- aucun chevauchement, clipping ou glyph cassé observé ;
- comparaison source → Original effectuée.

Scores finaux :

- **Original : 9,5/10** ;
- **Premium : 9,5/10**.

La différence résiduelle de l'Original concerne surtout les éléments dépendant des données société (ex. signature réellement chargée) et de légères variations typographiques, sans défaut de structure.

## Gates restantes

1. Installation réelle iPhone/Android.
2. Fermeture/réouverture sans perte sur appareil réel.
3. Partage/téléchargement/impression navigateur réel.
4. Partage PDF iOS/Android.
5. Human gate final.
6. Merge uniquement après validation humaine.

## NEXT EXACT

Passer sur appareil réel, exécuter les quatre preuves d'installation/persistance/partage, puis human gate. Si toutes sont vertes : mise à jour canonique finale, merge uniquement après validation explicite. Aucun Vercel.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md. État vérifié : 110/116 = 94,8 %. HEAD produit certifié c2873b7c… ; run final 33007119765 SUCCESS ; artifact 9621115970. 15/15 tests, build, audit 0 vulnérabilité, runtime v4 10 assertions, Premium/mobile 2 assertions, offline et tactile >=44 px prouvés. Original 9,5/10, Premium 9,5/10. Restent uniquement installation iPhone/Android, fermeture/réouverture réelle, partage/téléchargement/impression navigateur réel, partage PDF iOS/Android, human gate puis merge. Aucun Vercel.`
