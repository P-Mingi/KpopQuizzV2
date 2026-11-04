# Jour J de Bunnyverse : toute la journée sur une page

Pour le owner. Écrite à partir de l'état donné par ORCH le 2026-11-04 à 22:45 UTC (lane JOURJ, run O1), en français. Rien ne se lance tout seul : c'est toi qui colles et qui cliques. Aucune valeur secrète n'est écrite ici : pour un secret, la page dit « copie depuis ... ».

Ce que fait le jour J. kpopquiz.org ne change pas. `bunnyverse.org` (le hub) et `bunnyverse.org/anime` (OtakuQuiz) passent en ligne. On s'y connecte avec Google et Discord seulement, sans e-mail (AUTH-BUNNYVERSE.md:5, 28-31). L'indexation par Google s'ouvre en tout dernier (RUNBOOK.md:378).

Où on en est (ORCH, 2026-11-04 22:45 UTC). Les sessions B1, B2 et B3 sont faites en production. D (008) ce soir. E1, E2, G et le lot K2 demain 2026-11-05 dès 10:00 UTC. V7 la nuit suivante à 00:40. Le jour J vient après V7 entièrement vrai et après tout ce que la partie 8 exige. Les e-mails d'authentification passent depuis ce soir par le SMTP personnalisé de Resend sur kpopquiz.org, limite 100 par heure. Le Send Email Hook reste éteint jusqu'après le lancement.

## 0. Comment lire cette page

- **A toi :** ce que toi seul peux faire (cliquer dans un tableau de bord, coller dans le Terminal, décider). **Claude** : SQL en lecture seule sur la production et journaux Supabase. **Worker** : vérifications par curl et lecture de Vercel. Tu ne lances aucune commande de vérification (OWNER-NOW.md:13).
- Aucun agent ne se connecte, ne crée un compte, ne touche un mot de passe ni un code TOTP en production (RUNBOOK.md:31-32). Les comptes Team (étape 7), ton code admin (étape 2) et les connexions (étapes 15, 21) sont à toi.
- Un bloc de code = une commande. Copie-la en entier, dans le Terminal, depuis le dossier du dépôt (OWNER-NOW.md:14). `read -rs` n'affiche rien pendant que tu colles : appuie sur Entrée (OWNER-NOW.md:14).
- Après chaque collage, écris dans le chat « collé J1 » (ou la partie). Un `KO` ou un `ERROR` : ne lance rien d'autre, colle les lignes dans le chat (OWNER-NOW.md:15, 21; session.sh:49-55).
- Heures en UTC (Paris en hiver : UTC + 1). Jamais de SQL entre 23:50 et 00:30 (OWNER-NOW.md:16; session.sh:71). Le jour J commence après 00:30 et finit avant 22:00 (OWNER-NOW.md:302).
- Chaque partie de session (J1 à J5) se relance sans risque depuis son début : un fichier déjà appliqué ne change rien la seconde fois (session.sh:9-12).
- Le détail complet de chaque commande de session va dans `~/kpq-launch/logs`, sur ta machine seulement. L'écran n'affiche que OK ou KO et des nombres (OWNER-NOW.md:17).
- Chaque étape porte « Source : fichier:ligne ». Les fichiers sont dans `docs/launch/o1`, sauf `MFA-OWNER.md` (`docs/o1/admin`), `PLAN-ADMIN-2.md` (`docs/o1/admin`) et `send-email-hook.md` (`docs/o1/b7`).

### Retour arrière : la commande, une seule fois

Les retours arrière SQL ci-dessous utilisent tous cette commande, avec le nom du fichier à la place de `NOM` (c'est le `sql1` de RUNBOOK.md:45). Elle marche dans le terminal où la ligne de sauvegarde a exporté `PROD_DB_URL`. Règle de ROLLBACK.md:10-11 : d'abord on s'arrête, ensuite on revient. Écris dans le chat avant de lancer un retour. Un retour refuse et ne change rien quand il effacerait des données écrites depuis (ROLLBACK.md:7).

```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f docs/pending-migrations/multisite/launch/NOM
```

Pour 023 et 024, le dossier est `docs/pending-migrations/multisite/` sans `launch/`.

### La ligne de sauvegarde + partie (J1 à J5)

Chaque partie J se lance avec sa propre ligne. Une seule ligne fait quatre choses : elle sauvegarde la base, vérifie que la sauvegarde est complète, affiche « sauvegarde : N lignes », puis lance la partie. Si N est 2000 ou moins, ou si la sauvegarde échoue, la partie ne se lance pas (le `&&` coupe la chaîne). Tu ne vois alors aucune ligne `OK` : colle ce que tu vois dans le chat.

- `read -rs PROD_DB_URL` attend la chaîne de connexion de Supabase (Connect : directe, ou « session pooler » si ton réseau n'a pas d'IPv6). Tu la tapes à chaque ligne (OWNER-NOW.md:111).
- La sauvegarde prend quelques minutes (OWNER-NOW.md:111; OWNER-NOW.md:9 compte 30 min pour six). Le fichier va dans `~/kpq-launch`, sur ta machine seulement (données personnelles). Garde-le 60 jours (OWNER-NOW.md:111; RUNBOOK.md:101-102).
- Chaque partie J lance `session.sh`, qui refuse tout autre projet que la production, tout autre dépôt que `main` à jour sans fichier modifié à la main, et la fenêtre 23:50-00:30 (session.sh:69-73).

Source : session.sh:9-12, 60-80; OWNER-NOW.md:17-21, 111; consigne ORCH 2026-11-04 pour la ligne exacte.

## Le jour en bref

| partie | étapes | quoi |
|---|---|---|
| 1. Avant | 1 à 3 | le go, ton code admin, Resend |
| 2. SQL du matin | 4 à 11 | sauvegarde, J1, comptes Team, J2, J3, images |
| 3. En ligne | 12 à 23 | builds, domaine, connexion, jump, J4, J5, quiz du jour, vérification, annonce |
| 4. Indexation | 24 et 25 | contrôle du noindex, puis ouverture, tout à la fin |
| 5. Le même jour | 26 | Kpopdle sur l'accueil de kpopquiz.org |
| 6. Après | 27 à 33 | veille, drapeaux réseau, décision à +72 h |

33 étapes : 3 avant, 23 le jour J (4 à 26), 7 après.

Durées d'après les sources.
- Toi, le jour J : 1 h 25 (OWNER-NOW.md:300). Cette page ajoute 4 sauvegardes (une par partie J1 à J5 au lieu d'une seule) : environ 20 min de plus, à 5 min chacune (OWNER-NOW.md:9).
- La journée entière : « une journée sur place », de 00:30 à 22:00 UTC (OWNER-NOW.md:300-302; RUNBOOK.md:379). Le travail de tous (toi, Claude, worker) pour la partie K est de 7 h (RUNBOOK.md:72). Ce temps se chevauche : Claude et le worker travaillent pendant que tu attends.
- Après : 4 h 25 de travail cumulé (RUNBOOK.md:73), sur 72 h de veille (RUNBOOK.md:73, 565).

---

## Partie 1. Avant le jour J

### 1. Le rapport K1 et ton go (la veille au soir)

Toi 15 min, dont 5 min une seule fois pour le code admin (étape 2). Claude 20 min. Worker 15 min.

Claude et le worker vérifient chaque ligne de la liste de la partie 8 A. Claude te dit aussi si l'étape 11 (images) sert.

A toi : lis le rapport. Tout est vrai et quelqu'un est libre les 72 h qui suivent le lancement : écris « go » dans le chat. Sinon le jour J se décale.

Vérif : le rapport dit « vrai » à chaque ligne de la partie 8 A, V7 compris (VERIFY.md:253-261).
Retour : aucun, c'est une lecture.

Source : OWNER-NOW.md:288-298; RUNBOOK.md:382-391.

### 2. Ton code admin (TOTP), en place avant le jour J

Toi 5 min, une seule fois (MFA-OWNER.md:1). De préférence le jour où le verrou part en production : ça coûte deux redéploiements de `kpopquiz`, donc pas le jour J (OWNER-NOW.md:296). Le code est à toi. Ni Claude ni le worker ne le voient, ne le créent, ne le gardent.

A toi :
1. Supabase, projet de production, Authentication, Multi-Factor : « TOTP (App Authenticator) » doit être activé. Sinon active-le et enregistre. (MFA-OWNER.md:7-9)
2. Vercel, projet `kpopquiz`, Settings, Environment Variables : ajoute la clé ci-dessous, valeur `1`, Production. Puis redéploie `kpopquiz`. Sur `kpopquiz` seul : le code vaut aussi pour OtakuQuiz. (MFA-OWNER.md:17)
```
ADMIN_MFA_ENROL_OPEN
```
3. Connecte-toi sur kpopquiz.org avec ton compte admin, ouvre `/admin`. (MFA-OWNER.md:18)
4. La page « Turn on the admin code » s'affiche : clique « Show the QR code ». (MFA-OWNER.md:19)
5. Scanne le QR code avec l'application du téléphone. Ajoute le même code dans ton gestionnaire de mots de passe (scanne, ou colle la clé affichée sous le QR code). Si le téléphone est perdu, le gestionnaire suffit. (MFA-OWNER.md:20-21)
6. Tape les 6 chiffres, clique « Turn on and continue ». L'admin s'ouvre. (MFA-OWNER.md:22)
7. Un autre compte dans `ADMIN_USER_IDS` : refais 3 à 6 avec ses deux applications, ou retire ce compte de la liste. (MFA-OWNER.md:23)
8. Retire `ADMIN_MFA_ENROL_OPEN` de Vercel, redéploie `kpopquiz`. `/admin` doit toujours demander les 6 chiffres. (MFA-OWNER.md:24)
9. Une fois : dans Supabase, SQL Editor, remplace `VOTRE_ID_1` et `VOTRE_ID_2` par les UID de `ADMIN_USER_IDS` (seulement dans l'éditeur, jamais dans un fichier du dépôt) et lance la lecture ci-dessous. Aucune ligne : rien à faire. Des lignes : dis-le dans le chat, `MFA-OWNER.md:88-94` donne la correction. (MFA-OWNER.md:76-94, 102)
```
select user_id, group_id, role, status from public.space_members where user_id in ('VOTRE_ID_1', 'VOTRE_ID_2') and role in ('curator', 'space_admin');
```

Le jour J, sur `bunnyverse.org/anime/admin`, tu retapes les 6 chiffres : ce site a sa propre session (MFA-OWNER.md:26).

Vérif : toi, `/admin` sur kpopquiz.org demande les 6 chiffres et s'ouvre (RUNBOOK.md:390). Worker : `ADMIN_MFA_ENROL_OPEN` est absent de la Production des trois projets (RUNBOOK.md:390).
Retour : si les deux applications sont perdues, MFA-OWNER.md:34-62 (suppression des codes, des sessions, nouveau mot de passe, nouvelle mise en place). Ça coûte deux redéploiements de `kpopquiz`.

Source : MFA-OWNER.md:5-28, 76-94; OWNER-NOW.md:296; RUNBOOK.md:390; ENV.md:36.

### 3. Resend pour bunnyverse.org (recommandé, pas bloquant)

Les sources ne donnent pas de durée.

Pourquoi. bunnyverse.org n'a pas de connexion par e-mail (AUTH-BUNNYVERSE.md:28-31). Son seul e-mail est l'avis « ton passeport va être supprimé » du hub, qu'il envoie lui-même à Resend, sans passer par le hook (send-email-hook.md:15). Sans clé, l'avis est sauté et la suppression a quand même lieu (ENV.md:135; RUNBOOK.md:329). L'expéditeur par défaut est `Bunnyverse <no-reply@bunnyverse.org>`, sans réglage de plus (ENV.md:135).

A toi :
1. Resend : ajoute le domaine `bunnyverse.org`. Resend affiche les enregistrements SPF et DKIM à poser : pose-les dans le DNS de Cloudflare (seuls ces deux types sont demandés, RUNBOOK.md:324). Pas de MX pour `team.bunnyverse.org`, ni boîte, ni catch-all (RUNBOOK.md:296).
2. Resend : une clé limitée à l'envoi (ENV.md:130).
3. Vercel, projet `fandomverse` seulement, Settings, Environment Variables : ajoute la clé ci-dessous, Production, valeur : copie depuis ta clé Resend. Rien sur `otakuquiz` ni `kpopquiz`.
```
RESEND_API_KEY
```
4. Redéploie `fandomverse`, ou laisse l'étape 12 s'en charger (elle construit `main`). Une variable de serveur se lit à l'exécution ; redéployer fait que les vérifications la voient (ENV.md:20).

Pas de `SEND_EMAIL_FROM_HUB` : laisse-la absente (ENV.md:135). Pas de Send Email Hook : il reste éteint jusqu'après le lancement.

Vérif : Resend montre `bunnyverse.org` comme vérifié. L'avis lui-même ne se teste qu'avec une vraie suppression, après l'étape 31 ; jusque-là il est sauté sans erreur.
Retour : supprime la variable (l'avis est sauté, la suppression continue) ; retire les enregistrements SPF et DKIM.

Source : send-email-hook.md:15, 23, 29-30; ENV.md:20, 130, 135; RUNBOOK.md:296, 324, 328-329; état ORCH.

---

## Partie 2. Le matin : sauvegarde et SQL du lancement (J1 à J3)

Commence après 00:30 UTC (OWNER-NOW.md:302).

### 4. Ouvrir la journée : le tableau de bord, puis le dépôt sur `main`

Toi 5 min, Claude 2 min (OWNER-NOW.md:305).

A toi :
1. Supabase, Database, Backups : vérifie qu'une sauvegarde de moins de 24 h existe. Sinon prends-en une si ton plan le permet. Note si Point in Time Recovery est actif. (OWNER-NOW.md:307; RUNBOOK.md:93)
2. Terminal, dans le dossier du dépôt :
```
git checkout main && git pull --ff-only
```

Les fichiers SQL de J1 à J5 doivent être sur `main` à ce moment : `L13-A1-character-facts.sql` et `L15-A2-series-games.sql` en particulier, sinon J4 s'arrête après avoir passé les sites en ligne (session.sh:91, 362-368). Claude le confirme avant.

Vérif (Claude) : une sauvegarde du tableau de bord de moins de 24 h existe ; `main` porte les fichiers de J1 à J5.
Retour : aucun.

Source : OWNER-NOW.md:304-313; RUNBOOK.md:92-102, 393; session.sh:72-73, 91.

### 5. Le point de départ du jour

Claude 10 min. Worker 10 min. Toi : rien, attends leur OK.

Claude enregistre V0 dans `~/kpq-launch/v0-launch.txt`. Le worker prend la photo de kpopquiz.org (V1) dans `~/kpq-launch/before`.

Vérif : les deux fichiers existent (RUNBOOK.md:393).
Retour : aucun.

Source : OWNER-NOW.md:315-318; RUNBOOK.md:393; VERIFY.md:40-52, 63-76.

### 6. J1 : L01, les lignes `anime` et `hub` de la table `sites`

Toi 2 min, plus la sauvegarde. Claude 2 min.

Avant L01, la partie vérifie les fichiers de lancement : sha256 de `MANIFEST.json` identiques, aucun fichier DRAFTS, aucune ancienne adresse `team.otakuquiz.org` (session.sh:238-253, 339-343).

A toi : colle la ligne (sauvegarde puis J1). Écris « collé J1 ».
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && export PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh J1
```

Résultat qui veut dire go : « sauvegarde : N lignes » avec N au-dessus de 2000, une ligne `OK   fichiers de lancement : mode verified ... aucun DRAFTS`, une ligne `OK   L01-B2-sites.sql`, les lignes `ok` de V-L01, puis « Session J1 terminée : tout est OK. » (session.sh:98, 252, 393).

Vérif (Claude) : V8, première requête : 3 lignes, `kpop` en `live`, `anime` et `hub` en `building`, avec les domaines et les marques de Bunnyverse (RUNBOOK.md:396; VERIFY.md:281-282).
Retour : fichier `L01-B2-sites.rollback.sql` avec la commande de la partie 0. Il refuse après la première inscription sur anime ou hub, après L02, ou après tout contenu (ROLLBACK.md:75).

Source : OWNER-NOW.md:320-325; RUNBOOK.md:395-396; session.sh:339-343; ROLLBACK.md:75.

### 7. Les 31 comptes Team : tu les crées toi-même

Toi 6 min. Claude 5 min (OWNER-NOW.md:329).

Où et comment. Dans ton Terminal, depuis le dossier du dépôt, avec le script `apps/quiz/e2e/o1/L1/team-auth.mjs`. Il appelle l'API admin d'Auth de Supabase pour créer 31 utilisateurs `<nom>@team.bunnyverse.org`. Chaque compte est créé avec son e-mail déjà confirmé, sans mot de passe et sans aucun e-mail envoyé (team-auth.mjs:5-9; RUNBOOK.md:407). Ces adresses ne reçoivent aucun courrier : aucun MX, aucune boîte pour `team.bunnyverse.org` (RUNBOOK.md:296, 399-400). Le script n'affiche que des nombres (team-auth.mjs:8-9). La clé `service_role` vient de Supabase, Project Settings, API Keys : copie-la. Elle ne se colle nulle part ailleurs (OWNER-NOW.md:55, 331; RUNBOOK.md:277).

Les quatre blocs, dans l'ordre. Chacun se colle seul.

A toi : la première ligne attend la clé. Colle la clé (rien ne s'affiche), Entrée.
```
read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
A toi : essai à blanc. Colle sa sortie (un nombre) dans le chat. Attends le OK de Claude.
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain bunnyverse.org
```
Attendu : « team-auth: dry run, would create up to 31 users (existing ones are skipped). Add --apply to do it. » (team-auth.mjs:36-37).

A toi : au OK de Claude, création des 31 comptes.
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain bunnyverse.org --apply
```
Attendu : « team-auth: 31 created, 0 already there, 0 failed ». Une seconde exécution dit « 0 created, 31 already there » (RUNBOOK.md:408). Un `failed` au-dessus de 0 : ne lance pas J2, colle la sortie dans le chat (team-auth.mjs:52-53).

A toi : efface la clé du terminal.
```
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
```

Vérif (Claude, SQL en lecture sur `auth.users`) : 31 utilisateurs en `team.bunnyverse.org`, tous confirmés (RUNBOOK.md:409; OWNER-NOW.md:344). La partie J2 refait le contrôle avant L02 (session.sh:345).
Retour : les comptes ne se défont pas avec L02. Pour les retirer : dans l'éditeur SQL de Supabase, seulement si Claude le demande, `delete from auth.users where email like '%@team.bunnyverse.org';` (L02-K2-team-accounts.rollback.sql:4).

Source : OWNER-NOW.md:328-344; RUNBOOK.md:398-409; team-auth.mjs:5-9, 36-37, 52-53.

### 8. J2 : L02, L03, L04

Toi 4 min, plus la sauvegarde. Claude 4 min (OWNER-NOW.md:347).

La partie vérifie d'abord que les 31 comptes Team existent, puis applique L02, L03 et L04. Chaque fichier est suivi de ses comptes (V8). L04 est gros : il passe par psql seulement (OWNER-NOW.md:346, 349; session.sh:344-350).

A toi : colle la ligne (sauvegarde puis J2). Écris « collé J2 ».
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && export PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh J2
```

Vérif (Claude) : 31 `editorial_accounts` sur anime ; `sites.system_user_id` rempli et `fallback_group_slug` à `anime-mix` ; aucun tampon kpop pour un compte Team (0) ; les deux profils « deleted_user » de anime et hub ; les colonnes 1 à 5 de `content-verify.sql` égales à `expected-counts.json` ; la vérification des fuites (RUNBOOK.md:409, 412-413; VERIFY.md:284-298; session.sh:344-350).
Retour : les fichiers `L04-K1-series.rollback.sql`, puis `L03-B7-sentinel.rollback.sql`, puis `L02-K2-team-accounts.rollback.sql`, dans cet ordre, avec la commande de la partie 0. L02 refuse si un compte Team a un quiz. L04 refuse dès qu'un quiz, une ligne de banque ou un fait utilise les groupes (ROLLBACK.md:76-77).

Source : OWNER-NOW.md:346-352; RUNBOOK.md:411-413; session.sh:344-350.

### 9. Aucun titre anime sur kpopquiz.org (worker)

Worker 3 min. Toi : attends son OK avant J3.

Vérif (worker) : le contrôle de fuite de V1, `0` sur chaque ligne : aucun titre anime sur `/`, `/quizzes`, `/new`, `/trending`, `/trivia`, `/most-liked`, `/sitemap.xml`, `/llms.txt` de kpopquiz.org (VERIFY.md:78-83). Un chiffre au-dessus de 0 : arrête, J3 attend.
Retour : voir l'étape 8 (rollbacks de L04 à L02) et ROLLBACK.md:16-17 : `SITE_SCOPE` reste à `1`.

Source : OWNER-NOW.md:354-357; RUNBOOK.md:413; VERIFY.md:78-83.

### 10. J3 : L05, L06, L07, L08, L10-PERS et les 14 lignes de la banque

Toi 4 min, plus la sauvegarde. Claude 4 min (OWNER-NOW.md:360).

Gros fichiers, psql seulement. Après chaque fichier, ses nombres sont comparés à `expected-counts.json`. À la fin : les 15 colonnes de `content-verify.sql`, V-S4, puis les 14 premières lignes de la banque anime passent à « verified ». Jamais plus de 14, même si la partie est relancée (OWNER-NOW.md:362; session.sh:255-260, 351-361).

A toi : colle la ligne (sauvegarde puis J3). Écris « collé J3 ».
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && export PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh J3
```

Vérif (Claude) : les 15 colonnes sont `ok` ; faits publiés = le nombre de l'en-tête de L05 ; 6 badges anime ; 70 profils de personnalité ; V-S4 `ok` (28 fonctions fermées) ; 14 lignes de banque vérifiées (RUNBOOK.md:414-416, 431-435; VERIFY.md:287, 292; session.sh:262-269).
Retour : `L10-PERS-personality.rollback.sql`, `L08-K3-daily-bank.rollback.sql`, `L07-K2-catalogue.rollback.sql`, `L06-B3-badges.rollback.sql`, `L05-K1-facts.rollback.sql`, dans cet ordre. Ils refusent une fois un quiz joué (L07) ou une ligne datée ou publiée (L08) ; un badge tenu (L06) (ROLLBACK.md:76-77). Pour cacher du contenu sans le supprimer : ROLLBACK.md:68-69.

Source : OWNER-NOW.md:359-365; RUNBOOK.md:414-416, 431-436; session.sh:351-361.

### 11. Les images de l'admin (seulement si Claude l'a dit à l'étape 1)

Toi 6 min, plus 5 min une seule fois pour le code de la preview. Claude 5 min (OWNER-NOW.md:371).

Ce que ça fait. `promote.mjs` copie les fichiers du seau `entity-images` et les lignes de `public.entity_images` de `o1-dev` vers la production. Il ne supprime rien. Une seconde exécution ne change rien. Fais-le avant de supprimer la branche `o1-dev` (RUNBOOK.md:419).

Le code admin d'abord, pour envoyer des images. Les images s'envoient avant ce jour, depuis `/anime/admin` sur la preview. La preview a sa propre base (`o1-dev`) : le code de la production ne devrait pas y marcher (non testé sur une preview). Il lui faut le sien, avec `ADMIN_MFA_ENROL_OPEN` sur les variables Preview d'`otakuquiz` (MFA-OWNER.md sections 1, 2 et 8). Les commandes ci-dessous n'ouvrent pas l'admin : pas de code pour elles (OWNER-NOW.md:373; RUNBOOK.md:418).

A toi : la première ligne attend la clé `service_role` de la production (Supabase, Project Settings, API Keys). Rien ne s'affiche.
```
read -rs PROMOTE_TARGET_SERVICE_KEY && export PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
A toi : essai à blanc. Colle sa sortie dans le chat (trois lignes de nombres). Attends le OK de Claude.
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs
```
A toi : au OK de Claude, la copie.
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs --apply
```
A toi : efface la clé.
```
unset PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL
```

Vérif (Claude) : le seau `entity-images` a le dossier `anime/` ; le nombre de lignes de `public.entity_images` par `kind` égale celui de l'essai à blanc (RUNBOOK.md:427-429).
Retour : supprime les lignes en trop depuis la page admin d'OtakuQuiz (ça retire aussi les fichiers), ou `018-entity-images.rollback.sql` après avoir vidé le seau et la table. Ça demande ton code à 6 chiffres sur la production (RUNBOOK.md:430, 418).

Source : OWNER-NOW.md:370-387; RUNBOOK.md:417-430.

---

## Partie 3. Les builds, le domaine, la connexion, les jeux

### 12. Fusionner la PR du jour J des builds

Toi 6 min. Worker 5 min (OWNER-NOW.md:393).

Claude prépare la PR. Elle passe `NET_PRODUCTION_HOLD` à 0 dans `apps/quiz/scripts/vercel-ignore-build.sh` et retire `"o1/integration": true` de `git.deploymentEnabled` dans `apps/quiz/vercel.json`. À la date de cette page, le fichier a encore `NET_PRODUCTION_HOLD=1` (vercel-ignore-build.sh:16) et la branche `o1/integration` y est encore (vercel.json:10). La fusion construit `main` sur les trois projets ; `kpopquiz` construit les mêmes pages. Rien à régler dans les Settings de Vercel : l'`ignoreCommand` de `vercel.json` remplace l'Ignored Build Step du tableau de bord (OWNER-NOW.md:395; RUNBOOK.md:439).

A toi : ouvre la PR sur GitHub, lis le résumé de Claude, fusionne. C'est ta décision.

Vérif (worker) : un déploiement Ready de `main` sur chacun des trois projets, construit avec son propre `NEXT_PUBLIC_SITE_ID` (`hub`, `anime`) (RUNBOOK.md:440).
Retour : revert de cette PR (`NET_PRODUCTION_HOLD=1`) : les deux projets ne construisent plus rien, leur dernier déploiement reste. Pour `kpopquiz` : Vercel, Deployments, déploiement précédent, Instant Rollback (RUNBOOK.md:441; ROLLBACK.md:14, 26).

Source : OWNER-NOW.md:392-397; RUNBOOK.md:438-441; vercel-ignore-build.sh:1-24; vercel.json:5-11.

### 13. Attacher `bunnyverse.org` au projet `fandomverse`

Toi 4 min. Worker 10 min (OWNER-NOW.md:400).

Le domaine va sur `fandomverse` seulement. `otakuquiz` n'a jamais de domaine : `/anime` y arrive par le groupe Microfrontends (RUNBOOK.md:444; ARCHITECTURE-BUNNYVERSE.md:21-27). `kpopquiz` garde `kpopquiz.org`. (ARCHITECTURE-BUNNYVERSE.md:115-116)

A toi, d'abord le DNS (à poser s'il ne l'est pas déjà : c'est l'étape 2 de OWNER-NOW.md). Dans Cloudflare, DNS du domaine `bunnyverse.org`, TTL 300 secondes :

| type | nom | valeur |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Aucun MX pour `team.bunnyverse.org` (RUNBOOK.md:293-296; OWNER-NOW.md:39-44).

Vérif DNS (worker, commandes en annexe) : `bunnyverse.org` en A donne `76.76.21.21`, `www.bunnyverse.org` en CNAME donne `cname.vercel-dns.com.`, aucun MX pour `team.bunnyverse.org` (RUNBOOK.md:297). Une autre adresse que `76.76.21.21` : arrête, dis-le dans le chat (voir « Pour Claude », point 5).

A toi, ensuite Vercel :
1. Projet `fandomverse`, Settings, Domains.
2. Ajoute le premier nom.
```
bunnyverse.org
```
3. Ajoute le second nom, réglé pour rediriger vers le premier.
```
www.bunnyverse.org
```
4. Si Vercel affiche d'autres valeurs DNS que le tableau ci-dessus, mets les siennes dans Cloudflare.
5. Le certificat arrive tout seul. Attends que Vercel le montre prêt.

(OWNER-NOW.md:402-408; RUNBOOK.md:444)

À partir d'ici le hub et `/anime` répondent sur `bunnyverse.org`, avec `noindex` (RUNBOOK.md:379, 446).

Vérif (worker), V10 : accueil 200 sur `https://bunnyverse.org` et `https://bunnyverse.org/anime` ; chaque canonique nomme son propre site (`https://bunnyverse.org`, `https://bunnyverse.org/anime`) ; une seule `robots.txt` par hôte, ses lignes `Sitemap:` ne nomment que bunnyverse.org ; sitemaps et `llms.txt` en 200 ; `www.bunnyverse.org` redirige (301 ou 308) vers `https://bunnyverse.org/` ; `strict-transport-security` présent ; le hub et `/anime` portent encore le `noindex` ; aucun `set-cookie` de nom kpop (VERIFY.md:337-355). Aussi : `/anime/` redirige en 308 vers `/anime`, `/anime/robots.txt` donne 404, `/robots.txt` liste `/anime/api/`, un fichier de `/anime/_next/static` répond 200 (ARCHITECTURE-BUNNYVERSE.md:125-130).
Retour : retire le domaine du projet `fandomverse` (le hub et `/anime` tombent ensemble) et les enregistrements DNS (RUNBOOK.md:446; ROLLBACK.md:34).

Source : OWNER-NOW.md:399-409; RUNBOOK.md:292-297, 443-446; VERIFY.md:337-355; ARCHITECTURE-BUNNYVERSE.md:108-130.

### 14. Les crons d'OtakuQuiz atteignent `/anime` (worker, obligatoire)

Worker 20 min, 30 min après l'étape 13, en parallèle des étapes 15 à 18. Toi : rien (OWNER-NOW.md:412-414).

Pourquoi. Les chemins de cron de `apps/quiz/vercel.json` n'ont pas `/anime`. Sur `otakuquiz`, chaque appel est relayé vers `https://bunnyverse.org/anime/api/cron/...`, ce qui ne marche qu'une fois le domaine attaché. Avant l'étape 13, des échecs dans le journal des crons d'`otakuquiz` sont normaux (OWNER-NOW.md:414; ARCHITECTURE-BUNNYVERSE.md:95-107).

Le worker regarde trois choses.
1. Vercel, projet `otakuquiz`, Logs, recherche `/anime/api/cron/` : `/anime/api/cron/editorial-publish` (toutes les 15 min) et `/anime/api/cron/live-expire` (toutes les 30 min) répondent 200. Un 401 : le `CRON_SECRET` n'arrive pas à la route. Un 404 : l'appel n'atteint pas `otakuquiz`. Aucune ligne : l'appel relayé n'arrive jamais sur `/anime`.
2. Vercel, projet `otakuquiz`, Settings, Cron Jobs, `editorial-publish` et `live-expire`, View Logs : les derniers passages ont réussi.
3. Vercel, projet `fandomverse`, Logs, recherche `/api/cron/` : seulement les crons du hub, aucune ligne `/anime/api/cron/...`.

Vérif : les trois points, puis aux étapes 20 et 27 le `/anime/api/cron/ensure-daily-quiz` en 200 (le Run de l'étape 20 ; puis le lendemain à 00:05 UTC).
Si un cron échoue : le worker prévient Claude dans l'heure. Claude te dit comment publier le quiz du jour à la main (étape 20). Le repli est d'ajouter des entrées `/anime/api/cron/...` dans `apps/quiz/vercel.json` : ce fichier sert aussi à kpopquiz.org, c'est donc ta décision, par une PR (OWNER-NOW.md:420; RUNBOOK.md:455).
Retour : lecture seule, rien à défaire.

Source : OWNER-NOW.md:411-420; RUNBOOK.md:448-456.

### 15. Se connecter (Google, puis Discord)

Toi 5 min. Claude 5 min (OWNER-NOW.md:423).

A toi :
1. Ouvre `https://bunnyverse.org`. La feuille de connexion propose Google et Discord et aucun champ e-mail (VERIFY.md:366).
2. Connecte-toi avec Google. Déconnecte-toi. Connecte-toi avec Discord.
3. Ouvre `https://bunnyverse.org/anime` : tu y es connecté (même session : AUTH-BUNNYVERSE.md:32-34).
4. Écris « fait 15 » dans le chat, avec ce que tu as vu.

Si la connexion ne revient pas sur bunnyverse.org : dans Supabase, Authentication, URL Configuration, la liste doit contenir exactement `https://bunnyverse.org/auth/callback` et `https://bunnyverse.org/anime/auth/callback`, sans `*` ni `?`. Site URL reste `https://kpopquiz.org` (RUNBOOK.md:281; AUTH-BUNNYVERSE.md:53-62). Dis-le dans le chat avant de toucher.

Vérif (Claude) : journaux Auth de Supabase : aucune erreur Google ni Discord (OWNER-NOW.md:427; VERIFY.md:386). Si les e-mails d'authentification de kpopquiz.org s'accumulent, regarde la limite de 100 par heure (partie 8 B).
Retour : à partir de la première inscription sur anime ou hub, L01 ne se défait plus (ROLLBACK.md:75). Les retours possibles deviennent les couches de ROLLBACK.md:57-72 : retirer le domaine, `PASSPORT_JUMP` à 0, Instant Rollback d'un projet.

Source : OWNER-NOW.md:422-427; RUNBOOK.md:285-290, 445; VERIFY.md:366-367; AUTH-BUNNYVERSE.md:9-40.

### 16. `PASSPORT_JUMP=1` sur les trois projets

Toi 9 min. Worker 5 min (OWNER-NOW.md:430).

Condition (RUNBOOK.md:459) : 006 et 007 appliquées (session B, faite), les trois secrets passport identiques sur les trois projets (fait le 2026-10-28), le domaine en ligne (étape 13).

A toi : Vercel, Production, dans `kpopquiz`, `fandomverse` et `otakuquiz`, Settings, Environment Variables : la clé ci-dessous, valeur `1`. Puis redéploie les trois ensemble.
```
PASSPORT_JUMP
```
A toi : puis, connecté sur kpopquiz.org, ouvre cette adresse.
```
https://kpopquiz.org/auth/passport/out?to=anime
```
Tu arrives sur `/anime` connecté, et `https://bunnyverse.org` montre la même session (OWNER-NOW.md:432).

Vérif : toi, le test ci-dessus (c'est le contrôle de la source : aucun agent ne se connecte). Pour la preuve fine, dans l'onglet Réseau du navigateur, le paramètre `via` apparaît une fois et aucun jeton ne reste dans l'adresse après l'arrivée (VERIFY.md:369-370). Le worker a 5 min dans la source (OWNER-NOW.md:430) sans détail. Un « invalid ticket » veut dire que les trois secrets passport ne sont pas égaux (ENV.md:67).
Retour : `PASSPORT_JUMP` à `0` sur les trois, redéploie les trois. Les liens deviennent de simples liens ; `/auth/authorize`, `/auth/land` et `/api/passport/redeem` répondent 404 ; comptes et tampons restent (ROLLBACK.md:62-63; RUNBOOK.md:461).

Source : OWNER-NOW.md:429-438; RUNBOOK.md:458-461; ENV.md:43; VERIFY.md:369-370.

### 17. J4 : L12 (les sites passent en ligne), 023 et 024 une seconde fois, lot A1, L15

Toi 2 min, plus la sauvegarde. Claude 3 min (OWNER-NOW.md:441).

La partie applique L12 et vérifie que `kpop`, `anime` et `hub` sont `live`. Elle relance 023 (la ligne du jeu `otakudle`, éteinte : le site anime existe maintenant) et 024 (les lignes des jeux One Piece et Dragon Ball, éteintes). Elle applique `L13-A1-character-facts.sql` (les faits des 750 personnages d'Otakudle, dont les 200 du TOP200) et lance sa vérification, puis `L15-A2-series-games.sql` (les 100 personnages de One Piece et les 70 de Dragon Ball). Elle revérifie tout le contenu et V-S4. Si le fichier du lot A1 n'est pas sur `main`, elle s'arrête sur lui, après L12 (OWNER-NOW.md:443; session.sh:362-372).

A toi : colle la ligne (sauvegarde puis J4). Écris « collé J4 ».
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && export PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh J4
```

Vérif (Claude) : V8 : `kpop`, `anime`, `hub` en `live` ; V-L13 : 50 données démographiques, aucun fait hors de la réserve, aucune valeur sans source, 200 personnages « featured », 584 personnages avec les 7 colonnes ; V-L15 : chaque valeur a sa source ; les 15 colonnes de contenu `ok` ; V-S4 `ok` (RUNBOOK.md:465; VERIFY.md:288-290; session.sh:362-372). Le nombre de cibles d'Otakudle s'imprime : lis-le (178 selon VERIFY.md:290, voir « Pour Claude », point 7).
Retour : dans cet ordre, `L15-A2-series-games.rollback.sql` (refusé dès qu'un jeu de série a une partie), `L13-A1-character-facts.rollback.sql` (refusé dès qu'`otakudle` a une partie), `L12-L1-sites-live.rollback.sql` (remet anime et hub en `building`) (RUNBOOK.md:465; ROLLBACK.md:66).

Source : OWNER-NOW.md:440-445; RUNBOOK.md:463-465; session.sh:362-372; SQL-ORDER.md:90-91.

### 18. J5 : Kpopdle Idol et Otakudle s'allument (L14)

Toi 1 min, plus la sauvegarde. Claude 1 min (OWNER-NOW.md:449).

La partie revérifie les faits, lance `dle_activate` pour les deux jeux (chacun reçoit sa date de départ et sa banque de 365 jours, une seule fois), puis vérifie que chaque jeu répond. Les nombres s'impriment, jamais un nom (OWNER-NOW.md:451; session.sh:373-379).

La date de départ (l'epoch) est le jour de la partie n° 1 : aujourd'hui en UTC, le jour de cette commande. Elle ne bouge plus. Lance donc J5 le jour où les jeux ouvrent : si le drapeau de l'étape 19 arrive deux jours après, les premiers joueurs voient le n° 3 (OWNER-NOW.md:455; RUNBOOK.md:469).

A toi : colle la ligne (sauvegarde puis J5). Écris « collé J5 ».
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH" && read -rs PROD_DB_URL && export PROD_DB_URL && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh J5
```

Si un jeu a moins de 40 cibles, la commande s'arrête, dit lequel et combien, et aucun des deux jeux ne change (OWNER-NOW.md:457; RUNBOOK.md:470). Les deux jeux d'une série (One Piece, minimum 40 ; Dragon Ball, minimum 30) ne bloquent jamais la commande : un jeu s'ouvre quand sa réserve atteint son minimum, sinon il reste éteint avec un avertissement (RUNBOOK.md:471). Pour Kpopdle Idol, `V-L14` imprime le vrai nombre de cibles : lis-le (OWNER-NOW.md:457; RUNBOOK.md:472).

Résultat qui veut dire go : des lignes `ok | dle_day kpopdle-idol répond : partie n° | 1` et `ok | dle_day otakudle répond : partie n° | 1`, plus V-L14, V-023, V-024, V-L15, V-DLE-KEPT en `ok`, V-S4 `ok` (session.sh:166-169, 373-379).

Vérif (Claude) : V8 (lignes de L14) et `dle_day` des deux jeux (RUNBOOK.md:473). Les pages des jeux restent en 404 jusqu'à l'étape 19.
Retour : `L14-O1-dle-on.rollback.sql` : les deux jeux (et ceux d'une série) s'éteignent ; les epochs, les banques et les parties restent. Après J5, la session G ne peut plus tourner : 020 et `V-020` demandent `kpopdle-idol` éteint (RUNBOOK.md:473; ROLLBACK.md:67).

Source : OWNER-NOW.md:448-459; RUNBOOK.md:467-473; session.sh:373-379.

### 19. La PR du jour J : `dailyGuess` à true

Toi 2 min. Claude 5 min (OWNER-NOW.md:462).

C'est une constante du code (`HUB_FEATURES` dans `apps/quiz/src/lib/site/registry.ts`) : seule une PR l'allume, après J5. Il n'y a pas de drapeau d'environnement (RUNBOOK.md:475). On y va seulement si les trois sont vrais :
- `V-L14` est `ok` sur les deux jeux ;
- `dle_day` répond pour les deux jeux (les deux lignes de J5) ;
- `/otakudle` et `/kpopdle` sont dans le build de cette PR.

Sinon la PR attend : les joueurs ne voient rien de changé.

A toi : si les trois sont vrais, fusionne la PR sur GitHub.

Vérif : la source n'en donne pas d'autre que les trois conditions ci-dessus. Les points 1 et 2 de l'étape 26 (déploiements Ready sur le commit de la PR, `/kpopdle` et `/daily` en 200) servent aussi ici.
Retour : revert de la PR ; toutes les pages des jeux répondent à nouveau 404 (RUNBOOK.md:475; ROLLBACK.md:67).

Source : OWNER-NOW.md:461-464; RUNBOOK.md:475; ENV.md:55.

### 20. Le quiz du jour d'OtakuQuiz

Toi 6 min. Worker 5 min. Claude 3 min (OWNER-NOW.md:467).

A toi :
1. Ton compte a son code depuis l'étape 2. S'il l'a perdu : `MFA-OWNER.md:34-62`, et le jour J s'allonge de deux redéploiements de `kpopquiz` (OWNER-NOW.md:471).
2. Connecté avec ton compte admin sur `https://bunnyverse.org/anime`, ouvre `https://bunnyverse.org/anime/admin` et tape les 6 chiffres. Ce site a sa propre session : il faut les taper ici, même si tu l'as fait sur kpopquiz.org (OWNER-NOW.md:472).
3. Dans le même onglet, colle cette ligne dans la console du navigateur. Elle prend la date du jour toute seule. La réponse dit `scheduled: 14`. Si elle dit `not_found` : refais le point 2 (OWNER-NOW.md:473).
```
fetch('/anime/api/admin/quiz-bank/auto-schedule', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({start_date: new Date().toISOString().slice(0, 10)})}).then(r => r.json()).then(console.log)
```
4. Vercel, projet `otakuquiz`, Settings, Cron Jobs, `ensure-daily-quiz`, Run (OWNER-NOW.md:477).

Vérif : worker, `https://bunnyverse.org/anime/daily` redirige vers une page `/anime/q/` ; Vercel, projet `otakuquiz`, Logs : le Run apparaît comme `/anime/api/cron/ensure-daily-quiz` en 200 (étape 14). Claude : 14 lignes de banque datées (OWNER-NOW.md:479).
Si le cron ne répond pas : Claude te donne la solution manuelle de RUNBOOK.md:481-482 (appel direct du cron avec le `CRON_SECRET` d'`otakuquiz`, saisi avec `read -rs`, puis `unset`).
Retour : dépublier un quiz dans l'admin (statut, jamais DELETE) (ROLLBACK.md:68).

Source : OWNER-NOW.md:466-479; RUNBOOK.md:477-482, 369-372.

### 21. Une vraie partie

Toi 6 min (OWNER-NOW.md:482).

A toi : sur `/anime`, avec ton compte : joue un quiz, like-le, ouvre la page du jour et une page de série (couverture anti-spoiler ; le blind test répond 404, c'est prévu). Sur le hub : la page réseau, déconnecté puis connecté. Écris « fait 21 » et ce que tu as vu.

Vérif : toi, ce que tu as vu ; aucun message d'erreur.
Retour : voir l'étape 20 pour dépublier ; ROLLBACK.md:57-72 pour les couches.

Source : OWNER-NOW.md:481-484; RUNBOOK.md:483.

### 22. La vérification complète (worker et Claude)

Worker 45 min. Claude 10 min (OWNER-NOW.md:487). Toi : attends.

Worker : V10 en entier, avec les fuites de texte ; V1 pour kpopquiz.org (seuls les nombres en direct changent, les drapeaux NET sont encore éteints) ; 30 min de Runtime Logs propres sur les trois projets. Claude : les lignes de fuite de V8 sont à 0 (OWNER-NOW.md:489; RUNBOOK.md:483-484).

Claude regarde aussi, après la mise en route des jeux : `select bucket, count(distinct ip_hash), max(calls) from public.dle_rate group by 1 order by 1 desc limit 5`. Il doit voir plusieurs adresses par minute chargée. Une seule adresse avec un compte élevé chaque minute veut dire que le compte est partagé (VERIFY.md:512).

Résultat qui veut dire go : `0` sur chaque ligne de fuite (VERIFY.md:359-363). Les restes K-pop déjà connus (VERIFY.md:363) sont à noter, pas à ignorer : étape 23.
Retour : voir l'étape 23.

Source : OWNER-NOW.md:486-489; RUNBOOK.md:483-484; VERIFY.md:337-375, 512.

### 23. Go et annonce

Toi 2 min (OWNER-NOW.md:492).

A toi : si V10 trouve un reste K-pop déjà connu sur `/anime` (`docs/o1/RAPPORT-FINAL.md`, section 5 ; VERIFY.md:363 liste le texte K-pop sur `/u/<nom>`, name-all, le hub vide, les tuiles « Ways to play » et `/dmca`), décide « corriger d'abord » ou « accepter ». Claude note la date. Puis annonce. Le script d'e-mails de la liste d'attente (X1) est à toi et n'est pas sur le chemin du lancement (RUNBOOK.md:484).

Retour : ROLLBACK.md:57-72, couche la plus légère d'abord.

Source : OWNER-NOW.md:491-494; RUNBOOK.md:484; VERIFY.md:363.

---

## Partie 4. L'indexation, tout à la fin

### 24. Le noindex, avant l'indexation (worker)

Worker 10 min (OWNER-NOW.md:499). Toi : attends.

Avant que tu poses `NET_LAUNCH_DATE` et `NET_INDEXING`, le worker lance les six commandes de l'annexe : l'accueil du hub, l'accueil d'OtakuQuiz et une page de quiz d'OtakuQuiz. Les trois premières lisent l'en-tête `X-Robots-Tag`, les trois dernières la balise robots du HTML.

Résultat qui veut dire go : chaque commande affiche sa ligne noindex (`x-robots-tag: noindex, nofollow` ou `<meta name="robots" content="noindex, nofollow"`). Une commande muette à ce moment : on s'arrête, le worker prévient Claude avant l'étape 25 (OWNER-NOW.md:518; RUNBOOK.md:514).
Retour : lecture seule.

Source : OWNER-NOW.md:496-519; RUNBOOK.md:487-516.

### 25. Ouvrir l'indexation, la toute dernière étape

Toi 9 min. Claude 2 min. Worker 10 min (OWNER-NOW.md:522).

Seulement quand l'étape 23 est faite et que rien d'autre n'est ouvert pour la journée (RUNBOOK.md:521). Seulement après le OK de Claude sur la ligne `privacy.controller` de `apps/quiz/src/copy/hub/h1.ts` : elle doit nommer le responsable du traitement, pas un texte provisoire (OWNER-NOW.md:524; RUNBOOK.md:521).

A toi : Vercel, Production, dans `fandomverse` et `otakuquiz` (jamais `kpopquiz`), Settings, Environment Variables.
1. D'abord cette clé, valeur la date du jour au format `AAAA-MM-JJ` (Claude te la donne) :
```
NET_LAUNCH_DATE
```
2. Puis cette clé, valeur `1` :
```
NET_INDEXING
```
3. Redéploie les deux projets (Deployments, Redeploy du dernier build de `main`). Jamais un projet sans l'autre : le hub ne peut pas lire le drapeau d'`otakuquiz`. Le build échoue si `NET_INDEXING` est posé sans `NET_LAUNCH_DATE` (RUNBOOK.md:521; ENV.md:49).
4. Search Console, propriété Domaine `bunnyverse.org` (si elle n'existe pas : Ajouter une propriété, type Domaine, pose chez Cloudflare l'enregistrement TXT que Google affiche, puis Valider ; OWNER-NOW.md:46). Sitemaps : soumets les deux adresses.
```
https://bunnyverse.org/sitemap.xml
```
```
https://bunnyverse.org/anime/sitemap.xml
```

Vérif (worker) : les six commandes de l'annexe n'affichent plus rien une fois les deux redéploiements Ready ; V10 « after K10 » : plus de noindex sur l'accueil du hub, `/anime`, `/anime/series`, une série, un quiz ; toujours un noindex sur `/settings`, `/me`, `/anime/admin` ; les deux fichiers de clé IndexNow répondent 200 sur bunnyverse.org et 404 sur kpopquiz.org (adresses en annexe) (OWNER-NOW.md:538; RUNBOOK.md:523).
Retour : retire `NET_INDEXING` (et `NET_LAUNCH_DATE`) des deux projets, redéploie les deux. Les pages se referment aussitôt ; celles déjà explorées disparaissent lentement (RUNBOOK.md:524; ROLLBACK.md:71).

Source : OWNER-NOW.md:521-538; RUNBOOK.md:518-524; ENV.md:48-49.

---

## Partie 5. Le même jour : Kpopdle sur kpopquiz.org

### 26. Le module Kpopdle sur l'accueil de kpopquiz.org (`NET_KPOPDLE_HOME`)

Toi 3 min. Worker 10 min (OWNER-NOW.md:585).

Le jeu s'allume par la PR de l'étape 19. Si elle n'est pas fusionnée, cette étape attend avec elle. Tout doit être vrai, sinon tu ne touches à rien :
1. La PR de l'étape 19 est sur `main` et les déploiements Production de `fandomverse` et `kpopquiz` sont Ready sur ce commit.
2. Le worker confirme que `https://bunnyverse.org/kpopdle` et `https://bunnyverse.org/daily` répondent 200.
3. Tu as joué la partie du jour sur ton téléphone, jusqu'au bout.
4. L'étape 25 est faite (le lien ne mène pas à une page noindex).
5. Une heure de Runtime Logs de `fandomverse` sans ligne `[dle]` d'erreur.

(OWNER-NOW.md:587; RUNBOOK.md:549)

A toi : Vercel, `kpopquiz` seulement, Production : la clé ci-dessous, valeur `1`. Redéploie `kpopquiz`.
```
NET_KPOPDLE_HOME
```

Vérif (worker), RUNBOOK L3c : un seul lien `href="https://bunnyverse.org/kpopdle"` dans le HTML de l'accueil de kpopquiz.org, un seul `<h1`, aucun nom d'idol, le module entre le quiz du jour et les groupes (bureau et 375 px), V1 : seule `/` change (RUNBOOK.md:551). Le lien manque alors que la variable est posée : le module a refusé de s'afficher (interrupteur du hub ou `dle_day`) ; l'accueil est intact ; la ligne `[home] Kpopdle` des journaux de `kpopquiz` le dit.
Retour : retire la clé, redéploie `kpopquiz` (RUNBOOK.md:552; OWNER-NOW.md:593).

Source : OWNER-NOW.md:584-593; RUNBOOK.md:547-552; ENV.md:52.

---

## Partie 6. Après le jour J : une veille, puis les drapeaux un par un

Un drapeau à la fois, chacun sur les trois projets en un seul lot, chacun suivi de V1, V10 et une heure de Runtime Logs propres avant le suivant (RUNBOOK.md:531; ENV.md:20).

### 27. Heure 0 à +1, puis +24 h

Claude 25 min. Worker 1 h 15 (OWNER-NOW.md:543).

Worker : V10, V11 points 1 à 3, les inscriptions sur `/anime`. À +24 h, obligatoire : Vercel, projet `otakuquiz`, Logs, le `/anime/api/cron/ensure-daily-quiz` de 00:05 UTC et les autres crons du jour en `/anime/api/cron/...` répondent 200 (ni 401 ni 404) ; Vercel, projet `fandomverse`, Logs : aucune ligne `/anime/api/cron/...`. Claude : journaux Auth (erreurs Google et Discord), comptes Team absents des classements ; à +24 h, après le cron de 00:05, une ligne `kpop` et une ligne `anime` du jour dans `qotd_log`. Chaque matin : `V-DLE-KEPT` (0, `ok` sur chaque jeu actif) et V12 (la maintenance de nuit des jeux) (VERIFY.md:309-313, 390-408; RUNBOOK.md:563, 577).

Retour : n/a (lecture). Un problème : ROLLBACK.md:57-72.

Source : OWNER-NOW.md:540-545; RUNBOOK.md:533-536; VERIFY.md:377-388.

### 28. Le pied de page réseau (`NEXT_PUBLIC_NET_FOOTER`)

Toi 6 min. Worker 1 h 10 (OWNER-NOW.md:549).

Après le « +24 h propre ». A toi : Vercel, Production, les trois projets : la clé ci-dessous, valeur `1`. Redéploie les trois.
```
NEXT_PUBLIC_NET_FOOTER
```
Vérif (worker) : V1 (seuls la ligne du pied de page et l'Organization changent sur kpopquiz.org), V10, 1 h de journaux propres (OWNER-NOW.md:554).
Retour : retire la clé, redéploie (RUNBOOK.md:539; ROLLBACK.md:60-61).

Source : OWNER-NOW.md:547-554; RUNBOOK.md:539; ENV.md:44.

### 29. Le menu réseau (`NEXT_PUBLIC_NET_MENU`)

Toi 6 min. Worker 1 h 10. Après le OK du worker sur l'étape 28.

A toi : même geste, cette clé, valeur `1`, dans les trois projets. Redéploie les trois.
```
NEXT_PUBLIC_NET_MENU
```
Vérif (worker) : V1 montre « Your sites » seulement pour un membre connecté avec deux sites ou plus, rien pour les autres (RUNBOOK.md:540).
Retour : retire la clé, redéploie.

Source : OWNER-NOW.md:556-562; RUNBOOK.md:540; ENV.md:45.

### 30. La balise réseau (`NEXT_PUBLIC_NET_BEACON`)

Toi 6 min. Worker 1 h 10. Après le OK du worker sur l'étape 29.

A toi : même geste, cette clé, valeur `1`, dans les trois projets. Redéploie les trois.
```
NEXT_PUBLIC_NET_BEACON
```
Vérif (worker) : `bridge_daily` se remplit (des nombres seulement) (RUNBOOK.md:541).
Retour : retire la clé, redéploie.

Source : OWNER-NOW.md:564-570; RUNBOOK.md:541; ENV.md:46.

### 31. kpopquiz : confidentialité et suppression

Toi 5 min. Claude 3 min. Worker 10 min (OWNER-NOW.md:573).

A toi : Vercel, `kpopquiz` seulement, Production : les deux clés ci-dessous, valeur `1`. La seconde seulement si Claude confirme que 016 et 017 sont appliquées et que `passport-deletions` a tourné sur `fandomverse`. Redéploie `kpopquiz`.
```
NEXT_PUBLIC_NET_PRIVACY
```
```
NEXT_PUBLIC_NET_DELETION
```
Vérif (worker) : V1. `RESEND_API_KEY` (étape 3) n'est pas obligatoire pour la seconde clé : sans elle, l'avis de suppression est sauté et la suppression a lieu quand même (ENV.md:51).
Retour : retire la clé, redéploie `kpopquiz` (RUNBOOK.md:545).

Source : OWNER-NOW.md:572-582; RUNBOOK.md:545; ENV.md:50-51.

### 32. Le lendemain : la ligne Kpopdle en fin de quiz et la carte de groupe

Toi 3 min. Worker 10 min (OWNER-NOW.md:597).

Après l'étape 26, quand elle est stable depuis un jour. Même go / no-go qu'à l'étape 26. Les liens d'OtakuQuiz vers ses trois jeux n'ont pas de clé : ils s'allument avec la PR de l'étape 19. A toi : Vercel, `kpopquiz` seulement, Production : les deux clés ci-dessous, valeur `1` (chacune peut partir seule). Redéploie `kpopquiz`.
```
NET_KPOPDLE_QUIZEND
```
```
NET_KPOPDLE_GROUP
```
Vérif (worker), RUNBOOK L3d : un seul lien `href="https://bunnyverse.org/kpopdle"` sur une page de groupe qui a des membres dans le jeu, aucun sur un groupe qui n'en a pas, un seul `<h1`, V1 : seules les pages de groupe changent ; sur OtakuQuiz, trois liens vers `otakudle` sur l'accueil `/anime` (RUNBOOK.md:558).
Retour : retire la clé, redéploie `kpopquiz` (RUNBOOK.md:559).

Source : OWNER-NOW.md:595-607; RUNBOOK.md:554-559; ENV.md:53-54.

### 33. +48 h, +72 h, et décider

Claude 30 min. Worker 40 min à chaque passage. Toi 8 min à +72 h (OWNER-NOW.md:610, 615).

V11 à +48 h et à +72 h. Claude : les requêtes, les journaux Auth, les conseils de sécurité de la base. Worker : V10, les journaux, les crons (OWNER-NOW.md:612).

A toi, à +72 h : regarde Search Console pour kpopquiz.org et bunnyverse.org. Sitemaps soumis ; aucun nouveau « bloquée par robots.txt » ni « exclue par noindex » sur kpopquiz.org. Si V11 est propre depuis 72 h : remonte le TTL de `bunnyverse.org` à la valeur par défaut de Cloudflare, garde le dump du jour J 60 jours. Le lancement est fini. Sinon : ROLLBACK.md, section 3, la couche la plus légère d'abord (OWNER-NOW.md:617; RUNBOOK.md:565).

Hors de cette page : les deux tables du hub et leurs deux crons (RUNBOOK.md:568-575), après le lancement.

Source : OWNER-NOW.md:609-617; RUNBOOK.md:561-566; VERIFY.md:377-388.

---

## Partie 7. Les variables et les drapeaux de Production, projet par projet

Tout est pour l'environnement Production. Une variable publique (`NEXT_PUBLIC_*`) est figée au build : change-la, puis redéploie le projet. Une variable de serveur se lit à l'exécution ; redéploie quand même, pour que les vérifications la voient (ENV.md:19-20). Dans la fenêtre du Redeploy, décoche « Use project's Ignore Build Step » si elle est cochée (RUNBOOK.md:312; vercel-ignore-build.sh:4-5). Pour un secret : « copie depuis ... », jamais de valeur dans le chat, un journal ou un fichier (ENV.md:10).

### 7.1 Dans l'ordre où tu les allumes

| ordre | étape | projet(s) | variable | valeur | redéploiement |
|---|---|---|---|---|---|
| 1 | 3, avant | `fandomverse` | `RESEND_API_KEY` | secret : copie depuis ta clé Resend | `fandomverse` (ou l'étape 12) |
| 2 | 16 | `kpopquiz`, `fandomverse`, `otakuquiz` | `PASSPORT_JUMP` | `1` | les trois ensemble |
| 3 | 25 | `fandomverse`, `otakuquiz` | `NET_LAUNCH_DATE` | la date du jour `AAAA-MM-JJ` (Claude la donne) | avec la ligne 4 |
| 4 | 25 | `fandomverse`, `otakuquiz` | `NET_INDEXING` | `1` | les deux ensemble, jamais l'un sans l'autre |
| 5 | 26 | `kpopquiz` | `NET_KPOPDLE_HOME` | `1` | `kpopquiz` |
| 6 | 28, après +24 h | les trois | `NEXT_PUBLIC_NET_FOOTER` | `1` | les trois ensemble |
| 7 | 29, 1 h propre après 6 | les trois | `NEXT_PUBLIC_NET_MENU` | `1` | les trois ensemble |
| 8 | 30, 1 h propre après 7 | les trois | `NEXT_PUBLIC_NET_BEACON` | `1` | les trois ensemble |
| 9 | 31 | `kpopquiz` | `NEXT_PUBLIC_NET_PRIVACY` | `1` | `kpopquiz` |
| 10 | 31, si 016, 017 et `passport-deletions` sont ok | `kpopquiz` | `NEXT_PUBLIC_NET_DELETION` | `1` | `kpopquiz` |
| 11 | 32, le lendemain de la ligne 5 | `kpopquiz` | `NET_KPOPDLE_QUIZEND`, `NET_KPOPDLE_GROUP` | `1` chacune | `kpopquiz` |

Les lignes 6 à 8 vont dans cet ordre, une par une (RUNBOOK.md:538-541). Les lignes 5 et 11 sont indépendantes de cette chaîne (RUNBOOK.md:547, 554). `NET_LAUNCH_DATE` se pose avant `NET_INDEXING` (ENV.md:49).

Jamais en production, dans aucun projet : `NEXT_PUBLIC_NET_FACTS` (attend L11, après le lancement), `PASSPORT_CONTINUE`, `PASSPORT_SEED`, `NEXT_PUBLIC_DLE_PREVIEW` (réservé à la Preview) (ENV.md:47, 55, 57, 99).

Réglé seulement le temps d'une mise en place : `ADMIN_MFA_ENROL_OPEN` = `1` sur `kpopquiz` (étape 2), puis retiré. Sur `otakuquiz` seulement en Preview, pour l'étape 11 (ENV.md:36).

`ADMIN_PATH` : n'existe que si le plan ADMIN-2 est dans le code déployé. Il irait sur `fandomverse` seulement, en Sensitive, avec une valeur que toi seul connais (PLAN-ADMIN-2.md:13). Cette page n'en écrit pas la valeur. Le code de ce commit ne le lit pas : l'admin est à `/anime/admin` (DEV-PREVIEW.md:79). Voir « Pour Claude », point 9.

### 7.2 Déjà en place, à vérifier sans y toucher (K1)

| projet | variables et valeurs non secrètes |
|---|---|
| `kpopquiz` | `NEXT_PUBLIC_SITE_ID` absente (veut dire kpop) ; `NEXT_PUBLIC_UX_V1` = `1` ; `NEXT_PUBLIC_UX_V12` = `1` ; `SITE_SCOPE` = `1` (étape B6, faite) ; `SUPABASE_SERVICE_ROLE_KEY` à lui ; `ADMIN_USER_IDS` ; `QOTD_ROTATION_FIX` (celui de kpop) ; `ADMIN_MFA_ENROL_OPEN` absente |
| `fandomverse` | `NEXT_PUBLIC_SITE_ID` = `hub` ; `NEXT_PUBLIC_UX_V1` = `1` ; `NEXT_PUBLIC_UX_V12` = `1` ; `SITE_SCOPE` = `1` ; `CRON_SECRET` ; `SUPABASE_SERVICE_ROLE_KEY` (variable de projet, étape H3, Production seulement) ; `QOTD_ROTATION_FIX` absente ; `NEXT_PUBLIC_GOOGLE_CLIENT_ID` et `NEXT_PUBLIC_SITE_URL` absentes |
| `otakuquiz` | `NEXT_PUBLIC_SITE_ID` = `anime` ; `NEXT_PUBLIC_UX_V1` = `1` ; `NEXT_PUBLIC_UX_V12` = `1` ; `SITE_SCOPE` = `1` ; `QOTD_ROTATION_FIX` = `1` ; `CRON_SECRET` ; `ADMIN_USER_IDS` (copie de `kpopquiz`) ; `SUPABASE_SERVICE_ROLE_KEY` (variable de projet) ; `NEXT_PUBLIC_GOOGLE_CLIENT_ID` et `NEXT_PUBLIC_SITE_URL` absentes |
| les trois | `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` identiques ; `PASSPORT_TICKET_SECRET`, `PASSPORT_REVALIDATE_SECRET` et `NET_IP_HASH_SALT` identiques sur les trois (secrets : on ne compare que les longueurs) |

Source de 7.1 et 7.2 : ENV.md:26-67, 74-75; OWNER-NOW.md:25, 55-59.

### 7.3 Ne doit jamais exister dans un projet de production

`DEV_LOGIN_ENABLED`, `DEV_LOGIN_EMAIL`, `DEV_LOGIN_CONTRIBUTOR_EMAIL`, `NEXT_PUBLIC_NET_ORIGINS`, `NEXT_PUBLIC_SITE_URL` sur `fandomverse` ou `otakuquiz`, `SITE_ID`, `NEXT_PUBLIC_NET_WELCOME`, tout `O1_*`, `RECORD_BASELINE`, `PLAYLIST_TRACE`, `NEXT_PUBLIC_DLE_PREVIEW`, `AUTH_FIXTURE_CONFIRM`, les clés de `o1-dev` ou `o1-scratch`, `SEND_EMAIL_ORIGINS` (ENV.md:88-101, 133).

---

## Partie 8. Go / no-go

### A. Avant de commencer : tout doit être vrai

Si une seule case est fausse, le jour J se décale (RUNBOOK.md:382).

Ce qui précède le jour J
- [ ] Les sessions B, D, E1, E2, G et le lot K2 sont faites et OK ; les veilles C, D3 et F sont propres (RUNBOOK.md:60-73, 258, 383).
- [ ] V7 : les six conditions sont vraies, le Verrou 0 est levé : le lendemain de 010 les contrôles V5 passent ; 0 quiz et 0 badge hors `kpop` ; adhésions kpop = profils ; somme des XP égale et pas plus basse que V0 ; audit des compteurs pas au-dessus de la base ; V1 identique (VERIFY.md:253-261).
- [ ] G3 fait : V-S4 `ok`, V1, une heure de journaux propres (RUNBOOK.md:256).
- [ ] V9 passe pour les trois projets (hub sur `/`, OtakuQuiz sur `/anime`, sur l'adresse `.vercel.app` de `fandomverse`) (RUNBOOK.md:383; VERIFY.md:315-335).
- [ ] Le dossier `launch/` montre L01 à L08, L10-PERS et L12 avec leurs retours ; les trois contrôles de J2 passent (sha256 de `MANIFEST.json`, aucun fichier `-- DRAFTS`, `team.otakuquiz.org` absent de L02) ; l'en-tête de L01 nomme le domaine Bunnyverse ; la répétition J3 a été faite sur ces fichiers (RUNBOOK.md:348-367, 384).
- [ ] `L13-A1-character-facts.sql`, `L15-A2-series-games.sql` et `L14-O1-dle-on.sql` sont sur `main` (session.sh:33, 91; RUNBOOK.md:465).
- [ ] La vérification d'avant mise en route des jeux (V12 : les rôles ont les droits `t|t|t|t|t|t|f`) est passée (VERIFY.md:394-399).
- [ ] H9 (`dle_rate_hit`, l'adresse que la limite voit vraiment) est passée sur `o1-dev` avec le résultat « Pass » (VERIFY.md:412-512). La source dit « Not run yet » (VERIFY.md:414) : confirme son état avec Claude. Un échec bloque la mise en route des jeux (VERIFY.md:510).
- [ ] Domaine et réglages (H) : `dig` donne `76.76.21.21` pour `bunnyverse.org`, le CNAME de `www` est en place, aucun MX pour `team.bunnyverse.org` ; le groupe Microfrontends `fandomverse` existe, `fandomverse` par défaut ; les adresses de retour de Supabase sont exactement les deux callbacks, sans `*` ; la clé `service_role` est en place sur `fandomverse` et `otakuquiz` ; Google Cloud et Discord ne changent pas (aucune origine JavaScript, aucun client nouveau) (RUNBOOK.md:385; AUTH-BUNNYVERSE.md:53-74).
- [ ] La liste `PLACEHOLDERS` de `apps/quiz/src/lib/site/registry.ts` pour anime et hub : chaque élément est posé ou accepté. Boîte de l'Organization : `hello@kpopquiz.org` (RUNBOOK.md:386-387).
- [ ] Le texte de confidentialité du hub est fait ; la ligne `privacy.controller` de `h1.ts` nomme le responsable du traitement (Claude le confirme avant l'étape 25) (RUNBOOK.md:388).
- [ ] Le domaine e-mail des comptes Team est `team.bunnyverse.org`, sans courrier ; `QOTD_ROTATION_FIX=1` est posé sur `otakuquiz` (RUNBOOK.md:389).
- [ ] Ton code TOTP est en place (étape 2) ; chaque autre id de `ADMIN_USER_IDS` a son code ou a quitté la liste ; `ADMIN_MFA_ENROL_OPEN` est absent de la Production des trois projets (RUNBOOK.md:390).
- [ ] Aucune variable de la partie 7.3 n'existe en production (ENV.md:88-101).
- [ ] Les e-mails d'authentification de kpopquiz.org passent bien par le SMTP Resend (limite 100 par heure) ; le Send Email Hook est éteint (état ORCH ; RUNBOOK.md:319).
- [ ] Les deux PR du jour sont prêtes, préparées par Claude : la PR des builds (étape 12) et la PR `dailyGuess` (étape 19) (OWNER-NOW.md:395, 462).
- [ ] Une sauvegarde du tableau de bord de moins de 24 h existe ; `psql --version` affiche 18 une fois la ligne PATH passée (OWNER-NOW.md:307; RUNBOOK.md:57).
- [ ] Quelqu'un est libre pendant les 72 h qui suivent le lancement (RUNBOOK.md:391).
- [ ] Tu as une journée devant toi : départ après 00:30 UTC, fin avant 22:00 UTC (OWNER-NOW.md:302).

### B. Pendant la journée : on s'arrête si

| quoi | que faire | source |
|---|---|---|
| Une ligne `KO` ou un `ERROR` d'une partie J | Rien d'autre n'est lancé. Colle les lignes dans le chat. Relance la même partie seulement quand Claude l'a dit : elle repart de son début sans risque. | session.sh:49-55; OWNER-NOW.md:15 |
| « sauvegarde : N lignes » avec N à 2000 ou moins, ou pas de ligne `OK` après | La partie ne s'est pas lancée. Colle ce que tu vois. | consigne ORCH |
| Un KO sur `lock_timeout` ou « une table était occupée » | Relance la même ligne plus tard, à une heure calme. | session.sh:102; OWNER-NOW.md:123 |
| Il est entre 23:50 et 00:30 UTC | Pas de SQL. | session.sh:71 |
| J1 : fichiers de lancement différents de `MANIFEST.json`, un fichier DRAFTS, une ancienne adresse Team | Stop. Les fichiers ne sont pas ceux qui ont été relus. | session.sh:251; RUNBOOK.md:358-359 |
| Le dry run des comptes Team ne donne pas 31, ou `failed` au-dessus de 0 | Pas de J2. Colle la sortie. | team-auth.mjs:36, 52-53 |
| Un titre anime apparaît sur kpopquiz.org (étape 9) | Pas de J3. | OWNER-NOW.md:357; VERIFY.md:83 |
| Un chiffre V8 de fuite au-dessus de 0 | Stop, ROLLBACK.md:76-77. | RUNBOOK.md:484 |
| V-S4 en KO (une des 28 fonctions de S4 est rouverte ou absente) | Stop. | session.sh:118-125; VERIFY.md:25-37 |
| Étape 14 : 401, 404 ou aucune ligne sur un cron `/anime/api/cron/...` | Le worker prévient Claude dans l'heure. Le quiz du jour se publie à la main. Le repli par `vercel.json` est ta décision (une PR). | OWNER-NOW.md:420; RUNBOOK.md:455 |
| Étape 15 : erreur Google ou Discord dans les journaux Auth, ou la connexion ne revient pas sur bunnyverse.org | Stop avant l'étape 16. Vérifie les deux callbacks. | RUNBOOK.md:281, 290 |
| Étape 16 : « invalid ticket » | Les trois secrets passport ne sont pas égaux. `PASSPORT_JUMP` à `0` sur les trois. | ENV.md:67; ROLLBACK.md:62-63 |
| J5 : un jeu sous 40 cibles | La commande s'arrête, aucun jeu ne change. Corriger la réserve ou décider, puis relancer J5. | OWNER-NOW.md:457; RUNBOOK.md:470 |
| Les trois conditions de l'étape 19 ne sont pas vraies | La PR `dailyGuess` attend. Rien ne change pour les joueurs. | RUNBOOK.md:475 |
| Une nouvelle erreur dans les Runtime Logs de l'un des trois projets (30 min de journaux propres pour l'étape 22) | C'est un constat : pas de suite avant que Claude ait regardé. | RUNBOOK.md:484; VERIFY.md:380 |
| V10 : un chiffre de fuite de texte au-dessus de 0 | Décide « corriger d'abord » ou « accepter » et fais dater la décision. | OWNER-NOW.md:494; VERIFY.md:363 |
| Étape 24 : une des six commandes est muette avant l'indexation | On s'arrête, pas d'étape 25. | OWNER-NOW.md:518 |
| `privacy.controller` encore provisoire | Pas d'étape 25. | OWNER-NOW.md:524 |
| Les comptes Team apparaissent dans un classement | C'est un constat à traiter avant la suite (ils doivent être absents). | VERIFY.md:384-385; RUNBOOK.md:533 |
| Les e-mails d'authentification de kpopquiz.org atteignent la limite de 100 par heure de Supabase | Prévenir Claude ; ne pas allumer d'autre drapeau ce jour-là. Le Send Email Hook reste éteint. | état ORCH |
| V10 « after K10 » : un noindex reste là où il doit avoir disparu | `NET_INDEXING` retiré, redéploie les deux projets. | RUNBOOK.md:523-524 |

### C. Après L01 : ce qui ne se défait plus

- L01 ne se défait plus après la première inscription sur anime ou hub (des adhésions y pointent), après L02, ou après tout contenu. L03 : une fois un quiz confié à un profil sentinelle ou une partie liée à lui. L06 : une fois un badge tenu. L07 : après la première partie d'un quiz. L08 : après une ligne datée ou publiée. L04 : une fois un quiz, une ligne de banque ou un fait utilise les groupes.
- 003 et 004 ne se défont plus après la première adhésion, le premier favori ou le premier suivi sur anime. 008 non plus après la première partie anime. 010 non plus après la première ligne anime de banque ou de journal.
- Un compte supprimé (016 et Mission U partie D) ne revient que depuis une sauvegarde.
- `SITE_SCOPE` ne s'éteint plus jamais : éteint, il montrerait des quiz anime sur kpopquiz.org.
- Les couches de retour qui restent : le moins lourd d'abord, les données restent (ROLLBACK.md:57-72).

(ROLLBACK.md:16-17, 74-81)

### D. Dernier recours

Restaurer la sauvegarde de la session (tableau de bord Supabase, Database, Backups, ou `pg_restore` du dump dans un nouveau projet, puis repointer les trois projets). Ça perd tout ce qui a été écrit depuis, sur les trois sites : seulement pour une corruption (ROLLBACK.md:83-84).

---

## Annexe : les commandes du worker

Tu ne les lances pas (OWNER-NOW.md:13). Elles sont ici pour que tu voies ce que le worker contrôle.

DNS (étape 13 ; RUNBOOK.md:297) :

```
dig +short bunnyverse.org A
```
```
dig +short www.bunnyverse.org CNAME
```
```
dig +short team.bunnyverse.org MX
```
Attendu : `76.76.21.21`, puis `cname.vercel-dns.com.`, puis rien.

Redirection `www` (étape 13 ; VERIFY.md:349) :
```
curl -sS -o /dev/null -w 'www %{http_code} %{redirect_url}\n' https://www.bunnyverse.org/
```
Attendu : 301 ou 308 vers `https://bunnyverse.org/`.

Les six commandes du noindex (étapes 24 et 25 ; OWNER-NOW.md:501-517; RUNBOOK.md:491-512) :
```
curl -sI https://bunnyverse.org | grep -i '^x-robots-tag'
```
```
curl -sI https://bunnyverse.org/anime | grep -i '^x-robots-tag'
```
```
curl -sIL https://bunnyverse.org/anime/daily | grep -i '^x-robots-tag'
```
```
curl -s https://bunnyverse.org | grep -o '<meta name="robots" content="noindex[^"]*"'
```
```
curl -s https://bunnyverse.org/anime | grep -o '<meta name="robots" content="noindex[^"]*"'
```
```
curl -sL https://bunnyverse.org/anime/daily | grep -o '<meta name="robots" content="noindex[^"]*"'
```
Avant l'étape 25 : chaque commande affiche sa ligne noindex. Après les deux redéploiements : elles n'affichent plus rien. Les adresses `*.vercel.app` gardent leur noindex mais sont protégées par Vercel : le worker ne les teste pas (OWNER-NOW.md:519).

Fichiers de clé IndexNow (étape 25 ; RUNBOOK.md:523) : 200 sur bunnyverse.org, 404 sur kpopquiz.org.
```
curl -sS -o /dev/null -w '%{http_code}\n' https://bunnyverse.org/339dab142e51883ae3a2c7e4737254e4.txt
```
```
curl -sS -o /dev/null -w '%{http_code}\n' https://bunnyverse.org/anime/760f9a9459d4db0bd8a08f13a0f1ec6e.txt
```
Les deux mêmes chemins sur `https://kpopquiz.org` donnent 404.

---

## Pour Claude

Cette section est pour Claude (ORCH et les autres lanes), pas pour le owner. Les conflits entre sources, le choix retenu, et les points ouverts.

Conflits entre sources (la plus récente retenue)

1. **Une sauvegarde par partie, ou une pour la session.** OWNER-NOW.md:304-313 et 17-21 : une sauvegarde au début de la session, puis les parties collées seules dans le même terminal. La consigne ORCH du 2026-11-04 : chaque partie J1 à J5 porte sa ligne de sauvegarde + vérification + partie. Retenu : la consigne ORCH. Effet : 5 sauvegardes, 5 saisies de la chaîne de connexion, environ 20 min de plus.
2. **Seuil du dump.** OWNER-NOW.md:113 et RUNBOOK.md:101 : « plusieurs centaines » de lignes pour `pg_restore --list`. Consigne ORCH : `N > 2000`. Retenu : ORCH. À confirmer sur le dump réel de la session G : si la base complète donne 2000 lignes ou moins, la chaîne s'arrête avant la partie (sans danger, mais bloquant).
3. **E-mails d'authentification.** RUNBOOK.md:319, ENV.md:124 et OWNER-TODO.md:19 : Resend non configuré, expéditeur par défaut de Supabase, hook éteint. État ORCH : SMTP personnalisé Resend sur kpopquiz.org depuis ce soir, limite 100 par heure, hook après le lancement. Retenu : ORCH. ENV.md:135 et RUNBOOK.md:329 disent de poser `RESEND_API_KEY` sur `fandomverse` « plus tard » ; la page le met à l'étape 3, recommandé et non bloquant.
4. **Calendrier de sessions.** Sources : E commence entre 18:00 et 22:20 (OWNER-NOW.md:207; session.sh:302) et E2 avant 23:45 (session.sh:308) ; E après la veille D3 de 24 h (RUNBOOK.md:68-69) ; V7 à E4 plus 24 h (RUNBOOK.md:236; OWNER-NOW.md:249) ; la session G après V7, « Waits for F » (RUNBOOK.md:242; SQL-ORDER.md:127; OWNER-NOW.md:252). État ORCH : E1, E2, G et K2 demain dès 10:00 UTC, D ce soir, V7 à 00:40 la nuit suivante. Cela fait D puis E à moins de 24 h, E2 puis V7 à moins de 15 h, et G avant V7. Cette page suppose que tout cela est vrai et propre avant le jour J et ne tranche pas.
5. **Cloudflare.** Les sources parlent du « registrar » et ne nomment jamais Cloudflare (RUNBOOK.md:293-295; OWNER-NOW.md:39-44). La page écrit « Cloudflare » (ORCH) avec les mêmes valeurs. Les sources ne disent rien du mode proxy de Cloudflare. Le contrôle de RUNBOOK.md:297 (le A vaut `76.76.21.21`) le détecterait : un enregistrement derrière le proxy répondrait une autre adresse. À ORCH de décider si la page doit dire explicitement « DNS seulement, sans proxy » (non sourcé, donc pas écrit).
6. **« La PR du jour J ».** Les sources donnent ce nom à deux PR : les builds (`NET_PRODUCTION_HOLD=0`, OWNER-NOW.md:395; RUNBOOK.md:439) et `dailyGuess` à true (OWNER-NOW.md:462; RUNBOOK.md:475, 547). La page les lit comme deux PR (étapes 12 et 19) : la seconde doit venir après J5, la première avant le domaine.
7. **Cibles d'Otakudle.** OWNER-NOW.md:443 : « 584 personnages avec les 7 colonnes et 113 cibles ». VERIFY.md:290 : « 584 ... et 178 cibles ». DEV-PREVIEW.md:100, 115 : 113 puis 178 après D03 (CR-026). Retenu : 178 (VERIFY, le plus récent), mais `V-L13` imprime le vrai nombre.
8. **Étape 61 ter : « le jour J » ou « stable depuis un jour ».** RUNBOOK.md:554-556 et OWNER-NOW.md:595-598 disent les deux. La page met l'étape 32 le lendemain, quand l'étape 26 est stable depuis un jour.
9. **Adresse de l'admin.** OWNER-NOW.md:472 et RUNBOOK.md:479 : `bunnyverse.org/anime/admin`. PLAN-ADMIN-2.md:11-30 : une adresse secrète `bunnyverse.org/<ADMIN_PATH>`, et `/anime/admin` répondrait 404. Le code de ce commit ne lit pas `ADMIN_PATH` (DEV-PREVIEW.md:79 ; aucune occurrence dans `apps/quiz`). La page suit `/anime/admin`. Si ADMIN-2 est déployé avant le jour J, les étapes 11, 20 et 22 changent. La valeur d'`ADMIN_PATH` n'est écrite nulle part.
10. **Le mot « K2 ».** « K2 » veut dire le départ du matin de la partie K (RUNBOOK.md:393) et le lot K2 d'idols (session.sh:333; RUNBOOK.md:258). Cette page dit « le lot K2 » pour le second et « point de départ du jour » pour le premier.

Points ouverts

11. **H9** (`dle_rate_hit`) est « Not run yet » (VERIFY.md:414) et bloque la mise en route des jeux si elle échoue (VERIFY.md:510). La partie 8 A l'exige avant J5.
12. **Décocher « Use project's Ignore Build Step » au Redeploy.** Les sources le demandent tant que `NET_PRODUCTION_HOLD=1` (RUNBOOK.md:312; vercel-ignore-build.sh:4-5). Après l'étape 12, le script construit de toute façon (lignes 20 et 31-32). La page garde « décoche si elle est cochée » : inoffensif.
13. **`team-auth.mjs`** charge `@supabase/supabase-js` seulement avec `--apply` (team-auth.mjs:40) ; l'essai à blanc sort avant (ligne 37) et ne prouve donc pas que les dépendances sont installées. Aucune source ne dit d'installer quoi que ce soit avant l'étape 7. Si le module manque, `--apply` échoue sans avoir créé de compte. À confirmer avant le jour.
14. **Étape 3, Resend** : les écrans de Resend ne sont décrits par aucune source ; la page ne donne que ce que les sources imposent (domaine vérifié, SPF et DKIM, pas de MX pour `team`, clé limitée à l'envoi, variable sur `fandomverse`). Les noms de boutons de Vercel (Settings, Domains, Environment Variables, Redeploy, Cron Jobs, Run, View Logs) sont ceux des sources.
