# Stratégie SEO du 27 octobre 2026 : rapport de la phase 0

Aucun quiz ne passe en noindex. Aucun SQL n'a été lancé en production. Le code des pages /q/
n'a pas été touché.

## 1. Doublons (kpop et anime)

Fichiers : `DUPLICATES-2026-10-27.md` (lisible) et `dupes.json` (machine).

- kpopquiz.org : 494 quiz comparés, 104 groupes de quiz proches. otakuquiz.org (base O1) :
  284 quiz, 35 groupes.
- Une seule fusion 301 à vous soumettre : `this-is-only-for-true-gllits` (41 parties) vers
  `this-is-only-for-true-gllits-2` (105 parties). Même créateur, même jour, 10 questions sur 10
  identiques. La fusion perd 2 j'aime, sauf s'ils sont déplacés.
- Aucune autre paire ne dépasse 60 % de questions communes. Le vrai problème : beaucoup de quiz
  visent la même recherche (11 « fan test » Cortis, 10 ILLIT, 8 Stray Kids, 7 BLACKPINK).
- Proposés : 323 nouveaux titre, H1 et description côté kpop, 82 côté anime, avec les liens
  « série ». Le titre du créateur reste affiché en sous-titre. 24 titres kpop et 19 titres anime
  enfreignent aujourd'hui la règle du hub (« {Groupe} Quiz »).
- Mise en œuvre en phase 1 : il faut un endroit pour ranger ces titres SEO sans toucher au titre
  du créateur (une petite table, SQL à votre go).

## 2. Pages de thème General K-pop

Fichiers : `THEMES-PLAN-2026-10-27.md` et `themes.json`.

- 10 thèmes, chacun sur le gabarit des pages de groupe : /kpop-history-quiz (19 quiz),
  /kpop-debut-quiz (8), /kpop-company-quiz (15), /kpop-fandom-quiz (25), /kpop-discography-quiz
  (23), /kpop-dance-quiz (8), /kpop-awards-quiz (9), /kpop-drama-variety-quiz (11),
  /kpop-idol-quiz (22), /kpop-groups-quiz (23).
- Les 170 quiz General K-pop publiés ont tous un thème ; 163 sont rangés. Les 7 autres sont
  tenus à l'écart pour vous : paroles, vie amoureuse, sasaeng, photos d'enfance, un quiz en
  portugais, deux sondages d'opinion.
- Parent : /general-kpop-quiz. Fil d'Ariane : Accueil, Quizzes, General K-pop Quiz, thème.
- Sous 5 quiz, une page de thème passe en noindex et sort du sitemap (règle des hubs vides).
- 15 quiz parlent d'un seul groupe mais sont rangés en General K-pop (liste dans le plan).

## 3. Explications sourcées : lot E1 (les 41 de Search Console)

Fichiers : `explanations/e1/` et `docs/pending-migrations/seo-explanations-e1.sql`.

- 233 explications, chacune avec sa source, pour 38 des 41 quiz. Elles vont dans une table à
  part (`quiz_explanations`) : le quiz du créateur n'est jamais modifié.
- Même circuit que les lots : 4 rédacteurs, 4 vérificateurs indépendants, l'agent dédié qui
  revérifie chaque point signalé avec une page ouverte (40 points : 21 gardés, 18 réécrits,
  1 retiré), puis une dernière lecture des textes réécrits.
- Mis de côté : un quiz en suédois, le quiz sur la vie amoureuse des idols, et ITZY (sa
  correction #133 réécrit le quiz ; ses explications viendront après).
- Le SQL refuse de s'appliquer si un créateur a modifié une question depuis le 27 octobre. Testé
  en local sur le vrai contenu.
- Ce que le circuit a trouvé dans les quiz eux-mêmes (`explanations/e1/QUIZ-ISSUES-E1.md`) :
  17 réponses fausses dans 11 quiz, 15 questions hors règles (santé, mineurs, paroles, litige),
  15 ambiguës, 10 invérifiables. Les quiz Team concernés peuvent être corrigés comme ITZY :
  MAMAMOO « Curtain Call » (6 réponses fausses : cet album n'existe pas), (G)I-DLE TOMBOY (2),
  4th gen true or false, streaming records, BTS clips, TWICE (1 chacun).
- La suite : 209 quiz publiés n'ont encore aucune explication (231 le 27 octobre, dont 22
  couverts par E1). Lots de 40, même circuit, un SQL par lot.

## 4. SQL de la colonne bon/faux et du statut d'indexation

Mergé (#134), à appliquer sur votre go : `seo-plays-per-question-correct.sql` (colonne
`plays.per_question_correct`), `seo-index-status.sql` (tables `seo_index_status` et
`seo_index_checks`), `seo-quiz-explanations.sql` (table des explications). Chacun avec son
retour arrière, testés en local.

## 5. Hygiène des anciennes URL

En production (#135), vérifié après déploiement :
- /battle?quiz= avec un identifiant de quiz : 301 vers le quiz (il répondait 404) ; sans quiz :
  410.
- /blind-test/* : 301 seulement vers une page qui existe vraiment, sinon 410 (avant, des 301
  menaient à des 404).
- /pt/*, /games/this-or-that/*, /games/name-all* : déjà en 301 ou 410, inchangés.
- Plus aucun lien interne vers /quizzes?group= : les pastilles de groupe de la recherche mènent
  au hub du groupe. Captures avant et après identiques au pixel.

## Pour la suite

- Phase 2 : le guide du compte de service Google est prêt (`GSC-URL-INSPECTION-GUIDE.md`). Il
  demande l'accès « Complet » à Search Console, nécessaire pour renvoyer le sitemap.
- Core Web Vitals : mesure de départ faite sur 5 pages /q/ (`cwv/baseline-2026-10-27.json`,
  mobile, CPU ralenti 4 fois, 4G lente, médiane de 3) : LCP 3,3 à 3,9 s, CLS 0 à 0,016, 448 Ko de
  JS. La même mesure sera refaite après la phase 1.
- Le compte `kpopquizz` (130 quiz) n'est pas dans `editorial_accounts` : ses quiz s'affichent
  comme ceux d'un joueur.

## Vos décisions

1. La fusion 301 des deux quiz ILLIT identiques.
2. Les pages de thème : quelle entrée depuis l'accueil (une rangée « Browse by topic » sur
   /quizzes serait un nouvel élément visible ; sinon /general-kpop-quiz dans la liste des
   groupes, sur le modèle existant), et les 7 quiz tenus à l'écart.
3. Le go pour les SQL : les trois tables (#134), puis le lot E1.
4. Les corrections des quiz Team aux réponses fausses (même méthode qu'ITZY), et le sort des
   quiz de joueurs signalés.
