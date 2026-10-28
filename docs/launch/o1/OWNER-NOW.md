# Lancement de FandomVerse : mes actions, dans l'ordre (2026-10-28)

**Moi : environ 4 h 45, en 49 étapes sur 69 (4 h 55 et 51 étapes si les deux étapes « si besoin » servent). Dont 4 h jusqu'à la fin du jour J.**
**Claude : environ 7 h 30. Worker : environ 14 h 25, dont 7 h 50 à surveiller des journaux. Ils travaillent entre mes étapes et ne changent rien en production.**
**Durée totale : au moins 5 jours de la session B au jour J inclus (trois veilles de 24 h : après B, après 008, après 010), puis 72 h de veille. Au plus tôt : B le jour 1, jour J le jour 5, décision finale le jour 8.**

Objectif « moins de 5 h » tenu, de justesse. Ce qui coûte le plus : le jour J (1 h 25), les six sauvegardes (une par session SQL, 30 min en tout) et les preuves avec un vrai compte (environ 40 min : aucun agent ne se connecte ni ne crée de compte en production).

## Comment lire cette page

- **Moi** : ce que toi seul peux faire (achat, DNS, collage SQL en production, clés et réglages des tableaux de bord, drapeaux Vercel, go / no-go). **Claude** : l'intégrateur, SQL en lecture seule sur la production et journaux Supabase. **Worker** : un agent qui vérifie par curl et lit Vercel (déploiements, journaux, réglages). Tu ne lances jamais de commande de vérification.
- Sous chaque titre : qui fait quoi, et combien de temps. Un bloc = une commande : copie-le en entier, dans le Terminal, depuis le dossier du dépôt. `read -rs` n'affiche rien pendant que tu colles : appuie sur Entrée.
- Après chaque collage, écris dans le chat « collé n° X ». Claude (ou le worker) vérifie et répond OK avant la suite. Une sortie avec `ERROR` : ne lance rien d'autre, colle la sortie dans le chat. Chaque fichier se rejoue sans risque.
- Heures en UTC (Paris en hiver : UTC + 1). Jamais de SQL entre 23:50 et 00:30. Une session SQL par phase, une sauvegarde au début de chaque session, les fichiers dans l'ordre de `SQL-ORDER.md`.
- Le SQL passe par psql, dans le terminal ouvert par la sauvegarde de la session : il garde la chaîne de connexion jusqu'à sa fermeture. Terminal fermé en cours de session : relance seulement cette ligne.
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL
```
- Variante pour un petit fichier « en une transaction » : `pbcopy < docs/pending-migrations/multisite/001-sites.sql` (le chemin du fichier), puis Cmd+V dans une nouvelle requête de l'éditeur SQL de Supabase, Run. Jamais l'éditeur pour 002b, 002c et 009 (hors transaction), ni pour L04, L05 et L07 (1,2 à 2,6 Mo).
- Le détail, les vérifications et le retour arrière de chaque étape : le lien RUNBOOK (en anglais) et `ROLLBACK.md`. L'état et les décisions : `OWNER-TODO.md`.

Déjà fait, rien à faire : le groupe Microfrontends `fandomverse`, les variables Vercel de `fandomverse` et `otakuquiz`, les trois secrets passport et `CRON_SECRET` (l'intégrateur, le 2026-10-28, exception CLI). Google : aucune origine JavaScript, aucun client nouveau ; Discord : rien (`AUTH-FANDOMVERSE.md`).

## Partie 1. Maintenant, aucune base touchée (35 min pour moi)

### 1. Acheter le domaine
Moi 10 min. [RUNBOOK H6](RUNBOOK.md#h-domain-vercel-supabase-and-google)

Achète `fandomverse.org` chez le registrar de ton choix. Acheté dans Vercel (Domains) : les enregistrements de l'étape 2 sont posés pour toi, fais seulement la partie Search Console.

### 2. DNS et propriété Search Console
Moi 12 min, Worker 5 min. [RUNBOOK H6 et K10](RUNBOOK.md#h-domain-vercel-supabase-and-google)

Chez le registrar, TTL 300 secondes. Aucun MX pour `team`.

| type | nom | valeur |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Puis Search Console, Ajouter une propriété, type Domaine, le nom ci-dessous. Ajoute chez le registrar l'enregistrement TXT que Google affiche, puis Valider (ça peut attendre quelques heures). C'est un geste de K10 fait en avance : rien n'est indexé avant l'étape 56.
```
fandomverse.org
```
Vérif (worker) : A `76.76.21.21`, `www` en CNAME `cname.vercel-dns.com`, aucun MX pour `team.fandomverse.org`.

### 3. La clé service_role en variable partagée
Moi 8 min, Worker 5 min. [RUNBOOK H3](RUNBOOK.md#h-domain-vercel-supabase-and-google)

Supabase, Project Settings, API Keys : copie la clé `service_role` (ne la colle nulle part ailleurs). Vercel, Team Settings, Environment Variables, Shared, Add : Sensitive, Production seulement, projets `kpopquiz`, `fandomverse`, `otakuquiz`. Si Vercel refuse `kpopquiz` (il a déjà la sienne, même valeur) : garde-la et lie les deux autres. Clé :
```
SUPABASE_SERVICE_ROLE_KEY
```
Vérif (worker) : les trois projets montrent la variable en Production.

### 4. Les adresses de retour Supabase
Moi 5 min. [RUNBOOK H4](RUNBOOK.md#h-domain-vercel-supabase-and-google)

Supabase, Authentication, URL Configuration, Redirect URLs, Add URL, une fois par ligne. Site URL reste `https://kpopquiz.org`. Exactement ces deux adresses, sans `*` ni `?`. Supprime `https://otakuquiz.org/**` et `https://fanquiz.org/**` s'ils y sont.
```
https://fandomverse.org/auth/callback
```
```
https://fandomverse.org/anime/auth/callback
```
Vérif : au jour J, étape 49 (la connexion revient bien sur fandomverse.org).

## Partie 2. Fusion et premiers déploiements (19 min pour moi)

### 5. Prêt à fusionner ?
Claude 30 min. [RUNBOOK A5](RUNBOOK.md#a-before)

Claude confirme les quatre conditions de A5 : les lanes FandomVerse sont dans `o1/integration`, les vérifs sont vertes, aucun bloqueur n'est ouvert, la dernière comparaison de production était identique. Il te résume `docs/launch/o1/A5-REVIEW.md`.

### 6. Fusionner la PR `o1/integration` vers `main`
Moi 15 min. [RUNBOOK A5](RUNBOOK.md#a-before)

Lis le résumé de Claude (le détail dans `A5-REVIEW.md` si tu veux), puis fusionne sur GitHub. C'est ta décision. Vercel déploie `kpopquiz` tout seul.

### 7. Après la fusion
Worker 1 h 15, Claude 5 min. [RUNBOOK A4 à A6](RUNBOOK.md#a-before)

Worker : le déploiement `kpopquiz` est Ready, Runtime Logs calmes pendant 1 h, V1 (pages identiques), même nombre de crons dans `apps/quiz/vercel.json` et dans Vercel (A6). Claude : `admin_delete_account` existe (A4).

### 8. Premiers déploiements des deux nouveaux projets
Moi 4 min, Worker 20 min. [RUNBOOK H8](RUNBOOK.md#h-domain-vercel-supabase-and-google)

Après le OK de l'étape 7. Vercel, `otakuquiz`, Deployments : Redeploy du dernier `main`. Puis la même chose sur `fandomverse`. Cet ordre vient de `ARCHITECTURE-FANDOMVERSE.md`, section 5.

Vérif (worker) : V9 (le hub sur `/`, OtakuQuiz sur `/anime`, noindex, `check:env` passe), le groupe Microfrontends, la liste de `ENV.md` section 4.

## Partie 3. Session SQL B : 001 à 007 (40 min pour moi, 2 h 30 sur place)

Ton heure la plus calme, jamais entre 23:50 et 00:30. Une heure d'attente à l'étape 14.

### 9. Ouvrir la session B : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK A2](RUNBOOK.md#a-before)

Supabase, Database, Backups : une sauvegarde de moins de 24 h existe (sinon prends-en une si ton plan le permet). Puis dans le Terminal :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```
`read -rs` attend la chaîne de connexion (Supabase, Connect : direct, ou session pooler si ton réseau n'a pas d'IPv6). Le dump prend quelques minutes. Garde ce terminal ouvert toute la session. Garde le dump 60 jours, sur ta machine seulement (données personnelles).

Vérif (Claude) : le dump se relit (`pg_restore --list`, plusieurs centaines d'entrées).

### 10. Point de départ
Claude 10 min, Worker 10 min. [RUNBOOK A3, B1](RUNBOOK.md#b-p1-001-to-007)

Claude : V0 dans `~/kpq-launch/v0.txt` et les 12 signatures dans `~/kpq-launch/functions-before.txt`. Worker : la production `kpopquiz` tourne le commit de `main` ; la photo V1 dans `~/kpq-launch/before`.

### 11. 001 puis 002a
Moi 4 min, Claude 4 min. [RUNBOOK B2, B3](RUNBOOK.md#b-p1-001-to-007)

Un bloc, « collé n° 11 », le OK de Claude, puis le second. Un échec sur `lock_timeout` : relance plus tard.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/001-sites.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/002a-site-columns.sql
```

### 12. 002b puis 002c, hors transaction (psql seulement)
Moi 5 min, Claude 4 min. [RUNBOOK B4](RUNBOOK.md#b-p1-001-to-007)

Les index prennent quelques minutes.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/multisite/002b-site-validate.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/multisite/002c-site-indexes.sql
```

### 13. 002d, DANGEREUX
Moi 6 min, Claude 3 min. [RUNBOOK B5](RUNBOOK.md#b-p1-001-to-007)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/002d-quiz-site-guard.sql
```
Tout de suite après, connecté sur kpopquiz.org : crée un quiz jetable, vérifie qu'il s'enregistre, supprime-le. Écris « collé n° 13, quiz OK » (ou ce qui a raté).

### 14. `SITE_SCOPE=1` sur kpopquiz
Moi 4 min, Worker 1 h 10, Claude 3 min. [RUNBOOK B6](RUNBOOK.md#b-p1-001-to-007)

Après le OK de Claude sur 002b à 002d. Vercel, `kpopquiz`, Settings, Environment Variables, Add, Production : la clé ci-dessous, valeur `1`. Puis Deployments, Redeploy de la production sans le cache de build.
```
SITE_SCOPE
```
Vérif : worker (V1 identique, puis 1 h de Runtime Logs calmes), Claude (V2). Attends leur OK, environ 1 h, avant l'étape 15.

### 15. 003, DANGEREUX
Moi 9 min, Claude 3 min. [RUNBOOK B7](RUNBOOK.md#b-p1-001-to-007)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/003-memberships.sql
```
Tout de suite après, dans une fenêtre privée : inscris un compte jetable sur kpopquiz.org et termine l'accueil. Donne son nom d'utilisateur à Claude. Garde ce compte jusqu'à l'étape 23.

### 16. 004 et 005
Moi 3 min, Claude 4 min. [RUNBOOK B8](RUNBOOK.md#b-p1-001-to-007)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/004-passport-prefs.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/005-net-counters.sql
```

### 17. 006 puis 007
Moi 4 min, Worker 3 min, Claude 4 min. [RUNBOOK B9, B10](RUNBOOK.md#b-p1-001-to-007)

Avant 006, le worker confirme que `passport` n'est pas dans les « Exposed schemas » de l'API Supabase (par requête, VERIFY V3).
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/006-passport-handoff.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/007-world-xp.sql
```

### 18. Fermer la session B
Worker 10 min, Claude 2 min. [RUNBOOK B11](RUNBOOK.md#b-p1-001-to-007)

Worker : nouvelle photo V1 et comparaison. Claude note l'heure : la veille de 24 h commence. Tu peux fermer le terminal.

## Partie 4. Veille, session D : 008, veille (21 min pour moi)

### 19. La veille de 24 h, à l'étape 18 plus 24 h
Claude 15 min, Worker 20 min. [RUNBOOK C](RUNBOOK.md#c-24-hour-watch-after-b)

Claude : les lignes « 24 hour watch » de V3, des parties et des inscriptions qui arrivent toujours, l'audit des compteurs. Worker : Runtime Logs `kpopquiz` sur 24 h, V1, `robots.txt` et balises robots de kpopquiz.org inchangés (Search Console : toi, à l'étape 63). Leur « veille propre » ouvre la session D.

### 20. Ouvrir la session D : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK A2](RUNBOOK.md#a-before)

Ton heure la plus calme, loin de 00:05 et de 03:30 à 05:00 (les crons). Supabase, Database, Backups : une sauvegarde de moins de 24 h existe. Puis :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```

### 21. La porte avant 008
Claude 10 min. [RUNBOOK D1](RUNBOOK.md#d-p2-008-write-locks)

Claude compare les 11 fonctions de production au fichier de retour de 008. Il doit lire `functions read: 11 | body different from the rollback file: none`. Un nom listé : on s'arrête.

### 22. 008, DANGEREUX
Moi 8 min, Claude 10 min, Worker 10 min. [RUNBOOK D2](RUNBOOK.md#d-p2-008-write-locks)

Seulement après le « none » de l'étape 21.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/008-write-locks.sql
```
Tout de suite après, avec le compte jetable : joue un quiz, like un quiz, retire le like, crée un quiz puis supprime-le. Écris « collé n° 22 » et ce que tu as vu.

Vérif : Claude (V4 après 008, `V-S4 ok`, XP et compteurs bougent comme avant, audit des compteurs), worker (V1).

### 23. La veille de 24 h, à l'étape 22 plus 24 h
Moi 8 min, Claude 15 min, Worker 20 min. [RUNBOOK D3](RUNBOOK.md#d-p2-008-write-locks)

Claude : l'audit des compteurs reste au plus au niveau de base. Worker : Runtime Logs calmes sur 24 h. Toi : la même preuve qu'à l'étape 22 avec le compte jetable, puis supprime ce compte comme d'habitude (tableau de bord Supabase ou admin). Écris « fait n° 23 ». Leur « veille propre » ouvre la session E.

## Partie 5. Session E : 009, le déploiement, 010 (10 min pour moi)

Commence entre 18:00 et 22:20, un jour sans autre changement, et fais tout d'une traite.

### 24. Ouvrir la session E : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK A2](RUNBOOK.md#a-before)

Supabase, Database, Backups : une sauvegarde de moins de 24 h existe. Puis :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```

### 25. 009, hors transaction (psql seulement)
Moi 3 min, Claude 9 min. [RUNBOOK E1, E2](RUNBOOK.md#e-p3-009-the-app-deploy-010)

Avant : Claude confirme que les deux anciennes clés existent encore (`2`). Après : V5 « After 009 ».
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/multisite/009-daily-prep.sql
```

### 26. Le déploiement de l'app
Worker 5 min, Moi (si besoin) 3 min. [RUNBOOK E3](RUNBOOK.md#e-p3-009-the-app-deploy-010)

Worker : la production `kpopquiz` tourne le dernier `main` (la fusion ou plus récent) et `/daily` redirige vers une page `/q/`. Seulement s'il te le demande : Vercel, `kpopquiz`, Deployments, Redeploy du dernier `main` sans le cache.

### 27. 010, DANGEREUX
Moi 2 min, Claude 4 min. [RUNBOOK E4](RUNBOOK.md#e-p3-009-the-app-deploy-010)

Tout de suite après l'étape 26. Jamais après 23:45 : sinon arrête-toi là et fais 010 le lendemain soir, avec une nouvelle sauvegarde (étape 24) ; 009 et le déploiement restent en place.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/010-daily-v2.sql
```
Vérif (Claude) : V5 « After 010 ». Il note l'heure.

## Partie 6. Veille après 010, puis session G : 011 à 017 (21 min pour moi)

### 28. Le lendemain matin, après 00:05
Claude 5 min, Worker 5 min. [RUNBOOK E5](RUNBOOK.md#e-p3-009-the-app-deploy-010)

Claude : la ligne `qotd_log` du jour avec `kpop`, un seul quiz du jour. Worker : `/daily` y mène ; Vercel, `kpopquiz`, Cron Jobs : `ensure-daily-quiz` a réussi.

### 29. V7, à l'étape 27 plus 24 h
Claude 15 min, Worker 10 min. [RUNBOOK F](RUNBOOK.md#f-24-hour-watch-after-010)

Les six conditions de V7 sont vraies : le Verrou 0 est levé. Alors la session G.

### 30. Ouvrir la session G : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK A2](RUNBOOK.md#a-before)

Supabase, Database, Backups : une sauvegarde de moins de 24 h existe. Puis :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```

### 31. 011, 018, 012, 013, 014, 015
Moi 12 min, Claude 18 min. [RUNBOOK G1](RUNBOOK.md#g-p5-011-to-017)

Dans cet ordre, un bloc à la fois, « collé n° 31, 011 » après chacun, le OK de Claude (V6) entre deux. Si 013 s'arrête sur un nom de `game_type` : ne touche pas au fichier, colle la sortie, Claude s'en occupe.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/011-anime-series.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/018-entity-images.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/012-editorial-quiz.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/013-formats.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/014-daily-openings.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/015-spoilers.sql
```

### 32. 016 et 017
Moi 4 min, Claude 6 min. [RUNBOOK G2](RUNBOOK.md#g-p5-011-to-017)

Seulement si Claude confirme que `admin_delete_account` existe (sinon on saute les deux).
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/016-passport-deletion.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/017-deletion-kpop.sql
```

### 33. Fermer la session G
Claude 3 min, Worker 1 h 10. [RUNBOOK G3](RUNBOOK.md#g-p5-011-to-017)

Claude : `V-S4 ok`. Worker : V1, puis 1 h de Runtime Logs.

## Partie 7. Contenu et go / no-go (10 min pour moi)

### 34. Le contenu
Claude 1 h 30. [RUNBOOK J](RUNBOOK.md#j-content)

En parallèle des parties 3 à 6. Claude relit un échantillon des paquets de `docs/anime/editorial/packets/` (J1), lance `node scripts/anime/editorial/check.mjs docs/anime/data` (0 échec), contrôle les sha256 de `MANIFEST.json`, l'absence de fichier DRAFTS et de `team.otakuquiz.org` (J2), et répète les fichiers de lancement sur `o1-scratch` (J3 : le second passage ne change rien). Il te donne le résultat.

### 35. Le rapport K1, la veille du jour J
Claude 20 min, Worker 15 min. [RUNBOOK K1](RUNBOOK.md#k-launch-day)

Chaque ligne de K1 est vérifiée : veilles propres, V9, fichiers de lancement, DNS, groupe Microfrontends, adresses de retour, clé liée, `QOTD_ROTATION_FIX=1` sur `otakuquiz`. Claude dit aussi si l'étape 45 (images) sert.

### 36. Go / no-go
Moi 10 min. [RUNBOOK K1](RUNBOOK.md#k-launch-day)

Lis le rapport. Tout est vrai et quelqu'un est libre les 72 h qui suivent le lancement : « go ». Sinon le jour J se décale.

## Partie 8. Jour J (1 h 25 pour moi, une journée sur place)

Commence après 00:30, finis avant 22:00.

### 37. Ouvrir la session du jour J : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK K2](RUNBOOK.md#k-launch-day)

Supabase, Database, Backups : une sauvegarde de moins de 24 h existe. Puis :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```

### 38. Point de départ du jour
Claude 10 min, Worker 10 min. [RUNBOOK K2](RUNBOOK.md#k-launch-day)

Claude : V0 dans `~/kpq-launch/v0-launch.txt`. Worker : la photo V1 dans `~/kpq-launch/before`.

### 39. L01
Moi 2 min, Claude 3 min. [RUNBOOK K3](RUNBOOK.md#k-launch-day)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L01-B2-sites.sql
```

### 40. Les 31 comptes Team
Moi 6 min, Claude 5 min. [RUNBOOK K4](RUNBOOK.md#k-launch-day)

Supabase, Project Settings, API Keys : copie la clé `service_role`. La première ligne l'attend. La deuxième est un essai à blanc : colle sa sortie (un nombre) dans le chat. Au OK de Claude, la troisième crée les comptes, sans aucun e-mail. La dernière efface la clé du terminal.
```
read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain fandomverse.org
```
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain fandomverse.org --apply
```
```
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
```
Vérif (Claude) : 31 utilisateurs en `team.fandomverse.org`, tous confirmés.

### 41. L02 puis L03
Moi 4 min, Claude 6 min. [RUNBOOK K4, K5](RUNBOOK.md#k-launch-day)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L03-B7-sentinel.sql
```

### 42. L04 puis L05 (gros fichiers : psql seulement)
Moi 6 min, Worker 3 min, Claude 6 min. [RUNBOOK K5](RUNBOOK.md#k-launch-day)

Après L04, attends le OK du worker (aucun titre anime sur les pages de kpopquiz.org) avant L05.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L04-K1-series.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L05-K1-facts.sql
```

### 43. L06, L07, L08
Moi 8 min, Claude 10 min. [RUNBOOK K5](RUNBOOK.md#k-launch-day)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L06-B3-badges.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L07-K2-catalogue.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L08-K3-daily-bank.sql
```
Vérif (Claude) : `content-verify.sql` donne les nombres de `expected-counts.json` (V8), `V-S4 ok`.

### 44. L10-PERS
Moi 2 min, Claude 3 min. [RUNBOOK K5.3b](RUNBOOK.md#k-launch-day)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L10-PERS-personality.sql
```
Vérif (Claude) : 70 profils de personnalité pour `anime`.

### 45. Les images de l'admin, seulement si Claude l'a dit (étape 35)
Moi (si besoin) 6 min, Claude (si besoin) 5 min. [RUNBOOK K5.3c](RUNBOOK.md#k-launch-day)

La première ligne attend la clé `service_role`. La deuxième est un essai à blanc : colle sa sortie dans le chat. Au OK de Claude, la troisième copie. La dernière efface la clé.
```
read -rs PROMOTE_TARGET_SERVICE_KEY && export PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs
```
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs --apply
```
```
unset PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL
```

### 46. Les 14 lignes de la banque
Moi 2 min, Claude 2 min. [RUNBOOK K5](RUNBOOK.md#k-launch-day)

La ligne affiche 14 titres.
```
psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "update public.quiz_bank set status='verified', verified_at=now() where id in (select id from public.quiz_bank where site_id='anime' and status='draft' and scheduled_date is null order by md5(title) limit 14) returning title"
```

### 47. Les builds
Moi 6 min, Worker 5 min. [RUNBOOK K5b](RUNBOOK.md#k-launch-day)

Vercel, `otakuquiz` puis `fandomverse`, Settings, Git, Ignored Build Step : enlève `exit 0` s'il y est. Puis Deployments, Redeploy du dernier `main` sur chacun, `otakuquiz` d'abord. Ne touche pas à `kpopquiz`.

Vérif (worker) : un déploiement Ready de `main` sur chacun.

### 48. Le domaine
Moi 4 min, Worker 10 min. [RUNBOOK K6](RUNBOOK.md#k-launch-day)

Vercel, `fandomverse`, Settings, Domains : ajoute le premier nom, puis le second, réglé pour rediriger vers le premier. Rien sur `otakuquiz`. Si Vercel demande d'autres valeurs DNS qu'à l'étape 2, mets les siennes chez le registrar. Le certificat arrive tout seul.
```
fandomverse.org
```
```
www.fandomverse.org
```
Vérif (worker) : V10 (200, canonique et robots propres à chaque site, noindex encore présent, `www` redirige).

### 48 bis. Les crons d'OtakuQuiz passent par `/anime` (obligatoire)
Worker 20 min. [RUNBOOK K6b](RUNBOOK.md#k-launch-day)

Les chemins des crons de `apps/quiz/vercel.json` n'ont pas `/anime` : sur `otakuquiz`, chaque appel est relayé vers `https://fandomverse.org/anime/api/cron/...`, ce qui ne marche qu'une fois le domaine attaché (étape 48). Avant l'étape 48, des échecs dans le journal des crons d'`otakuquiz` sont normaux. 30 minutes après l'étape 48, en parallèle des étapes 49 à 52, le worker regarde :
- Vercel, projet `otakuquiz`, Logs, recherche `/anime/api/cron/` : `/anime/api/cron/editorial-publish` (toutes les 15 min) et `/anime/api/cron/live-expire` (toutes les 30 min) répondent 200. Un 401 : le `CRON_SECRET` n'arrive pas à la route ; un 404 : l'appel n'atteint pas `otakuquiz` ; aucune ligne : l'appel relayé n'arrive jamais sur `/anime`.
- Vercel, projet `otakuquiz`, Settings, Cron Jobs, `editorial-publish` et `live-expire`, View Logs : les derniers passages ont réussi.
- Vercel, projet `fandomverse`, Logs, recherche `/api/cron/` : seulement les crons du hub lui-même, aucune ligne `/anime/api/cron/...`.

Puis au Run de l'étape 52 et le lendemain à 00:05 UTC (étape 57) : `/anime/api/cron/ensure-daily-quiz` répond 200 dans les Logs d'`otakuquiz`.
Un cron en échec (401, 404 ou aucune ligne) : le worker prévient Claude dans l'heure ; Claude te dit comment publier le quiz du jour à la main (RUNBOOK K9). La solution de repli est d'ajouter des entrées `/anime/api/cron/...` dans `apps/quiz/vercel.json` : ce fichier sert aussi à kpopquiz.org, c'est donc ta décision (une PR).

### 49. Se connecter
Moi 5 min, Claude 5 min. [RUNBOOK K6](RUNBOOK.md#k-launch-day)

Sur `https://fandomverse.org` : connecte-toi avec Google, déconnecte-toi, puis avec Discord. Ouvre `https://fandomverse.org/anime` : tu y es connecté. Écris « fait n° 49 » et ce que tu as vu.

Vérif (Claude) : journaux Auth de Supabase, aucune erreur Google ni Discord.

### 50. `PASSPORT_JUMP=1`
Moi 9 min, Worker 5 min. [RUNBOOK K7](RUNBOOK.md#k-launch-day)

Vercel, Production, dans `kpopquiz`, `fandomverse` et `otakuquiz` : la clé ci-dessous, valeur `1`. Redéploie les trois ensemble. Puis, connecté sur kpopquiz.org, ouvre l'adresse ci-dessous : tu arrives sur `/anime` connecté, et `https://fandomverse.org` montre la même session.
```
PASSPORT_JUMP
```
```
https://kpopquiz.org/auth/passport/out?to=anime
```

### 51. L12 : les sites passent en ligne
Moi 2 min, Claude 3 min. [RUNBOOK K8](RUNBOOK.md#k-launch-day)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/L12-L1-sites-live.sql
```
Vérif (Claude) : `kpop`, `anime` et `hub` sont `live`.

### 52. Le quiz du jour
Moi 6 min, Worker 5 min, Claude 3 min. [RUNBOOK K9](RUNBOOK.md#k-launch-day)

Connecté avec ton compte admin sur `https://fandomverse.org/anime`, colle cette ligne dans la console du navigateur (elle prend la date du jour toute seule). La réponse dit `scheduled: 14`.
```
fetch('/anime/api/admin/quiz-bank/auto-schedule', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({start_date: new Date().toISOString().slice(0, 10)})}).then(r => r.json()).then(console.log)
```
Puis Vercel, `otakuquiz`, Settings, Cron Jobs, `ensure-daily-quiz`, Run (ça marche depuis l'étape 48).

Vérif : worker (`https://fandomverse.org/anime/daily` redirige vers une page `/anime/q/` ; Vercel, projet `otakuquiz`, Logs : le Run apparaît comme `/anime/api/cron/ensure-daily-quiz` en 200, étape 48 bis), Claude (14 lignes datées).

### 53. Une vraie partie
Moi 6 min. [RUNBOOK K9](RUNBOOK.md#k-launch-day)

Sur `/anime`, avec ton compte : joue un quiz, like-le, ouvre la page du jour et une page de série (couverture anti-spoiler ; le blind test répond 404, c'est prévu). Sur le hub : la page réseau, déconnecté puis connecté.

### 54. La vérification complète
Worker 45 min, Claude 10 min. [RUNBOOK K9](RUNBOOK.md#k-launch-day)

Worker : V10 en entier (avec les fuites de texte), V1 pour kpopquiz.org, 30 min de Runtime Logs propres sur les trois projets. Claude : les lignes de fuite de V8 sont à 0.

### 55. Go et annonce
Moi 2 min. [RUNBOOK K9](RUNBOOK.md#k-launch-day)

Si V10 trouve un reste K-pop déjà connu sur `/anime` (`docs/o1/RAPPORT-FINAL.md`, section 5) : décide « corriger d'abord » ou « accepter » ; Claude note la date. Puis annonce.

### 55 bis. Le noindex, avant l'indexation (et de nouveau après)
Worker 10 min. [RUNBOOK K9b](RUNBOOK.md#k-launch-day)

Avant que tu poses `NET_LAUNCH_DATE` et `NET_INDEXING` (étape 56), le worker lance ces six commandes : l'accueil du hub, l'accueil d'OtakuQuiz et une page de quiz d'OtakuQuiz (`/anime/daily` redirige vers le quiz du jour ; `-L` suit la redirection). Les trois premières lisent l'en-tête `X-Robots-Tag`, les trois dernières la balise robots du HTML.
```
curl -sI https://fandomverse.org | grep -i '^x-robots-tag'
```
```
curl -sI https://fandomverse.org/anime | grep -i '^x-robots-tag'
```
```
curl -sIL https://fandomverse.org/anime/daily | grep -i '^x-robots-tag'
```
```
curl -s https://fandomverse.org | grep -o '<meta name="robots" content="noindex[^"]*"'
```
```
curl -s https://fandomverse.org/anime | grep -o '<meta name="robots" content="noindex[^"]*"'
```
```
curl -sL https://fandomverse.org/anime/daily | grep -o '<meta name="robots" content="noindex[^"]*"'
```
Avant l'étape 56 : chaque commande affiche sa ligne noindex (`x-robots-tag: noindex, nofollow` ou `<meta name="robots" content="noindex, nofollow"`). Une commande muette à ce moment-là : on s'arrête, le worker prévient Claude avant l'étape 56.
Après les deux redéploiements de l'étape 56 (`NET_INDEXING=1` en ligne) : les six mêmes commandes n'affichent plus rien. Les adresses `*.vercel.app` gardent leur noindex ; elles sont protégées par Vercel, le worker ne les teste pas.

### 56. Ouvrir l'indexation, la toute dernière étape
Moi 9 min, Claude 2 min, Worker 10 min. [RUNBOOK K10](RUNBOOK.md#k-launch-day)

Seulement après le OK de Claude sur la ligne `privacy.controller` de `apps/quiz/src/copy/hub/h1.ts`. Vercel, Production, dans `fandomverse` et `otakuquiz` (jamais `kpopquiz`) : d'abord la première clé, valeur la date du jour au format `AAAA-MM-JJ` (Claude te la donne), puis la seconde, valeur `1`. Redéploie les deux.
```
NET_LAUNCH_DATE
```
```
NET_INDEXING
```
Search Console, propriété `fandomverse.org`, Sitemaps : soumets les deux adresses.
```
https://fandomverse.org/sitemap.xml
```
```
https://fandomverse.org/anime/sitemap.xml
```
Vérif (worker) : les six commandes de l'étape 55 bis n'affichent plus rien ; V10 « after K10 » (plus de noindex sur l'accueil, `/anime`, `/anime/series`, une série, un quiz ; toujours sur `/settings`, `/me`, `/anime/admin`), les deux fichiers de clé IndexNow répondent 200 sur fandomverse.org et 404 sur kpopquiz.org.

## Partie 9. Après le lancement (44 min pour moi)

### 57. Heure 0 à +1, puis +24 h
Claude 25 min, Worker 1 h 15. [RUNBOOK L1, L2](RUNBOOK.md#l-after-launch)

Worker : V10, V11 points 1 à 3, les inscriptions sur `/anime` ; à +24 h, obligatoire (étape 48 bis) : Vercel, projet `otakuquiz`, Logs, le `/anime/api/cron/ensure-daily-quiz` de 00:05 UTC et les autres crons du jour en `/anime/api/cron/...` répondent 200 (ni 401 ni 404), et Vercel, projet `fandomverse`, Logs n'a aucune ligne `/anime/api/cron/...`. Claude : journaux Auth (erreurs Google et Discord), comptes Team absents des classements ; à +24 h, après le cron de 00:05, une ligne `kpop` et une ligne `anime` du jour dans `qotd_log`.

### 58. Le pied de page réseau
Moi 6 min, Worker 1 h 10. [RUNBOOK L3](RUNBOOK.md#l-after-launch)

Après le « +24 h propre ». Vercel, Production, les trois projets : la clé ci-dessous, valeur `1`. Redéploie les trois.
```
NEXT_PUBLIC_NET_FOOTER
```
Vérif (worker) : V1 (seuls la ligne du pied de page et l'Organization changent), V10, 1 h de journaux propres.

### 59. Le menu réseau
Moi 6 min, Worker 1 h 10. [RUNBOOK L3](RUNBOOK.md#l-after-launch)

Après le OK du worker sur l'étape 58. Même geste, cette clé :
```
NEXT_PUBLIC_NET_MENU
```

### 60. La balise réseau
Moi 6 min, Worker 1 h 10. [RUNBOOK L3](RUNBOOK.md#l-after-launch)

Après le OK du worker sur l'étape 59. Même geste, cette clé :
```
NEXT_PUBLIC_NET_BEACON
```

### 61. kpopquiz : confidentialité et suppression
Moi 5 min, Claude 3 min, Worker 10 min. [RUNBOOK L3b](RUNBOOK.md#l-after-launch)

Vercel, `kpopquiz` seulement, Production : les deux clés ci-dessous, valeur `1` (la seconde seulement si Claude confirme que 016 et 017 sont appliqués et que `passport-deletions` a tourné sur `fandomverse`). Redéploie `kpopquiz`.
```
NEXT_PUBLIC_NET_PRIVACY
```
```
NEXT_PUBLIC_NET_DELETION
```
Vérif (worker) : V1.

### 62. +48 h et +72 h
Claude 30 min, Worker 40 min. [RUNBOOK L4](RUNBOOK.md#l-after-launch)

V11 à chaque fois. Claude : les requêtes, les journaux Auth, les conseils de sécurité de la base. Worker : V10, les journaux, les crons.

### 63. Décider à +72 h
Moi 8 min. [RUNBOOK L5](RUNBOOK.md#l-after-launch)

Regarde Search Console pour kpopquiz.org et fandomverse.org : sitemaps soumis, aucun nouveau « bloquée par robots.txt » ni « exclue par noindex » sur kpopquiz.org. Si V11 est propre depuis 72 h : remonte le TTL de fandomverse.org à la valeur par défaut du registrar, garde le dump du jour J 60 jours. Le lancement est fini. Sinon : `ROLLBACK.md` section 3, la couche la plus légère d'abord.

### 64. Tables du hub : la PR des deux crons
Worker 45 min. [RUNBOOK L6](RUNBOOK.md#l-after-launch)

Le worker (ou l'intégrateur) prépare la petite PR des deux routes cron (RUNBOOK L6, point 3). Elle se fusionne seulement après l'étape 66.

### 65. Ouvrir la session L6 : sauvegarde
Moi 5 min, Claude 2 min. [RUNBOOK L6](RUNBOOK.md#l-after-launch)

Après la balise réseau (étape 60) propre, à une heure calme. Supabase, Database, Backups : une sauvegarde de moins de 24 h existe. Puis :
```
git checkout main && git pull --ff-only
```
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f ~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```

### 66. Les deux fichiers du hub
Moi 4 min, Claude 10 min. [RUNBOOK L6](RUNBOOK.md#l-after-launch)
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/hub/001-quiz-daily-plays.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/hub/002-xp-daily-snapshots.sql
```
Vérif (Claude) : RUNBOOK L6, points 1 et 2.

### 67. Fusionner la PR des crons
Moi 4 min, Worker 10 min, Claude 10 min. [RUNBOOK L6](RUNBOOK.md#l-after-launch)

Fusionne la PR de l'étape 64 sur GitHub. Puis Vercel, `fandomverse`, Settings, Cron Jobs, `hub-xp-snapshot`, Run.

Vérif : worker (les deux crons listés sur `fandomverse`, `{"skipped":true}` sur les deux autres projets), Claude le lendemain matin (RUNBOOK L6, point 4).
