# KpopCards : ta page, dans l'ordre (lot 7, photos de groupe en 2 ou 3 cartes et panoramas)

Huit étapes, en un seul passage. Ne saute rien, ne change pas l'ordre. Claude n'a aucun accès à la production : tout ce qui touche Supabase
et Vercel, c'est toi.

Avant de commencer :
- La PR #233 est fusionnée et son fichier 117 est appliqué (le bouton « Reconstruire le catalogue » marche). Le 118 refuse sans le 117.
- Aucun paquet n'a été ouvert. Le 118 refuse dès qu'un paquet existe : il change les numéros des cartes de groupe.
- La CI de la PR du lot 7 vers `main` est verte.

## Les étapes

1. **Sauvegarde.** Supabase, Database, Backups : une sauvegarde de moins de 24 heures doit exister.

2. **116c, seulement si tu le veux et s'il n'est pas encore appliqué : AVANT le 118.** Le 118 change la note de 6 des 187 photos
   « Personality rights » (des photos de groupe où quelqu'un serait coupé même en 3 cartes) : après lui, la garde stricte du 116c (exactement
   187 photos) refuserait. Si tu as déjà appliqué le 116c, passe à l'étape 3.

3. **118, les photos de groupe.** SQL Editor de Supabase, jamais entre 23:50 et 00:30 UTC. Colle
   `docs/pending-migrations/cards/118-group-parts.sql` (147 Ko, un seul bloc DO) et lance.
   - Il ajoute aux photos leur nombre de cartes (2 ou 3), crée les tables des panoramas, et remplace quatre fonctions (catalogue, ajout au
     catalogue, ouverture, craft). Il ne reconstruit pas le catalogue.
   - Sur les 255 photos de groupe des lots 3 et 6 : 81 en 2 cartes, 117 en 3, 37 passent « À relire » (quelqu'un serait coupé même en 3), 20
     sont refusées (la vignette semblait montrer une personne de moins de 18 ans). Il ne touche que les photos de groupe que la base a.
   - Lis les notices (onglet Messages) : « photos set to 2 ..., to 3 ..., focal points moved ..., kept (owner's) ..., to review ..., rejected
     ..., pages not found ... ». « kept (owner's) » compte les photos dont tu avais déplacé le point focal : il est gardé, l'admin te prévient
     si la fenêtre coupe quelqu'un.
   - Autre façon : `psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/118-group-parts.sql`
   - Si ça échoue : rien n'a changé (un seul bloc). Lis le message, puis dis-le à Claude.

4. **Les lignes Verify.** Les 13 lignes `-- Verify:` en tête du fichier : colle chaque requête, compare au `expect`.

5. **Fusionne la PR du lot 7.** Le code marche avant et après le 118 ; l'ordre 118 puis fusion est le plus simple.

6. **Admin, « Reconstruire le catalogue ».** Les cartes de groupe suivent alors leurs 2 ou 3 parties (numéros consécutifs) et les
   panoramas P-0001 et suivants sont écrits. Le message affiche le nombre de cartes et de panoramas.
   - Facultatif : l'onglet « À relire » montre les 37 photos. Pour chacune, le choix « 2 cartes » ou « 3 cartes », l'aperçu des parties et
     du panorama, et l'avertissement si la fenêtre coupe quelqu'un. Approuve celles que tu veux, puis reconstruis encore.

7. **Le script, depuis un terminal (dans ton dossier du dépôt, à jour de `main`) :** `pnpm --filter quiz owner:cards`
   - Il vérifie `TOUT_OK`, puis coupe et envoie les tiers (5,5 x 8,5, 2x si chaque tiers fait au moins 640 px) et les panoramas (la fenêtre
     entière, 2x si chaque partie a son 2x). Les paires déjà coupées gardent leurs fichiers et reçoivent seulement leur panorama.
   - Il te propose ensuite d'effacer les fichiers qui ne servent plus (les moitiés d'une photo passée en 3) : rien n'est effacé sans que tu
     tapes `delete`.

8. **Le premier vrai paquet.**

## Ce que ça donne (règles inchangées par ailleurs, paires et tiers comptés comme des cartes)

| Cas | Cartes avant le lot 7 | Cartes après | Photos de groupe en 2 / en 3 | Panoramas |
| --- | --- | --- | --- | --- |
| Photos auto seulement | 980 | 993 | 24 / 61 | 85 |
| Avec le 116c | 1 188 | 1 188 | 26 / 66 | 92 |
| Toutes les photos « À relire » approuvées | 1 526 | 1 630 | 79 / 146 | 225 |

Ces chiffres viennent des données du dépôt avec la règle des éditions du catalogue ; les vrais sont dans le message de l'étape 6.

## Revenir en arrière

`docs/pending-migrations/cards/118-group-parts.rollback.sql` (un bloc DO) rend les quatre fonctions d'avant, remet les photos comme elles
étaient (statut, note, point focal, 2x) et retire ce que le 118 a ajouté. Il refuse dès qu'un paquet a été ouvert. Ensuite, « Reconstruire
le catalogue ».
