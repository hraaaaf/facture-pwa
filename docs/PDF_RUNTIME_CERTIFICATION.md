# PDF runtime certification — 26 août 2026

## Scope

Validation runtime des PDF Original/Premium après contournement du blocage DNS local via GitHub Actions.

## Preuve technique

- workflow run : `32956883264`
- job : `98140389945`
- workspace de départ : `51ea5bae1f02def91a8fbe936ee4f00f80a68f71`
- patch produit appliqué dans le runner puis testé
- commit produit résultant : `b818ee14b35e54749fa8370971aea89945b8044f`
- HEAD PR #1 vérifié sur ce commit
- tests : **13/13 passés** (`tests/pwa.test.ts`, `src/lib.test.ts`, `tests/pdf-artifacts.test.ts`)
- build : **succès** (`tsc -b && vite build`)
- PWA build : manifest + service worker générés
- artifact PDF : `9602313604 — exact-head-pdfs-fixed`
- 5 PDF produits : facture Original, BL détaillé Original, BL simple Original, facture Premium, facture Premium stress

Le job global est rouge uniquement sur l'étape finale de push : GitHub a refusé au `GITHUB_TOKEN` la modification du workflow sans permission `workflows`. Les étapes produit, tests, build et upload artifact sont toutes vertes. Le commit `b818ee14…` est désormais le HEAD de la PR et contient exactement les blobs produit testés dans le runner, avec le workflow revenu en `workflow_dispatch` manuel.

## Corrections validées dans ce runtime

- autosave brouillon debounce 800 ms branché dans l'éditeur ;
- annulation explicite de l'autosave avant Enregistrer/Finaliser ;
- suppression brouillon atomique `get(id) -> contrôle DRAFT -> delete(id)` dans une seule transaction IndexedDB ;
- montants PDF Premium normalisés avec espaces ASCII pour éviter les glyphes cassés de Helvetica ;
- fixture PDF source utilise le logo extrait du document utilisateur ;
- le libellé de marque n'est pas répété sous le logo lorsqu'un logo est présent.

## Inspection visuelle réelle

Les PDF de l'artifact ont été rendus en PNG à 180 dpi et inspectés.

### Original

- facture : logo présent, montants 800 / 8000 / 1600 / 9600 lisibles, tableau et footer sans chevauchement ;
- BL détaillé : même structure financière ;
- BL simple : structure sans prix conservée ;
- comparaison avec le PDF source effectuée.

**Score runtime Original : 9,3/10.**

Écart restant vers 9,5 : logo encore un peu plus petit que la source, quelques écarts de typographie/espacement et absence volontaire de fausse signature manuscrite.

### Premium

- montants français corrigés : `8 000,00`, `1 600,00`, `9 600,00 MAD` ;
- cas stress : remise ligne 10 %, remise globale 5 %, HT 6 840, TVA 1 368, TTC 8 208 ;
- aucun chevauchement observé ;
- footer, page number, client/object et résumé lisibles.

**Score runtime Premium : 9,4/10.**

Écart restant vers 9,5 : finition typographique de certains headers et optimisation de la densité verticale.

## Gates encore ouvertes

- Original >= 9,5 ;
- Premium >= 9,5 ;
- test multi-page réel ;
- partage/téléchargement/impression sur navigateur/appareil réel ;
- audit 390/430/768 de l'app ;
- installation/offline/backup/restauration sur appareils réels.

Aucun Vercel n'a été lancé.
