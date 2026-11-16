# KpopCards : ta page, dans l'ordre (lot 6, la récolte de photos)

Neuf étapes, en un seul passage. Ne saute rien, ne change pas l'ordre. Claude n'a aucun accès à la production : tout ce qui touche Supabase et Vercel, c'est toi.

Ce qui est déjà fait : le paquet 099 à 115 de la PR #231 tourne en prod depuis le 2026-11-15 (`TOUT_OK` true). Les variables Vercel de KpopCards sont celles de #231 ; ce lot n'en ajoute aucune. Aucun paquet n'a encore été ouvert.

Avant de commencer : la CI de la PR `o1/cards-harvest` vers `main` est verte (`unit` et `e2e`). Les aperçus Vercel `fandomverse` et `otakuquiz` échouent sur cette branche comme pour #231 (pas de variables Preview, c'est voulu).

## Les étapes

1. **Sauvegarde.** Supabase, Database, Backups : une sauvegarde de moins de 24 heures doit exister (fais-en une si ton offre le permet). Une sauvegarde plus vieille ne compte pas.

2. **116, la récolte.** SQL Editor de Supabase, jamais entre 23:50 et 00:30 UTC. Colle `docs/pending-migrations/cards/116-photos-harvest.sql` (1,1 Mo, un seul bloc DO) et lance.
   - Il ajoute les sujets du lot 6 (les 218 idols de Kpopdle, 10 membres de CORTIS, Hearts2Hearts et BABYMONSTER, 65 groupes), 1 115 photos (771 `auto`, 344 « À relire »), les 10 poches verrouillées et le type des groupes qu'il crée (liste du 111).
   - Il ajoute 7 lignes `public.idols` (Carmen et 6 mineurs) : inactives, à relire, sans date. Une garde en base refuse de les rendre actives tant que la personne a moins de 18 ans ou n'a pas de date.
   - Il ne change aucune photo, aucun statut et aucune ligne `public.idols` existante. Il refuse s'il ferait bouger la source de Kpopdle.
   - Lis les notices (onglet Messages) : « idols rows added 7 », « group types added », « photos added ».
   - Autre façon, depuis un terminal : `psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/116-photos-harvest.sql`
   - Si ça échoue : rien n'a changé (un seul bloc). Lis le message, puis dis-le à Claude. Ne relance pas à l'aveugle.

3. **116b, les 7 dates, depuis ton dossier privé.** Le fichier est sur ton Mac, hors du dépôt : `/Users/louis/kpq-o1/notes/cards-lot6/116b-idols-birth-dates.sql`.
   - Ouvre-le dans un éditeur de texte, copie tout, colle dans le SQL Editor et lance (ou `psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f /Users/louis/kpq-o1/notes/cards-lot6/116b-idols-birth-dates.sql`).
   - Il remplit la date de naissance des 7 lignes du 116 encore sans date, deux sources concordantes pour chacune. Il ne touche à rien d'autre : les lignes restent inactives, donc la date reste privée (la policy `idols_public_read` ne montre que les lignes actives).
   - Ce fichier ne va jamais dans le dépôt, dans un commit, dans le chat ou dans un message.
   - La notice dit « 116b: 7 birth dates filled (of 7) ».

4. **116c, facultatif : les 187 photos « Personality rights ».** Colle `docs/pending-migrations/cards/116c-approve-personality-rights.sql` et lance, seulement si tu le décides.
   - Il approuve les 187 photos qui attendent « À relire » pour une seule raison : Commons affiche sur le fichier l'avertissement « Personality rights » (la personne photographiée a des droits sur son image, à part du droit d'auteur ; licence et auteur ont été vérifiés comme pour les autres).
   - Garde stricte : il refuse sans rien changer si ce ne sont pas exactement ces 187 photos, ou si un paquet a été ouvert. Applique-le après 116b (une des 187 photos est celle de Carmen, qui attend sa date).
   - Effet : 980 cartes sans lui, 1 188 avec lui (après l'étape 7).

5. **Les Verify** (lecture seule), une requête à la fois dans le SQL Editor :
   - `select count(*) from public.idols where review_reason like '116-photos-harvest%' and active;` : **0**, toujours.
   - `select count(*) from pg_trigger where tgname = 'cards_116_idols_guard' and not tgisinternal;` : **1**.
   - `select count(*) from public.idols where review_reason like '116-photos-harvest%' and birth_date is not null;` : **7** (après 116b).
   - `select count(*) from public.dle_src_kpop_idol s join public.idols i on i.id::text = s.entity_id where i.review_reason like '116-photos-harvest%';` : **0**.
   - `select count(*) from public.cards_photos p where not exists (select 1 from public.cards_entities e where e.id = p.entity_id);` : **0**.
   - `select has_function_privilege('anon', 'public.cards_age_locks(date)', 'execute');` : **false**.
   - Si tu as passé 116c : `select count(*) from public.cards_photos where status = 'approved' and review_note like '%(approved with 116c-approve-personality-rights.sql)';` : **187**.
   - `ALL-verify.sql` n'est pas à lancer ici : ses lignes du catalogue ne sont vraies qu'après l'étape 7. Le script de l'étape 8 le lance lui-même.

6. **Fusionne la PR** `o1/cards-harvest` vers `main`, puis attends que les 3 déploiements, `kpopquiz`, `otakuquiz` et `fandomverse`, soient Ready.

7. **« Reconstruire le catalogue »** dans l'admin (connecte-toi, passe le code TOTP) : https://bunnyverse.org/anime/admin?tab=photos&kind=cards, bouton « Reconstruire le catalogue ». Le message dit combien de cartes attendent leur fichier : c'est normal, l'étape 8 les coupe.
   - Les photos « À relire » du lot 6 (344, ou 157 après 116c) peuvent attendre : approuvées plus tard, elles entrent par « Ajouter au catalogue », même après le premier paquet.
   - Dans la file des idols à relire de l'admin Verse, les 7 lignes du 116 apparaissent : ne les approuve pas. Pour un mineur, la garde de l'étape 2 refuserait de toute façon.

8. **Le script du terminal**, dans ton dépôt : `git pull`, puis `pnpm --filter quiz owner:cards`.
   - Il lit `apps/quiz/.env.local` et veut `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_DB_URL`. `SUPABASE_DB_URL` reste dans `apps/quiz/.env.local` seulement : jamais dans Vercel, jamais dans git, jamais dans le chat.
   - Il te fait retaper l'hôte du projet, refuse tant que `ALL-verify.sql` ne rend pas `TOUT_OK` (il tient compte du lot 6), puis coupe et publie les fichiers des cartes des photos vivantes (aperçu, confirmation tapée, publication). Il y en a beaucoup plus que pour #231 : compte plusieurs minutes.
   - Si `TOUT_OK` est false : reconstruis le catalogue (étape 7), puis relance. Si ça reste false, copie les lignes en échec à Claude.

9. **Le premier vrai paquet** : https://bunnyverse.org/kpopcards, connecté avec ton compte. Dès qu'un paquet est ouvert ou une carte possédée, « Reconstruire le catalogue » est refusé pour toujours : il ne reste que « Ajouter au catalogue ». Les poches « Carte à venir » s'ouvrent seules le jour des 18 ans, sans rien toucher.

## Revenir en arrière

Seulement avant le premier vrai paquet : après, on ne revient plus en arrière par le SQL.
1. D'abord Vercel, **Instant Rollback** sur les 3 projets (`kpopquiz`, `otakuquiz`, `fandomverse`), vers le déploiement précédent. Cela ne touche aucune donnée.
2. Si tu as passé 116c : `docs/pending-migrations/cards/116c-approve-personality-rights.rollback.sql` (les 187 photos repassent « À relire »).
3. `docs/pending-migrations/cards/116-photos-harvest.rollback.sql` : il retire ce que le journal du 116 a ajouté (photos, entités, types, la garde, les fonctions). Il garde les lignes `public.idols` que 116b a complétées ; pour les vider aussi : `update public.idols set birth_date = null where review_reason like '116-photos-harvest%';` avant le rollback.
4. Puis « Reconstruire le catalogue ».
