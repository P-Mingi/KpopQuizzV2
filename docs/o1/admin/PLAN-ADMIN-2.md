# PLAN ADMIN-2 : un seul admin, sur bunnyverse.org, à une adresse secrète (plan seulement)

Plan écrit avec ADMIN-1 (2026-10-30). Aucun code ici. ADMIN-2 démarre après le merge d'ADMIN-1 et après que le owner a coché INVENTAIRE.md.

## 0. Point de départ (ADMIN-1)

- Une seule porte serveur : `requireAdmin()` (`apps/quiz/src/lib/admin/guard.ts`) : session vérifiée par Supabase, id dans `ADMIN_USER_IDS`, niveau `aal2`. Tout le reste répond 404.
- Pages de code TOTP et de mise en place sous `/admin/k7q2m/` (kpop et anime).
- Le test statique `lib/admin/admin-lock.static.test.ts` et le test d'exécution `admin-lock.refusal.test.ts` gardent cette règle. ADMIN-2 les déplace vers le nouvel arbre, sans les affaiblir.

## 1. Une seule adresse : bunnyverse.org/<ADMIN_PATH>

- Variable `ADMIN_PATH` : marquée **Sensitive** dans Vercel, posée sur le projet **fandomverse** seulement (le build hub de bunnyverse.org). Jamais sur kpopquiz ni otakuquiz, jamais dans le dépôt, jamais dans un log. Au moins 24 caractères aléatoires (lettres minuscules et chiffres).
- Le middleware du build hub, et lui seul, reconnaît `/<ADMIN_PATH>` et `/<ADMIN_PATH>/**` et fait un **rewrite** vers l'arbre interne de l'admin (par exemple `app/sites/[site]/(hub)/admin/**`). L'adresse affichée reste l'adresse secrète.
- Le middleware pose sur ce rewrite un en-tête de requête interne (par exemple `x-admin-door`) et **retire cet en-tête de toute autre requête**. Le layout de l'admin interne répond `notFound()` sans cet en-tête : un accès direct au chemin interne (ou à `/admin` du hub, que le catch-all de `next.config.ts` enverrait au même dossier) est une 404, avant `requireAdmin`.
- Sans `ADMIN_PATH` (preview, dev, autre projet), l'admin n'existe pas : 404 partout. En dev local, une valeur dans l'env local du développeur.
- Les pages TOTP suivent l'adresse secrète (`/<ADMIN_PATH>/code`, `/<ADMIN_PATH>/setup`) : `paths.ts` lit le préfixe côté serveur et le passe aux formulaires en prop (jamais inliné dans un bundle public).
- robots.txt ne change pas ; aucune page, aucun sitemap, aucun lien ne nomme l'adresse. En-têtes `X-Robots-Tag: noindex, nofollow` et `Cache-Control: no-store` comme dans ADMIN-1.

## 2. Trois sections, le site choisi dans l'interface

- Sections **Bunnyverse**, **KpopQuiz**, **OtakuQuiz** dans la navigation de l'admin. Le site est un choix de l'interface (paramètre `site` dans l'URL et dans le corps des requêtes), plus jamais l'hôte ni `SITE_ID`.
- Côté serveur : chaque route valide `site` contre `SITE_IDS`, puis lit et écrit avec la clé service après `requireAdmin('api')`, en filtrant par ce site (une variante explicite de `forSite`/`withSite` qui prend le site en argument). `check-site-scope` doit rester propre.
- Les correctifs "scoper par site" de l'inventaire viennent avec : R08 à R10 et R31 (groupes, signalements), R36 (stats réseau), R37 et R39 (ban et déban : ne republier que ce que le ban a retiré).
- Le cache des sites publics : une écriture faite depuis le hub ne peut pas vider le cache (`revalidateTag`) des déploiements kpop et anime. Il faut une route de revalidation par site (POST, secret partagé, liste fermée de tags), appelée par l'admin après chaque écriture qui touche une page publique. À construire et tester avant de retirer les admins kpop et anime.

## 3. Ce qui disparaît

- Les pages et routes que le owner coche "supprimer" dans INVENTAIRE.md (sections 1 à 6). Propositions de l'inventaire, à confirmer par les coches : P02 (si Q01 est vide), P03, P08, R02, R12, R29, le GET de R25, le cron O07 (spotify-snapshot), `apps/blindtest` entier. Les "fusionner" deviennent une seule page dans la section qui convient (P06 dans le DM du profil, P10, P18, P20, P21 dans Verse, P15 à P17 en une page, A01 et A03 en un onglet Images, A06 dans P07, P04 en carte du tableau de bord).
- **kpopquiz.org/admin et bunnyverse.org/anime/admin répondent 404** : l'arbre `app/(site)/admin/**` et `app/sites/[site]/(anime)/admin/**` est supprimé des builds kpop et anime ; `/admin` sort des listes de session du middleware et des route maps (`registry.ts`, `route-allowlist.ts`) ; les routes `/api/admin/**` ne répondent que sur le build hub (404 ailleurs, comme `route-kit.ts` le fait déjà pour l'anime).
- Les boutons admin des pages publiques (bouton DM du profil, retrait d'un quiz, O33) deviennent des liens vers l'admin unique, ou disparaissent selon les coches.

## 4. Journal des actions admin (migration)

- Migration additive dans `docs/pending-migrations/multisite/` (le prochain numéro libre au moment d'ADMIN-2), avec son rollback et sa vérification `docs/launch/o1/checks/V-<numéro>`. Appliquée par le owner seulement.
- Table `admin_actions` : `id` (identity), `at timestamptz default now()`, `admin_id uuid`, `site_id text references sites(id)`, `action text`, `target_type text`, `target_id text`, `detail jsonb` (sans donnée personnelle : pas d'email, pas de texte libre d'un utilisateur), `request_id text`. RLS activée, aucune policy, `revoke all from anon, authenticated` : écrite et lue par la clé service seulement.
- Un helper `logAdminAction(ctx, …)` dans `lib/admin/` appelé par chaque route d'écriture après le succès ; le test statique échoue si une route d'écriture de l'admin ne l'appelle pas. Une page "Journal" (lecture, 200 dernières lignes, filtre par site).

## 5. Nouveau code TOTP après 12 heures

- `requireAdmin` lit `currentAuthenticationMethods` du niveau (le `amr` du jeton vérifié) : l'entrée `totp` porte l'heure de la dernière vérification. Plus de 12 heures : une page envoie vers la page de code, une route répond 404, même à `aal2`.
- La page de code accepte alors une session déjà `aal2` (Supabase permet `challengeAndVerify` à `aal2`) et renvoie vers l'adresse demandée (chemin interne validé, jamais une URL externe).
- Tests sur horloge figée : 11 h 59 passe, 12 h 01 demande le code, un jeton sans entrée `totp` est refusé.

## 6. Ordre et preuves

1. Coches du owner dans INVENTAIRE.md (porte).
2. Arbre admin interne sur le build hub, `ADMIN_PATH`, en-tête de porte, 404 directs ; tests statiques et d'exécution portés.
3. Sections par site, routes avec `site` explicite, revalidation croisée.
4. Journal (migration en attente, appliquée par le owner) et `logAdminAction`.
5. Code TOTP toutes les 12 heures.
6. Retrait des admins kpop et anime (404), suppression des pages cochées.
7. Preuves : tsc, vitest sans les flags UX, check:routes, check:verse-tokens, twins, check-site-scope, builds kpop, anime et hub, preuves curl (adresse secrète 200 pour l'admin, 404 sinon, `/admin` 404 sur les trois), parité 60/60 de kpopquiz.org (bruit connu seulement).

## 7. Risques

- Fuite de `ADMIN_PATH` : sans effet seul (la porte reste `requireAdmin` avec `aal2`), on change la variable et on redéploie.
- Un rewrite mal borné qui ouvrirait l'arbre interne : couvert par l'en-tête de porte et ses tests (requête directe, en-tête forgé par le client, préfixe partiel).
- Le cache public des autres sites après une écriture depuis le hub (section 2) : bloquant avant de retirer les admins kpop et anime.
