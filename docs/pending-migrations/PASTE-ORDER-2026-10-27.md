# Ordre de collage des SQL, 27 octobre 2026

Tu colles chaque fichier dans l'éditeur SQL de Supabase (projet kpopquiz.org), dans cet ordre,
un à la fois. Après chacun, dis-moi « collé n° X » : je vérifie en lecture seule que la base est
dans l'état attendu avant que tu passes au suivant. Si un fichier affiche une erreur, arrête-toi
et colle-moi le message : chaque fichier est une transaction, une erreur n'a rien changé.

État vérifié le 27 octobre 2026 avant d'écrire cette page :
- les tables `quiz_explanations`, `seo_index_status`, `seo_index_checks` et la colonne
  `plays.per_question_correct` n'existent pas encore ;
- les 233 explications du lot E1 correspondent toujours aux questions en ligne ;
- aucune ligne de la banque n'occupe les dates du 3 au 22 décembre ; le lot 2 est en place
  (20 lignes) ;
- le quiz ITZY et sa ligne de banque ont toujours le contenu lu le 25 octobre.

## Comment copier un fichier

Chaque commande récupère la version de `main` sur GitHub et la met dans le presse-papiers, quelle
que soit la branche ouverte dans ton dossier. Ensuite, dans Supabase : **SQL Editor**, **New
query**, colle (Cmd+V), **Run**. Supabase peut demander de confirmer une opération qui modifie des
données : confirme.

## 1. La table des explications

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/seo-quiz-explanations.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». Je vérifie : la table `quiz_explanations`
existe, vide, avec la lecture publique des lignes vérifiées seulement.

## 2. La colonne bon/faux par question

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/seo-plays-per-question-correct.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». Instantané même sur une grosse table (colonne
vide, pas de réécriture). Je vérifie : la colonne `plays.per_question_correct` et son contrôle.

## 3. Les tables du suivi d'indexation

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/seo-index-status.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». Je vérifie : `seo_index_status` et
`seo_index_checks` existent, vides, réservées au serveur (aucun accès public).

## 4. Le lot E1 d'explications (233 lignes, 38 quiz)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/seo-explanations-e1.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». Le fichier est long (environ 78 Ko) : c'est
normal. S'il répond « row(s) no longer match their quiz », un créateur a modifié une question
depuis le 27 octobre : rien n'a changé, je régénère le lot. Je vérifie : 233 lignes, 38 quiz,
toutes « verified ».

## 5. Le lot 3 de la banque (20 quiz, 3 au 22 décembre)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/daily-bank-2026-12-lot3.sql | pbcopy
```

Résultat attendu : « Success. No rows returned » (environ 91 Ko). Je vérifie ligne par ligne :
20 lignes, une par date du 3 au 22 décembre, 200 questions, titres et groupes du fichier,
« checked by Louis Pecchia on 2026-10-25 ». Le 3 décembre au matin, /daily doit montrer
« ITZY: From Debut to Born to Be ».

## 6. La correction du quiz ITZY

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quiz-itzy-crazy-in-love-era-fix.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». S'il répond « not in the read on 2026-10-25
state », le quiz a changé depuis : rien n'a changé, dis-le moi. Je vérifie : md5 du quiz
`814d81f7d3a45d366bf14fca805eb3ba`, de la ligne de banque `93e0174f935d77a793f019e35b2c2079`,
`updated_at` inchangé. La page montre le nouveau texte dans l'heure.

## 7. Six quiz en brouillon

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quizzes-draft-2026-10-27.sql | pbcopy
```

Résultat attendu : « Success. No rows returned ». Passent en brouillon : finnish-the-lyric,
k-pop-dating-and-relationships-verified-facts-only, k-pop-sasaeng-and-fan-culture-dark-side,
can-you-recognize-these-idols-as-kids, kpop-geral, et le doublon this-is-only-for-true-gllits.
Les deux sondages restent publiés. Je vérifie : ces 6 quiz en brouillon, rien d'autre. Ensuite
je merge #137 : l'adresse du doublon renvoie (301) vers this-is-only-for-true-gllits-2.

## Prêts, en attente de ton go (même méthode : colle, puis dis-moi « collé »)

### 8. Les corrections des quiz Team (à coller après le n° 4)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quiz-team-fixes-2026-10-27.sql | pbcopy
```

Cinq quiz Team corrigés (gi-dle-the-tomboy-era, 4th-gen-groups-true-or-false,
k-pop-streaming-records, bts-music-video-trivia-can-you-get-100, twice-members-facts-quiz) et
MAMAMOO « Curtain Call » en brouillon. Une preuve par changement :
`quiz-team-fixes-2026-10-27.md`. Résultat attendu : « Success. No rows returned ». S'il répond
« not in the read on 2026-10-27 state », un de ces quiz a changé : rien n'a changé, dis-le moi. Je
vérifie : les md5 corrigés des 5 quiz et de leurs lignes de banque, MAMAMOO en brouillon, et les 4
explications E1 mises à jour (3 suivent leur question, 1 retirée).

### 9. Les demandes de correction aux créateurs (schéma, puis les 5 demandes)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quiz-corrections-schema.sql | pbcopy
```

puis

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quiz-corrections-e1.sql | pbcopy
```

Le schéma ajoute le type de notification `quiz_correction` et la table des demandes ; le second
fichier crée les 5 demandes (pas encore envoyées). Rien n'est envoyé aux créateurs tant que le
cron n'est pas déclaré : je l'ajoute juste après la fusion A5, puis le job envoie les messages au
passage suivant (09 h 30 UTC). Résultat attendu pour chacun : « Success. No rows returned ».

### 10. Le lot E2 d'explications (197 lignes, 40 quiz, à coller après le n° 1)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/seo-explanations-e2.sql | pbcopy
```

Même circuit et même contrôle que le lot E1 (`docs/seo/strategy-2026-10-27/explanations/e2/`).
Résultat attendu : « Success. No rows returned ». S'il répond « row(s) no longer match their
quiz », un créateur a modifié une question : rien n'a changé, je régénère le lot. Je vérifie :
197 lignes, 40 quiz.

### 11. Les 12 demandes de correction du lot E2 (à coller après le n° 9)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2 && git fetch -q origin && git show origin/main:docs/pending-migrations/quiz-corrections-e2.sql | pbcopy
```

12 réponses fausses dans 9 quiz de joueurs (liste et textes dans
`docs/seo/strategy-2026-10-27/explanations/e2/QUIZ-ISSUES-E2.md` et dans le fichier lui-même).
Comme pour le n° 9, rien n'est envoyé avant que le cron soit déclaré. Résultat attendu :
« Success. No rows returned ».

## Pas encore prêt ou pas encore accordé

- La déclaration du compte kpopquizz en compte Team : la liste de ce que ça change est dans
  `docs/seo/strategy-2026-10-27/KPOPQUIZZ-TEAM-IMPACT.md`. Pas avant ton accord.
- Les lots d'explications E3 et suivants : je les ajouterai ici quand ils seront prêts.

## Retours arrière

Chaque fichier a son retour arrière à côté (même nom, avec `-rollback`). Ne les colle que si je
te le demande.
