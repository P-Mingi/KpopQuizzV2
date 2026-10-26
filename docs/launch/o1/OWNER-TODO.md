# Lancement OtakuQuiz et FanQuiz : ce qu'il te reste à faire (owner, 2026-10-26)

Rien ici n'est nouveau. Chaque ligne cite sa section du RUNBOOK (`docs/launch/o1/RUNBOOK.md`) ou une décision du journal (`docs/o1/LEDGER.md`).
Les temps sont des estimations de temps actif, mains sur le clavier. Les attentes (veille, DNS, builds) sont comptées à part quand elles sont longues.
Fichiers compagnons : `SQL-ORDER.md` (ordre SQL), `ENV.md` (variables), `VERIFY.md` (contrôles V0 à V11), `ROLLBACK.md` (retour arrière).

Légende : MAINTENANT = faisable avant T0. JOUR J = le jour T0. APRÈS = après T0.
Chaque étape : quoi faire, durée, ce qui doit être vrai avant.

## 0. Déjà fait, ne pas refaire

- S4 (A0) est appliqué en production depuis le 2026-10-23 à 14:53 UTC (LEDGER D-103). Il reste seulement le contrôle `V-S4` (VERIFY A0) à rejouer après 008 (RUNBOOK D2).
- Le RUNBOOK dit encore "à ajouter" pour les deux crons (A6). Le LEDGER D-102 dit que `vercel.json` les a (17 jobs). Tu vérifies seulement (A6).
- Les fichiers de lancement L01 à L08, L10-PERS et L12 sont générés en mode "verified" et ne contiennent aucun `-- DRAFTS` (vérifié dans le dossier `docs/pending-migrations/multisite/launch/`). Tu vérifies les sha256 (J2), tu ne régénères que si tu changes des faits.
- Identité légale (forme, SIREN, directeur, téléphone) remplie dans `copy/hub/h1.ts` (D-114). Le build refuse de lancer s'il reste un crochet.
- Les projets Vercel `otakuquiz` et `fanquiz` existent, variables publiques posées, builds en pause par `exit 0` (RUNBOOK H1, retiré à K5b).
- Pas de Discord sur les nouveaux domaines (D-099). Resend et le hook email sont reportés (D-115, RUNBOOK I). Rien à faire pour les emails au lancement.

## 1. MAINTENANT (avant T0), dans l'ordre du RUNBOOK

### A. Avant (RUNBOOK A)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| A1 | Préparer `~/kpq-launch`, vérifier `psql` et `pg_dump` 15+, taper `PROD_DB_URL` avec `read -rs` | 15 min | rien |
| A2 | Sauvegarde : backup Supabase de moins de 24 h + `pg_dump` perso. À refaire avant B, D, E et K (10 à 20 min chaque fois) | 20 min | A1 |
| A3 | Base de référence : VERIFY V0, puis `snap ~/kpq-launch/before` (V1) | 15 min | A2 |
| A4 | Mission U sur `main` : D (puis son `account-deletion.sql` une fois, sauf s'il est déjà passé), puis B, C, A. B et C ne servent qu'après le lancement | 30 min | A3. Contrôle : `to_regprocedure('public.admin_delete_account(uuid,boolean,boolean)')` non nul |
| A5 | PR `o1/integration` vers `main` : lire le diff par zone, merger si checks verts, rapports C1 C2 C3 sans bloqueur, B7 dedans, comparaison prod identique sur 60 pages. Puis V1 et 1 h de logs | 90 min (plus 1 h de veille passive) | A4. Ne pas utiliser "set quiz of the day" ni "auto select" admin avant E (note de A5) |
| A6 | Vérifier que `apps/quiz/vercel.json` a les crons `passport-deletions` (03:50) et `passport-cleanup` (03:55) : 17 jobs. Sinon petite PR | 10 min | A5 |
| A7 | Régler les points ouverts (section 5 plus bas) | 15 min | rien |

### B. P1 : 001 à 007 (au plus tard T-30, RUNBOOK B)

Heure calme, pas entre 23:50 et 00:30 UTC. Tout est additif.

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| B1 | Sauvegarde du jour, `snap before`, vérifier que `origin/main` = déploiement prod kpop | 20 min | A5 déployé |
| B2 | `sql1 $M/001-sites.sql` puis V2 | 5 min | B1 |
| B3 | `sql1 $M/002a-site-columns.sql` puis V2 (24 colonnes) | 10 min | B2 |
| B4 | `sqln $M/002b-site-validate.sql` puis `sqln $M/002c-site-indexes.sql` (jamais en transaction) | 20 min | B3 |
| B5 | `sql1 $M/002d-quiz-site-guard.sql` (DANGEREUX) puis créer et supprimer un quiz test sur kpopquiz.org | 15 min | B4 |
| B6 | Vercel kpop : `SITE_SCOPE=1` en Production, redeploy sans cache. Puis V1 | 15 min (plus 1 h de logs) | B3 à B5 contrôlés, aucune ligne anime en base |
| B7 | `sql1 $M/003-memberships.sql` (DANGEREUX) puis inscrire un compte test en navigation privée | 15 min | B6 |
| B8 | `sql1 $M/004-passport-prefs.sql` et `sql1 $M/005-net-counters.sql` | 5 min | B7 |
| B9 | Vérifier que `passport` n'est PAS dans Exposed schemas (Supabase, API), puis `sql1 $M/006-passport-handoff.sql` | 10 min | B8 |
| B10 | `sql1 $M/007-world-xp.sql` puis V3 | 5 min | B9 |
| B11 | V1 encore, noter l'heure : la veille de 7 jours commence | 10 min | B10 |

### C. Veille de 7 jours (RUNBOOK C)

- Chaque jour : lignes "Seven day watch" de V3, Runtime Logs kpop, Search Console, jeux et inscriptions qui arrivent.
- Durée : 5 min par jour, 35 min en tout. Ne pas passer à D avant un jour 7 propre.

### D. P2 : 008 write locks (au plus tard T-14, RUNBOOK D)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| D1 | VERIFY V4 "Gate" : `11 functions read, body different: none`. Lire `docs/o1/reports/LC/scratch.md` | 20 min | C propre 7 jours |
| D2 | Sauvegarde, `sql1 $M/008-write-locks.sql` (DANGEREUX, heure calme). Puis V4, requête A0 (`28|28`), V1, preuve en vrai avec un compte test | 50 min | D1 |
| D3 | Veille 24 h : V4 preuve le lendemain, logs calmes | 15 min | D2 |

### E. P3 : 009, déploiement, 010 (une seule séance, RUNBOOK E)

Prévoir au moins 90 min avant 23:50 UTC. Jamais 010 seul. Si l'horloge dépasse 23:45, s'arrêter à E3 et faire E4 le lendemain.

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| E1 | Sauvegarde, lectures V5, vérifier que les 2 anciennes clés existent encore | 20 min | D3 propre |
| E2 | `sqln $M/009-daily-prep.sql` (hors transaction) puis V5 "After 009" | 15 min | E1 |
| E3 | Vérifier que la prod kpop tourne le commit `main` avec le code P3, sinon Redeploy sans cache. `/daily` redirige vers `/q/` | 15 min | E2 |
| E4 | Tout de suite `sql1 $M/010-daily-v2.sql` (DANGEREUX), puis V5 "After 010" | 15 min | E3 |
| E5 | Le lendemain matin : V5 "The day after" (cron 00:05 réussi) | 10 min | E4 |

### F. P4 : trois jours puis Verrou 0 (RUNBOOK F)

- 3 jours de suite V5 "The day after", puis V7 une fois (six conditions vraies). 10 min par jour plus 20 min pour V7 = 50 min.
- Avant : E5 propre. Le Verrou 0 n'est levé qu'ici.

### G. P5 : 011 à 016 et 017 (T-9 à T-8, RUNBOOK G, SQL-ORDER lignes 14 à 19b)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| G1 | Sauvegarde, puis dans l'ordre `011-anime-series`, `012-editorial-quiz`, `013-formats` (quoi : formats et `character_id` pour le quiz personnage), `014-daily-openings`, `015-spoilers`, chacun suivi de V6 | 40 min | F propre (V7 vrai) |
| G2 | Ligne 18b `account-deletion.sql` si pas déjà passé, puis `016-passport-deletion.sql`, puis `017-deletion-kpop.sql` (SQL-ORDER 19b, D-112). Pas de 016 sans `admin_delete_account` | 20 min | G1, A4 (part D), 006 |
| G3 | V1 et une heure de logs. Rien ne change à l'écran | 20 min | G2 |

Ce que fait chaque fichier (SQL-ORDER) : 011 séries, arcs, personnages, thèmes (7 tables vides). 012 file de relecture éditoriale. 013 formats de jeu. 014 table des openings (dormante). 015 signalement de spoilers. 016 suppression de passeport (demandes, journal). 017 appelle la suppression Mission U pour les données kpop.

### H. Vercel, domaines, Supabase, Google (T-14 à T-7, en parallèle de C à G)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| H1 | Contrôler les projets `otakuquiz` et `fanquiz` contre ENV.md section 4 (Root `apps/quiz`, région `dub1`, branche `main`, protection des previews, domaine pas encore attaché) | 20 min | rien |
| H2 | Variables ENV.md 1.1 à 1.4 sur `otakuquiz` (`NEXT_PUBLIC_SITE_ID=anime`) et `fanquiz` (`hub`). Créer UNE fois les 3 secrets (`PASSPORT_TICKET_SECRET`, `PASSPORT_REVALIDATE_SECRET`, `NET_IP_HASH_SALT`, `openssl rand -base64 48 | pbcopy`) et les coller identiques dans les 3 projets. `CRON_SECRET` sur les 2 nouveaux. `ADMIN_USER_IDS` sur anime. `QOTD_ROTATION_FIX=1` sur anime seulement (J4). Aucune autre bascule de ENV 1.2 | 45 min | rien. Jamais de variable de ENV 1.6. Puis V9 (longueurs égales) |
| H3 | Supabase, Authentication, URL Configuration : garder Site URL `https://kpopquiz.org`, ajouter `https://otakuquiz.org/**` et `https://fanquiz.org/**` | 10 min | rien |
| H4 | Google Cloud Console : 2 clients OAuth Web (origine JS `https://otakuquiz.org`, puis `https://fanquiz.org`). Chaque id dans `NEXT_PUBLIC_GOOGLE_CLIENT_ID` de son projet. Supabase, Providers, Google : ajouter les 2 ids (celui de kpop reste premier). Redeploy les 2 projets | 40 min | H2 |
| H5 | Baisser le TTL DNS des 2 domaines à 300 s, la veille. Noter les enregistrements que Vercel demandera. Tester que `hello@kpopquiz.org` reçoit. Aucun MX ni boîte pour `team.otakuquiz.org` | 20 min | un jour d'avance sur K6 |
| H6 | Premier déploiement de chaque nouveau projet, ouvrir les URL `*.vercel.app`, V9. Le build passe `check:env`, look staging noindex | 30 min | H2, H4 |

### I. Emails : REPORTÉ (D-115, RUNBOOK I)

- Ne pas faire I1 à I3. Pas de Resend, hook Send Email éteint, Supabase envoie ses emails par défaut.
- La suppression de compte marche sans Resend (D-115).
- Temps : 0.

### J. Contenu (T-7 à T-1, RUNBOOK J)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| J1 | Relecture des paquets `docs/anime/editorial/packets/` et des faits. Les faits sont déjà `verified` par les lots (D-106 à D-119) mais le RUNBOOK te laisse la relecture. `node scripts/anime/editorial/check.mjs docs/anime/data` : 0 échec | variable, compter 2 h de contrôle par sondage | rien |
| J2 | `shasum -a 256` des fichiers du dossier `launch` contre `MANIFEST.json`, et `grep -l '^-- DRAFTS' $M/launch/*.sql` ne doit rien afficher. Régénérer (`node apps/quiz/e2e/o1/L1/content-sql.mjs`) et committer par PR seulement si tu as changé des faits | 10 min (45 min si tu régénères) | J1 |
| J3 | Répétition sur branche `o1-scratch` avec tes fichiers, chacun deux fois : le second passage ne change rien | 40 min | J2 |
| J4 | Plan des 14 premiers quiz du jour anime : rien à faire maintenant sauf lire J4 (le cron 00:05 et `QOTD_ROTATION_FIX=1` couvrent la suite) | 15 min | H2 |

## 2. JOUR J (T0), dans l'ordre du RUNBOOK K

Prévoir une journée. Démarrer le matin UTC après 00:30, finir avant 22:00. Une personne libre 72 h pour surveiller.

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| K1 | La veille au soir : go / no-go. V1 à V7 passés, V9 pour les 3 projets, `launch/` complet avec sha256 bons et sans DRAFTS, contrôle de `privacy.controller` dans `apps/quiz/src/copy/hub/h1.ts`, sauvegarde de la veille, `QOTD_ROTATION_FIX=1` sur `otakuquiz`, personne dispo 72 h | 30 min | tout A à J |
| K2 | Sauvegarde du jour, V0 dans `~/kpq-launch/v0-launch.txt`, `snap before` | 35 min | K1 |
| K3 | `sql1 $M/launch/L01-B2-sites.sql` (lignes anime et hub, `building`). V8 : 3 lignes | 10 min | K2 |
| K4 | Comptes Team : `team-auth.mjs --project-ref <ref>` en dry run puis `--apply` (31 créés, aucun mail). Puis `sql1 $M/launch/L02-K2-team-accounts.sql`. `unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY` ensuite | 25 min | K3 |
| K5.1 | `L03-B7-sentinel.sql` (utilisateurs supprimés anime et hub). V8 | 5 min | K3 |
| K5.2 | `L04-K1-series.sql`, `L05-K1-facts.sql`, puis le contrôle de fuite SITE_SCOPE de V1 (aucun titre anime sur kpop) | 20 min | K5.1 |
| K5.3 | `L06-B3-badges.sql`, `L07-K2-catalogue.sql`, `L08-K3-daily-bank.sql`, puis `content-verify.sql` contre `expected-counts.json` | 20 min | K5.2 |
| K5.3b | `L10-PERS-personality.sql` (SQL-ORDER ligne 27b, après L08, avant L12). Seulement si tu décides l'avoir au lancement (décision ouverte 1) et si 013 est passé | 10 min | K5.3, 013 |
| K5.4 | Passer 14 lignes de `quiz_bank` anime en `verified` (la requête du RUNBOOK K5 point 4) | 10 min | K5.3 |
| K5b | Vercel `otakuquiz` et `fanquiz` : retirer `exit 0` de l'Ignored Build Step, puis Redeploy du dernier `main` de chaque projet | 15 min (builds en attente) | H2 à H6, K5 |
| K6 | Ajouter `otakuquiz.org` au projet `otakuquiz`, `fanquiz.org` au projet `fanquiz`, poser les DNS que Vercel montre, attendre les certificats. Magic link et Google sur les 3 domaines. V10 : sites encore en noindex, fichiers IndexNow répondent | 60 min (attente DNS en plus) | K5b, H5 |
| K7 | `PASSPORT_JUMP=1` sur les 3 projets, redeploy ensemble. Test `/auth/passport/out?to=anime` depuis kpopquiz.org connecté | 25 min | K6, 006 et 007, secrets égaux (V9) |
| K8 | `sql1 $M/launch/L12-L1-sites-live.sql` : anime et hub `live` (V8) | 10 min | K5, K7 |
| K9 | Dater les 14 lignes depuis la console de otakuquiz.org (compte `ADMIN_USER_IDS`), appeler `ensure-daily-quiz` avec `CRON_SECRET` (puis `unset`), `/daily` redirige vers `/q/`. V10 complet, V1 kpop, parcours test (inscription, jouer, liker, daily, spoiler de série). 30 min de logs propres. Sauter "the blind test hub" : le blind test est coupé sur anime (D-120, 404) | 90 min | K8 |
| K10 | TOUT dernier : contrôle de la ligne `privacy.controller`, `NET_LAUNCH_DATE=YYYY-MM-DD` d'abord, puis `NET_INDEXING=1` (anime et hub seulement, pas kpop), redeploy, ajouter les 2 propriétés dans Search Console et envoyer les 2 `sitemap.xml`. Contrôle V10 "après K10" | 40 min | K9 propre |

## 3. Après le lancement (RUNBOOK L)

| étape | quoi faire | durée | doit être vrai avant |
|---|---|---|---|
| L1 | Heure 0 à +1 h : V10, V11 points 1 à 4. Surveiller inscriptions anime, erreurs Google, absence des comptes Team dans `/leaderboard` | 60 min | K10 |
| L2 | +24 h (après le cron 00:05) : V11 complet, une ligne `qotd_log` kpop et une anime | 30 min | L1 |
| L3 | Un drapeau par jour sur les 3 projets, chacun suivi de V1 et V10 : jour 1 `NEXT_PUBLIC_NET_FOOTER=1` (données Organisation dans le footer kpop, accord D-099), jour 2 `NEXT_PUBLIC_NET_MENU=1`, jour 3 `NEXT_PUBLIC_NET_BEACON=1`. `NEXT_PUBLIC_NET_FACTS` pas au lancement | 3 x 20 min = 60 min | L2 |
| L3b | Kpop au lancement : `NEXT_PUBLIC_NET_PRIVACY=1` (légal, notice de connexion) et `NEXT_PUBLIC_NET_DELETION=1` (bouton "Delete account", après 18b, 016, 017 et le cron hub). Redeploy kpop. Source : ENV.md 1.2, D-110 et D-112 | 20 min | 18b, 016, 017 appliqués |
| L4 | V11 à +48 h et +72 h (les contrôles +1 h et +24 h sont comptés en L1 et L2) | 30 min | L2 |
| L5 | +72 h : si V11 est propre, remonter les TTL DNS, garder la sauvegarde K2 60 jours, noter la date | 20 min | L4 |
| Plus tard | Supprimer les branches Supabase `o1-dev` et `o1-scratch`, puis les variables Preview de `o1/integration` sur les 3 projets (D-113) | 30 min | lancement stable |
| Plus tard | Hors chemin de lancement (D-099) : L09 openings, L11 quiz croisé puis `NEXT_PUBLIC_NET_FACTS=1`, cron `ensure-daily-opening`, soumission IndexNow pour les 2 nouveaux sites, 54 faits de distribution rejetés, petits restes de `docs/o1/RAPPORT-FINAL.md` | non estimé | après L5 |

## 4. Total

Temps actif estimé, à la minute près des tableaux :

- MAINTENANT (A à J, hors I) : environ 16 h 30
- JOUR J (K1 à K10) : environ 6 h 45
- Après le lancement (L1 à L5, L3b, et nettoyage des branches) : environ 4 h
- TOTAL : environ 27 h de temps actif, étalé sur environ 5 semaines (T-30 à T+3) à cause de la veille de 7 jours, des 14 jours avant 008, des 3 jours de F et des 72 h de veille finale.

Le chemin le plus court en calendrier est fixé par le RUNBOOK : B au plus tard à T-30, C 7 jours, D au plus tard à T-14, E à T-13 ou T-12, F 3 jours, G à T-9 ou T-8, H en parallèle, J de T-7 à T-1.

## 5. Décisions du owner encore ouvertes

1. Quiz "Which character are you" (L10-PERS) au lancement ou après : au lancement il passe entre L08 et L12 (PERS request 1, D-121, SQL-ORDER 27b). Le RUNBOOK K5 ne le liste pas encore.
2. T0, la date du lancement (RUNBOOK, "Still to decide").
3. Le jour de la séance E, la fenêtre du daily (RUNBOOK, "Still to decide").
4. Les deux tables optionnelles du hub (`docs/pending-migrations/hub/001-quiz-daily-plays.sql`, `002-xp-daily-snapshots.sql`) et leurs deux crons nocturnes : oui ou non (D-118, `docs/o1/requests/H2b.md` points 1 et 2). Sans elles la home FanQuiz marche.
5. Les images par série : règles reçues le 2026-10-26, lot en cours (D-122).
6. Valeurs de la marque encore à poser ou à accepter : textes de vocabulaire, thème et titres de niveaux du hub, mascotte anime (RUNBOOK K1, liste `PLACEHOLDERS` du registre ; logos kpop gardés pour l'instant, D-099).
7. Les branches `legal/notice` et `privacy/age-15` (kpopquiz.org) sont suivies par l autre conversation ; rien à faire ici.
8. Mission U partie D : lancer `account-deletion.sql` en production s'il n'est pas déjà passé (RUNBOOK A4, G2). Sans elle, 016, 017 et le bouton de suppression restent éteints.
9. Redéployer la fonction `send-email` : sans objet tant que le hook reste éteint (D-115, `H1.md` H2c point 1). À faire le jour où tu activeras Resend.
