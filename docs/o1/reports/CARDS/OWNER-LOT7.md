# KpopCards : ta page, dans l'ordre (lot 7, photos de groupe en 2 ou 3 cartes et panoramas)

Huit étapes, en un seul passage. Ne saute rien, ne change pas l'ordre. Claude n'a aucun accès à la production : tout ce qui touche Supabase
et Vercel, c'est toi.

Avant de commencer :
- La PR #233 est fusionnée. Le 117 de #233 a été refusé en prod (fins de ligne Windows) : n'y reviens pas, la PR du lot 7 apporte un 117
  corrigé, à appliquer à l'étape 2. Coller depuis le lien « raw » dans Firefox marche maintenant : les gardes ignorent les espaces et les
  fins de ligne.
- Le 116c est déjà appliqué en prod : rien à faire de ce côté.
- Aucun paquet n'a été ouvert. Le 118 refuse dès qu'un paquet existe : il change les numéros des cartes de groupe.
- La CI de la PR du lot 7 vers `main` est verte.

## Les étapes

1. **Sauvegarde.** Supabase, Database, Backups : une sauvegarde de moins de 24 heures doit exister.

2. **117 corrigé.** SQL Editor de Supabase, jamais entre 23:50 et 00:30 UTC. Colle `docs/pending-migrations/cards/117-catalog-safeupdate.sql`
   de la PR du lot 7 et lance. La notice dit « cards_build_catalog() deletes with WHERE true » (ou « already applied » s'il est déjà là).
   Puis ses lignes Verify.

3. **118, les photos de groupe.** Même endroit, même fenêtre horaire. Colle `docs/pending-migrations/cards/118-group-parts.sql` (147 Ko, un
   seul bloc DO) et lance.
   - Il ajoute aux photos leur nombre de cartes (2 ou 3), crée les tables des panoramas, et remplace quatre fonctions (catalogue, ajout au
     catalogue, ouverture, craft). Il ne reconstruit pas le catalogue.
   - Sur les 255 photos de groupe des lots 3 et 6 : 81 en 2 cartes, 117 en 3, 37 passent « À relire » (quelqu'un serait coupé même en 3),
     20 sont écartées (la vignette semblait montrer une personne de moins de 18 ans). Il ne touche que les photos de groupe que la base a.
   - Lis les notices (onglet Messages) : « photos set to 2 ..., to 3 ..., focal points moved ..., kept (owner's) ..., to review ...,
     rejected ..., pages not found ... ». « kept (owner's) » compte les photos dont tu avais déplacé le point focal : il est gardé, l'admin te
     prévient si la fenêtre coupe quelqu'un.
   - Autre façon : `psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/118-group-parts.sql`
   - Si ça échoue : rien n'a changé (un seul bloc). Lis le message, puis dis-le à Claude.

4. **Les lignes Verify du 118.** Les 13 lignes `-- Verify:` en tête du fichier : colle chaque requête, compare au `expect`.

5. **Fusionne la PR du lot 7.**

6. **Admin, « Reconstruire le catalogue ».** Les cartes de groupe suivent alors leurs 2 ou 3 parties (numéros consécutifs) et les
   panoramas P-0001 et suivants sont écrits ; le message compte les cartes et les panoramas.
   - Puis l'onglet « À relire » pour les groupes listés plus bas, si tu veux les garder dans les paquets : pour chaque photo, le choix
     « 2 cartes » ou « 3 cartes », l'aperçu des parties et du panorama, l'avertissement si la fenêtre coupe quelqu'un. Approuve, puis
     reconstruis encore.

7. **Le script, depuis un terminal (dans ton dossier du dépôt, à jour de `main`) :** `pnpm --filter quiz owner:cards`
   - Il vérifie `TOUT_OK`, puis coupe et envoie les tiers (5,5 x 8,5, 2x si chaque tiers fait au moins 640 px) et les panoramas (la fenêtre
     entière, 2x si chaque partie a son 2x). Les paires déjà coupées gardent leurs fichiers et reçoivent seulement leur panorama.
   - Il te propose ensuite d'effacer les fichiers qui ne servent plus (les moitiés d'une photo passée en 3) : rien n'est effacé sans que tu
     tapes `delete`.

8. **Le premier vrai paquet.**

## Ce que ça donne (le 116c est appliqué ; paires et tiers comptés comme des cartes)

| Cas | Cartes avant le lot 7 | Cartes après | Photos de groupe en 2 / en 3 | Panoramas |
| --- | --- | --- | --- | --- |
| Les photos vivantes d'aujourd'hui (auto, approuvées, 116c) | 1 188 | 1 188 | 26 / 66 | 92 |
| Toutes les photos « À relire » approuvées | 1 526 | 1 630 | 79 / 146 | 225 |

Ces chiffres viennent des données du dépôt avec la règle des éditions du catalogue ; les vrais sont dans le message de l'étape 6.

## Les 5 groupes qui quittent les paquets, photo par photo

Un groupe entre dans les paquets à partir de 2 photos vivantes. Après le 118, ces 5 groupes en ont moins de 2. Pour chaque photo : son état
aujourd'hui, ce que le 118 en fait, et ce qui la retient. « À relire » se décide dans l'admin (étape 6) ; « écartée » n'apparaît pas dans
l'admin (voir la fin de cette section).

**DAY6** (1 photo vivante, il en faut une de plus)
- `2017 DAY6 TAIPEI.JPG` : vivante, 3 cartes.
- `DAY6 in taiwan.jpg` : approuvée, passe « À relire » : quelqu'un serait coupé même en 3 cartes (6 personnes).
- `Day6ninestars.png` : « À relire », la revue de licence est encore ouverte sur Commons ; 3 cartes si tu l'approuves.
- `180628 Day6.jpg` : « À relire », revue de licence ouverte, pas tout le groupe de ce jour ; 3 cartes.
- `170311 DAY6 음악중심 미니팬미팅 by SinC (1).jpg` : « À relire », la date du fichier et celle de la description diffèrent d'un jour, pas tout le
  groupe, une personne non identifiée ; 3 cartes.

**PENTAGON** (0 photo vivante, il en faut 2)
- `200901 Pentagon Ten Asia (TTA).png` : « À relire », revue de licence ouverte, pas tout le groupe ; le 118 ajoute : quelqu'un serait coupé
  même en 3 cartes (7 personnes).
- `261010 PENTAGON 10th Anniversary Tour 101010 in Seoul.png` : « À relire », revue de licence ouverte ; 3 cartes.
- `Pentagon 190327.png` (approuvée), `171215 Pentagon.png`, `190419 펜타곤 (PENTAGON).png`, `180503 펜타곤 PENTAGON 01.png` (auto) : écartées
  par la vignette.

**STAYC** (1 photo vivante, il en faut une de plus)
- `StayС in Incheon Airport, July 24, 2024.png` : vivante, 3 cartes.
- `STAYC in Seattle.jpg` (approuvée), `MMA 2023 STAYC.jpg`, `230214 스테이씨 (StayC) at Teddy Bear Showcase.png`,
  `230816 STAYC at "TEENFRESH" Showcase.jpg`, `STAYC Ending Pose.jpg` (auto) : écartées par la vignette.

**GOT7** (1 photo vivante, il en faut une de plus)
- `Got7 on the red carpet of 2018 Asia Artist Awards(AAA), 28 November 2018 02.jpg` : vivante (116c), 3 cartes.
- `Got7 cheering video for JYPE 16th audition 04.jpg` (approuvée par le 116c) et `171013 GOT7 KBS 뮤직뱅크 출근길.jpg` (auto) : passent « À
  relire » : quelqu'un serait coupé même en 3 cartes (7 personnes).
- `Got7 at 2018 KBS Song Festival, 28 December 2018.jpg` : « À relire », pas tout le groupe, avertissement « Personality rights », une
  personne non identifiée ; 3 cartes.
- `Park Jin-young and Jackson Wang at a fansigning event in Sinchon, 10 December 2017 02.jpg` (2 cartes) et `Park Jinyoung and JB in 2015.jpg` (3 cartes) : « À
  relire », pas tout le groupe, « Personality rights », une personne qui n'est pas membre (le fondateur de l'agence).

**ITZY** (0 photo vivante, il en faut 2)
- `ITZY (있지) 2023 뮤직뱅크 페스티벌 출국 ITZY Airport Departure.jpg` (approuvée par le 116c) : passe « À relire » : quelqu'un serait coupé même en
  3 cartes (4 personnes).
- `18052026 ITZY LIA 2.png` (auto) : passe « À relire » : une seule personne, et sa tête ne tient pas dans la fenêtre même en 3 cartes.
- `Yeji of Itzy on Incheon Airport, September 26, 2024.png` (2 cartes) et `10072026 YUNA ITZY AIRPORT DEPARTURE 2.png` (2 cartes) : « À
  relire », une seule membre (pas tout le groupe), « Personality rights » pour la première.
- `ITZY's Lia in August 2023 02.jpg` : « À relire », une seule membre, « Personality rights » ; le 118 ajoute qu'elle serait coupée même en 3.

**Les photos écartées par la vignette (PENTAGON, STAYC).** La règle d'âge du lot 2, avec les dates de naissance, les avait validées (tout le
monde avait 18 ans ou plus à la date de la photo). La vignette les écarte sur l'apparence seule, et les vérificateurs penchaient vers
l'écart dans le doute. Elles ne sont pas dans les onglets de l'admin. Si tu veux en remettre une ou plusieurs en jeu, dis lesquelles à Claude :
un petit fichier les remettra dans leur état d'avant le 118 (son journal `cards_parts_log` le garde).

## Revenir en arrière

`docs/pending-migrations/cards/118-group-parts.rollback.sql` (un bloc DO) rend les quatre fonctions d'avant, remet les photos comme elles
étaient (statut, note, point focal, 2x) et retire ce que le 118 a ajouté. Il refuse dès qu'un paquet a été ouvert. Ensuite, « Reconstruire
le catalogue ».
