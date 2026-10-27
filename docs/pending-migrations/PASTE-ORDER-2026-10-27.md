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

## À venir (pas encore prêts, je les ajouterai ici)

- Les corrections des quiz Team aux réponses fausses, dans un seul fichier (MAMAMOO « Curtain
  Call » y passe en brouillon). À coller après le n° 4.
- Le schéma des demandes de correction aux créateurs (nouveau type de notification, table des
  demandes) et les 5 premières demandes.
- La déclaration du compte kpopquizz en compte Team : pas avant ton accord sur la liste de ce que
  ça change.
- Les lots d'explications E2 et suivants.

## Retours arrière

Chaque fichier a son retour arrière à côté (même nom, avec `-rollback`). Ne les colle que si je
te le demande.
