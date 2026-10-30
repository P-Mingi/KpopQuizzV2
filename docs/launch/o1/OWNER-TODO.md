# Lancement de Bunnyverse : où on en est (2026-10-28, nom Bunnyverse le 2026-10-29)

Une page d'état. Les actions, dans l'ordre, avec qui fait quoi, la durée et les lignes à copier : `OWNER-NOW.md`.
Le détail de chaque étape (en anglais) : `RUNBOOK.md`. Le retour arrière : `ROLLBACK.md`.

## En bref

- Moi : environ 4 h 45 en 49 étapes (4 h 55 avec les deux étapes « si besoin »). Claude : environ 7 h 30. Worker : environ 14 h 25, dont 7 h 50 à surveiller des journaux.
- Durée : au moins 5 jours de la session B au jour J (veilles de 24 h après B, après 008 et après 010), puis 72 h de veille. Au plus tôt : B le jour 1, jour J le jour 5, fin le jour 8.
- Je peux commencer maintenant : étapes 1 à 4 de `OWNER-NOW.md` (domaine, DNS, clé, adresses de retour). La suite attend la fusion des lanes par l'intégrateur.

## État

- En production : S4 (2026-10-23, D-103) et Mission U partie D (2026-10-27, D-127). Rien d'autre.
- Fichiers de lancement : L01 à L08, L10-PERS et L12, en mode « verified », sans DRAFTS (50 séries, 268 quiz, 99 lignes du jour, 10 quiz de personnalité). La lane 2 y met les domaines et les adresses Team ; Claude les contrôle (J2), l'intégrateur les répète (J3).
- Vercel, par l'intégrateur le 2026-10-28 (exception CLI) : `fanquiz` renommé `fandomverse`, variables de production de `fandomverse` et `otakuquiz`, les trois secrets passport identiques sur les trois projets, `CRON_SECRET`, le groupe Microfrontends `fandomverse`. Aucun domaine attaché. Builds des deux nouveaux projets en pause (`exit 0`) jusqu'au jour J.
- `apps/quiz/vercel.json` liste `passport-deletions` et `passport-cleanup` (18 crons).
- kpopquiz.org : mentions légales et `privacy/age-15` fusionnées (#122, #123), identité légale remplie (D-114). Images par série faites (D-122).
- Google : aucune origine JavaScript, aucun client nouveau. Discord : rien. Resend et le hook d'e-mail : reportés (D-115) ; bunnyverse.org n'a pas de connexion par e-mail.

## Ce qui est décidé

Le 2026-10-28 :
1. « FanQuiz » devient « FandomVerse » le 2026-10-28, puis « Bunnyverse » le 2026-10-29 (fandomverse.net et .com sont pris ; pas de .com pour Bunnyverse). Un seul domaine, `bunnyverse.org` : le hub à `/`, OtakuQuiz à `/anime`, plus tard `/kdrama` et `/cpop`. kpopquiz.org reste à part et ne change pas.
2. Connexion sur bunnyverse.org : Google (le client de kpopquiz.org) et Discord, pas d'e-mail. Le hub et `/anime` partagent la session. Entre kpopquiz.org et bunnyverse.org, le ticket passport reste.
3. Logos : le lapin et « Bunnyverse », le lapin et « OtakuQuiz ».
4. Pas de calendrier : on lance dès que tout est prêt. Veilles de 24 h après B, 008 et 010. Une sauvegarde avant chaque session SQL.
5. Vercel par l'intégrateur en CLI (exception). Moi : la clé `service_role` en variable partagée.
6. Comptes Team : `<username>@team.bunnyverse.org`, un sous-domaine qui ne reçoit aucun courrier.
7. Mes pages en français et allégées : je garde seulement ce que moi seul peux faire ; toutes les vérifications passent à Claude ou à un worker ; moins de 5 h pour moi.
7 bis. Le 2026-10-29, le renommage ne touche que ce que le public voit (noms, domaine, logo, image de partage, e-mails, pages légales). Le projet Vercel `fandomverse`, le groupe Microfrontends `fandomverse`, le cookie `__Host-fv_oauth` et les autres noms internes restent.

Toujours valables (D-099, D-124) :
8. `L10-PERS-personality.sql` part au lancement, entre L08 et L12.
9. Les tables du hub `001-quiz-daily-plays` et `002-xp-daily-snapshots` et leurs deux crons : oui, après les drapeaux réseau, hors du chemin de lancement.
10. Les valeurs de marque du hub sont acceptées telles quelles dans `apps/quiz/src/lib/site/registry.ts`.
11. Un fait vérifié devient une ligne trivia publiée. L01 passe au lancement. Le quiz du jour anime est daté avec l'outil de banque et `QOTD_ROTATION_FIX=1` sur `otakuquiz`. Données d'organisation dans le pied de page de kpopquiz.org. `NET_INDEXING` en tout dernier.

Abandonné le 2026-10-28 : le calendrier daté (lancement au 1er décembre), les veilles de 7 et de 3 jours, les domaines `otakuquiz.org` et `fanquiz.org`, deux nouveaux clients Google, `team.otakuquiz.org`.

## Mes décisions restantes

- Quand commencer la session B (pas de calendrier).
- Les « go » déjà placés dans `OWNER-NOW.md` : la fusion (étape 6), le go / no-go (étape 36), l'annonce (étape 55), la fin à +72 h (étape 63).
- Au jour J, si V10 trouve un reste K-pop déjà connu sur `/anime` (`docs/o1/RAPPORT-FINAL.md`, section 5) : corriger d'abord, ou accepter et dater.
- Si les crons d'OtakuQuiz n'arrivent pas après le jour J (`ARCHITECTURE-BUNNYVERSE.md`, section 7) : ajouter des entrées `/anime/api/cron/...` dans `vercel.json`, ce qui touche la liste des crons de kpopquiz.org.
- Plus tard, hors lancement : brancher Resend et le hook d'e-mail (RUNBOOK I) ; supprimer les branches Supabase `o1-dev` et `o1-scratch` une fois le lancement stable (D-113).
