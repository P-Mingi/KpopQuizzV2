# kpopquizz en compte Team : tout ce qui change

Date : 2026-10-27. Recherche en lecture seule : rien n'a été écrit en base, aucun fichier du repo modifié.
Code lu sur `origin/main` (0dcc154) et `origin/o1/integration` (962f4db). Données lues en SELECT sur la prod (rdkgouofytwfdpbxbzio).
Le drapeau v12 est bien allumé en prod : `/u/kpophistory` affiche déjà la pastille Team, `/u/kpopquizz` affiche « Lv 5 · Casual Fan ».

## En bref

- Le geste : une seule ligne dans `public.editorial_accounts` (fichier `kpopquizz-team.sql`, non appliqué). Aucun déploiement.
- Les 130 quiz publiés restent en ligne, dans tous les flux, avec le même auteur, le même lien et le même JSON-LD.
- Le quiz du jour continue tout seul : `ensure_daily_quiz` écrit l'auteur en dur, il ne lit pas la table Team.
- Ce qui se voit : pastille « Team » à côté de kpopquizz, plus de niveau, profil réduit à l'onglet Quizzes.
- Ce qui surprend : kpopquizz **disparaît de 4 classements où il est bien placé** (créateurs « This week » n°1, « All time » n°4, /creators n°4 et n°5 d'octobre), de 7 Hall of fame, et la phrase « The first X quiz was made by kpopquizz » **disparaît de 5 pages groupe**.
- Rien n'est gelé en base : l'XP, les badges et les compteurs continuent. Ils sont seulement cachés.

## Les chiffres du compte aujourd'hui

| Donnée | Valeur |
|---|---|
| username / display name | kpopquizz / KpopQuizz Team |
| créé le | 2026-03-26 |
| quiz | 132 au compteur du profil : 130 publiés, 1 brouillon, 1 retiré ; 104 ont été quiz du jour ; le dernier créé aujourd'hui |
| plays reçues | 3 401 (compteur du profil) ; 98 likes reçus |
| XP / niveau | 453 XP, « Lv 5 · Casual Fan » ; rang joueurs XP : 63e sur 300 (le 10e a 6 185 XP) |
| badges | 11 : founding_fan, creator_silver, marathoner_10, marathoner_50, perfectionist_1, perfectionist_10, quizmaker_1, quizmaker_5, quizmaker_25, reached_100, reached_1000 (dernier le 2026-08-03) ; aucun épinglé |
| abonnés | 1 follower, 0 abonnement ; 0 nouveau follower sur 7 jours |
| parties jouées par le compte | 223 plays (2026-03-26 au 2026-04-15) sur 116 quiz, tous des quiz des 9 comptes Team |
| fil d'activité | 1 événement « quiz_created » par jour (22 sur 30 jours, 2 sur 48 h, sur 1 362 événements visibles) |
| notifications reçues | 91 (77 milestone, 9 badge, 2 comment, 2 new_follower, 1 rating), toutes non lues |
| commentaires, posts communauté, blindtest, ranked, duels, maîtrise | 0 partout |
| auth | le profil a bien un utilisateur auth (obligatoire : `editorial_accounts.user_id` référence `auth.users`) |

## La ligne proposée

- `display_name` = **KpopQuizz Team** : le même texte que le profil, comme les 9 lignes existantes (KpopProf, Nora, Theo... sont tous égaux au display name du profil). Ainsi le H1 du profil reste identique au `<title>` et au JSON-LD.
- `beat` = **Quiz of the day and every group** : même style que les autres (« Girl groups and trivia », « EXO and SHINee »).
- `active` = true.
- Attention au beat : s'il contient « chart », « data », « number » ou « stat », kpopquizz signe tous les brouillons « weekly recap » et sort de la rotation des sujets comeback (`lib/editorial/templates.ts:81` et `:104`). Alternative possible si c'est voulu : `Quiz of the day and site stats`.

## 1. Pastille et affichage

| Où | Avant | Après | Preuve (main ; o1 si différent) |
|---|---|---|---|
| Page de chacun des 130 quiz, ligne auteur | « by kpopquizz · Lv 5 Casual Fan » | « by kpopquizz » + pastille **Team**, sans niveau | `components/quiz/ux-v1/quiz-page.tsx:150-152` (o1 :143-145) ; drapeau lu par `lib/ux-v1/p4/queries.ts:182` (o1 :183) |
| Page quiz, carte « Made by » | « kpopquizz / Lv 5 Casual Fan · 132 quizzes · 3.4K plays » | « kpopquizz Team / 132 quizzes · 3.4K plays » | `quiz-page.tsx:273-277` (o1 :266-270) |
| Avatar sur la page quiz | avatar normal | avatar « team » (initiale) | `quiz-page.tsx:149, 272` |
| Rendu du nom | couleur, police et bias du fan | nom simple + pastille, sans flair | `components/ux-v1/person-name.tsx:67-74` (o1 :71) |
| Profil /u/kpopquizz, H1 | « KpopQuizz Team » | le `display_name` de la ligne Team (« KpopQuizz Team » avec la proposition) + pastille Team | `components/profile/ux-v1/passport.tsx:228-229` (o1 :235) ; `lib/ux-v1/p10/build-passport.ts:48` (o1 :54) |
| Profil, puce de niveau | « Lv 5 · Casual Fan » | « KpopQuiz team » | `lib/ux-v1/p10/passport-model.ts:65, 69-70` (o1 :74, :78) |
| Profil, phrase sous le nom | aucune | « Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live. » | `passport.tsx:247` (o1 :253) ; texte `lib/ux-v1/a0/team.ts:10` |
| Profil, onglets | Overview, Quizzes, Badges (+ History pour le propriétaire) | **Quizzes seulement** | `passport.tsx:103-108, 216` (o1 :108, :222) |
| Profil, barre d'XP | visible | **cachée** | `passport.tsx:249` (o1 :255) |
| Profil, chiffres | streak, groups mastered, quizzes made, plays received | quizzes made (132), plays received (3 401) seulement | `passport.tsx:67, 109` (o1 :72, :114) |
| Profil, ligne meta | groupes, « joined March 2026 », followers | « joined » et followers seulement | `passport.tsx:58-63, 97` |
| Page /search, résultat « People » | kpopquizz avec niveau | kpopquizz + pastille Team, followers seulement | `app/(site)/search/page.tsx:122, 199-206` (o1 :123, :200) |
| Panneau « Fresh quizzes » de /leaderboard | « by kpopquizz » | « by kpopquizz » + pastille Team (quand un quiz du jour est parmi les 6 plus récents ; ce n'est pas le cas à cet instant) | `lib/ux-v1/p9/data.ts:443-446` (o1 :449) ; `components/leaderboard/ux-v1/around.tsx:110-111` |
| Cartes de quiz anciennes (résultats de quiz sur /search, listes legacy) | « by kpopquizz » | **inchangé**, sans pastille | `components/quiz/quiz-card.tsx:61`, `components/ui/quiz-card.tsx:119` (pas de lecture Team) |
| Image OG du profil `/api/og/passport/kpopquizz` | niveau et titre | **inchangé** : garde « Lv 5 » (comme les 9 comptes Team aujourd'hui) | `app/api/og/passport/[username]/route.tsx:95-97` |

## 2. Classements et leaderboards

| Où | Avant (aujourd'hui) | Après | Preuve |
|---|---|---|---|
| /leaderboard, Créateurs « This week » | **n°1** (50 plays sur 4 quiz de 7 jours) | **absent** ; le 2e devient 1er, le 11e entre dans le top 10 | `lib/db/queries/profiles.ts:78-87` (o1 :79) ; `lib/ux-v1/p9/data.ts:330-334` (o1 :333-337) |
| /leaderboard, Créateurs « All time » | **n°4** (3 401 plays) | **absent** ; le 5e devient 4e, le 11e entre | `profiles.ts:153-161` (o1 :154-162) ; `p9/data.ts:332` (o1 :335) |
| /leaderboard, « Rising » (nouveaux followers 7 jours) | absent (0 nouveau follower) | absent, aucun effet visible | `lib/db/queries/community.ts:39-42` (o1 :43) |
| /leaderboard, Joueurs XP | 63e, hors du top 10 affiché | exclu ; aucun effet visible (lecture de 20 lignes au lieu de 15) | `p9/data.ts:246-249, 217-218` (o1 :250-252) ; legacy `profiles.ts:187-195` |
| /creators (règles G8), « All time » | **n°4** (3 379 plays comptées) | **absent** ; le 11e entre dans le top 10 | `lib/creators/data.ts:77-82, 108` (o1 :79, :109) |
| /creators, mois d'octobre | **n°5** (540 plays comptées) | **absent** ; le 11e entre dans le top 10 | même code |
| /creators, « Rising in each fandom » | jamais (premier quiz en mars) | jamais | `lib/creators/board.ts:121-136` |
| Plays jouées PAR kpopquizz (223) dans /creators | elles comptent déjà pour rien : tous ces quiz sont à des comptes Team, déjà exclus | aucun changement | `board.ts:67` ; `creators/data.ts:81` |
| Hall of fame des quiz (top 10 par quiz) | kpopquizz figure dans le top 10 de **7 quiz** (top 3 sur 2, **1re place sur 1**), tous des quiz de comptes Team | **retiré** de ces 7 tableaux, les fans en dessous montent d'un rang | `lib/ux-v1/p4/queries.ts:146-147` (o1 :148) ; legacy `community.ts:116, 130` (o1 :131) |
| « #N of M players » après une partie (116 quiz qu'il a joués) | kpopquizz compté dans M | M baisse de 1, les fans classés sous lui gagnent 1 rang | `lib/editorial/surfaces/quiz-rank.ts:25-28` + fonctions SQL `get_quiz_rank_v12` / `get_quiz_rank_for_score_v12` (déjà en prod, appel `is_editorial`) |
| Hall of fame des 130 quiz de kpopquizz | kpopquizz n'y joue pas (0 partie sur ses quiz) | **inchangé** : l'exclusion vise les joueurs Team, pas l'auteur | même code |
| « Your standing » des autres fans | kpopquizz compté au-dessus de 92 créateurs et de 237 joueurs | ces fans gagnent 1 rang affiché | `lib/ux-v1/p9/standing.ts:72-83` (o1 :73) |
| Fandom war | 0 partie sur 14 jours | aucun effet | `lib/editorial/surfaces/war.ts:37-47` + `get_fandom_war_map_v12` |
| Blindtest du jour, ranked, top fans de groupe (maîtrise) | 0 ligne | aucun effet | `app/(site)/blindtest/leaderboard/page.tsx:97-98`, `lib/ux-v1/p6/board.ts:49-55`, `lib/ranked/view.ts:134-138`, `lib/db/queries/group-hub.ts:102-109` |

## 3. XP, niveaux, badges

| Sujet | Avant | Après | Preuve |
|---|---|---|---|
| XP en base | 453, peut monter | **continue pareil** : aucune règle ne gèle l'XP d'un compte Team (les 9 comptes Team ont 4 932 à 14 368 XP) | aucune fonction d'XP ne lit `editorial_accounts` ; en base, seules `get_quiz_rank_v12`, `get_quiz_rank_for_score_v12`, `get_fandom_war_map_v12` appellent `is_editorial` |
| Niveau affiché | « Lv 5 · Casual Fan » sur profil et pages quiz | **caché** partout sauf l'image OG | voir section 1 |
| 11 badges | visibles dans l'onglet Badges | **gardés en base, plus visibles** (pas d'onglet Badges, pas de badge épinglé) | `passport.tsx:103, 216` ; `build-passport.ts:48` |
| Nouveaux badges | apparaissent dans « Badge watch » | gagnés en base mais **cachés** de « Badge watch » et du rail communauté | `community.ts:471-486` (o1 :493) ; `lib/ux-v1/p8/rail.ts:181-182` (o1 :182-183) |
| SYSTEM.md 5.6 | dit « no XP, streak, badge » pour un compte Team | le code ne l'applique pas : l'XP et les badges restent, ils sont juste cachés | `docs/design/growth-v12/SYSTEM.md:232-246` |

## 4. Règles des comptes Team

| Règle | Effet pour kpopquizz | Preuve |
|---|---|---|
| Ne peut plus agir comme un fan dans la communauté : like, réponse, vote de débat, débat, défi | refusé (403 `editorial_account`) si quelqu'un se connecte avec ce compte ; aujourd'hui il n'en fait aucun | `app/api/ux-v1/p8/like/route.ts:88`, `replies/route.ts:66` (o1 :67), `challenges/route.ts:36`, `debates/route.ts:37`, `debate-vote/route.ts:38` |
| Duels « This or that » | plus de paires servies, vote refusé ; il n'a jamais voté | `lib/duel/service.ts:89, 129` ; `lib/duel/server.ts:167` |
| Parties invitées rattachées à la connexion | refusé (rien n'est rattaché) | `app/api/claim-runs/route.ts:64` |
| Suivi blindtest | événements ignorés | `app/api/track/bt-run/route.ts:151` |
| Widget « standing » du compte lui-même | répond comme un compte déconnecté | `app/api/creators/standing/route.ts:52` |
| Créer des quiz en direct | **toujours permis** : aucun code (main ou o1) n'oblige un compte Team à passer par le pipeline pour les quiz ; les 9 comptes Team ont déjà 155 quiz | aucune garde dans la création de quiz ; o1 `012-editorial-quiz.sql` ajoute des brouillons « quiz » pour le bureau anime, sans bloquer la création directe |
| **Quiz du jour (banque)** | **aucune dépendance au statut Team** : la fonction écrit l'auteur en dur (l'id système fixe du profil kpopquizz), sans lire `editorial_accounts` | `supabase/migrations/042_fix_ensure_daily_quiz.sql:62` (fonction en prod identique, seule fonction qui contient cet id) ; o1 : `docs/pending-migrations/multisite/009-daily-prep.sql:55` et `010-daily-v2.sql:132` (`sites.system_user_id` = le même id) |
| Pipeline éditorial (sujets, débats, blogs) | kpopquizz devient un auteur possible pour un brouillon, et la règle « jamais deux de suite du même compte » le compte comme un compte de plus | `lib/editorial/pipeline.ts:50, 60` ; `lib/editorial/rules.ts:50, 62` |
| Brouillons automatiques « comeback » | la rotation passe de 9 à 10 comptes : **les futurs sujets sont redistribués** et kpopquizz en signe environ 1 sur 10 (les brouillons déjà créés gardent leur auteur) | `lib/editorial/templates.ts:103-105` ; `lib/editorial/admin-api.ts:40-48` |
| Brouillon « weekly recap » | reste à KpopProf (premier compte actif), car aucun beat ne contient chart/data/number/stat | `templates.ts:28-32, 81` |
| Suppression du compte | déjà protégé (profil système) | `docs/pending-migrations/account-deletion.sql:117, 143` ; o1 en plus `lib/passport/deletion/account.ts:134` (refus « staff_account ») |
| Plafond technique | la liste Team est lue avec `limit(50)` : 10 lignes après l'ajout (41 si les 31 comptes anime d'o1 arrivent) | `lib/editorial/accounts.ts:22` |

## 5. Notifications

| Sujet | Effet | Preuve |
|---|---|---|
| Notifications « X replied / commented » vers kpopquizz | plus envoyées ; il n'a aucun post ni commentaire, donc rien ne change | `lib/ux-v1/p8/notify.ts:75` (o1 :76) |
| Milestones, badges, commentaires de quiz vers kpopquizz | **continuent** (déclencheurs SQL, pas de garde Team) ; 77 milestones non lus aujourd'hui | aucune lecture Team dans ces chemins |
| Pastille Team dans la cloche des autres fans | sur les notifications dont le lien est `/u/kpopquizz` : **0 aujourd'hui** | `lib/ux-v1/p11/team.ts:15` ; `components/notifications/ux-v1/notifications-page.tsx:91, 241` ; `bell-panel.tsx:91` ; liste fournie par `app/api/ux-v1/p11/team/route.ts:18` |

## 6. SEO et JSON-LD

| Sujet | Effet | Preuve |
|---|---|---|
| JSON-LD `Quiz` des 130 pages : `author` | **inchangé** : `Person`, name « kpopquizz », url `/u/kpopquizz` (passer en `Organization` serait un changement de code à part) | `app/(site)/q/[slug]/page.tsx:415-419` (o1 :385-389) |
| Meta description des quiz « ... quiz by kpopquizz » | inchangée | `q/[slug]/page.tsx:247` |
| /u/kpopquizz : title, description, JSON-LD `ProfilePage` / `Person` | inchangés (ils lisent le display name du profil, pas la ligne Team) ; avec la proposition « KpopQuizz Team », le H1 reste égal au title et au JSON-LD | `app/(site)/u/[username]/page.tsx:68-74, 194-197` (o1 :55-61, :167-170) |
| /u/kpopquizz : contenu HTML | moins de texte servi : plus d'Overview, de Badges ni d'historique ; une phrase Team en plus ; reste indexable (132 quiz, seuil 3) | `passport.tsx:103, 216, 247` ; `u/[username]/page.tsx:74` |
| Pages groupe : « The first X quiz was made by kpopquizz. » | **disparaît sur 5 hubs** : ASTRO, GOT7, MAMAMOO, MONSTA X, NCT (aucun autre créateur non Team n'y a fait un quiz, donc la phrase n'est pas remplacée) ; un lien interne vers /u/kpopquizz de moins par hub | `lib/ux-v1/p3/growth-data.ts:90-97, 138, 149` (o1 :99, :141) ; `components/group/ux-v1/hub-growth.tsx:106-108` |
| Sitemap, llms.txt, robots | inchangés (/u/ n'est pas dans le sitemap) | `app/sitemap.ts:212` |

## 7. Fil d'activité et compteurs

| Où | Effet | Preuve |
|---|---|---|
| « Happening now » (communauté, /leaderboard) | les lignes « kpopquizz created a ... quiz » **disparaissent** (1 par jour) ; le seuil de vie (4 événements en 48 h) n'est pas menacé : 1 362 événements visibles | `lib/db/queries/community.ts:313-336` (o1 :343) ; `p9/data.ts:474-497` (o1 :481) |
| Bandeau d'activité de l'accueil `/api/activity/recent` | idem, retiré | `app/api/activity/recent/route.ts:49-67` (o1 :51) |
| Rail « live activity » de la communauté | idem, retiré | `lib/ux-v1/p8/rail.ts:116` (o1 :117) |
| « Fans online » de l'accueil | aucun effet (aucune partie récente) | `app/api/stats/live/route.ts:21-23` |
| Weekly recap « most played quiz » | un quiz de kpopquizz peut toujours être cité | `lib/editorial/template-data.ts:69-90` (pas de filtre Team) |
| Recherche rapide `/api/search` (creators, people) | kpopquizz **n'apparaît plus** dans la liste déroulante | `app/api/search/route.ts:26-42` (o1 :27-43) |

## 8. Ce qui ne change pas

- Les 130 quiz restent publiés, dans les flux, les hubs, la recherche de quiz, le sitemap ; aucun quiz ne sort d'une liste (aucun filtre sur l'auteur des quiz, sauf les classements de créateurs).
- Le quiz du jour et la banque (lots 1 à 3) : même auteur, même fonction, même cron.
- Les compteurs du profil (quiz, plays, likes reçus, followers) et le bouton Follow sur kpopquiz.org.
- L'XP et les badges en base.

## 9. Branche o1/integration : différences

- Même logique Team sur toutes les surfaces ci-dessus (seuls les numéros de ligne bougent).
- En plus sur o1 : refus de follow vers ou depuis un compte Team, **seulement sur un site monde** (anime), pas sur kpop : `app/api/follow/route.ts:19, 58`.
- En plus sur o1 : refus de suppression « staff_account » : `lib/passport/deletion/account.ts:134`.
- En plus sur o1 : « Top fans » du hub exclut tout compte Team (actif ou retiré) : `lib/site/hub/data/top-fans.ts:93`.
- En plus sur o1 : l'admin éditorial filtre les comptes par site (`lib/editorial/store.ts:43`) ; la migration `multisite/002a-site-columns.sql:44` ajoute `editorial_accounts.site_id` (défaut 'kpop'). Le SQL proposé ne nomme pas site_id et marche avant comme après.
- Précédent sur o1 : l'auteur du quiz du jour d'OtakuQuiz (`otakuquiz_team`) est déclaré Team dès son lancement (`multisite/launch/L02-K2-team-accounts.sql`). Déclarer kpopquizz Team aligne les deux sites.
- Sur o1, `getTeamIds()` n'est pas filtré par site (`lib/editorial/accounts.ts` identique à main) : les 31 comptes anime compteront aussi comme Team sur kpop ; sans effet pour kpopquizz.

## 10. Délai et retour arrière

- Délai d'apparition : liste Team en cache 5 min (`lib/editorial/accounts.ts:30`), pages profil et quiz en ISR 1 h (`u/[username]/page.tsx:29`, `q/[slug]/page.tsx:42`), classements 5 min à 1 h, phrase « first quiz » des hubs jusqu'à 6 h (`CACHE_TTL.catalog` = 21 600 s).
- Retour arrière : `kpopquizz-team-rollback.sql` supprime la ligne (refusé si un brouillon ou un post éditorial utilise déjà kpopquizz). Mettre `active = false` ne suffit pas : une ligne retirée compte encore comme Team pour les duels (`lib/duel/server.ts:167, 222`, `lib/duel/weekly-splits.ts:35`), les anciens posts (`lib/ux-v1/p8/people.ts:75`) et, sur o1, Top fans et suppression.

## 11. À décider avant le go

1. Accepter que kpopquizz quitte les classements de créateurs où il est n°1 (semaine) et n°4/n°5 : c'est le but (« Team accounts are on no board »), mais c'est le changement le plus visible.
2. Accepter la perte de la phrase « first quiz » sur 5 hubs (ASTRO, GOT7, MAMAMOO, MONSTA X, NCT).
3. Le beat : « Quiz of the day and every group » (kpopquizz entre dans la rotation des sujets comeback) ou « Quiz of the day and site stats » (kpopquizz signe les weekly recaps à la place de KpopProf et sort des comebacks).
4. Le display_name : « KpopQuizz Team » (H1 = title = JSON-LD, mais « KpopQuizz Team » + pastille « Team » répète le mot) ou un autre nom court.
5. Hors de ce SQL, à part si voulu : JSON-LD `author` en `Organization` pour les comptes Team, et image OG sans niveau.
