# PDF Original — Référence source verrouillée

Date : 26 août 2026

## Rôle

Ce fichier décrit la donnée de référence utilisée pour le LOT 3 PDF Original.

Les valeurs ci-dessous sont transcrites des PDF fournis par l’utilisateur. Elles ne doivent pas être remplacées silencieusement par des données de démonstration génériques.

Fixture code : `src/referenceFixture.ts`.

## Société source

- Nom : `Benmoussa Rachid`
- Marque : `TAPISTOR SABRE`
- Adresse : `484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT`
- Ville document : `RABAT`
- RC : `82972 RABAT`
- Patente : `26450045`
- CNSS : `7121982`
- ICE : `001806241000086`
- IF : `35789182`
- RIB : `181 810 21211 52654410108 03`

Les références fournies ne supportent pas de valeur TEL / FAX / email / nom de banque. Ces champs restent donc vides dans la fixture.

## Facture / BL détaillé source

- Numéro : `0107-2026`
- Date : `06 Juillet 2026`
- Client : `SECRÉTARIAT D’ETAT CHARGÉ DE L’ARTISANAT ET DE L’ECONOMIE SOCIALE ET SOLIDAIRE`
- Objet source : `Enretien de batiment administratif: Capitonnage de porte en similicuir au niveau du secrétariat general`
- Désignation : `Capitonnage de porte en similicuir` + `70cm/200cm`
- Unité : `Pièce`
- Quantité : `10`
- PU HT : `800`
- Total HT : `8000`
- TVA : `20 %` = `1600`
- TTC : `9600`
- Montant en lettres attendu : `NEUF MILLE SIX CENTS DIRHAMS`

## BL simple source

- Numéro : `06-07-2026`
- Même date / objet / désignation / unité / quantité
- Aucune colonne PU / Total
- Aucun total financier affiché

## Logo temporaire

Le vrai logo n’est pas extrait/réutilisé automatiquement depuis le PDF.

En attendant le fichier logo officiel, l’application utilise un **logo fictif temporaire** :

- fond vert ;
- pictogramme canapé stylisé ;
- initiales `TS` ;
- stocké dans `src/brand.ts` sous forme de data URL PNG ;
- remplaçable à tout moment via E0/E6 ;
- ne constitue pas un actif de marque définitif.

## Règle de fidélité

LOT 3 doit comparer le rendu généré à ces références en suivant :

`source PDF -> rendu PNG -> PDF généré -> rendu PNG -> comparaison visuelle`.

Le score `Original >= 9,5/10` ne peut être déclaré qu’après cette comparaison réelle.
