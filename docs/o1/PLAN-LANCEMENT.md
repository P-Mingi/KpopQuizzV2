# Plan du lancement : les étapes

O1, 2026-11-02, réécrit sur la décision du propriétaire : aucune date. Une étape finie, la suivante commence. Le jour J arrive dès que tout est vert, et le go ou no-go se décide à ce moment-là.

États : **fait**, **en cours**, **attend X**.

## 1. Chemin critique

| # | Étape | Dépend de | État |
|---|---|---|---|
| C1 | Session B (001 à 007, `SITE_SCOPE=1`, veille d'1 h) | le propriétaire devant son Mac : bascule du dossier principal, sauvegarde | attend le propriétaire |
| C2 | Veille C : le lendemain matin, après les crons de la nuit | C1 | attend C1 |
| C3 | Session D (008) | C2 propre | attend C2 |
| C4 | Veille D3 : le lendemain matin, après les crons de la nuit | C3 | attend C3 |
| C5 | Session E (009, déploiement, 010), entre 18:00 et 22:20 | C4 propre | attend C4 |
| C6 | E5 et V7 le matin, après 00:05 | C5 | attend C5 |
| C7 | Session G (011 à 017, 018 à 023, lot K1), veille d'1 h : crée les tables des images et des jeux | C6 vert ; #188 fusionnée | attend C6 |
| C8 | Petite session K2 : sauvegarde, puis une commande | C7 ; fichier K2 prêt (P3) | attend C7 et P3 |
| C9 | Images posées par le propriétaire dans l'admin | C7 ; volet images (P6) en ligne | attend C7 et P6 |
| C10 | Go ou no-go | C8, C9, P1 à P7 verts | attend tout |
| C11 | Jour J : sessions J1 à J5, PR du jour J | C10 go | attend C10 |

## 2. En parallèle, dès maintenant

Au plus 2 sous-agents à la fois. Les scripts de données tournent en processus de fond et ne comptent pas dans cette limite.

| # | Chantier | Dépend de | État |
|---|---|---|---|
| P1 | Maquettes des 4 pages en pointillé (Otakudle One Piece, Otakudle Dragon Ball, module « Daily games » de l'accueil OtakuQuiz, page série Dragon Ball) | | en cours |
| P2 | Pages des deux jeux de série, en anglais et en français, table de traduction des valeurs | P1 et l'accord du propriétaire | attend P1 |
| P3 | Données, par scripts : One Piece (100), Dragon Ball (70), idols K2 (200 actives, 150 au minimum), autres séries (582) ; comparaison des sources ; le propriétaire ne lit que les écarts | | One Piece et Dragon Ball en cours |
| P4 | SQL : les deux jeux de série, la source `fandom` admise, la liste des 200 cibles, L04 et L13 régénérés, fichier K2 | P3 | attend P3 |
| P5 | Passerelles : les 13 liens du tableau, en anglais et en français ; kpopquiz.org ne montre jamais l'anime | | à lancer |
| P6 | Volet images de l'admin : téléversement ou lien, licence dans une liste, lecture Commons, refus du non libre ; `/credits` seulement si une image demande un crédit | | à lancer |
| P7 | PR du jour J et répétitions des sessions, au fil de l'eau | | en continu |

## 3. Décisions prises (propriétaire, 02/11)

- Veilles : C et D3 s'arrêtent le lendemain matin, après les crons de la nuit ; V7 se lit le matin, après 00:05 ; on garde 1 h après `SITE_SCOPE` et 1 h après G. Toute veille qui doit voir passer 00:05 l'attend.
- G dès que V7 est vert ; K2 vient ensuite, dans sa propre petite session.
- Pools : 752 personnages (table en annexe), dont 118 ajoutés aux données du site et visibles sur OtakuQuiz. L'identité n'exclut plus un personnage : seules les colonnes décrivent son état au début. Les 365 premiers jours, le personnage du jour d'Otakudle vient d'une liste d'environ 200 parmi les plus connus.
- Qualité : deux sources au moins quand c'est possible (Wikidata et Wikipedia d'abord, wikis Fandom pour les faits de fiction, faits seulement). Un jeu part en relecture sous 3 % de conflits, avec 80 % de faits confirmés par deux sources dans chaque colonne.
- One Piece : « Pas de fruit du démon » comme indice à 5 erreurs pour un personnage sans fruit.
- ADMIN-2 après le jour J ; avant, seul le volet images, dans l'admin actuel.

## Annexe : les 50 séries

| # | Série | Classe | Pool | Tier | Épisodes | Volumes | Persos sur le site | À ajouter au site | Déjà dans Otakudle |
|---|---|---|---|---|---|---|---|---|---|
| 1 | One Piece | One Piece | 100 | A | 1180 | 115 | 32 | 68 | oui |
| 2 | Dragon Ball | Dragon Ball | 70 | A | - | - | 30 | 40 | oui |
| 3 | Attack on Titan | grosse | 25 | A | 94 | 34 | 30 |  | oui |
| 4 | Bleach | grosse | 25 | B | 366 | 74 | 20 | 5 | oui |
| 5 | Demon Slayer: Kimetsu no Yaiba | grosse | 25 | A | 63 | 23 | 30 |  | oui |
| 6 | Detective Conan | grosse | 25 | B | - | - | 28 |  |  |
| 7 | Hunter × Hunter | grosse | 25 | B | 148 | 39 | 20 | 5 | oui |
| 8 | Jujutsu Kaisen | grosse | 25 | A | 59 | 30 | 30 |  | oui |
| 9 | My Hero Academia | grosse | 25 | A | 170 | 42 | 30 |  | oui |
| 10 | Naruto | grosse | 25 | A | 720 | 72 | 30 |  | oui |
| 11 | Black Clover | moyenne | 12 | B | - | - | 20 |  | oui |
| 12 | Chainsaw Man | moyenne | 12 | B | 12 | 24 | 20 |  | oui |
| 13 | Code Geass | moyenne | 12 | B | 50 | - | 20 |  |  |
| 14 | Dandadan | moyenne | 12 | B | 24 | 25 | 20 |  |  |
| 15 | Dr. Stone | moyenne | 12 | B | 94 | 27 | 22 |  |  |
| 16 | Fairy Tail | moyenne | 12 | B | 328 | 63 | 20 |  |  |
| 17 | Frieren: Beyond Journey's End | moyenne | 12 | B | 38 | 15 | 20 |  | oui |
| 18 | Fruits Basket | moyenne | 12 | B | 63 | 23 | 20 |  |  |
| 19 | Fullmetal Alchemist | moyenne | 12 | B | 115 | 27 | 20 |  |  |
| 20 | Gintama | moyenne | 12 | B | 367 | 77 | 26 |  |  |
| 21 | Haikyu!! | moyenne | 12 | B | 85 | 45 | 20 |  |  |
| 22 | Inuyasha | moyenne | 12 | B | 167 | 56 | 20 |  |  |
| 23 | JoJo's Bizarre Adventure | moyenne | 12 | B | 195 | 139 | 20 |  |  |
| 24 | Kaguya-sama: Love Is War | moyenne | 12 | B | 37 | 28 | 20 |  |  |
| 25 | Mob Psycho 100 | moyenne | 12 | B | - | 16 | 20 |  |  |
| 26 | Oshi no Ko | moyenne | 12 | B | 35 | 16 | 20 |  |  |
| 27 | Re:Zero | moyenne | 12 | B | - | 46 | 20 |  |  |
| 28 | Sakamoto Days | moyenne | 12 | B | 22 | 28 | 20 |  |  |
| 29 | Slam Dunk | moyenne | 12 | B | 101 | 31 | 20 |  |  |
| 30 | Solo Leveling | moyenne | 12 | A | 25 | - | 30 |  |  |
| 31 | Spy × Family | moyenne | 12 | B | 50 | 17 | 20 |  |  |
| 32 | Sword Art Online | moyenne | 12 | B | 96 | - | 20 |  |  |
| 33 | That Time I Got Reincarnated as a Slime | moyenne | 12 | B | - | 23 | 20 |  |  |
| 34 | Tokyo Ghoul | moyenne | 12 | B | - | - | 20 |  |  |
| 35 | Tokyo Revengers | moyenne | 12 | B | - | 31 | 20 |  |  |
| 36 | Tower of God | moyenne | 12 | B | 39 | 20 | 20 |  |  |
| 37 | The Apothecary Diaries | courte | 5 | C | - | - | 12 |  |  |
| 38 | Blue Lock | courte | 5 | C | 38 | 40 | 12 |  |  |
| 39 | Bocchi the Rock! | courte | 5 | C | 12 | 8 | 14 |  |  |
| 40 | Cowboy Bebop | courte | 5 | C | 26 | - | 12 |  |  |
| 41 | Death Note | courte | 5 | B | 37 | 12 | 20 |  |  |
| 42 | Neon Genesis Evangelion | courte | 5 | C | 26 | - | 12 |  |  |
| 43 | Kagurabachi | courte | 5 | C | - | 12 | 12 |  |  |
| 44 | Kaiju No. 8 | courte | 5 | C | 23 | 16 | 12 |  |  |
| 45 | Omniscient Reader's Viewpoint | courte | 5 | C | - | - | 12 |  |  |
| 46 | One-Punch Man | courte | 5 | C | 36 | 37 | 12 |  |  |
| 47 | Sailor Moon | courte | 5 | C | 200 | 18 | 12 |  |  |
| 48 | Steins;Gate | courte | 5 | C | - | - | 12 |  |  |
| 49 | Vinland Saga | courte | 5 | C | 48 | 29 | 12 |  |  |
| 50 | Violet Evergarden | courte | 5 | C | 13 | - | 16 |  |  |
