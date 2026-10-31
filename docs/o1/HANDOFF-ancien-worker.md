# Passation de l'ancien worker à O1 (2026-10-31, relevés de 10 h 45 UTC)

Décision du propriétaire : O1 devient le seul worker. Ce fichier dit tout ce qu'il faut pour reprendre. Tout ce qui est marqué « relevé » a été lu en lecture seule, sans aucune valeur secrète.

## 1. Où on en est

- `main` = `6f6b302` (#173, #174, #175, #176 fusionnées). Production kpopquiz Ready sur ce commit.
- **Étape 8 : pas faite côté Vercel.** Le propriétaire l'a annoncée faite deux fois, mais aucun Redeploy n'existe après ceux, annulés, du 30/10 à 15 h 12 et 15 h 13 UTC. Voir section 3.
- **Session B : pas commencée.** Elle attend un V9 vert.
- Correctif SQL de sécurité : appliqué par l'intégrateur le 30/10, voir section 7.

## 2. Les trois PR ouvertes

Aucune n'a de commentaire de relecture. La CI est verte sur les trois (`CLEAN`). Toutes sont sur `6f6b302`. Le merge revient au propriétaire : pas de merge sans son go.

### #177 ADMIN-1, `o1/admin-lock`, tête `90c38d4`

- `requireAdmin()` (`lib/admin/guard.ts`) : jeton vérifié par le serveur d'auth, id dans `ADMIN_USER_IDS`, aal2, facteur vérifié. Tout le reste répond 404.
- Reste à faire : relecture d'O1 et de l'intégrateur, puis merge par le propriétaire.
- Fichiers d'O1 à relire : lignes de contrat 43, 44, 45 (`twins.json`, `TWINS.md`), `ENV.md`, `RUNBOOK.md` (K5.3c, K9, J4, K5 étape 4), `OWNER-NOW.md` (23, 45, 52). `scripts/o1/check.sh` reste rouge contre la copie figée d'O1 (3 violations) tant que ces lignes n'y sont pas.
- Pas lancés : les specs Playwright `g1` et `g9` modifiées.
- Restent à faire : une fixture aal2 pour `e2e/o1/ADM/images-api.o1.ts` et pour l'admin de la fixture dev-login. `adminGate` de `lib/anime/admin-tabs.ts` n'est plus utilisé, gardé pour ses tests.
- Conséquence voulue : les 6 crons en GET qui acceptaient une session admin (`pulse-generate`, `mv-snapshot`, `spotify-snapshot`, `verse-refresh`, `verse-role-decay`, `api/qotd/publish`) exigent la même origine avec une session. On ne les lance plus en tapant l'adresse. `CRON_SECRET` ne change pas.
- La relecture de sécurité indépendante a porté sur le code. Elle n'a rien exécuté en réel : voir section 5.

### #178 lot K1, `o1/k1-idols`, tête `3a4790d`

- `021a-k1-idol-gender-debut.sql` : 200 genres, 153 années de début, 644 lignes `entity_sources`. `021b-k1-idol-activate.sql` : liste vide, personne n'est activé.
- Répétition : 42 PASS, 0 FAIL. Sur la photo du 30/10 (dates de naissance fictives) : `V-K1a` et `V-K1b` ok, 87 idols actives adultes complètes, 116 actives inchangées.
- Reste à faire : relecture d'O1 de `session-rehearsal.sh`, puis merge. `session.sh` s'arrête en partie G sans ces fichiers sur `main`.
- Texte à reprendre par O1 : `OWNER-NOW`, ligne 14e bis de `SQL-ORDER`, G1 du `RUNBOOK` disent encore « les idols choisies par le propriétaire ».
- **Décision du propriétaire :** personne n'est activé avant le lancement, car activer change les pages gelées de kpopquiz.org (jeux « name all », statistiques, sitemap, pages de groupe). L'activation vient après le lancement, dans la PR kpopquiz d'après-lancement. Règle : adultes dont le genre et l'année de début concordent ; jamais 52, 53, 54, 179, 198, 199, 147, 197.
- **À regarder à ce moment-là :** cette règle donne 30 « oui », dont 16 à problème : 10 anciens membres de ce groupe selon au moins une source, et 8 fiches de 5 personnes présentes sur une autre fiche, 2 fiches étant dans les deux cas. Les 14 autres sont dans `K1-RELECTURE.md`, et le statut de 3 d'entre eux reste à vérifier.
- Ouvert aussi : 21 idols actives sans année de début (sources en conflit), hors du jeu pour l'instant. Selon les deux sources, 2 idols actives ne sont plus membres. 2 idols actives n'ont pas de nationalité.
- La liste détaillée est `docs/strategy/o1/dle/K1-RELECTURE.md`, hors git, dans le dossier principal.

### #179 lot A1, `o1/a1-characters`, tête `a24a612`

- `launch/L13-A1-character-facts.sql` : 118 personnages complets sur 120, 50 démographies, 570 lignes de sources. Réponses du propriétaire appliquées. Répétition : 43 PASS, 0 FAIL.
- Reste à faire : relecture d'O1, merge, puis les contrôles 4 et 5 de `V-L13`, qui attendent la migration 023.
- Pour O1 :
  - Goku `saiyan`, Nezuko `demon`, Denji `hybrid` s'écartent de la règle du contrat (l'espèce montrée d'abord), par décision du propriétaire. Un CR est peut-être nécessaire.
  - Muzan `male` repose sur le « he » de Wikipedia alors que Wikidata dit « non divulgué ». Urahara `human` est déduit de « owner of the Urahara Shop ».
  - L04 n'a pas de `seasons` pour One Piece, Naruto, Dragon Ball et Bleach. Si 023 suit le contrat à la lettre, ces séries n'ont pas de studio : 88 cibles sur 118.
  - One Piece et Black Clover n'ont que 6 personnages dans le pool, trop peu pour un Otakudle par série.
- La liste détaillée est `docs/strategy/o1/dle/A1-RELECTURE.md`, hors git.

`session-rehearsal.sh` est identique à l'octet près sur #178 et #179 : les deux passent dans n'importe quel ordre. Leur fusion testée en local donne 43 PASS, 0 FAIL.

## 3. Étape 8 puis V9

**Relevé :** `otakuquiz` et `fandomverse` n'ont aucun déploiement de production Ready. Dernières lignes : `dpl_EhcYmqqnr1Cui2ABjEgS7D2jS4mx` et `dpl_GFB6buCC4Yhw2pXnzu7zvCQYZw9Y`, source `git`, `6f6b302`, annulées par `NET_PRODUCTION_HOLD`.

**Ce que le propriétaire doit faire :** dans `otakuquiz`, Deployments, redéployer une ligne Production (Canceled), pas une Preview (Error). Décocher « Use project's Ignore Build Step », cliquer sur le bouton Redeploy de la fenêtre, voir la page du nouveau déploiement en Building. Puis pareil dans `fandomverse`. Ordre : `ARCHITECTURE-BUNNYVERSE.md`, section 5.

- La consigne donnée était la ligne `76927f7`. La production kpopquiz étant passée à `6f6b302`, qui contient #174, je recommande la ligne `6f6b302`, à confirmer avec le propriétaire.
- **Point non prouvé :** la doc Vercel dit que le `ignoreCommand` de `vercel.json` remplace le réglage du projet. Elle ne dit pas si la case du Redeploy couvre aussi ce script. Les essais de 15 h 12 et 15 h 13 tombent aux minutes où la clé a été ajoutée : c'était probablement la proposition de redéploiement de Vercel, case cochée. Si un essai, case décochée, finit Canceled avec « production is held until launch (K5b) », il faut une petite PR : `vercel-ignore-build.sh` lit la pause dans une variable Vercel au lieu de la valeur écrite en dur.

**Déjà vérifié pour V9 et H8, sans build (relevé) :**

- Les trois projets : racine `apps/quiz`, Node 24.x, branche de production `main`, protection `all_except_custom_domains`.
- Groupe Microfrontends `fandomverse`, `fandomverse` application par défaut, `otakuquiz` sur `/anime`.
- `SUPABASE_SERVICE_ROLE_KEY` : Production, Sensitive, sur `fandomverse` et `otakuquiz`, en variables de projet. `ENV.md` 1.1 parle encore d'une variable partagée : à corriger.
- Variables de `ENV.md` 1.1 à 1.3 présentes en Production, `ADMIN_USER_IDS` seulement sur `otakuquiz` (normal), rien de 1.4 ni de 1.6.
- kpopquiz.org : accueil 200, `/auth/authorize` 404, données structurées présentes.

**Ce qui reste de V9, une fois les deux projets Ready** (commandes dans `VERIFY.md`, section V9) :

- Le hub sur `/`, OtakuQuiz sur `/anime` : home 200, authorize 404, `application/ld+json`, titres Bunnyverse et OtakuQuiz.
- Noindex : meta et `X-Robots-Tag`.
- `check:env` qui passe dans le journal de build de chaque projet.

Les adresses `.vercel.app` sont protégées. `get_access_to_vercel_url` (MCP Vercel) donne un lien de partage de 23 h, qui pose le cookie `_vercel_jwt`.

Lectures faites avec `vercel api` en GET seulement. La sortie commence parfois par une ligne `<claude-code-hint`, à retirer avant de lire le JSON.

## 4. Session B

Fenêtre : l'heure la plus calme du propriétaire, jamais entre 23 h 50 et 00 h 30. Détail : `OWNER-NOW.md` partie 3 et `RUNBOOK.md` B. Aucune écriture en production par un agent.

1. **Sauvegarde et go.** Le dossier principal est sur `mission-u/bank-tools` et `session.sh` refuse hors de `main`. Le propriétaire fait `git checkout main && git pull --ff-only`, puis l'étape 9 (sauvegarde Supabase et `pg_dump`, chaîne de connexion tapée par le propriétaire seul), puis envoie « go B ». Rien en SQL avant ce go. Vérifier que le dump se relit : `pg_restore --list`.
2. **Avant B1 :** V0 dans `~/kpq-launch/v0.txt`, les 12 signatures dans `~/kpq-launch/functions-before.txt`, photo V1 dans `~/kpq-launch/before` (`VERIFY.md` V0 et V1).
3. **`bash docs/launch/o1/session.sh B1`** (001, 002a à 002d). Juste après, le propriétaire crée un quiz jetable sur kpopquiz.org, vérifie qu'il s'enregistre et le supprime. V2.
4. **`SITE_SCOPE=1` sur kpopquiz**, Redeploy sans cache. **Veille de 1 h :** V1 identique, Runtime Logs calmes, V2 et V3. Confirmer pendant cette veille que `passport` n'est pas dans les schémas exposés.
5. **`bash docs/launch/o1/session.sh B2`** (003). Juste après, en fenêtre privée, le propriétaire inscrit un compte jetable et termine l'accueil. Il donne le nom d'utilisateur pour la vérification V3. Garder ce compte jusqu'à l'étape 23.
6. **`bash docs/launch/o1/session.sh B3`** (004 à 007).
7. **Fermeture :** nouvelle photo V1 et comparaison. **Veille de 24 h** (`RUNBOOK` C) : V1, comptes de `quizzes` en hausse, pas de nouvelle sorte d'erreur, audit des compteurs de V0 pas au-dessus de sa base.

Vérifications :

- `session.sh` joue lui-même `docs/launch/o1/checks/V-*.sql` après chaque fichier, et écrit le détail dans `~/kpq-launch/logs`.
- Les requêtes V2 et V3 sont dans `VERIFY.md`. Les lancer en lecture seule sur `rdkgouofytwfdpbxbzio` (MCP Supabase `execute_sql`, jamais `apply_migration`).
- Runtime Logs : MCP Vercel `get_runtime_logs` avec `group_by` ou `deploymentId`. `get_runtime_errors` ne remonte pas les lignes `error/function` du type `fetch failed` : regarder aussi les logs.
- Répétition sur base locale : `bash docs/launch/o1/session-rehearsal.sh --prod-copy ~/kpq-o1/prod-public.sql`.

## 5. ADMIN-1 après la fusion de #177

Tout est dans `docs/o1/admin/MFA-OWNER.md` (sur la branche jusqu'au merge). **Dès le déploiement, plus aucun admin n'entre tant que l'inscription n'est pas faite.**

1. Vérifier Supabase : Authentication, Multi-Factor, TOTP actif.
2. Poser `ADMIN_MFA_ENROL_OPEN=1` en Production sur `kpopquiz`, redéployer. `MFA-OWNER.md` dit que ce projet seul suffit : le code vaut aussi pour OtakuQuiz, où il faut seulement retaper les 6 chiffres. Une preview tourne sur `o1-dev` et demande sa propre inscription.
3. Le propriétaire s'inscrit avec deux applis (téléphone et gestionnaire de mots de passe). Tout id de `ADMIN_USER_IDS` doit être inscrit ou retiré de la liste.
4. Retirer la variable, redéployer. Tant qu'elle est posée, un mot de passe volé suffit à inscrire un facteur sur un compte qui n'en a pas.

**Reste à prouver sur Vercel (section 8 de `MFA-OWNER.md`), jamais exécuté en réel :**

- Une vraie inscription TOTP et un passage en aal2. Les tests utilisent de vraies bibliothèques auth-js, mais un serveur d'auth simulé.
- `ADMIN_USER_IDS` et `ADMIN_MFA_ENROL_OPEN` lus par le middleware déployé. S'ils ne sont pas visibles, un vrai admin reçoit un 404.
- Le POST MFA d'OtakuQuiz derrière les Microfrontends (`sameOrigin` avec `x-forwarded-host`).
- `x-matched-path` sur Vercel, qui pourrait trahir la route attrape-tout sous `/api/admin`.
- La requête de la section 7 de `MFA-OWNER.md` : les comptes de la liste ne doivent pas avoir de rôle `curator` ou `space_admin`, qui garderait un pouvoir sans aal2.

Les agents ne créent aucun compte et ne manipulent aucun mot de passe ni code TOTP. ADMIN-2 n'est qu'un plan : `docs/o1/admin/PLAN-ADMIN-2.md`. L'inventaire `docs/o1/admin/INVENTAIRE.md` attend les coches du propriétaire.

## 6. Points fragiles connus

### Le comparateur local des 60 pages (`scripts/o1/parity.sh`)

- Bruit déjà vu sans changement de code : `/blindtest/group-bts` (ordre des lignes Flight), `/leaderboard` (aussi différent sur le contrôle sans changement `c06ae97` ; bloc « Fresh quizzes » ou « 15d » contre « 16d ago »), un `/q/` isolé, `/about` (bloc de chiffres perdu sur une lecture de prod de plus de 8 s).
- Toute autre page doit être expliquée.
- Lire le verdict de `result.txt` et le code de sortie. L'étape brute peut signaler des pages que les normalisations du juge effacent.
- Si `node_modules` d'O1 n'a pas `@vercel/microfrontends`, passer par une copie temporaire du script pointant sur le dossier de travail, à supprimer ensuite.
- Résultats en cache : `~/kpq-o1/cache/parity/<base12>-<head12>-*`. Une seule exécution à la fois.

### V1 entre deux déploiements de production

`VERIFY.md` compare deux photos prises avant et après. Si la photo d'avant manque, on compare l'ancien déploiement à kpopquiz.org :

1. `curl -c jar.txt` sur le lien de partage de l'ancien déploiement pour obtenir le cookie.
2. Deux relais locaux, voir ci-dessous : l'un vers l'ancien déploiement avec `jar.txt`, l'autre vers `https://kpopquiz.org` avec un fichier vide.
3. `apps/quiz/e2e/ux-v1/helpers/flag-off-diff.mjs --a <relais A> --b <relais B> --out <dossier> <URLs de apps/quiz/e2e/o1/parity/urls.txt>`, puis `scripts/o1/parity/compare.mjs` avec les mêmes origines.

Deux déploiements diffèrent toujours par leur id (`data-dpl-id`, `?dpl=`) : le relais le remplace par un même jeton. Ne garder que les différences non numériques, puis les expliquer. L'ancien déploiement sert des pages en cache plus vieilles : plus l'écart est grand, plus il y a de chiffres et d'ordres de quiz différents (11 à 21 pages sur 60 vues). L'onglet « Home » actif d'un seul côté vient de la page régénérée contre la page du build : particularité connue.

```js
// node relay.mjs <port> <origine cible> <fichier cookies curl>. GET et HEAD seulement.
import http from 'node:http';
import fs from 'node:fs';
const [port, target, jar] = process.argv.slice(2);
const cookie = fs.readFileSync(jar, 'utf8').split('\n').filter((l) => l && (!l.startsWith('#') || l.startsWith('#HttpOnly_')))
  .map((l) => l.split('\t')).filter((f) => f.length >= 7).map((f) => `${f[5]}=${f[6]}`).join('; ');
http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  try {
    const r = await fetch(target + req.url, { redirect: 'manual', headers: { cookie, 'user-agent': req.headers['user-agent'] || 'v1-relay' } });
    const h = {};
    r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie'].includes(k)) h[k] = v; });
    if (h.location) h.location = h.location.replace(target, `http://127.0.0.1:${port}`);
    res.writeHead(r.status, h);
    let body = Buffer.from(await r.arrayBuffer());
    if (/text|javascript|json|x-component|xml/.test(h['content-type'] || '')) body = Buffer.from(body.toString('utf8').replace(/dpl_[A-Za-z0-9]{20,40}/g, 'dpl_<deployment>'));
    res.end(body);
  } catch (e) { res.writeHead(502); res.end(String(e)); }
}).listen(Number(port), '127.0.0.1');
```

### Le 404 de `/admin`

- **Hub :** `/admin` répond 404, noindex, no-store, sans texte admin, mais ses octets diffèrent d'une adresse inconnue (13 194 contre 12 470 : le layout du groupe `(anime)` répond, comme sur `main`). Laissé tel quel, décision du propriétaire attendue.
- **kpop :** `/admin.rsc` n'a pas `X-Robots-Tag` et porte `s-maxage=3600`, mais ne nomme rien.
- **Une comparaison instable :** un premier build kpop a raté 7 comparaisons d'octets (63 octets, position de la meta robots, visiteur connecté et inscription ouverte). Un second build du même commit a passé. Pas reproduit.
- **Serveur froid :** son premier 404 diffère de 63 octets d'un 404 chaud : réchauffer avant de comparer.

### Autres

- `zones.test.ts` ne se charge pas sur une branche dont `node_modules` est lié à une copie sans `@vercel/microfrontends`. Il n'échoue pas à cause du code testé.
- Chaque push sur `main` crée sur `otakuquiz` et `fandomverse` une Preview en ERROR (27 s environ) : `NEXT_PUBLIC_SUPABASE_*` n'existent en Preview que pour `o1/integration`. kpopquiz n'en a pas, d'où mon hypothèse, non confirmée par la doc : c'est le groupe Microfrontends qui les crée. Le correctif en clics (les variables pour toutes les branches) ferait deux vrais builds de plus à chaque push, 200 s chacun. Je recommande 3 lignes dans `vercel-ignore-build.sh` qui sautent ces Preview. Rien n'est changé.

## 7. Encore ouvert

**Sécurité**

- Règles ouvertes fermées le 30/10 par l'intégrateur : `songs` et `blind_test_songs` en lecture seule pour le public, 4 tables Pinterest fermées. Relevé du 31/10 : aucune ligne perdue (4 291, 349, 217 pins, 219 cartes). Le SQL appliqué n'est pas dans le dépôt, à noter dans le `LEDGER`.
- Nettoyage sans urgence : ces deux tables et 4 autres tables `pinterest_*` gardent des droits SQL pour `anon` et `authenticated`, sans effet par l'API.
- `/admin/songs` ne peut plus écrire jusqu'au déploiement de #177 (normal).
- `byeol_daily_caps` et `byeol_reward_history` : un utilisateur connecté écrit ses propres lignes. À regarder après le lancement (décision du propriétaire).

**Côté propriétaire, je ne sais pas si c'est fait**

- Révoquer l'accès de l'appli Pinterest : le jeton de rafraîchissement a été lisible.
- Supprimer la variable partagée d'équipe `SUPABASE_SERVICE_ROLE_KEY`, stockée en lisible et liée à aucun projet.
- Supprimer `ADMIN_PASSWORD` de kpopquiz : aucun code ne la lit.
- Badge « Needs Attention » de kpopquiz : l'API donne `readable-secret` sur 11 entrées, envoyées au propriétaire. Le texte exact de l'écran n'a pas été relevé. Rien à changer avant le lancement.

**Travail**

- #137 (301 ILLIT) attend le collage n° 7 du propriétaire. #108, #111, #113, #116 (SEO Mission 3) et #30 sont encore ouvertes, pas touchées ici.
- `/fr/credits` attend les pages françaises du Terrier (étape 4).
- `lib/site/hub/daily-guess.ts` lit `dailyGuess` avec une conversion de type : à retirer, `dailyGuess` est sur `main` depuis #170.
- `mission-u/bank-tools` : ne rien pousser (décision du propriétaire). Ses 7 commits locaux sont identiques à ceux de GitHub, déjà fusionnés par #101.

## 8. Mes dossiers de travail et branches

| Dossier | Branche | Quoi en faire |
|---|---|---|
| `.worktrees/admin` | `o1/admin-lock` | garder jusqu'au merge de #177, puis supprimer |
| `.worktrees/k1` | `o1/k1-idols` | garder jusqu'au merge de #178, puis supprimer |
| `.worktrees/a1` | `o1/a1-characters` | garder jusqu'au merge de #179, puis supprimer |
| `.worktrees/handoff` | `o1/handoff-old-worker` | supprimer après le merge de cette PR |
| `.worktrees/sql-b` | `o1/session-b` | **à supprimer** : aucun commit, sur `da2f1cd`. La session B se joue depuis `main` avec `session.sh` |

- Suppression : `git worktree remove --force <dossier>` (les fichiers ignorés bloquent sinon), puis `git branch -D <branche>`. Disque à 89 % le 30/10 : ces dossiers ont leurs `node_modules`.
- Le dossier principal reste sur `mission-u/bank-tools` jusqu'à ce que le propriétaire passe sur `main`.
- `Bloom/.claude/launch.json` : l'entrée `admin-lock` (:3066) est à retirer avec `.worktrees/admin`.
- Les autres branches `o1/*` locales ne sont pas à moi.
- Hors git, à garder : `docs/strategy/o1/dle/K1-RELECTURE.md` et `A1-RELECTURE.md`.
- Aucune surveillance en fond ne tourne de mon côté. Les preuves sont dans `docs/proofs/` de chaque branche. Mes fichiers temporaires disparaissent avec ma session.
