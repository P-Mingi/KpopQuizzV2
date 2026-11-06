# Lancement de Bunnyverse : où on en est (2026-10-28, nom Bunnyverse le 2026-10-29)

Une page d'état. Les actions, dans l'ordre, avec qui fait quoi, la durée et les lignes à copier : `OWNER-NOW.md`.
Le détail de chaque étape (en anglais) : `RUNBOOK.md`. Le retour arrière : `ROLLBACK.md`.

## En bref

- Moi : environ 4 h 50 en 49 étapes, code admin compris (5 h 05 avec les deux étapes « si besoin »). Claude : environ 7 h 30. Worker : environ 14 h 25, dont 7 h 50 à surveiller des journaux.
- Durée : au moins 5 jours de la session B au jour J (veilles de 24 h après B, après 008 et après 010), puis 72 h de veille. Au plus tôt : B le jour 1, jour J le jour 5, fin le jour 8.
- Je peux commencer maintenant : étapes 1 à 4 de `OWNER-NOW.md` (domaine, DNS, clé, adresses de retour). La suite attend la fusion des lanes par l'intégrateur.

## Calendrier recalé (décision du 2026-11-06)

Le jour 0 est le jour de D. Heures en UTC. Les sessions se font au Mac, ou sans lui depuis un codespace (`CODESPACE.md`).

- **Jour 0 :**
  - D (008) dès que possible, au plus tard vers 22:00, pour que la veille couvre la nuit. Jamais entre 23:50 et 00:30, et loin de 00:05 et de 03:30 à 05:00 (les crons).
  - Tout de suite après : la preuve avec le compte jetable (étape 22), puis les contrôles de Claude.
  - Puis les logos, dans le même terminal : 001, 002, V-logos. Claude donne les trois commandes.
- **La nuit :** la veille après D, au lieu de 24 h.
- **Jour 1, 09:30 :** le contrôle de la veille. Claude fait l'audit des compteurs, l'égalité des XP, les signatures et les journaux. Toi : la même preuve avec le compte jetable, puis tu le supprimes (étape 23).
- **Jour 1, dès 10:00,** si la veille est propre :
  1. E1b (025), avec sa sauvegarde. La PR de E1b (#204) est fusionnée avant.
  2. La session E, avec sa sauvegarde : E1 (009), le contrôle du déploiement (étape 26), puis E2 (010), jamais après 23:45.
  3. La session G, avec sa sauvegarde. La PR de o1/integration (#203) est fusionnée avant, sur ton accord.
  4. K2, avec sa sauvegarde.
- **Nuit du jour 1 au jour 2 :** après 00:05, le quiz du jour (étape 28) ; à 00:40, V7.

## Au prochain passage au Mac

- **Installer Chrome Remote Desktop,** pour lancer les sessions depuis le téléphone. Une fois testé, c'est la route à préférer au codespace : la sauvegarde reste sur le Mac et ne passe pas chez GitHub.
  1. Sur le Mac, dans Chrome : remotedesktop.google.com/access, **Configurer l'accès à distance**, installe l'hôte. Dans Réglages Système, accorde-lui Accessibilité et Enregistrement de l'écran.
  2. Choisis un code PIN d'au moins 6 chiffres, utilisé nulle part ailleurs. Garde la validation en deux étapes du compte Google.
  3. Le Mac doit rester allumé et éveillé sur secteur : Réglages Système, Batterie, empêcher la mise en veille automatique.
  4. Sur le téléphone : l'app Chrome Remote Desktop, avec le même compte Google. Teste une fois : ouvre Terminal sur le Mac et lance `psql --version`.
- **Rapatrier les sauvegardes faites dans un codespace,** les vérifier, puis les effacer du codespace (`CODESPACE.md`, section 4).

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
5. Vercel par l'intégrateur en CLI (exception). Moi : la clé `service_role` en variable de projet sur `fandomverse` et `otakuquiz`.
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
