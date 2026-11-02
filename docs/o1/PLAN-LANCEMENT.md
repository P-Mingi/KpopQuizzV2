# Plan jusqu'au jour J (mardi 1er décembre 2026)

O1, 2026-11-02. Périmètre validé par le propriétaire le 02/11 : quatre jeux prêts au jour J (Kpopdle Idol, Otakudle toutes séries, Otakudle One Piece, Otakudle Dragon Ball), pools d'environ 750 personnages et 200 idols, images posées par le propriétaire dans l'admin, passerelles du tableau `Plan.dc.html`. Si les quatre jeux et leurs données vérifiées ne sont pas prêts, c'est la date du jour J qui bouge : O1 prévient dès qu'il le voit venir.

## 1. Les chantiers

| Chantier | Contenu | Qui | Charge estimée |
|---|---|---|---|
| D1 One Piece et Dragon Ball | scripts de collecte (Wikidata, Wikipedia, wikis Fandom), comparaison, liste d'écarts | sous-agent Sonnet | 2 jours |
| D2 Idols K2 | membres des groupes les plus joués sans idols, plus les « oui » de 021b ; 200 actives, adultes, complètes | sous-agent Sonnet | 2 jours |
| D3 Autres séries | Otakudle toutes séries : 10 séries d'Otakudle d'abord, puis les 38 autres | sous-agent Sonnet | 2 à 3 jours |
| S1 SQL des jeux | deux jeux de série (colonnes propres, flèches), la source `fandom` admise, la liste des 200 cibles, L04 et L13 régénérés, K2 | O1 | 3 jours |
| A1 Pages des jeux | `/otakudle/one-piece`, `/otakudle/dragon-ball`, en anglais et en français, table de traduction des valeurs | sous-agent Sonnet, après les maquettes | 3 jours |
| A2 Passerelles | les 13 liens du tableau, en anglais et en français ; kpopquiz.org ne montre jamais l'anime | sous-agent Sonnet | 2 jours |
| A3 Images | admin : téléversement ou lien, licence dans une liste, lecture Commons, refus du non libre ; `/credits` seulement si une image demande un crédit | sous-agent Sonnet | 2 à 3 jours |
| P Preuves | tests ciblés, suite complète avant chaque push, répétition de session, comparaison de 60 pages pour les PR qui touchent kpopquiz.org | O1 | continu |

Total : environ 18 à 21 jours de travail, sur 4 semaines, avec au plus 2 sous-agents en même temps. Marge : 3 à 4 jours. Ce qui peut la manger : les écarts des données One Piece et Dragon Ball, le temps de relecture du propriétaire, la lecture des licences Commons.

## 2. Jour par jour

Les sessions SQL suivent la chaîne courte proposée en section 3 ; si le propriétaire garde les veilles de 24 h, D, E et G glissent d'un jour chacune.

| Date | Sessions et veilles | En parallèle (au plus 2 sous-agents) | Propriétaire |
|---|---|---|---|
| lun 2 | session B, veille d'1 h | maquettes ; D1 One Piece et Dragon Ball | session B ; les questions |
| mar 3 | fin de la veille C le matin (après les crons de la nuit) ; session D le soir | D1 suite ; D2 idols | session D ; les maquettes |
| mer 4 | fin de D3 le matin ; session E entre 18:00 et 22:20 | D2 suite ; D3 les 10 séries d'Otakudle | session E ; écarts One Piece et Dragon Ball |
| jeu 5 | E5 et V7 le matin, après 00:05 | D3 les 38 autres séries ; S1 commence | écarts idols |
| ven 6 | | A1 pages des jeux ; D3 suite | liste des 200 personnages |
| sam 7 et dim 8 | | A1 suite ; S1 (L04, L13, K2, jeux de série) | écarts des séries |
| lun 9 | répétition complète de G avec K2 | A3 images ; S1 fin | |
| mar 10 | session G (avec K2), veille d'1 h | A3 suite ; A2 passerelles | session G |
| mer 11 au ven 13 | | A2 et A3 ; tests | images dans l'admin (preview) |
| lun 16 au ven 20 | | intégration des 4 jeux sur o1-dev ; contenu | images ; relecture des pages en français |
| lun 23 au ven 27 | | PR du jour J ; répétition des sessions J1 à J5 ; corrections | go / no-go le vendredi 27 |
| lun 30 | | marge | |
| mar 1er déc. | jour J | | jour J |

## 3. La chaîne des sessions SQL et ses veilles

| Veille | Aujourd'hui | Proposition | Pourquoi |
|---|---|---|---|
| B, 1 h après `SITE_SCOPE=1` | 1 h | garder 1 h | elle précède 003, dangereux : il faut voir du vrai trafic sur le nouveau build |
| C, après B | 24 h | jusqu'au lendemain matin, après les crons de 00:05 et de 03:30 à 05:00 | ce qu'elle contrôle (parties et inscriptions qui arrivent, compteurs, journaux) se voit après une nuit avec ses crons ; moins de trafic vu qu'en 24 h |
| D3, après 008 | 24 h | pareil, le lendemain matin | les verrous d'écriture touchent XP et compteurs : il faut une nuit de crons, pas forcément 24 h |
| F, après 010 | 24 h | V7 le matin même de E5, après 00:05 | les six conditions de V7 se lisent dès que le quiz du jour de 00:05 est passé ; avant 00:05, impossible |
| G | 1 h | garder 1 h | |

Ce qui ne se raccourcit pas : toute veille qui doit voir passer le cron de 00:05 (E5, F) attend 00:05.

## 4. Pools

- Personnages, par classe : One Piece 100, Dragon Ball 70, grosses séries 25, moyennes 12, courtes 5. La table des 50 séries est en annexe. Total : 752, dont 118 personnages à ajouter aux données du site (ils apparaissent aussi sur les pages publiques d'OtakuQuiz).
- Ordre : One Piece et Dragon Ball, puis les 10 autres séries d'Otakudle, puis le reste.
- Personnage du jour d'Otakudle toutes séries : les 365 premiers jours, une liste d'environ 200 parmi les plus connus ; tout le pool reste devinable.
- Idols : 200 actives, adultes, complètes, dans Kpopdle Idol au jour J (150 au minimum).

## 5. Qualité des données

Chaque fait vient de deux sources au moins quand c'est possible : Wikidata et Wikipedia d'abord, wikis Fandom pour les faits de fiction (faits seulement, jamais de texte ni d'image), cités dans `entity_sources`. Un script compare ; un agent ne regarde que les écarts ; le propriétaire ne lit que la liste des écarts restants.

Seuil proposé : un jeu part en relecture quand ses conflits sont sous 3 % des faits et que chaque colonne de jeu a au moins 80 % de faits confirmés par deux sources. Au-delà, le script est corrigé avant toute relecture.

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
