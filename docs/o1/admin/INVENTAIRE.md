# ADMIN-0 : inventaire de l'admin (2026-10-30)

Ordre du owner (2026-10-30) : un seul admin pour les trois sites plus tard, supprimer l'inutile, protéger par MFA et 404.
Ce fichier est un inventaire. Il ne change aucun code et ne lance aucune requête.

Base lue : `main` e580242, plus la branche non fusionnée `origin/o1/step2-photos` (PR #174, 4ff64c3) pour l'onglet Photos et ses 3 routes.
Chemins de code relatifs à `apps/quiz/src/` sauf mention contraire.

## Comment lire

- **MW** : le middleware (`lib/supabase/middleware.ts:19`) envoie un visiteur sans session de `/admin/**` vers `/login?returnTo=...` (302). Il ne couvre pas `/api/`.
- **S** : la session est lue côté serveur par `auth.getUser()` (vérifiée par Supabase). Aucun `getSession` ni `getClaims` dans l'app.
- **A** : `isAdmin(id)` = l'id est dans la variable `ADMIN_USER_IDS` (`lib/admin.ts:1`). Pas de MFA, pas de rôle en base.
- **svc** : lu ou écrit avec la clé service (la RLS ne s'applique pas). **jwt** : avec le JWT de l'utilisateur (la RLS s'applique).
- **-> /** : redirection vers l'accueil. **404 site** : la page 404 du site.
- Toutes les lignes dépendent de `ADMIN_USER_IDS`. Toute écriture svc dépend de `SUPABASE_SERVICE_ROLE_KEY`. La colonne Flag ne cite que le reste.
- Où ça tourne : les pages `(site)/admin/**` n'existent que sur le build kpop. Les routes `/api/admin/**` existent sur les 3 builds (préfixe `/api/` partagé), scopées par `forSite()` quand elles l'appellent.
- Dernière activité : rien n'est mesuré ici. les cellules portent le résultat des requêtes de la section 9, lancées le 2026-10-30 (détails en 9 bis). Une page qui ne fait que lire n'a pas de trace en base.
- Choix owner : cocher une case par ligne.

## Résumé

| Bloc | Lignes |
|---|---|
| Pages kpopquiz.org `(site)/admin/**` | 22 |
| Pages admin anime `sites/[site]/(anime)/admin/**` | 4 fichiers, 6 lignes (3 onglets de `/admin`, dont Photos de #174) |
| Routes `api/admin/**` | 42 sur main + 3 de #174 = 45 |
| Autres appels directs à `isAdmin` (routes, pages, libs, client) | 34 |
| Fichiers Verse qui donnent le pouvoir admin par `roles.ts` / `curate.ts` | 43 (en plus des 34) |
| Hors `apps/quiz` : `apps/blindtest` | 1 page, 7 routes |
| Requêtes à lancer | Q01 à Q28 |

## 1. Pages kpopquiz.org

| # | Chemin | Ce que ça fait | Tables (L lu, E écrit) | Flag / env | Qui y mène | Protection aujourd'hui | Dernière activité | Proposition | Choix owner |
|---|---|---|---|---|---|---|---|---|---|
| P01 | `/admin` | Tableau de bord : KPI 7 j, signalements, QOTD, utilisateurs (ban, édition), quiz (retirer, restaurer, difficulté), groupes en attente | L jwt : plays, quizzes, profiles, reports, groups. E : par 16 routes (R08 à R40) | aucun | nav du layout "Dashboard", éditeur de quiz, pages blind-tests et songs | MW + S+A serveur, sinon -> / | lecture : pas mesurable. Actions : Q11 : QOTD 30/10 ; Q12 : 232 signalements en attente (dernier 28/10) ; Q13 : 9 groupes en attente ; Q14 : aucun ban | garder : socle de l'admin unique, déjà réutilisé par l'anime (A02) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P02 | `/admin/ai-visibility` | Journal manuel : une IA cite-t-elle KpopQuiz (plateforme, requête, rang) | L svc ai_visibility_checks. E par R01 | aucun | nav "AI Visibility" | MW + S+A, sinon -> / | Q01 : pas en base (table absente) | supprimer si Q01 est vide : saisie à la main, aucune autre page ne lit ces lignes | [ ] garder / [ ] fusionner / [ ] supprimer |
| P03 | `/admin/blind-tests/create` | Crée un jeu "blind test" (titre, clips YouTube) servi sur `/g/[slug]` | E jwt games par `/api/game/create` (O02) | aucun | seulement P04 (lui-même sous flag) | MW + S+A, sinon -> / | Q02 : dernier 27/03, 0 en 90 j, 4 au total | supprimer si Q02 est vide : l'ancien blind test est retiré (`/blind-test` en 301) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P04 | `/admin/blind-tests/runs` | Stats des parties de blindtest (une RPC agrégée, sans donnée perso) | L svc RPC bt_runs_admin_stats (SQL v12-g1-bt-runs) | `NEXT_PUBLIC_BT_TRACKING` (off = 404) | nav "Blindtest runs" si flag | flag sinon 404, puis MW + S+A, sinon -> / | lecture : pas mesurable. Fraîcheur des données : Q28 : derniere partie 30/10, 5714 parties en 90 j | fusionner : une carte du tableau de bord si le flag est on en prod, sinon supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| P05 | `/admin/community-reports` | Contenus cachés au 3e signalement : rendre le contenu | L svc community_autohidden, verse_threads, verse_essays, verse_discussions, community_debates, community_challenges, community_replies, debate_votes. E par R05 | `NEXT_PUBLIC_UX_V12` (off = 404) | nav "Reports" si flag | flag sinon 404, puis MW + S+A, sinon -> / | Q03 : dernier masquage 07/10, derniere restauration 06/10, 1 encore cache | garder : seule modération de la communauté | [ ] garder / [ ] fusionner / [ ] supprimer |
| P06 | `/admin/dm` | Envoie une notification à un utilisateur | E par R19 | aucun | bouton "DM" du tableau de bord (P01) | MW + S+A, sinon -> / | Q04 : dernier DM 14/10, 1 en 90 j, 2 au total | fusionner : le bouton DM du profil (`components/profile/mod-notify-button.tsx`) fait la même chose | [ ] garder / [ ] fusionner / [ ] supprimer |
| P07 | `/admin/editorial` | File des brouillons éditoriaux : relire, dater, approuver, rejeter | L svc editorial_drafts, editorial_accounts. E par R06, R07 | `NEXT_PUBLIC_UX_V12` (off = 404) + SQL v12 | nav "Editorial" si flag | flag sinon 404, puis MW + S+A, sinon -> / | Q05 : 20 brouillons jamais relus ; 8 publies, derniere relecture 11/10, derniere publication 14/10 | garder si Q05 montre un usage ; une seule page pour les 2 sites (A06 en est la copie) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P08 | `/admin/embed` | Générateur de code d'intégration d'un quiz | L quizzes publiés (lecture publique) | aucun | aucun lien | **MW seulement : aucun contrôle admin**, tout compte connecté l'ouvre | pas mesurable (aucune écriture) | supprimer : le même générateur existe sur la page de chaque quiz (`components/embed/embed-quiz-toggle.tsx`) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P09 | `/admin/industry` | Suivi des MV et des comebacks | L svc mv_tracking, comebacks, groups, mv_snapshots. E par R03, R04, R17, R18 | aucun | nav "Industry" | MW + S+A, sinon -> / | Q06 : comebacks vides ; Q07 : 20 MV, dernier ajout 27/07 | garder si Q06 ou Q07 montre un usage (comebacks et mv_tracking sont lus par les pages groupe et Verse), sinon supprimer avec les crons | [ ] garder / [ ] fusionner / [ ] supprimer |
| P10 | `/admin/member-review` | File des idols créés par un curateur : approuver, garder caché, supprimer | L svc idols (colonne origin de 147). E par R41 | SQL 147 (en attente) ; `VERSE_PUBLIC` pour les anonymes | aucun lien | MW + S+A, sinon -> / | Q08 : aucun idol cree par un curateur | fusionner dans P19 (une seule file Verse) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P11 | `/admin/pulse` | Citations sources du rapport mensuel "Pulse" | L svc pulse_citations, pulse_reports. E par R21, R22 | aucun | nav "Pulse" | MW + S+A, sinon -> / | Q09 : citations : derniere 25/07 (0 en 90 j) ; rapports : dernier 01/10 (2 en 90 j) | garder si Q09 montre un usage (lu par `lib/pulse/compute.ts`), sinon supprimer avec le cron | [ ] garder / [ ] fusionner / [ ] supprimer |
| P12 | `/admin/quiz-bank` | Banque du quiz du jour : vérifier, dater, auto-planifier, publier maintenant | L svc quiz_bank, groups (forSite). E par R23, R24, O03 | aucun | nav "Quiz Bank" | MW + S+A, sinon -> / | Q10 : 106 publies (derniere modif 30/10, 24 en 90 j), 34 verifies (25/10) | garder : le quiz du jour des 2 sites en dépend (RUNBOOK J4) ; dans l'admin unique, ajouter le choix du site | [ ] garder / [ ] fusionner / [ ] supprimer |
| P13 | `/admin/quiz/[id]/edit` | Éditeur de quiz en mode admin | L svc quizzes (forSite). E par R25 | aucun | P14 | MW + S+A, sinon -> / ; quiz absent = 404 | pas mesurable (`quizzes.updated_at` suit les parties, pas les éditions) | garder (partagé avec l'anime, A05) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P14 | `/admin/quiz/search` | Liste et recherche des quiz à éditer | L svc quizzes (forSite) | aucun | nav "Edit Quizzes" | MW + S+A, sinon -> / | pas mesurable (lecture) | garder (partagé avec l'anime, A04) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P15 | `/admin/songs` | Liste des chansons du blind test | L jwt blind_test_songs | aucun | aucun lien (seulement P16, P17) | MW + S+A, sinon -> / | Q15 : dernier ajout 27/03, derniere modif 05/06, 0 en 90 j, 349 au total | fusionner P15, P16, P17 en une page, si Q15 montre un usage (la table sert encore aux modes blind test et au duel) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P16 | `/admin/songs/add` | Ajoute une chanson | E jwt blind_test_songs par R34 ; R42 | aucun | P15 | MW + S+A, sinon -> / | Q15 : dernier ajout 27/03, derniere modif 05/06, 0 en 90 j, 349 au total | fusionner avec P15 | [ ] garder / [ ] fusionner / [ ] supprimer |
| P17 | `/admin/songs/[id]` | Modifie ou supprime une chanson | L jwt blind_test_songs. E par R35 ; R42 | aucun | P15 | MW + S+A, sinon -> / ; absent = 404 | Q15 : dernier ajout 27/03, derniere modif 05/06, 0 en 90 j, 349 au total | fusionner avec P15 | [ ] garder / [ ] fusionner / [ ] supprimer |
| P18 | `/admin/space-images` | Modération des images des blocs Verse : cacher, rendre, supprimer | L svc verse_space_assets. E par `/api/verse/space-image` (O19) | SQL 146 ; `VERSE_PUBLIC` pour les anonymes | aucun lien | MW + S+A, sinon -> / | Q16 : aucune image de bloc | fusionner dans la section Verse de l'admin unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| P19 | `/admin/verse` | Écarts Wikidata, albums et idols à revoir, overrides | L svc idols, albums, verse_seed_ids, entity_overrides. E par R41 | `VERSE_PUBLIC` pour les anonymes | nav "Verse" | MW + S+A, sinon -> / | Q17 : 1 override (31/07) ; Q18 : 57 albums et 86 idols a revoir | garder : devient la section Verse (avec P10, P18, P20, P21, P22) | [ ] garder / [ ] fusionner / [ ] supprimer |
| P20 | `/admin/verse/entities` | Tournées, émissions, OST, prix d'un groupe | L svc groups. E par `/api/verse/entity` (tours, shows, osts, awards) | `VERSE_PUBLIC` pour les anonymes | nav "Entities" ; `/verse/[slug]/curate` | MW + S+A, sinon -> / | Q19 : tournees, emissions, OST vides ; prix 55, dernier 29/07, 0 en 90 j | supprimer si Q19 est vide (tables jamais remplies), sinon fusionner dans P19 | [ ] garder / [ ] fusionner / [ ] supprimer |
| P21 | `/admin/verse/quality` | Couverture du contenu Verse par groupe | L albums, groups, idols, eras, verse_content, awards | `VERSE_PUBLIC` pour les anonymes | nav "Quality" | MW + S+A, sinon -> / | pas mesurable (lecture) | fusionner dans P19 | [ ] garder / [ ] fusionner / [ ] supprimer |
| P22 | `/admin/verse/suggestions` | File des suggestions d'édition : approuver, rejeter, tout approuver (mineures) | L/E svc verse_edit_suggestions, verse_content, verse_revisions par `/api/verse/suggestions` | `VERSE_PUBLIC` pour les anonymes | nav "Suggestions" ; `/verse/[slug]/curate` | MW + S+A, sinon -> / | Q20 : 4 suggestions (1 approuvee, 3 refusees), toutes du 31/07 | garder, dans la section Verse | [ ] garder / [ ] fusionner / [ ] supprimer |

## 2. Pages admin anime (bunnyverse.org/anime)

| # | Chemin | Ce que ça fait | Tables (L lu, E écrit) | Flag / env | Qui y mène | Protection aujourd'hui | Dernière activité | Proposition | Choix owner |
|---|---|---|---|---|---|---|---|---|---|
| A01 | `/admin` (onglet Images, par défaut) | Photos des séries et des personnages : chercher, envoyer, importer par URL, point focal, retirer | par R11 à R16 : entity_images, bucket entity-images ; L groups, series, characters | build anime ; SQL 018, 019 (en attente) | onglets de la page | MW (`/anime/login`) + S+A serveur, sinon **404 site** (`notFound()`), testé par `admin.site.test.ts` | Q21 : pas en base (018 en attente) | garder ; fusionner avec A03 (même table, même bucket) | [ ] garder / [ ] fusionner / [ ] supprimer |
| A02 | `/admin?tab=overview` | Le tableau de bord kpop (P01) importé tel quel | comme P01 | build anime | onglets de la page | même porte que A01 (404), puis celle de P01 | comme P01 | garder : c'est P01 ; voir Constats 6 et 8 (lien DM mort, stats non scopées) | [ ] garder / [ ] fusionner / [ ] supprimer |
| A03 | `/admin?tab=photos` (#174) | Photos sous licence, bannières, icônes, stickers de Bunnyverse, avec historique | par R43 à R45 : entity_images (idol, group, agency), site_assets, agencies, idols, groups, bucket entity-images | build anime ; SQL 022 (en attente, #174) | onglets de la page | même porte que A01 (404) | Q21, Q22 : pas en base (018 et 022 en attente) | garder (#174) ; fusionner avec A01 en un seul onglet images | [ ] garder / [ ] fusionner / [ ] supprimer |
| A04 | `/admin/quiz/search` | Re-export de P14 | comme P14 (forSite anime) | build anime | aucun lien (pas de nav admin sur l'anime) | MW + S+A de P14, sinon **-> /** (pas 404) | pas mesurable (lecture) | garder ; ajouter un onglet dans `/admin` et passer en 404 | [ ] garder / [ ] fusionner / [ ] supprimer |
| A05 | `/admin/quiz/[id]/edit` | Re-export de P13 | comme P13 (forSite anime) | build anime | A04 | MW + S+A de P13, sinon -> / ; quiz d'un autre site = 404 | pas mesurable | garder ; passer en 404 | [ ] garder / [ ] fusionner / [ ] supprimer |
| A06 | `/admin/review` | Copie (twin) de P07 pour l'anime | L svc editorial_drafts, editorial_accounts (forSite anime). E par R06, R07 | `NEXT_PUBLIC_UX_V12` (off = 404) | aucun lien | flag sinon 404, puis MW + S+A, sinon -> / | Q05 : 20 brouillons jamais relus ; 8 publies, derniere relecture 11/10, derniere publication 14/10 | fusionner avec P07 (une page, le site en paramètre), ou supprimer si l'anime n'a pas de comptes éditoriaux | [ ] garder / [ ] fusionner / [ ] supprimer |

## 3. Routes `/api/admin/**`

| # | Chemin | Ce que ça fait | Tables (L lu, E écrit) | Flag / env | Qui y mène | Protection aujourd'hui | Dernière activité | Proposition | Choix owner |
|---|---|---|---|---|---|---|---|---|---|
| R01 | `POST /api/admin/ai-visibility` | Ajoute une ligne au journal | E svc ai_visibility_checks | aucun | P02 | S+A, sinon 401 | Q01 : pas en base (table absente) | suit P02 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R02 | `POST /api/admin/auto-select-qotd` | Choisit le quiz du jour de demain | L/E svc quiz_bank, quizzes, qotd_log (forSite) | `CRON_SECRET` | **aucun appelant**, absent de `vercel.json` | Bearer CRON_SECRET, sinon 401 ; aucun contrôle admin | Q11 : auto, dernier 23/10, 4 au total | supprimer : remplacé par `lib/ux-v1/p1/qotd-rotation.ts` (cron ensure-daily-quiz) | [ ] garder / [ ] fusionner / [ ] supprimer |
| R03 | `POST /api/admin/comebacks` | Ajoute un comeback | E svc comebacks | aucun | P09 | S+A, sinon 401 | Q06 : table vide | suit P09 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R04 | `PUT, DELETE /api/admin/comebacks/[id]` | Modifie ou supprime un comeback | E svc comebacks | aucun | P09 | S+A, sinon 401 | Q06 : table vide | suit P09 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R05 | `POST /api/admin/community-reports` | Rend un contenu caché et classe ses signalements | E svc community_autohidden, verse_flags, debate_votes, tables de contenu | `NEXT_PUBLIC_UX_V12` (off = 404) | P05 | flag sinon 404, puis S+A, sinon 403 | Q03 : dernier masquage 07/10, derniere restauration 06/10, 1 encore cache | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R06 | `GET, POST /api/admin/editorial` | Liste, crée, génère les brouillons | L/E svc editorial_drafts, editorial_accounts (forSite) ; L comebacks, stats de la semaine | `NEXT_PUBLIC_UX_V12` + SQL v12 | P07, A06 | `lib/editorial/admin-api.ts` : flag sinon 404, S+A sinon 401, SQL absent 503 | Q05 : 20 brouillons jamais relus ; 8 publies, derniere relecture 11/10, derniere publication 14/10 | suit P07 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R07 | `PATCH /api/admin/editorial/[id]` | Édite, approuve avec date, rejette | E svc editorial_drafts | idem R06 | P07, A06 | idem R06, puis `pipeline.ts` revérifie A (403) | Q05 : 20 brouillons jamais relus ; 8 publies, derniere relecture 11/10, derniere publication 14/10 | suit P07 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R08 | `DELETE /api/admin/group/[id]` | Supprime un groupe sans quiz | L jwt quizzes ; E svc groups | aucun | P01 | S+A, sinon 401 ; pas de forSite | Q13 : 9 groupes en attente (le plus recent 28/10), 11 crees en 90 j | garder, scoper par site | [ ] garder / [ ] fusionner / [ ] supprimer |
| R09 | `POST /api/admin/group/[id]/approve` | Valide un groupe créé par un fan | E svc groups | aucun | P01 | S+A, sinon 401 ; pas de forSite | Q13 : 9 groupes en attente (le plus recent 28/10), 11 crees en 90 j | garder, scoper par site | [ ] garder / [ ] fusionner / [ ] supprimer |
| R10 | `POST /api/admin/group/[id]/merge` | Fusionne un doublon : déplace les quiz, supprime le groupe | E svc quizzes, groups | aucun | P01 | S+A, sinon 401 ; pas de forSite | Q13 : 9 groupes en attente (le plus recent 28/10), 11 crees en 90 j | garder, scoper par site | [ ] garder / [ ] fusionner / [ ] supprimer |
| R11 | `DELETE /api/admin/images` | Retire une photo de série ou personnage | E svc entity_images, bucket entity-images | build anime ; SQL 018 | A01 (`lib/anime/entity-images-api.ts:22`) | `route-kit.ts` : build anime + S+A, sinon 404 ; même origine sinon 403 | Q21 : pas en base (018 en attente) | garder ; fusionner avec R43 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R12 | `DELETE /api/admin/images/delete` | Même handler que R11 | idem R11 | idem R11 | **aucun appelant** (tests seulement) | idem R11 | Q21 : pas en base (018 en attente) | supprimer : doublon de R11 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R13 | `PATCH /api/admin/images/focal` | Règle le point focal | E svc entity_images | idem R11 | A01 | idem R11 | Q21 : pas en base (018 en attente) | garder ; fusionner avec R43 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R14 | `POST /api/admin/images/import` | Télécharge une image depuis une URL (serveur) et l'enregistre | E svc entity_images, bucket | idem R11 | A01 | idem R11 | Q21 : pas en base (018 en attente) | fusionner avec R45 (même besoin) | [ ] garder / [ ] fusionner / [ ] supprimer |
| R15 | `GET /api/admin/images/list` | Séries, personnages et état de leurs photos | L svc groups, series, characters, entity_images | idem R11 | A01 | build anime + S+A, sinon 404 | pas mesurable (lecture) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R16 | `POST /api/admin/images/upload` | Envoie un fichier image | E svc entity_images, bucket | idem R11 | A01 | idem R11 | Q21 : pas en base (018 en attente) | garder ; fusionner avec R43 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R17 | `POST /api/admin/mv-tracking` | Ajoute un MV suivi | E svc mv_tracking | aucun | P09 | S+A, sinon 401 | Q07 : 20 MV suivis, dernier ajout 27/07, 0 en 90 j | suit P09 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R18 | `PUT, DELETE /api/admin/mv-tracking/[id]` | Modifie ou supprime un MV suivi | E svc mv_tracking | aucun | P09 | S+A, sinon 401 | Q07 : 20 MV suivis, dernier ajout 27/07, 0 en 90 j | suit P09 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R19 | `POST /api/admin/notifications/send` | DM d'un admin à un utilisateur | L svc profiles ; E svc creator_notifications (type admin_dm) | aucun | P06 ; bouton DM du profil `/u/[username]` | S+A, sinon 403 | Q04 : dernier DM 14/10, 1 en 90 j, 2 au total | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R20 | `GET /api/admin/pending-groups` | Groupes en attente de validation | L jwt groups | aucun | P01 | S+A, sinon 401 | Q13 : 9 groupes en attente (le plus recent 28/10), 11 crees en 90 j | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R21 | `POST /api/admin/pulse-citations` | Ajoute une citation | E svc pulse_citations | aucun | P11 | S+A, sinon 401 | Q09 : citations : derniere 25/07 (0 en 90 j) ; rapports : dernier 01/10 (2 en 90 j) | suit P11 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R22 | `PUT, DELETE /api/admin/pulse-citations/[id]` | Modifie ou supprime une citation | E svc pulse_citations | aucun | P11 | S+A, sinon 401 | Q09 : citations : derniere 25/07 (0 en 90 j) ; rapports : dernier 01/10 (2 en 90 j) | suit P11 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R23 | `PATCH, DELETE /api/admin/quiz-bank/[id]` | Modifie (statut, date) ou supprime une ligne de la banque | E svc quiz_bank (forSite) | aucun | P12 | S+A, sinon 403 | Q10 : 106 publies (derniere modif 30/10, 24 en 90 j), 34 verifies (25/10) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R24 | `POST /api/admin/quiz-bank/auto-schedule` | Date les lignes vérifiées sur N jours | E svc quiz_bank (forSite) | aucun | P12 | S+A, sinon 403 | Q10 : 106 publies (derniere modif 30/10, 24 en 90 j), 34 verifies (25/10) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R25 | `GET, PATCH /api/admin/quiz/[id]` | Lit et enregistre un quiz en mode admin | L/E svc quizzes (forSite), groups | aucun | PATCH : `components/quiz/quiz-editor.tsx:57` (P13, A05). GET : **aucun appelant** | S+A, sinon 403 | pas mesurable | garder le PATCH, retirer le GET | [ ] garder / [ ] fusionner / [ ] supprimer |
| R26 | `POST /api/admin/quiz/[id]/difficulty` | Change la difficulté | E svc quizzes (forSite) | aucun | P01 | S+A, sinon 403 | pas mesurable | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R27 | `POST /api/admin/quiz/[id]/remove` | Retire un quiz, clôt ses signalements | E svc quizzes, reports (forSite) | aucun | P01 ; bouton admin de la page quiz (`components/quiz/quiz-owner-actions.tsx:56`) | S+A, sinon 403 | Q12 : 232 signalements en attente, dernier 28/10, 170 en 90 j ; 5 quiz retires | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R28 | `POST /api/admin/quiz/[id]/restore` | Republie un quiz retiré | E svc quizzes (forSite) | aucun | P01 | S+A, sinon 403 | Q12 : 232 signalements en attente, dernier 28/10, 170 en 90 j ; 5 quiz retires | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R29 | `POST /api/admin/quiz/upload-image` | Envoie une image de quiz (fichier ou URL) | E svc bucket quiz-images | aucun | **aucun appelant** | S+A, sinon 403 | pas mesurable | supprimer : personne ne l'appelle | [ ] garder / [ ] fusionner / [ ] supprimer |
| R30 | `GET /api/admin/quizzes` | Liste paginée des quiz | L jwt quizzes (forSite), profiles | aucun | P01 | S+A, sinon 403 | pas mesurable (lecture) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R31 | `POST /api/admin/report/[id]/dismiss` | Classe un signalement | E svc reports | aucun | P01 | S+A, sinon 403 ; pas de forSite | Q12 : 232 signalements en attente, dernier 28/10, 170 en 90 j ; 5 quiz retires | garder, scoper par site | [ ] garder / [ ] fusionner / [ ] supprimer |
| R32 | `GET /api/admin/search-quizzes` | Recherche pour choisir un QOTD | L jwt quizzes (forSite) | aucun | P01 | S+A, sinon 403 | pas mesurable (lecture) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R33 | `POST /api/admin/set-qotd` | Fixe le quiz du jour à une date | E svc quizzes, qotd_log (forSite) | aucun | P01 | S+A, sinon 403 | Q11 : aucune pose manuelle en base (methodes vues : bank, auto) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R34 | `POST /api/admin/songs` | Ajoute une chanson | E **jwt** blind_test_songs (marche grâce à une policy ouverte, voir section 7) | aucun | P16 | S+A, sinon 401 | Q15 : dernier ajout 27/03, derniere modif 05/06, 0 en 90 j, 349 au total | suit P15 ; écrire en svc et fermer la policy | [ ] garder / [ ] fusionner / [ ] supprimer |
| R35 | `PUT, DELETE /api/admin/songs/[id]` | Modifie ou supprime une chanson | E **jwt** blind_test_songs | aucun | P17 | S+A, sinon 401 | Q15 : dernier ajout 27/03, derniere modif 05/06, 0 en 90 j, 349 au total | suit P15 ; écrire en svc | [ ] garder / [ ] fusionner / [ ] supprimer |
| R36 | `GET /api/admin/stats` | KPI du tableau de bord pour une période | L jwt plays, quizzes, profiles, reports, groups, **sans forSite** | aucun | P01, A02 | S+A, sinon 403 | pas mesurable (lecture) | garder, scoper par site | [ ] garder / [ ] fusionner / [ ] supprimer |
| R37 | `POST /api/admin/user/[id]/ban` | Bannit, retire tous ses quiz | E svc profiles.banned_at, quizzes (tous sites) | aucun | P01 | S+A, sinon 403 | Q14 : aucun ban | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R38 | `POST /api/admin/user/[id]/edit` | Change pseudo, nom affiché, avatar | E svc profiles | aucun | P01 | S+A, sinon 403 | pas mesurable (pas de trace) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R39 | `POST /api/admin/user/[id]/unban` | Débannit, republie ses quiz retirés | E svc profiles, quizzes (tous sites) | aucun | P01 | S+A, sinon 403 | Q14 : aucun ban | garder ; ne republier que ce que le ban a retiré | [ ] garder / [ ] fusionner / [ ] supprimer |
| R40 | `GET /api/admin/users` | Liste et recherche des comptes | L jwt profiles | aucun | P01 | S+A, sinon 403 | pas mesurable (lecture) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R41 | `POST /api/admin/verse/action` | Overrides, albums et idols à revoir : valider, cacher, supprimer | E svc entity_overrides, albums, idols | aucun | P19, P10 (`components/admin/curator-idol-queue.tsx`) | S+A, sinon 401 | Q08 : aucun ; Q17 : 1 override (31/07) ; Q18 : 57 albums et 86 idols a revoir | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R42 | `GET /api/admin/youtube-info` | Titre d'une vidéo YouTube (oEmbed) | aucune (appel YouTube) | aucun | P16, P17 (`song-edit-form.tsx`) | S+A, sinon 401 | pas mesurable | suit P15 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R43 | `POST /api/admin/photos` (#174) | Enregistre ou retire la photo d'un idol, groupe, agence, série, personnage | E svc entity_images, bucket entity-images ; L idols, groups, agencies | build anime ; SQL 022 | A03 (`components/admin/photos/api.ts`) | `route-kit.ts` : build anime + S+A, sinon 404 ; même origine sinon 403 | Q21 : pas en base (018 en attente) | garder ; absorbe R11, R13, R16 | [ ] garder / [ ] fusionner / [ ] supprimer |
| R44 | `POST /api/admin/photos/assets` (#174) | Bannières, icônes, stickers : enregistrer, retirer, restaurer une version | E svc site_assets, bucket entity-images | build anime ; SQL 022 | A03 | idem R43 | Q22 : pas en base (022 en attente) | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| R45 | `POST /api/admin/photos/fetch` (#174) | Télécharge une image par URL et la rend au navigateur (rien n'est stocké) | aucune | build anime | A03 | idem R43 | pas mesurable | garder ; absorbe R14 | [ ] garder / [ ] fusionner / [ ] supprimer |

## 4. Autres appels admin (hors `/admin` et `/api/admin`)

Chaque appel direct à `isAdmin` ou à une porte admin. Les lignes O25 à O34 sont les libs et le client.

| # | Chemin | Ce que ça fait | Tables (L lu, E écrit) | Flag / env | Qui y mène | Protection aujourd'hui | Dernière activité | Proposition | Choix owner |
|---|---|---|---|---|---|---|---|---|---|
| O01 | `GET /api/auth/me` (`app/api/auth/me/route.ts:65`) | Dit au navigateur si l'utilisateur est admin (pour montrer des boutons) | L jwt profiles | aucun | `lib/auth/use-me.ts`, O33 | S ; ne donne aucun droit | pas mesurable | garder ; l'admin unique peut s'en passer | [ ] garder / [ ] fusionner / [ ] supprimer |
| O02 | `POST /api/game/create` (`:28`) | Crée un jeu blind test, admin seul | E jwt games | aucun | P03 | S, puis A sinon 403 | Q02 : dernier 27/03, 0 en 90 j, 4 au total | suit P03 | [ ] garder / [ ] fusionner / [ ] supprimer |
| O03 | `GET /api/qotd/publish` (`:24`) | Publie le quiz du jour maintenant | L/E svc quiz_bank, quizzes, qotd_log | `QOTD_ROTATION_FIX`, `CRON_SECRET` | bouton de P12 (`quiz-bank-dashboard.tsx:113`) | Bearer CRON_SECRET, ou S+A ; sinon 401. GET qui écrit | Q10 : derniere modif 30/10 ; Q11 : banque 30/10 | garder ; passer en POST derrière l'admin unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O04 | `GET /api/cron/editorial-publish` (`:34`) | Publie un brouillon approuvé ; refuse si le relecteur n'est pas admin | L/E svc editorial_drafts, community_debates, editorial_posts | `NEXT_PUBLIC_UX_V12`, `CRON_SECRET` | cron `vercel.json` (15 min) | flag sinon 404 ; CRON_SECRET sinon 401 ; A passé aux règles | Q05 : 20 brouillons jamais relus ; 8 publies, derniere relecture 11/10, derniere publication 14/10 | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O05 | `GET /api/cron/mv-snapshot` (`:27`) | Relevé quotidien des vues YouTube | L mv_tracking ; E svc mv_snapshots | `CRON_SECRET`, clé YouTube | cron `vercel.json` | CRON_SECRET, ou S+A ; sinon 401 | Q24 : MV : dernier 30/10 (1740 en 90 j) ; Spotify : vide | suit P09 ; retirer la porte "admin connecté" | [ ] garder / [ ] fusionner / [ ] supprimer |
| O06 | `GET /api/cron/pulse-generate` (`:30`) | Calcule le rapport Pulse du mois | E svc pulse_reports | `CRON_SECRET` | cron `vercel.json` | CRON_SECRET, ou S+A ; sinon 401 | Q09 : citations : derniere 25/07 (0 en 90 j) ; rapports : dernier 01/10 (2 en 90 j) | suit P11 ; retirer la porte admin | [ ] garder / [ ] fusionner / [ ] supprimer |
| O07 | `GET /api/cron/spotify-snapshot` (`:26`) | Relevé hebdo des abonnés Spotify | L groups ; E svc spotify_snapshots | `CRON_SECRET`, clés Spotify | cron `vercel.json` | CRON_SECRET, ou S+A ; sinon 401 | Q24 : MV : dernier 30/10 (1740 en 90 j) ; Spotify : vide | supprimer : aucune page ne lit spotify_snapshots | [ ] garder / [ ] fusionner / [ ] supprimer |
| O08 | `GET /api/cron/verse-refresh` (`:24`) | Rafraîchit les groupes depuis Wikidata et MusicBrainz | L/E groups, albums, entity_overrides (lu) | `CRON_SECRET` | cron `vercel.json` | CRON_SECRET, ou S+A ; sinon 401 | pas mesurable simplement | garder ; retirer la porte admin | [ ] garder / [ ] fusionner / [ ] supprimer |
| O09 | `GET /api/cron/verse-role-decay` (`:18`) | Rétrograde les curateurs inactifs | E space_members | `CRON_SECRET` | cron `vercel.json` | CRON_SECRET, ou S+A ; sinon 401 | pas mesurable simplement | garder ; retirer la porte admin | [ ] garder / [ ] fusionner / [ ] supprimer |
| O10 | `GET, POST, DELETE /api/verse/banned-terms` (`:16`) | Liste globale des mots interdits | L/E svc verse_banned_terms | aucun | O34 sur `/verse/[slug]/patrol` | S+A, sinon 403 | Q23 : 175 mots bloques, dernier 06/10 | fusionner dans l'admin unique (outil global) | [ ] garder / [ ] fusionner / [ ] supprimer |
| O11 | `GET /api/verse/can-edit` (`:24`) | Dit si le visiteur peut éditer ; admin = oui partout | L groups, space_members | aucun | pages Verse | S ; admin court-circuite | pas mesurable | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O12 | `GET, POST /api/verse/membership` (`:32`) | Rejoindre ou quitter un espace ; admin vu comme space_admin | L/E svc space_members | aucun | pages Verse | S ; admin court-circuite | pas mesurable | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O13 | `POST /api/verse/pages/create` (`:32`) | Crée une page wiki ; admin sans rôle contributeur | E svc verse_pages | `VERSE_PUBLIC` | éditeur wiki | S ; admin ou contributeur, sinon 403 | pas une action admin | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O14 | `POST /api/verse/pages/publish` (`:43`) | Publie ou renvoie une page | E svc verse_pages, verse_content, verse_revisions | `VERSE_PUBLIC` | `/verse/[slug]/curate` | S ; admin ou curateur, sinon 403 | pas une action admin | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O15 | `POST /api/verse/pages/rename` (`:39`) | Renomme une page (alias 301) | E svc verse_pages | `VERSE_PUBLIC` | éditeur wiki | S ; admin ou curateur, sinon 403 | pas une action admin | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O16 | `POST /api/verse/pages/save` (`:41`) | Enregistre une page | E svc verse_pages, verse_drafts | `VERSE_PUBLIC` | éditeur wiki | S ; auteur, curateur ou admin, sinon 403 | pas une action admin | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O17 | `POST /api/verse/pages/submit` (`:32`) | Envoie une page en relecture | E svc verse_pages | `VERSE_PUBLIC` | éditeur wiki | S ; auteur ou admin, sinon 403 | pas une action admin | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O18 | `POST /api/verse/space-config` (`:43`) | Réglages d'un espace ; changer le "stage" = admin seul | E svc verse_spaces | `VERSE_PUBLIC` | builder Verse | S ; curateur, et A pour le stage, sinon 403 | pas mesurable simplement | garder ; le stage passe dans l'admin unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O19 | `POST, PATCH, DELETE /api/verse/space-image` (`:101`, `:118`) | Image de bloc : ajout (curateur), cacher ou supprimer (admin ou curateur) | E svc verse_space_assets, bucket verse-space-assets | SQL 146 | P18, builder Verse | S ; A ou curateur, sinon 403 | Q16 : aucune image de bloc | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O20 | page `/quiz/[id]/edit` (`:39`) | Éditeur du créateur ; l'admin peut ouvrir tout quiz | L quizzes | aucun | page quiz | sans session -> /login ; ni créateur ni admin = **404** | pas mesurable | garder (bon modèle : 404) | [ ] garder / [ ] fusionner / [ ] supprimer |
| O21 | page `/verse/[slug]/curate` (`:30`) | Tableau du curateur ; admin voit plus | L svc verse_pages, profiles | `VERSE_PUBLIC` | pages Verse | rôle curateur sinon -> espace | pas mesurable | garder ; corriger ses liens vers P20, P22 | [ ] garder / [ ] fusionner / [ ] supprimer |
| O22 | page `/verse/[slug]/patrol` (`:25`) | Patrouille ; admin voit aussi les mots interdits (O34) | L svc | `VERSE_PUBLIC` | pages Verse | rôle curateur sinon -> espace | pas mesurable | garder ; sortir O34 vers l'admin | [ ] garder / [ ] fusionner / [ ] supprimer |
| O23 | page `/verse/[slug]/wiki/[pageSlug]/edit` (`:38`, `:79`) | Éditeur de page wiki | L svc verse_pages, verse_drafts, verse_content | `VERSE_PUBLIC` | wiki | auteur, curateur ou admin, sinon 404 | pas mesurable | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O24 | page `/verse/[slug]/wiki/new` (`:26`) | Nouvelle page wiki | aucune | `VERSE_PUBLIC` | wiki | page ouverte ; le formulaire n'est actif que pour admin ou contributeur | pas mesurable | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O25 | `lib/admin.ts:1` `isAdmin` | La seule source : liste `ADMIN_USER_IDS` | aucune | `ADMIN_USER_IDS` | 94 appels dans 90 fichiers | sans session ni MFA (il prend un id) | n/a | garder ; y brancher la MFA (aal2) ou le remplacer par une porte unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O26 | `lib/entity-images/route-kit.ts:22` `adminGate` | Porte des routes images et photos : build anime + admin, sinon 404 ; même origine | aucune | `NEXT_PUBLIC_SITE_ID` | R11 à R16, R43 à R45 | S+A serveur, 404, 403 même origine | n/a | garder : modèle de la porte unique (à étendre aux 3 sites) | [ ] garder / [ ] fusionner / [ ] supprimer |
| O27 | `lib/editorial/admin-api.ts:23` `adminGate` | Porte des routes éditoriales | aucune | `NEXT_PUBLIC_UX_V12` | R06, R07 | flag 404, S+A 401, SQL 503 | n/a | fusionner dans la porte unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O28 | `lib/anime/admin-tabs.ts:17` `adminGate` | Décision pure ok / notfound de la page anime | aucune | aucun | A01 à A03 | utilisée avec S+A | n/a | fusionner dans la porte unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O29 | `lib/verse/roles.ts:19`, `:47`, `:59` | Admin = space_admin dans chaque espace ; `isVersePrivileged` ; `isVerseAdmin` | L space_members | aucun | section 5 | serveur | n/a | garder ; la MFA doit couvrir ces chemins | [ ] garder / [ ] fusionner / [ ] supprimer |
| O30 | `lib/verse/curate.ts:31`, `:40` | Admin peut curer et éditer toute entité | L idols, etc. | aucun | section 5 | serveur | n/a | garder ; même remarque | [ ] garder / [ ] fusionner / [ ] supprimer |
| O31 | `lib/editorial/pipeline.ts:69`, `:82` ; `lib/editorial/rules.ts:47` | Approuver et rejeter exigent un admin ; publier exige un relecteur admin | aucune | aucun | R07, O04 | serveur (403) | n/a | garder | [ ] garder / [ ] fusionner / [ ] supprimer |
| O32 | `lib/supabase/middleware.ts:19` ; `middleware.ts:20` ; `lib/site/routing.ts:283` | `/admin/**` demande une session (sinon 302 /login) | aucune | aucun | toutes les pages admin | session seulement, pas A | n/a | changer : 404 au lieu du 302 | [ ] garder / [ ] fusionner / [ ] supprimer |
| O33 | client : `lib/auth/use-me.ts:32`, `components/profile/mod-notify-button.tsx:18`, `components/quiz/quiz-owner-actions.tsx:25` | Montre un bouton admin (DM, retirer un quiz) | aucune | aucun | profils, pages quiz (kpop et anime) | **client seulement** pour l'affichage ; l'action repasse par R19, R27 (serveur) | n/a | garder ou supprimer avec l'admin unique | [ ] garder / [ ] fusionner / [ ] supprimer |
| O34 | client : `components/verse/curate/banned-terms.tsx` | Gestion des mots interdits | par O10 | aucun | O22 si admin | affichage décidé serveur (O22), action par O10 | Q23 : 175 mots bloques, dernier 06/10 | fusionner dans l'admin unique | [ ] garder / [ ] fusionner / [ ] supprimer |

## 5. Pouvoir admin hérité (Verse)

Ces fichiers n'appellent pas `isAdmin` eux-mêmes. Ils appellent une aide de `lib/verse/roles.ts` ou `lib/verse/curate.ts` qui répond "oui" pour un admin. Tous lisent la session côté serveur (getUser). Les 11 fichiers déjà listés en section 4 (O11, O13 à O16, O18, O19, O21 à O24) ne sont pas répétés.

| Fichier | Aide appelée | Ce que l'admin y gagne |
|---|---|---|
| `app/(site)/(builder)/build/[slug]/page.tsx` | isVerseAdmin, canCurateSpace | builder de tout espace, même caché |
| `app/(site)/verse/[slug]/[pageSlug]/edit/page.tsx` | isVerseAdmin, canCurateSpace | édition de toute page d'espace |
| `app/(site)/verse/[slug]/[pageSlug]/page.tsx` | isVersePrivileged | voit les pages parquées |
| `app/(site)/verse/[slug]/build/page.tsx` | isVerseAdmin, canCurateSpace | builder |
| `app/(site)/verse/[slug]/essays/[id]/page.tsx` | canCurateSpace | modère les essais |
| `app/(site)/verse/[slug]/essays/write/page.tsx` | currentSpaceRole | écrit comme space_admin |
| `app/(site)/verse/[slug]/insights/page.tsx` | currentSpaceRole | voit les stats d'espace |
| `app/(site)/verse/[slug]/layout.tsx` | isVerseAdmin | passe la porte des espaces parqués |
| `app/(site)/verse/[slug]/menu/page.tsx` | canCurateSpace | menu curateur |
| `app/(site)/verse/[slug]/new/page.tsx` | canCurateSpace | crée du contenu |
| `app/(site)/verse/[slug]/studio/page.tsx` | canCurateSpace | studio |
| `app/(site)/verse/page.tsx` | isVerseAdmin | voit l'annuaire caché |
| `app/api/verse/collectibles/route.ts` | canCurateSpace, getSpaceRole | gère les collectibles |
| `app/api/verse/comeback-mode/route.ts` | canCurateSpace | mode comeback |
| `app/api/verse/discussions/route.ts` | canCurateEntity | modère les discussions |
| `app/api/verse/draft/route.ts` | canEditEntity | brouillons de toute entité |
| `app/api/verse/entity/route.ts` | canCurateSpace, canCurateEntity | tours, shows, OST, prix (P20) |
| `app/api/verse/eras/color/route.ts` | canCurateSpace | couleur des ères |
| `app/api/verse/essays/route.ts` | canCurateSpace, getSpaceRole | essais |
| `app/api/verse/essays/series/route.ts` | canCurateSpace, getSpaceRole | séries d'essais |
| `app/api/verse/flags/route.ts` | canCurateSpace | traite les signalements |
| `app/api/verse/history/route.ts` | canCurateEntity | historique, retour arrière |
| `app/api/verse/live-now/route.ts` | canCurateSpace | bandeau live |
| `app/api/verse/lock/route.ts` | canCurateEntity | verrouille une section |
| `app/api/verse/members/route.ts` | getSpaceRole | gère les membres |
| `app/api/verse/nav/route.ts` | canCurateSpace | navigation d'espace |
| `app/api/verse/override/route.ts` | canEditEntity | override de faits |
| `app/api/verse/photocards/route.ts` | canCurateSpace, getSpaceRole | photocards |
| `app/api/verse/poll/route.ts` | canCurateSpace | sondages |
| `app/api/verse/presentation/route.ts` | canCurateSpace | présentation |
| `app/api/verse/presentation/fold/route.ts` | canCurateSpace | présentation |
| `app/api/verse/presentation/publish/route.ts` | canCurateSpace | publie la présentation |
| `app/api/verse/presentation/rollback/route.ts` | canCurateSpace | annule une présentation |
| `app/api/verse/section/route.ts` | canEditEntity | sections |
| `app/api/verse/space-feed/route.ts` | currentSpaceRole, canCurateSpace | fil d'espace |
| `app/api/verse/space-members/route.ts` | canCurateSpace | rôles des membres (bloquer, promouvoir) |
| `app/api/verse/sticker/route.ts` | canCurateSpace | stickers |
| `app/api/verse/suggestions/route.ts` | canCurateEntity | approuve les suggestions (P22) |
| `app/api/verse/tags/route.ts` | canCurateSpace | tags |
| `app/api/verse/tree/route.ts` | canCurateSpace | arbre des pages |
| `components/verse/atlas/atlas-view.tsx` | currentSpaceRole | vue atlas |
| `lib/verse/api-gate.ts` | isVerseAdmin | `verseWriteGate` laisse passer l'admin sur un espace caché ou parqué |
| `lib/verse/stage.ts` | canCurateSpace | stage d'espace |

Proposition pour tout le bloc : garder le rôle super-utilisateur, mais le faire passer par la même porte que l'admin unique (MFA comprise).
Choix owner pour le bloc : [ ] garder / [ ] fusionner / [ ] supprimer

## 6. Hors `apps/quiz` : `apps/blindtest`

Application à part (dernier commit 2026-04-17), base Supabase morte (`docs/blindtest-migration-map.md:12`). Même `isAdmin` copié (`apps/blindtest/src/lib/admin.ts:1`, `ADMIN_USER_IDS`).

| # | Chemin | Protection | Proposition | Choix owner |
|---|---|---|---|---|
| B01 | page `apps/blindtest/src/app/admin/songs/page.tsx` | S+A | supprimer avec l'app | [ ] garder / [ ] fusionner / [ ] supprimer |
| B02 | `apps/blindtest/src/app/api/admin/songs/[id]/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B03 | `.../songs/bulk-add/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B04 | `.../songs/generate-wrong-answers/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B05 | `.../songs/import-json/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B06 | `.../songs/list/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B07 | `.../songs/search-artist/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |
| B08 | `.../songs/search-deezer/route.ts` | S+A | supprimer | [ ] garder / [ ] fusionner / [ ] supprimer |

## 7. Pouvoir admin par SQL

Aucune fonction ni policy ne lit une liste d'admins, `auth.jwt()`, `app_metadata` ou un rôle d'utilisateur pour donner un droit admin. L'admin n'existe que dans le code (`ADMIN_USER_IDS`) et passe par la clé service. Le problème est l'inverse : des policies nommées "admin" sont ouvertes à tous (rôle PUBLIC, donc la clé anon publique).

Policies écrites ouvertes dans les migrations (fermées en production le 2026-10-30, voir 9 bis) :

- `supabase/migrations/017_blind_test_v2.sql:43`, `:46`, `:49` : `btsongs_admin_insert`, `btsongs_admin_update`, `btsongs_admin_delete` sur blind_test_songs, `true`. N'importe qui ajoute, modifie, supprime des chansons. R34 et R35 en dépendent (écriture jwt).
- `supabase/migrations/024_songs_deezer.sql:51` : `songs_admin_write` sur songs, `FOR ALL USING (true) WITH CHECK (true)`.
- `supabase/migrations/021_pinterest_pins.sql:52` : `pinterest_admin_all` sur pinterest_pins, `FOR ALL true`.
- `supabase/migrations/023_pinterest_api_tables.sql:19` : `pinterest_auth_admin_all`, `FOR ALL true`, sur une table qui garde `access_token` et `refresh_token` (`:8`, `:9`) : jetons OAuth lisibles avec la clé anon si des lignes existent.
- `supabase/migrations/023_pinterest_api_tables.sql:34` : `pinterest_boards_admin_all`, `FOR ALL true`.
- `supabase/migrations/065_pinterest_cards_v2.sql:36`, `:41`, `:46`, `:51` : quiz_pinterest_cards, lecture et écriture `true`.
- `supabase/migrations/065_pinterest_cards_v2.sql:78`, `:82`, `:86`, `:90` : storage, tout compte connecté peut envoyer, supprimer, remplacer dans les buckets quiz-backgrounds et quiz-pinterest-cards.
- `supabase/migrations/018_quiz_bank.sql:42` : `quizbank_admin_all` (`FOR ALL true`) : fermée par `docs/pending-migrations/r1-rls-tighten.sql:72`, appliquée le 2026-10-01 (`docs/release/R1-REPORT.md:74`).
- `supabase/migrations/063_byeol_anti_farming.sql:30`, `:56` : nommées "Service role can ..." mais la règle est `auth.uid() = user_id` : chaque compte écrit ses propres récompenses et plafonds. Nom trompeur, pas un droit admin.

Fonctions "admin" fermées au JWT (service role seul, bien) :

- `docs/pending-migrations/account-deletion.sql:105` `admin_delete_account` ; droits `:624` à `:626` (revoke public, anon, authenticated ; grant service_role).
- `docs/pending-migrations/v12-g1-bt-runs.sql:166` et `docs/pending-migrations/v12-bundle-a.sql:181` `bt_runs_admin_stats` ; grant service_role seul (`v12-g1-bt-runs.sql:258`, `v12-bundle-a.sql:273`).
- `supabase/migrations/085_ai_visibility_checks.sql:20` `admin_only_ai_visibility` : `USING (false)`, lecture et écriture par le serveur seulement.
- `docs/pending-migrations/multisite/018-entity-images.sql:6`, `:80` : entity_images sans policy d'écriture (service role).
- #174 `docs/pending-migrations/multisite/022-photos-admin.sql:179` à `:182`, `:261` à `:263` : agencies et site_assets fermées à anon et authenticated ; `:278`, `:279` vue publique en lecture.
- `docs/o1/contracts/schema.sql` : aucune fonction ni policy admin ; `:772` la file de `/admin/review` est lue par le serveur.
- `supabase/migrations/132_verse_roles.sql:19`, `:42` : rôles curator et space_admin en base, lecture publique ; aucune policy ne s'en sert (le contrôle est dans le code).

Pour voir toutes les fonctions "admin" et leurs droits en prod : Q26.

## 8. Constats

1. **Pas de 404, sauf l'anime.** Seules la page `/admin` anime (A01 à A03), les routes images (R11 à R16) et photos (R43 à R45) répondent 404. Les 21 pages kpop qui ont un contrôle, et A04 à A06, redirigent un non-admin vers `/` (P08 n'a pas de contrôle). 35 routes `/api/admin` répondent 401 ou 403 à un non-admin (R05, R06, R07 répondent 404 seulement quand le flag est off) ; R02 répond 401 sans `CRON_SECRET`. Le middleware renvoie un visiteur sans session vers `/login?returnTo=/admin` : l'adresse de l'admin se devine. `/api/admin/**` existe aussi sur les builds anime et hub (préfixe `/api/` partagé) ; le hub n'a pas `ADMIN_USER_IDS` (`docs/launch/o1/ENV.md:35`), donc il refuse tout, mais en 401 ou 403.
2. **Une page sans contrôle admin.** `/admin/embed` (P08) n'appelle pas `isAdmin` : tout compte connecté l'ouvre. Ailleurs, pas de contrôle "client seulement" : toutes les pages et routes lisent la session avec `getUser()` côté serveur, aucun `getSession`. Les boutons client (O33) ne servent qu'à l'affichage.
3. **Ni MFA ni mot de passe admin.** L'admin est la liste `ADMIN_USER_IDS`, sans MFA (aucun `aal` dans l'app). `ADMIN_PASSWORD` n'est lu par aucun code : il ne reste que dans l'ancienne spec (`docs/kpopquizz-v2-spec-FINAL.md:90`, `:1381`) et dans une liste de clés d'env (`docs/proofs/w7d/ci-env.txt:17`). Si la variable est encore dans Vercel, la retirer.
4. **Le pouvoir admin sort de `/admin`.** 19 routes et 5 pages hors `/admin` appellent `isAdmin` (section 4), et 43 fichiers Verse l'héritent par `roles.ts` et `curate.ts` (section 5). 6 routes (5 crons O05 à O09, et O03) acceptent un admin connecté à la place de `CRON_SECRET`, en GET. La MFA doit donc vivre dans `isAdmin` lui-même, ou dans une porte unique qu'appellent tous ces chemins, sinon ils la contournent.
5. **Pouvoir admin donné à tous par SQL** (section 7) : blind_test_songs, songs, pinterest_pins, pinterest_auth (jetons OAuth), pinterest_boards, quiz_pinterest_cards et deux buckets. Les routes R34 et R35 comptent sur la policy ouverte de blind_test_songs. Fermé en production le 2026-10-30 (section 9 bis).
6. **Orphelins.** Pages sans lien : P08, P10, P18, P15 (P16 et P17 ne sont liés que par P15), A04 et A06 (l'anime n'a pas de nav admin), P03 (lié seulement par P04, sous flag). Routes sans appelant : R02, R12, R29, le GET de R25. Liens morts : le bouton DM du tableau de bord sur l'anime (A02) mène à `/anime/admin/dm`, qui n'existe pas ; `/verse/[slug]/curate` envoie les curateurs vers P20 et P22, réservées aux admins (redirection vers `/`).
7. **Doublons kpop et anime.** A06 est une copie de P07. A02, A04, A05 sont P01, P14, P13 importés (même code, bien). Trois admins d'images : P18 (Verse), A01 Images, A03 Photos ; A01 et A03 écrivent la même table entity_images et le même bucket (R14 import contre R45 fetch, R11 contre l'action remove de R43, R16 contre R43). P06 fait la même chose que le bouton DM du profil.
8. **Effets entre sites.** R36 n'a pas de `forSite` (A02 montre des totaux réseau). R37 retire les quiz du compte sur tous les sites ; R39 republie tous ses quiz retirés, y compris ceux retirés par modération avant le ban. R08 à R10 et R31 n'ont pas de `forSite`. A03, sur le build anime, modifie des idols et groupes kpop.
9. **Écritures sans contrôle d'origine.** Seules R11 à R16 et R43 à R45 vérifient la même origine. Les autres écritures comptent sur le SameSite des cookies ; O03 et les crons écrivent sur un GET.
10. **Code mort à côté.** `apps/blindtest` garde son propre admin (section 6). Le cron O07 écrit spotify_snapshots, que rien ne lit.

## 9 bis. Résultats (lecture seule en production, 2026-10-30)

Lancées par l'intégrateur, en lecture seule, sans aucun nom, email ou id. Les cellules ci-dessus portent le résultat.

- **Q25, règles ouvertes, fermées en production le 2026-10-30 :** relevé après correctif : `pinterest_auth`, `pinterest_boards`, `pinterest_pins` et `quiz_pinterest_cards` n'ont plus de policy ni de droit pour anon et authenticated ; `songs` et `blind_test_songs` n'ont plus que leur policy de lecture, donc le public ne peut que les lire. Aucune ligne perdue (relevé du 2026-10-31 : 4 291 songs, 349 blind_test_songs, 217 pins, 219 cartes). `/admin/songs` ne peut plus ajouter, modifier ni supprimer jusqu'au déploiement d'ADMIN-1, qui écrit avec la clé service après la garde. Ces deux tables et quatre autres tables `pinterest_*` (csv_batches, originals, scrape_jobs, scraped, sans policy) gardent des droits SQL sans effet par l'API, à retirer au nettoyage.
- **Q25, stockage :** aucune règle d'écriture ouverte trouvée dans `storage.objects` en production (les quatre noms cités en section 7 n'y sont pas).
- **Q25, byeol (à regarder après le lancement, décision du owner) :** `byeol_daily_caps` ("Service role can manage caps", ALL, `auth.uid() = user_id`) et `byeol_reward_history` ("Service role can insert rewards", INSERT) laissent un utilisateur connecté écrire ses propres plafonds et récompenses. Sans risque pour un visiteur anonyme.
- **Q26, fonctions :** `admin_delete_account` (DEFINER) et `bt_runs_admin_stats` fermées à anon et authenticated ; `gate_notification_prefs` (DEFINER) ouverte, c'est un déclencheur, à vérifier dans ADMIN-1.

## 9. Requêtes à lancer (lecture seule)

À lancer par le owner, dans une transaction en lecture seule :

```sql
begin transaction read only;
-- coller une requête ici
rollback;
```

Aucune ne lit un nom, un email ou un id d'utilisateur. Si une table ou une colonne n'existe pas (SQL en attente), noter "pas en base" dans la cellule.

**Q01** ai_visibility_checks (P02, R01)
```sql
select max(checked_at) as derniere, count(*) filter (where checked_at > now() - interval '90 days') as n_90j, count(*) as total
from public.ai_visibility_checks;
```

**Q02** jeux blind test (P03, O02)
```sql
select max(created_at) as derniere, count(*) filter (where created_at > now() - interval '90 days') as n_90j, count(*) as total
from public.games where game_type = 'blind_test';
```

**Q03** contenus cachés et rendus (P05, R05)
```sql
select max(restored_at) as derniere_restauration,
       count(*) filter (where restored_at > now() - interval '90 days') as restaures_90j,
       max(hidden_at) as dernier_masquage,
       count(*) filter (where restored_at is null) as encore_caches
from public.community_autohidden;
```

**Q04** DM admin (P06, R19)
```sql
select max(created_at) as derniere, count(*) filter (where created_at > now() - interval '90 days') as n_90j, count(*) as total
from public.creator_notifications where type = 'admin_dm';
```

**Q05** brouillons éditoriaux (P07, A06, R06, R07, O04). Si la colonne site_id existe, l'ajouter au group by.
```sql
select status, count(*) as n, max(reviewed_at) as derniere_revue,
       count(*) filter (where reviewed_at > now() - interval '90 days') as revues_90j,
       max(published_at) as derniere_publication
from public.editorial_drafts group by status order by status;
```

**Q06** comebacks (P09, R03, R04)
```sql
select max(created_at) as dernier_ajout, count(*) filter (where created_at > now() - interval '90 days') as n_90j,
       count(*) filter (where active) as actifs, count(*) as total
from public.comebacks;
```

**Q07** MV suivis (P09, R17, R18)
```sql
select max(created_at) as dernier_ajout, count(*) filter (where created_at > now() - interval '90 days') as n_90j,
       count(*) filter (where active) as actifs, count(*) as total
from public.mv_tracking;
```

**Q08** idols créés par des curateurs (P10, R41). Demande la colonne origin (SQL 147).
```sql
select count(*) filter (where needs_review) as en_attente, max(created_at) as derniere_creation,
       count(*) filter (where created_at > now() - interval '90 days') as crees_90j
from public.idols where origin = 'curator';
```

**Q09** Pulse (P11, R21, R22, O06)
```sql
select 'pulse_citations' as t, max(created_at) as derniere, count(*) filter (where created_at > now() - interval '90 days') as n_90j, count(*) as total from public.pulse_citations
union all
select 'pulse_reports', max(updated_at), count(*) filter (where updated_at > now() - interval '90 days'), count(*) from public.pulse_reports;
```

**Q10** banque du quiz du jour (P12, R23, R24, O03)
```sql
select status, count(*) as n, max(updated_at) as derniere_modif,
       count(*) filter (where updated_at > now() - interval '90 days') as modifies_90j,
       max(verified_at) as derniere_verif
from public.quiz_bank group by status order by status;
```

**Q11** quiz du jour posés (P01, R02, R33, O03)
```sql
select selection_method, max(created_at) as derniere, count(*) filter (where created_at > now() - interval '90 days') as n_90j, count(*) as total
from public.qotd_log group by selection_method;
```

**Q12** signalements et quiz retirés (P01, R27, R28, R31)
```sql
select status, count(*) as n, max(created_at) as dernier_signalement,
       count(*) filter (where created_at > now() - interval '90 days') as n_90j
from public.reports group by status;
select count(*) as quiz_retires from public.quizzes where status = 'removed';
```

**Q13** groupes en attente (R08, R09, R10, R20)
```sql
select count(*) filter (where needs_review) as en_attente,
       max(created_at) filter (where needs_review) as plus_recent_en_attente,
       count(*) filter (where created_at > now() - interval '90 days') as crees_90j
from public.groups;
```

**Q14** bans (R37, R39)
```sql
select count(*) filter (where banned_at is not null) as bannis, max(banned_at) as dernier_ban,
       count(*) filter (where banned_at > now() - interval '90 days') as bans_90j
from public.profiles;
```

**Q15** chansons du blind test (P15, P16, P17, R34, R35)
```sql
select max(created_at) as dernier_ajout, count(*) filter (where created_at > now() - interval '90 days') as ajouts_90j,
       max(updated_at) as derniere_modif, count(*) filter (where updated_at > now() - interval '90 days') as modifs_90j,
       count(*) as total
from public.blind_test_songs;
```

**Q16** images de blocs Verse (P18, O19). Demande la colonne reviewed_at (SQL 146).
```sql
select status, count(*) as n, max(created_at) as dernier_ajout, max(reviewed_at) as derniere_moderation,
       count(*) filter (where reviewed_at > now() - interval '90 days') as moderes_90j
from public.verse_space_assets where kind = 'image' group by status;
```

**Q17** overrides Verse (P19, R41)
```sql
select max(updated_at) as derniere, count(*) filter (where updated_at > now() - interval '90 days') as n_90j, count(*) as total
from public.entity_overrides;
```

**Q18** files Verse à revoir (P19, R41)
```sql
select (select count(*) from public.albums where review_flag) as albums_a_revoir,
       (select count(*) from public.idols where needs_review) as idols_a_revoir;
```

**Q19** tournées, émissions, OST, prix (P20)
```sql
select 'tours' as t, count(*) as total, max(created_at) as dernier, count(*) filter (where created_at > now() - interval '90 days') as n_90j from public.tours
union all select 'shows', count(*), max(created_at), count(*) filter (where created_at > now() - interval '90 days') from public.shows
union all select 'osts', count(*), max(created_at), count(*) filter (where created_at > now() - interval '90 days') from public.osts
union all select 'awards', count(*), max(created_at), count(*) filter (where created_at > now() - interval '90 days') from public.awards;
```

**Q20** suggestions d'édition (P22)
```sql
select status, count(*) as n, max(reviewed_at) as derniere_revue,
       count(*) filter (where reviewed_at > now() - interval '90 days') as revues_90j,
       max(created_at) as derniere_suggestion
from public.verse_edit_suggestions group by status;
```

**Q21** photos des entités (A01, A03, R11 à R16, R43). Table de 018 (en attente).
```sql
select site_id, kind, count(*) as n, max(updated_at) as derniere_modif,
       count(*) filter (where updated_at > now() - interval '90 days') as modifs_90j
from public.entity_images group by site_id, kind order by site_id, kind;
```

**Q22** images du site Bunnyverse (A03, R44). Table de 022 (#174, en attente).
```sql
select count(*) as versions, max(created_at) as dernier_ajout,
       count(*) filter (where created_at > now() - interval '90 days') as n_90j,
       count(*) filter (where retired_at is null and published_at is not null) as en_ligne
from public.site_assets;
```

**Q23** mots interdits (O10, O34)
```sql
select action, count(*) as n, max(created_at) as dernier, count(*) filter (where created_at > now() - interval '90 days') as n_90j
from public.verse_banned_terms group by action;
```

**Q24** relevés des crons (O05, O07)
```sql
select 'mv_snapshots' as t, max(snapshot_date) as dernier, count(*) filter (where snapshot_date > current_date - 90) as n_90j from public.mv_snapshots
union all
select 'spotify_snapshots', max(snapshot_date), count(*) filter (where snapshot_date > current_date - 90) from public.spotify_snapshots;
```

**Q25** policies ouvertes encore en place (section 7)
```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('blind_test_songs', 'songs', 'quiz_bank', 'pinterest_pins', 'pinterest_auth', 'pinterest_boards',
                                               'quiz_pinterest_cards', 'ai_visibility_checks', 'byeol_reward_history', 'byeol_daily_caps'))
   or (schemaname = 'storage' and policyname in ('quiz_bg_auth_upload', 'quiz_bg_auth_delete', 'quiz_cards_auth_upload', 'quiz_cards_auth_update'))
order by schemaname, tablename, policyname;
```

**Q26** fonctions "admin" et leurs droits (section 7)
```sql
select p.proname, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_peut,
       has_function_privilege('authenticated', p.oid, 'execute') as connecte_peut
from pg_proc p
where p.pronamespace = 'public'::regnamespace and (p.proname ilike '%admin%' or p.prosrc ilike '%admin%')
order by p.proname;
```

**Q27** jetons Pinterest présents (section 7). Ne lit pas les jetons.
```sql
select count(*) as lignes, max(updated_at) as derniere_maj from public.pinterest_auth;
```

**Q28** parties de blindtest suivies (P04). Table de v12-g1-bt-runs.
```sql
select max(created_at) as derniere_partie,
       count(*) filter (where created_at > now() - interval '90 days' and not is_test) as parties_90j
from public.bt_runs;
```
