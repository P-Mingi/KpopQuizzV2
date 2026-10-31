# Nettoyages avant le lancement

Écrit le 2026-10-31 depuis le code, la copie du schéma de prod (17/10) et la doc publique de Vercel. Aucun accès à Vercel ni à Supabase : ce que je n'ai pas pu voir est dit à chaque section. Les noms de boutons viennent de la doc, l'écran peut différer un peu.

| # | Sujet | Qui agit | Quand |
|---|---|---|---|
| 1 | Preview de `main` en ERROR | toi : relire et fusionner le script | au prochain lot vers `main` |
| 2 | Clé `service_role` en Secret | toi seul | moment calme, juste avant un merge prévu |
| 3 | `ADMIN_PASSWORD` | toi | quand tu veux |
| 4 | byeol | toi : décider | après le lancement |
| 5 | Mots du lot K1 | fait | |
| 6 | SQL du 30/10 dans le `LEDGER` | fait, le texte manque | l'intégrateur le colle |
| 7 | Code mort | toi : décider | après le lancement |

## 1. Preview de `main` en ERROR sur `otakuquiz` et `fandomverse`

**La cause.** L'ancien worker avait vu juste, et la doc le confirme maintenant.

- Doc Vercel, « Managing microfrontends », Fallback environment : avec `Same Environment`, Vercel crée tout seul des Preview sur la branche de production de chaque projet du groupe.
- `kpopquiz` n'en a pas parce qu'il n'est pas dans le groupe (`apps/quiz/microfrontends.json`, `docs/launch/o1/ARCHITECTURE-BUNNYVERSE.md:25`).
- Ces Preview tombent sur `check:env` (`apps/quiz/package.json:8`, `apps/quiz/scripts/check-env.mts:16`) : `NEXT_PUBLIC_SUPABASE_*` n'existent en Preview que pour `o1/integration` (`scripts/o1-tools/vercel-preview-env.sh`, `docs/launch/o1/ENV.md:19`).
- Même un push de docs seules les déclenche : la règle docs compare au dernier déploiement réussi de la branche, et il n'y en a aucun.

**Les choix.**

| Choix | Effet à chaque push sur `main` | Avis |
|---|---|---|
| Variables pour toutes les branches | 2 vrais builds de plus, 200 s chacun | non : le plus cher, pour des Preview que personne n'ouvre |
| Couper `main` dans `apps/quiz/vercel.json` | plus aucune production, `kpopquiz` compris : le fichier est commun aux trois | non |
| Script (5 lignes utiles) | 2 déploiements annulés en quelques secondes | **oui, maintenant** |
| Réglage Fallback sur `Production` | aucun déploiement | après H8 seulement, voir plus bas |

**Pourquoi le script.** Il marche quel que soit le réglage du groupe, il est testé, il n'écrit rien dans Vercel. Il part avec le prochain lot vers `main`, donc sans push de plus. Limite : la doc compte un build annulé comme un déploiement dans les quotas, mais il ne fait aucun build.

**Le commit contient le script. À relire.** `apps/quiz/scripts/vercel-ignore-build.sh` saute un build seulement si les trois sont vrais : `VERCEL_ENV=preview`, branche `main`, projet `otakuquiz` ou `fandomverse`. Il ne touche donc aucune production, ni avant ni après K5b. Les nouveaux tests de `apps/quiz/src/lib/deploy/vercel-ignore-build.test.ts` le prouvent, avec `NET_PRODUCTION_HOLD` à 1 et à 0. `o1/integration` continue de builder.

**Tes clics, pour vérifier la cause (3 min, rien ne change).**

1. Vercel, projet `otakuquiz`, Deployments.
2. Filtre la branche `main`, ouvre la dernière ligne Preview en Error.
3. Dans les Build Logs, cherche `ignore-build:` puis `[check:env]`. Attendu : `first deployment of the branch, build`, puis `Build preflight FAILED for environment "preview"`.
4. Vercel, Team Settings, Microfrontends, groupe `fandomverse`, Settings, Fallback Environment. Note la valeur. Attendu : `Same Environment`.
5. Si la valeur est autre, dis-le au worker : la cause de la doc ne tient plus. Le script reste bon.

**Après la fusion, au prochain push sur `main`.**

1. Vercel, `otakuquiz`, Deployments : la Preview de `main` est Canceled, et son log dit `Preview of main, created by the group, skip`.
2. Pareil sur `fandomverse`.
3. Vercel, `kpopquiz`, Deployments : la production de ce push est Ready.
4. Retour en arrière : `git revert` du commit.

**Plus tard, après H8 (production sur les deux projets), si tu veux zéro déploiement.**

1. Vercel, Team Settings, Microfrontends, groupe `fandomverse`, Settings.
2. Fallback Environment : choisis `Production`, Save.
3. Retour en arrière : remets la valeur notée.

Pas avant H8 : sans production en face, une Preview dont l'autre projet n'a pas buildé répond `MICROFRONTENDS_MISSING_FALLBACK_ERROR`. Ce réglage ne touche jamais la production.

**Pas vu sans accès.** Le log réel, la valeur du réglage, et si le script tourne bien sur ces Preview (la durée de 27 s le laisse penser). `ARCHITECTURE-BUNNYVERSE.md:29` dit « Production by default » : si l'écran montre `Same Environment`, cette ligne est à corriger.

**À part.** Un push sur `preview/**` ferait la même erreur sur ces deux projets, pour la même raison. Je n'y touche pas.

## 2. Badge « Needs Attention » : la clé `service_role` de `kpopquiz` en Secret

**Ce que dit la doc.** Vercel dit maintenant Config (lisible) et Secret (illisible après l'enregistrement). Sensitive est l'ancien nom de Secret. Le badge « Needs Attention » n'est nommé nulle part dans la doc : je ne sais pas s'il part après cette clé ou après les 11 entrées.

**Ce que ça ne fait pas.** La valeur reste la même, donc la clé n'est pas renouvelée. Elle a été lisible. La renouveler est une autre décision : nouvelle clé d'abord, redéploiement, ancienne clé coupée en dernier.

**Les déploiements en cours.** Rien ne bouge pour eux : ils gardent leur copie de la valeur, et les crons aussi. Le changement compte au prochain déploiement. Pas de redéploiement à lancer : la valeur est la même.

**Avant.**

1. Choisis un moment calme : aucun build en cours, jamais entre 23:50 et 00:30 UTC, juste avant un merge déjà prévu. Ce merge servira de test, sans build de plus.
2. Aucun agent ne doit voir l'écran : pas de partage d'écran, pas d'extension navigateur avec agent, pas de capture. Rien dans un chat, un terminal ou un fichier.
3. Connecté en admin, ouvre `kpopquiz.org/admin/industry` et note le nombre de lignes. Cette page lit avec la clé (`apps/quiz/src/app/(site)/admin/industry/page.tsx:39`).

**Les clics.**

1. Supabase, Project Settings, API Keys : copie la clé `service_role`, la même sorte que celle en place (RUNBOOK H3).
2. Vercel, `kpopquiz`, Settings, Environment Variables. Cherche `SUPABASE_SERVICE_ROLE_KEY`.
3. Prends la ligne Production. Ne touche pas la ligne Preview de `o1/integration` : c'est la clé de `o1-dev`. Jamais de clé de prod en Preview.
4. Trois points, Edit.
5. Si la fenêtre propose Type : choisis Secret, colle la valeur, Save. Passe au 7.
6. Sinon : Cancel, trois points, Delete, puis tout de suite Add New : même nom, Type Secret, Production seul, colle la valeur, Save. Entre les deux, aucun build ne doit démarrer : il n'aurait pas la clé.
7. Copie un mot quelconque pour vider le presse-papiers.
8. La ligne affiche Secret.

La doc ne dit pas si tu verras le 5 ou le 6. Le CLI sait changer le type ; une leçon Vercel dit qu'il faut supprimer et recréer.

**Vérifier, après le déploiement du merge prévu.**

1. Vercel, `kpopquiz`, Deployments : la production est Ready.
2. `kpopquiz.org/admin/industry` montre le même nombre de lignes. Une mauvaise clé y donnerait des listes vides.
3. Vercel, `kpopquiz`, Logs : cherche `Invalid API key`. Rien pendant 1 h.
4. Ne te fie pas à `/sitemap.xml` : il ne casse pas de façon visible avec une mauvaise clé.
5. Un worker peut lire le type de la variable, jamais sa valeur.

**Revenir en arrière.**

1. Site cassé : `kpopquiz`, Instant Rollback vers le déploiement d'avant. Il garde ses anciennes valeurs.
2. Attention : après un rollback, les pushes ne passent plus en ligne. Il faudra Undo Rollback sur la production une fois réparé.
3. Mauvaise valeur : trois points, Edit, recolle depuis Supabase, Save, puis redéploie.
4. Retour en Config : pas de conversion possible. Delete, puis Add New en Config. Inutile pour le site, qui marche pareil.

## 3. `ADMIN_PASSWORD`

Aucun code ne la lit : recherche sur tout le dépôt, seulement `docs/kpopquizz-v2-spec-FINAL.md:90` et `:1381`, `docs/blindtest-migration-map.md:101`, et deux relevés dans `docs/proofs/`. L'admin passe par `ADMIN_USER_IDS`.

Vercel, `kpopquiz`, Settings, Environment Variables : cherche `ADMIN_PASSWORD`, trois points, Delete. Aucun redéploiement.
Si ce mot de passe sert ailleurs, change-le là-bas. Si la ligne n'existe plus, rien à faire : je ne peux pas le voir d'ici.

## 4. byeol

**Le système ne sert plus. Je n'ai donc pas écrit de migration : c'est une proposition.**

- Aucun appelant : ni `apps`, ni `packages`, ni `scripts`, ni `supabase/functions`, ni `pinterest-worker`, ni `.github` ne nomme `byeol_daily_caps`, `byeol_reward_history` ou les fonctions `award_*_byeol`. Recherche par grep.
- Seules traces hors docs : le mot dans des listes de chansons, et `check_byeol_eligibility` dans la liste de lecture de `scripts/o1/prod-proxy.mjs:12`, qu'aucune page n'appelle.
- Dans la base, seules les fonctions `award_daily_capped_byeol`, `award_first_time_byeol` et `check_byeol_eligibility` touchent ces tables (`prod-public.sql:1968`, `:2048`, `:2442`, `:2456`). Aucun déclencheur.
- Quand il servait, il écrivait par des fonctions SECURITY DEFINER (`supabase/migrations/063_byeol_anti_farming.sql:92` et `:165`). S4 les a fermées au public le 23/10 (`docs/pending-migrations/s4/S4-revoke-public-execute.sql:52`, header de `SQL-ORDER.md`). Elle note déjà « Byeol is gone ».
- Reste une écriture : le navigateur d'un connecté, sur ses propres lignes. Politiques `Service role can manage caps` et `Service role can insert rewards` (`prod-public.sql:6963` et `:6967`), à tort nommées : elles visent `auth.uid() = user_id`, pour tous les rôles.

**Le risque est faible.** Aucune page ne lit ces lignes. Un utilisateur peut seulement remplir ses propres lignes de deux tables mortes, sans gain.

**Ce que je propose, après le lancement, comme l'ancien worker.** Un fichier `docs/pending-migrations/multisite/` avec son rollback, rangé dans la partie « After launch » de `SQL-ORDER.md` (ligne 107), à écrire sur ton accord :

```sql
drop policy if exists "Service role can manage caps" on public.byeol_daily_caps;
drop policy if exists "Service role can insert rewards" on public.byeol_reward_history;
```

Fermer ces deux règles ne casse aucun flux : les lectures de ses propres lignes restent, les suppressions de compte passent par la cascade (`prod-public.sql:6240` et `:6241`), et les fonctions sont déjà fermées depuis S4. Même sujet à regarder dans le même fichier : `Users can update own byeol` sur `dev_user_byeol` (`prod-public.sql:7022`).

**À lire d'abord (Claude, en lecture seule).** La copie du schéma date du 17/10 :

```sql
select max(created_at) from public.byeol_reward_history;
select max(updated_at) from public.byeol_daily_caps;
```

Une date récente voudrait dire qu'un client que je ne vois pas écrit encore : on s'arrête et on cherche.

## 5. Mots du lot K1

Fait, sur les seules lignes utiles :

- `docs/launch/o1/OWNER-NOW.md:268` : liste vide en session G, activation après, sur une liste que tu coches. La phrase « Tant qu'un fichier du lot K1 n'est pas sur main » est retirée.
- `docs/launch/o1/SQL-ORDER.md:67` (14e bis) : même texte.
- `docs/launch/o1/SQL-ORDER.md:66` (14e) : « not on main yet » retiré. Ce n'était pas demandé, mais 021a est sur `main`.
- `docs/launch/o1/RUNBOOK.md:247` (G1) : même texte.

Vu, pas touché, hors du brief :

- `docs/launch/o1/session.sh:27` dit encore « the idols the owner chose » dans un commentaire.
- `docs/launch/o1/SQL-ORDER.md:86` (L13) dit « not on main yet », alors que le fichier y est.

## 6. SQL du 30/10 dans le `LEDGER`

Fait : `docs/o1/LEDGER.md`, D-128. Il note ce qui est connu et dit que le texte manque. Les noms des 4 tables Pinterest fermées manquent aussi : je ne les ai pas devinés. **L'intégrateur peut les coller.**

## 7. Code mort : rien n'est supprimé

### Admin de `apps/blindtest`

**Ce que c'est.** 10 fichiers sur les 159 de l'app : `src/app/admin/songs/` (page et `song-manager.tsx`), 7 routes `src/app/api/admin/songs/`, `src/lib/admin.ts`.

**Qui s'en sert.** Personne hors de ces fichiers : `isAdmin` n'est importé que par eux. L'admin de `/admin/songs` en prod est un autre code, dans `apps/quiz`. L'ancien projet Supabase de l'app n'existe plus (`docs/blindtest-migration-map.md:14`), et le dernier changement de `src` date du 2026-04-17.

**Ce qui lit l'app elle-même, hors docs.**

- `package.json:8` et `:10` : deux scripts.
- `pnpm-workspace.yaml` et `pnpm-lock.yaml:21` : le lien au monorepo.
- `scripts/blindtest/populate-curated.mjs:15` : importe `apps/blindtest/docs/kpop-artists-catalog.mjs`.
- `scripts/apply-bt-migrations.ts:11` : lit son `.env.local`.

**Ce que la suppression toucherait.** L'admin seul : ces 10 fichiers, et un build de plus au push, car ce ne sont pas des docs. L'app entière : en plus les lignes ci-dessus et le lockfile.

**Mon avis.** Ne retire pas l'admin seul : cela ne gagne rien, l'app ne tourne pas. Après le lancement, une seule PR retire `apps/blindtest/src`, garde `apps/blindtest/docs` tant que les scripts le lisent. Avant, regarde dans Vercel qu'aucun projet ne pointe sur `apps/blindtest` : je ne peux pas le voir.

### Cron `spotify_snapshots`

**Ce que c'est.** `apps/quiz/vercel.json:72`, chaque lundi à 06:00 UTC, appelle `apps/quiz/src/app/api/cron/spotify-snapshot/route.ts`. La route écrit les followers de chaque groupe dans `spotify_snapshots` (`route.ts:65`). Sans clés Spotify, elle ne fait rien (`route.ts:33`).

**Qui lit la table.** Personne : `spotify_snapshots` n'apparaît que dans cette route. Aucune vue ni fonction de la copie de prod ne la lit (`prod-public.sql:1553`). `apps/quiz/src/lib/db/queries/group-hub.ts:199` et `/admin/industry` lisent `mv_snapshots`, l'autre table, qui elle sert.

**Ce que la suppression toucherait.**

- `apps/quiz/vercel.json:72` : un cron de moins, et « 18 entries » dans `docs/launch/o1/RUNBOOK.md:33`.
- La route et `apps/quiz/src/lib/industry/spotify.ts`.
- Le bouton de `apps/quiz/src/app/(site)/admin/industry/industry-admin.tsx:107`.
- `apps/quiz/src/lib/r1-source-guards.test.ts:136`, qui attend cette route. Le changer demande ton accord : règle du ratchet.
- `apps/quiz/scripts/o1/q0a/twins-baseline.json:463`.
- `docs/launch/o1/ENV.md:76`.

**Mon avis.** Rien avant le lancement : `vercel.json` compte les crons (A6) et la prod doit rester identique. Après, retire le cron, la route, le bouton et la lib, et garde la table : aucune perte. Une seule question pour toi : veux-tu un jour une courbe de followers ? Si oui, garde le cron : une semaine manquée ne se rattrape pas, et il coûte un appel par semaine.

Je ne sais pas si le cron écrit vraiment. Pour le voir, en lecture seule : `select count(*), max(snapshot_date) from public.spotify_snapshots;`
