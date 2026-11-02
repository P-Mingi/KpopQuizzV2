# Otakudle pool of the 50 launch series: cross-check report

Game columns: gender, species, role_at_debut, voice_actor_ja (role_at_debut uses the contract list main, supporting, antagonist, other; voice_actor_ja is the 5-error hint) and the series demographic. first_appearance stays in the data but is not a game column and is not counted (owner, 2026-11-03). Pool sizes: the owner's table (PLAN-LANCEMENT annex). Candidates: Wikidata fictional characters of the series with their sitelinks, joined with the page size on the series Fandom wiki; score = percentile of sitelinks + percentile of page size inside the series; the characters of docs/anime/data/series/<slug>.json come first (by rank), then the best ranked others (added). One Piece and Dragon Ball keep the pools of onepiece.mjs and dragonball.mjs. A1 values (scripts/anime/a1/data/a1-facts.json) count as one source, the others are added by this script.

Characters: 750 in 50 series. Series under their pool size: hunter-x-hunter (23 of 25). Gap review: gender, species, role_at_debut and voice_actor_ja reviewed with judgment (review-all.mjs): {"role_at_debut":96,"species":143,"voice_actor_ja":94,"gender":114,"rulings":17}. A reviewed field carries reviewed: true and the pages that state the value.

## Rule (owner decisions, 2026-11-03)

1. Quality: a single source that no other source contradicts is accepted for every column of every series.
2. Contested values (two or more sources name different values) are settled by a fixed rule: the value stated by the most distinct sources wins; on a tie the most official source wins, in this order: official site or publisher, Wikipedia, A1 (the facts reviewed by the owner in lot A1), the series Fandom wiki, Wikidata, the site data. A Fandom character page, its infobox, its categories and its category pages count as ONE source; Wikipedia article, infobox and list count as one. "agree" = two or more distinct sources state the value, "single" = one source states it and none contradicts it (or the rule settled it), "none" = no source.
3. Genuinely doubtful = a contested value where the sources tie on number, both sides resting only on trusted sources (Wikipedia, A1, Fandom), so only the order settled it: listed separately below with the values and URLs. A tie against Wikidata or the site data alone is settled by the order and is not doubtful.

## Per series

| series | class | pool | target | candidates | added | gender agree | species agree | role_at_debut agree | voice_actor_ja agree | conflicts | demographic |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| one-piece | One Piece | 100 | 100 | 1445 | 68 | 99% | 77% | 14% | 94% | 0 | shonen (agree) |
| dragon-ball | Dragon Ball | 70 | 70 | 883 | 40 | 94% | 36% | 44% | 46% | 0 | shonen (agree) |
| naruto | grosse | 25 | 25 | 135 | 0 | 100% | 92% | 100% | 96% | 0 | shonen (agree) |
| demon-slayer | grosse | 25 | 25 | 36 | 0 | 36% | 36% | 56% | 32% | 0 | shonen (agree) |
| jujutsu-kaisen | grosse | 25 | 25 | 42 | 0 | 96% | 60% | 36% | 96% | 0 | shonen (agree) |
| attack-on-titan | grosse | 25 | 25 | 46 | 0 | 92% | 48% | 52% | 36% | 0 | shonen (agree) |
| my-hero-academia | grosse | 25 | 25 | 40 | 0 | 80% | 40% | 84% | 76% | 0 | shonen (agree) |
| bleach | grosse | 25 | 25 | 119 | 5 | 100% | 48% | 72% | 76% | 0 | shonen (agree) |
| hunter-x-hunter | grosse | 23 | 25 | 23 | 3 | 83% | 26% | 78% | 52% | 0 | shonen (agree) |
| chainsaw-man | moyenne | 12 | 12 | 20 | 0 | 58% | 50% | 17% | 58% | 0 | shonen (agree) |
| frieren | moyenne | 12 | 12 | 44 | 0 | 92% | 92% | 83% | 92% | 0 | shonen (agree) |
| black-clover | moyenne | 12 | 12 | 24 | 0 | 100% | 58% | 42% | 58% | 0 | shonen (agree) |
| detective-conan | grosse | 25 | 25 | 85 | 0 | 100% | 0% | 64% | 64% | 0 | shonen (agree) |
| code-geass | moyenne | 12 | 12 | 26 | 0 | 100% | 0% | 42% | 75% | 0 | none (single) |
| dandadan | moyenne | 12 | 12 | 20 | 0 | 83% | 25% | 33% | 25% | 0 | shonen (agree) |
| dr-stone | moyenne | 12 | 12 | 22 | 0 | 42% | 8% | 50% | 8% | 0 | shonen (agree) |
| fairy-tail | moyenne | 12 | 12 | 53 | 0 | 100% | 100% | 25% | 100% | 0 | shonen (agree) |
| fruits-basket | moyenne | 12 | 12 | 23 | 0 | 92% | 0% | 33% | 0% | 0 | shojo (agree) |
| fullmetal-alchemist | moyenne | 12 | 12 | 38 | 0 | 100% | 75% | 50% | 33% | 0 | shonen (agree) |
| gintama | moyenne | 12 | 12 | 28 | 0 | 92% | 17% | 100% | 25% | 0 | shonen (agree) |
| haikyu | moyenne | 12 | 12 | 24 | 0 | 100% | 0% | 33% | 25% | 0 | shonen (agree) |
| inuyasha | moyenne | 12 | 12 | 35 | 0 | 100% | 50% | 100% | 25% | 0 | shonen (agree) |
| jojo | moyenne | 12 | 12 | 36 | 0 | 100% | 8% | 75% | 0% | 0 | shonen (agree) |
| kaguya-sama-love-is-war | moyenne | 12 | 12 | 20 | 0 | 83% | 0% | 92% | 83% | 0 | seinen (agree) |
| mob-psycho-100 | moyenne | 12 | 12 | 20 | 0 | 17% | 17% | 33% | 17% | 0 | shonen (agree) |
| oshi-no-ko | moyenne | 12 | 12 | 20 | 0 | 92% | 0% | 25% | 42% | 0 | seinen (agree) |
| re-zero | moyenne | 12 | 12 | 82 | 0 | 92% | 67% | 0% | 92% | 0 | none (single) |
| sakamoto-days | moyenne | 12 | 12 | 20 | 0 | 83% | 0% | 0% | 8% | 0 | shonen (agree) |
| slam-dunk | moyenne | 12 | 12 | 20 | 0 | 100% | 0% | 0% | 8% | 0 | shonen (agree) |
| solo-leveling | moyenne | 12 | 12 | 30 | 0 | 8% | 0% | 0% | 8% | 0 | none (single) |
| spy-x-family | moyenne | 12 | 12 | 25 | 0 | 100% | 0% | 42% | 25% | 0 | shonen (agree) |
| sword-art-online | moyenne | 12 | 12 | 25 | 0 | 100% | 0% | 50% | 83% | 0 | none (single) |
| that-time-i-got-reincarnated-as-a-slime | moyenne | 12 | 12 | 148 | 0 | 75% | 33% | 8% | 83% | 0 | none (conflict) |
| tokyo-ghoul | moyenne | 12 | 12 | 19 | 0 | 25% | 17% | 0% | 25% | 0 | seinen (agree) |
| tokyo-revengers | moyenne | 12 | 12 | 21 | 0 | 25% | 0% | 0% | 0% | 0 | shonen (agree) |
| tower-of-god | moyenne | 12 | 12 | 20 | 0 | 0% | 0% | 0% | 0% | 0 | none (single) |
| apothecary-diaries | courte | 5 | 5 | 48 | 0 | 100% | 0% | 0% | 100% | 0 | none (conflict) |
| blue-lock | courte | 5 | 5 | 12 | 0 | 40% | 0% | 40% | 0% | 0 | shonen (agree) |
| bocchi-the-rock | courte | 5 | 5 | 22 | 0 | 100% | 0% | 0% | 0% | 0 | seinen (single) |
| cowboy-bebop | courte | 5 | 5 | 13 | 0 | 100% | 0% | 0% | 100% | 0 | none (single) |
| death-note | courte | 5 | 5 | 24 | 0 | 100% | 100% | 40% | 60% | 0 | shonen (agree) |
| evangelion | courte | 5 | 5 | 42 | 0 | 100% | 40% | 0% | 100% | 0 | none (single) |
| kagurabachi | courte | 5 | 5 | 13 | 0 | 60% | 0% | 0% | 40% | 0 | shonen (agree) |
| kaiju-no-8 | courte | 5 | 5 | 12 | 0 | 60% | 0% | 40% | 0% | 0 | shonen (agree) |
| omniscient-readers-viewpoint | courte | 5 | 5 | 12 | 0 | 0% | 0% | 20% | 0% | 0 | none (single) |
| one-punch-man | courte | 5 | 5 | 167 | 0 | 100% | 40% | 80% | 40% | 0 | seinen (agree) |
| sailor-moon | courte | 5 | 5 | 36 | 0 | 100% | 100% | 0% | 100% | 0 | shojo (agree) |
| steins-gate | courte | 5 | 5 | 15 | 0 | 100% | 0% | 60% | 80% | 0 | none (single) |
| vinland-saga | courte | 5 | 5 | 12 | 0 | 100% | 0% | 0% | 100% | 0 | seinen (agree) |
| violet-evergarden | courte | 5 | 5 | 18 | 0 | 20% | 0% | 0% | 0% | 0 | none (single) |

## TOP200 (200 characters)

| column | agree | single | conflict | none | agree share | single share | accepted (agree + single) |
|---|---:|---:|---:|---:|---:|---:|---:|
| gender | 197 | 2 | 0 | 1 | 99% | 1% | 100% |
| species | 114 | 84 | 0 | 2 | 57% | 42% | 99% |
| role_at_debut | 118 | 71 | 0 | 11 | 59% | 38% | 95% |
| voice_actor_ja | 159 | 38 | 0 | 3 | 80% | 19% | 99% |

## Whole pool (750 characters)

| column | agree | single | conflict | none | agree share | single share | accepted (agree + single) |
|---|---:|---:|---:|---:|---:|---:|---:|
| gender | 624 | 123 | 0 | 3 | 83% | 16% | 100% |
| species | 277 | 386 | 0 | 87 | 37% | 58% | 88% |
| role_at_debut | 305 | 410 | 0 | 35 | 41% | 57% | 95% |
| voice_actor_ja | 413 | 285 | 0 | 52 | 55% | 41% | 93% |

## Conflicts left (0)


## Genuinely doubtful (9; in the TOP200: 4)

Contested values where the sources tie on number, both sides resting on trusted sources only (Wikipedia, A1, Fandom), so only the order of trust settled it. Kept value first, then the other values with their pages.

- Oolong (dragon-ball/oolong) / species: kept "pig" (a1; https://www.wikidata.org/wiki/Q3091550) [TOP200]
  - other: "animal-type-earthling" (fandom; https://dragonball.fandom.com/wiki/Oolong)
- Emperor Pilaf (dragon-ball/emperor-pilaf) / species: kept "creature" (a1; https://www.wikidata.org/wiki/Q2481483) [TOP200]
  - other: "monster-type-earthling" (fandom; https://dragonball.fandom.com/wiki/Emperor_Pilaf)
  - other: "monster" (wikidata; https://www.wikidata.org/wiki/Q2481483)
- Panda (jujutsu-kaisen/panda) / species: kept "panda" (a1; https://en.wikipedia.org/wiki/List_of_Jujutsu_Kaisen_characters)
  - other: "cursed-corpse" (fandom; https://jujutsu-kaisen.fandom.com/wiki/Panda)
  - other: "animal" (wikidata; https://www.wikidata.org/wiki/Q105152626)
- Kisuke Urahara (bleach/kisuke-urahara) / species: kept "human" (a1; https://en.wikipedia.org/wiki/List_of_Bleach_characters) [TOP200]
  - other: "soul" (fandom; https://bleach.fandom.com/wiki/Kisuke_Urahara)
- Yoruichi Shihōin (bleach/yoruichi-shihoin) / species: kept "soul-reaper-werecat" (wikipedia; https://en.wikipedia.org/wiki/Yoruichi_Shih%C5%8Din) [TOP200]
  - other: "soul" (fandom; https://bleach.fandom.com/wiki/Yoruichi_Shih%C5%8Din)
  - other: "shinigami" (wikidata; https://www.wikidata.org/wiki/Q2084607)
- Isshin Kurosaki (bleach/isshin-kurosaki) / species: kept "human" (a1; https://en.wikipedia.org/wiki/List_of_Bleach_characters)
  - other: "soul" (fandom; https://bleach.fandom.com/wiki/Isshin_Kurosaki)
  - other: "shinigami" (wikidata; https://www.wikidata.org/wiki/Q15114254)
- Kite (hunter-x-hunter/kite) / gender: kept "male" (wikipedia; https://en.wikipedia.org/wiki/List_of_Hunter_%C3%97_Hunter_characters#Kite)
  - other: "female" (fandom; https://hunterxhunter.fandom.com/wiki/Kite)
- Reze (chainsaw-man/reze) / species: kept "devil" (wikipedia; https://en.wikipedia.org/wiki/Reze_(Chainsaw_Man))
  - other: "human" (fandom; https://chainsaw-man.fandom.com/wiki/Reze)
  - other: "demon" (wikidata; https://www.wikidata.org/wiki/Q134454509)
- Alphonse Elric (fullmetal-alchemist/alphonse-elric) / voice_actor_ja: kept "Rie Kugimiya" (wikipedia; https://en.wikipedia.org/wiki/Alphonse_Elric)
  - other: "Aaron Dismuke / Maxey Whitehead / Lily Truncale" (fandom; https://fma.fandom.com/wiki/Alphonse_Elric)

## Contested values settled by the rule (188; in the TOP200: 72)

- Sanji (one-piece/sanji) / role_at_debut: kept "antagonist" [fandom]; against "main" [site] [TOP200]
- Nico Robin (one-piece/nico-robin) / role_at_debut: kept "antagonist" [fandom]; against "main" [site] [TOP200]
- Franky (one-piece/franky) / role_at_debut: kept "antagonist" [fandom]; against "main" [site] [TOP200]
- Brook (one-piece/brook) / voice_actor_ja: kept "Chō" [fandom+wikidata]; against "Yūichi Nagashima" [wikipedia] [TOP200]
- Boa Hancock (one-piece/boa-hancock) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site] [TOP200]
- Nefertari Vivi (one-piece/nefertari-vivi) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site] [TOP200]
- Dracule Mihawk (one-piece/dracule-mihawk) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site] [TOP200]
- Yamato (one-piece/yamato) / gender: kept "male" [fandom+wikipedia]; against "female" [wikidata]
- Koby (one-piece/koby) / role_at_debut: kept "supporting" [a1+site]; against "antagonist" [fandom]
- Bartolomeo (one-piece/bartolomeo) / voice_actor_ja: kept "Shōtarō Morikubo" [fandom]; against "Showtaro Morikubo" [wikidata]
- Android 18 (dragon-ball/android-18) / species: kept "android" [wikipedia]; against "android" [fandom] [TOP200]
- Android 18 (dragon-ball/android-18) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom] [TOP200]
- Beerus (dragon-ball/beerus) / species: kept "beerus-race" [fandom]; against "god" [wikidata] [TOP200]
- Beerus (dragon-ball/beerus) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom] [TOP200]
- Bardock (dragon-ball/bardock) / role_at_debut: kept "antagonist" [wikipedia]; against "antagonist" [fandom] [TOP200]
- Cooler (dragon-ball/cooler) / species: kept "frost-demon" [fandom]; against "alien" [wikidata] [TOP200]
- Nappa (dragon-ball/nappa) / species: kept "saiyan" [fandom]; against "alien" [wikidata] [TOP200]
- Vegeta (dragon-ball/vegeta) / role_at_debut: kept "main" [site+wikipedia]; against "antagonist" [fandom] [TOP200]
- Goku (dragon-ball/goku) / species: kept "saiyan" [fandom+wikipedia+a1]; against "alien" [wikidata]
- Goku (dragon-ball/goku) / role_at_debut: kept "main" [a1+site]; against "antagonist" [fandom]
- Chiaotzu (dragon-ball/chiaotzu) / role_at_debut: kept "antagonist" [wikipedia]; against "antagonist" [fandom] [TOP200]
- Baby (dragon-ball/baby) / species: kept "neo-machine-mutant" [fandom]; against "alien" [wikidata] [TOP200]
- Oolong (dragon-ball/oolong) / species: kept "pig" [a1]; against "animal-type-earthling" [fandom] [TOP200]
- Oolong (dragon-ball/oolong) / role_at_debut: kept "supporting" [a1+site+wikipedia]; against "antagonist" [fandom] [TOP200]
- Emperor Pilaf (dragon-ball/emperor-pilaf) / species: kept "creature" [a1]; against "monster-type-earthling" [fandom], "monster" [wikidata] [TOP200]
- Captain Ginyu (dragon-ball/captain-ginyu) / gender: kept "female" [fandom]; against "male" [wikidata] [TOP200]
- Captain Ginyu (dragon-ball/captain-ginyu) / species: kept "ginyu-s-race-mutant" [fandom]; against "alien" [wikidata] [TOP200]
- Shin (dragon-ball/shin) / voice_actor_ja: kept "Yūji Mitsuya" [fandom]; against "Masumi Mutsuda" [wikidata] [TOP200]
- Android 16 (dragon-ball/android-16) / species: kept "android" [fandom]; against "robot" [wikidata] [TOP200]
- Launch (dragon-ball/launch) / role_at_debut: kept "supporting" [wikipedia]; against "antagonist" [fandom]
- Frieza (dragon-ball/frieza) / species: kept "frost-demon" [wikipedia]; against "frieza-clan" [fandom], "alien" [wikidata]
- Babidi (dragon-ball/babidi) / species: kept "bibidi-s-race" [fandom]; against "alien" [wikidata]
- Gohan (dragon-ball/gohan) / species: kept "saiyan-human-hybrid" [wikipedia]; against "saiyan" [fandom]
- Dodoria (dragon-ball/dodoria) / species: kept "dodoria-s-race" [fandom]; against "alien" [wikidata]
- Dende (dragon-ball/dende) / species: kept "namekian" [fandom]; against "alien" [wikidata]
- King Vegeta (dragon-ball/king-vegeta) / role_at_debut: kept "antagonist" [wikipedia]; against "antagonist" [fandom]
- King Cold (dragon-ball/king-cold) / species: kept "frost-demon" [fandom]; against "alien" [wikidata]
- King Kai (dragon-ball/king-kai) / species: kept "glind" [fandom]; against "alien" [wikidata]
- Puar (dragon-ball/puar) / gender: kept "male" [wikidata+wikipedia]; against "female" [fandom]
- Puar (dragon-ball/puar) / species: kept "animal-type-earthling" [fandom]; against "cat" [wikidata]
- Puar (dragon-ball/puar) / role_at_debut: kept "antagonist" [wikipedia]; against "antagonist" [fandom]
- Ox-King (dragon-ball/ox-king) / role_at_debut: kept "antagonist" [wikipedia]; against "antagonist" [fandom]
- Recoome (dragon-ball/recoome) / species: kept "recoome-s-race" [fandom]; against "alien" [wikidata]
- Piccolo (dragon-ball/piccolo) / role_at_debut: kept "main" [site+wikipedia]; against "antagonist" [fandom]
- Yamcha (dragon-ball/yamcha) / species: kept "human" [fandom+a1]; against "superhuman" [wikipedia]
- Yamcha (dragon-ball/yamcha) / role_at_debut: kept "supporting" [a1+site+wikipedia]; against "antagonist" [fandom]
- Jiren (dragon-ball/jiren) / species: kept "jiren-s-race" [fandom]; against "alien" [wikidata]
- Jiren (dragon-ball/jiren) / role_at_debut: kept "supporting" [wikipedia]; against "antagonist" [site]
- Tien Shinhan (dragon-ball/tien-shinhan) / species: kept "human" [wikipedia]; against "human" [fandom]
- Tien Shinhan (dragon-ball/tien-shinhan) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom]
- Trunks (dragon-ball/trunks) / species: kept "saiyan-human-hybrid" [wikipedia]; against "human" [fandom]
- Hit (dragon-ball/hit) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom]
- Glorio (dragon-ball/glorio) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom]
- Majin Buu (dragon-ball/majin-buu) / species: kept "majin" [fandom]; against "monster" [wikidata]
- Shikamaru Nara (naruto/shikamaru-nara) / voice_actor_ja: kept "Showtaro Morikubo" [wikidata+wikipedia]; against "Shōtarō Morikubo" [fandom] [TOP200]
- Rock Lee (naruto/rock-lee) / voice_actor_ja: kept "Yōichi Masukawa" [wikidata+wikipedia]; against "Yō'ichi Masukawa" [fandom]
- Konohamaru Sarutobi (naruto/konohamaru-sarutobi) / role_at_debut: kept "supporting" [a1+site]; against "main" [wikipedia] [TOP200]
- Nezuko Kamado (demon-slayer/nezuko-kamado) / species: kept "demon" [fandom+a1]; against "human" [wikipedia]
- Ryomen Sukuna (jujutsu-kaisen/ryomen-sukuna) / species: kept "human" [fandom+wikipedia]; against "curse" [a1] [TOP200]
- Toji Fushiguro (jujutsu-kaisen/toji-fushiguro) / role_at_debut: kept "supporting" [wikipedia]; against "antagonist" [site]
- Panda (jujutsu-kaisen/panda) / species: kept "panda" [a1]; against "cursed-corpse" [fandom], "animal" [wikidata]
- Levi Ackerman (attack-on-titan/levi-ackerman) / role_at_debut: kept "supporting" [a1]; against "main" [site] [TOP200]
- Katsuki Bakugo (my-hero-academia/katsuki-bakugo) / role_at_debut: kept "main" [a1+site]; against "antagonist" [fandom] [TOP200]
- Shoto Todoroki (my-hero-academia/shoto-todoroki) / role_at_debut: kept "main" [a1+site]; against "antagonist" [fandom] [TOP200]
- All Might (my-hero-academia/all-might) / role_at_debut: kept "main" [a1+site]; against "antagonist" [fandom] [TOP200]
- Endeavor (my-hero-academia/endeavor) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Tenya Ida (my-hero-academia/tenya-ida) / role_at_debut: kept "supporting" [a1+site]; against "antagonist" [fandom]
- Shota Aizawa (my-hero-academia/shota-aizawa) / role_at_debut: kept "supporting" [a1+site]; against "antagonist" [fandom]
- Hitoshi Shinso (my-hero-academia/hitoshi-shinso) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Rukia Kuchiki (bleach/rukia-kuchiki) / species: kept "shinigami" [wikidata+wikipedia+a1]; against "soul" [fandom] [TOP200]
- Sousuke Aizen (bleach/sousuke-aizen) / species: kept "shinigami" [wikidata+wikipedia]; against "soul" [fandom] [TOP200]
- Uryū Ishida (bleach/uryu-ishida) / role_at_debut: kept "main" [site+wikipedia]; against "antagonist" [a1] [TOP200]
- Renji Abarai (bleach/renji-abarai) / species: kept "shinigami" [wikidata+wikipedia]; against "soul" [fandom] [TOP200]
- Renji Abarai (bleach/renji-abarai) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Kisuke Urahara (bleach/kisuke-urahara) / species: kept "human" [a1]; against "soul" [fandom] [TOP200]
- Yoruichi Shihōin (bleach/yoruichi-shihoin) / species: kept "soul-reaper-werecat" [wikipedia]; against "soul" [fandom], "shinigami" [wikidata] [TOP200]
- Isshin Kurosaki (bleach/isshin-kurosaki) / species: kept "human" [a1]; against "soul" [fandom], "shinigami" [wikidata]
- Tōshirō Hitsugaya (bleach/toshiro-hitsugaya) / species: kept "shinigami" [wikidata+wikipedia]; against "soul" [fandom] [TOP200]
- Byakuya Kuchiki (bleach/byakuya-kuchiki) / species: kept "soul" [fandom]; against "shinigami" [wikidata] [TOP200]
- Kenpachi Zaraki (bleach/kenpachi-zaraki) / species: kept "soul" [fandom]; against "shinigami" [wikidata] [TOP200]
- Mayuri Kurotsuchi (bleach/mayuri-kurotsuchi) / species: kept "shinigami" [wikidata+wikipedia]; against "soul" [fandom] [TOP200]
- Gon Freecss (hunter-x-hunter/gon-freecss) / voice_actor_ja: kept "Megumi Han" [a1+fandom+wikidata]; against "Rica Matsumoto" [wikipedia] [TOP200]
- Killua Zoldyck (hunter-x-hunter/killua-zoldyck) / voice_actor_ja: kept "Mariya Ise" [a1+fandom+wikidata]; against "Kanako Mitsuhashi" [wikipedia] [TOP200]
- Kurapika (hunter-x-hunter/kurapika) / voice_actor_ja: kept "Miyuki Sawashiro" [a1+fandom]; against "Yuki Kaida" [wikipedia] [TOP200]
- Isaac Netero (hunter-x-hunter/isaac-netero) / voice_actor_ja: kept "Ichirō Nagai" [a1+wikidata]; against "Bunmei Tobayama" [fandom]
- Kite (hunter-x-hunter/kite) / gender: kept "male" [wikipedia]; against "female" [fandom]
- Denji (chainsaw-man/denji) / species: kept "devil-human-hybrid" [wikipedia+a1]; against "human" [fandom] [TOP200]
- Power (chainsaw-man/power) / species: kept "devil" [fandom+wikipedia]; against "fiend" [a1] [TOP200]
- Power (chainsaw-man/power) / role_at_debut: kept "supporting" [a1]; against "main" [site] [TOP200]
- Aki Hayakawa (chainsaw-man/aki-hayakawa) / role_at_debut: kept "supporting" [a1]; against "main" [site]
- Reze (chainsaw-man/reze) / species: kept "devil" [wikipedia]; against "human" [fandom], "demon" [wikidata]
- Pochita (chainsaw-man/pochita) / role_at_debut: kept "supporting" [a1]; against "main" [site]
- Jodie Starling (detective-conan/jodie-starling) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Momo Ayase (dandadan/momo-ayase) / voice_actor_ja: kept "Shion Wakayama" [wikidata+wikipedia]; against "綾瀬 桃" [fandom] [TOP200]
- Aira Shiratori (dandadan/aira-shiratori) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Aira Shiratori (dandadan/aira-shiratori) / voice_actor_ja: kept "Ayane Sakura" [wikidata+wikipedia]; against "白鳥愛羅" [fandom]
- Ken Takakura (dandadan/ken-takakura) / voice_actor_ja: kept "Natsuki Hanae" [wikidata+wikipedia]; against "オカルン" [fandom]
- Seiko Ayase (dandadan/seiko-ayase) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Seiko Ayase (dandadan/seiko-ayase) / voice_actor_ja: kept "綾瀬 星子" [fandom]; against "Nana Mizuki" [wikidata]
- Turbo Granny (dandadan/turbo-granny) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Turbo Granny (dandadan/turbo-granny) / voice_actor_ja: kept "ターボババア" [fandom]; against "Mayumi Tanaka" [wikidata]
- Evil Eye (dandadan/evil-eye) / role_at_debut: kept "main" [wikipedia]; against "antagonist" [site]
- Vamola (dandadan/vamola) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Unji Zuma (dandadan/unji-zuma) / role_at_debut: kept "main" [wikipedia]; against "antagonist" [site]
- Acrobatic Silky (dandadan/acrobatic-silky) / voice_actor_ja: kept "アクロバティックさらさら" [fandom]; against "Kikuko Inoue" [wikidata]
- Senku Ishigami (dr-stone/senku-ishigami) / voice_actor_ja: kept "Yūsuke Kobayashi" [fandom+wikidata]; against "Yūsuke Kobayashi (voice actor)" [wikipedia] [TOP200]
- Tsukasa Shishio (dr-stone/tsukasa-shishio) / role_at_debut: kept "antagonist" [site+fandom]; against "main" [wikipedia]
- Gen Asagiri (dr-stone/gen-asagiri) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Chrome (dr-stone/chrome) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Suika (dr-stone/suika) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Laxus Dreyar (fairy-tail/laxus-dreyar) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Gajeel Redfox (fairy-tail/gajeel-redfox) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom]
- Juvia Lockser (fairy-tail/juvia-lockser) / role_at_debut: kept "supporting" [site+wikipedia]; against "antagonist" [fandom]
- Shigure Sohma (fruits-basket/shigure-sohma) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Edward Elric (fullmetal-alchemist/edward-elric) / voice_actor_ja: kept "Romi Park" [wikidata+wikipedia]; against "Vic Mignogna" [fandom] [TOP200]
- Roy Mustang (fullmetal-alchemist/roy-mustang) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Roy Mustang (fullmetal-alchemist/roy-mustang) / voice_actor_ja: kept "Tōru Ōkawa" [wikidata+wikipedia]; against "Travis Willingham" [fandom] [TOP200]
- Alphonse Elric (fullmetal-alchemist/alphonse-elric) / voice_actor_ja: kept "Rie Kugimiya" [wikipedia]; against "Aaron Dismuke / Maxey Whitehead / Lily Truncale" [fandom]
- Father (fullmetal-alchemist/father) / species: kept "homunculu" [fandom]; against "monster" [wikidata] [TOP200]
- Scar (fullmetal-alchemist/scar) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Scar (fullmetal-alchemist/scar) / voice_actor_ja: kept "Ryōtarō Okiayu" [wikidata+wikipedia]; against "Dameon Clarke / J. Michael Tatum" [fandom]
- King Bradley (fullmetal-alchemist/king-bradley) / voice_actor_ja: kept "Ed Blaylock" [fandom]; against "Hidekatsu Shibata" [wikidata]
- Winry Rockbell (fullmetal-alchemist/winry-rockbell) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Winry Rockbell (fullmetal-alchemist/winry-rockbell) / voice_actor_ja: kept "Megumi Toyoguchi" [wikidata+wikipedia]; against "Caitlin Glass / Muriel Hofmann" [fandom]
- Lin Yao (fullmetal-alchemist/lin-yao) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Kagura (gintama/kagura) / species: kept "amanto" [fandom]; against "alien" [wikidata] [TOP200]
- Shinpachi Shimura (gintama/shinpachi-shimura) / voice_actor_ja: kept "Sakaguchi Daisuke" [fandom+wikidata]; against "comedian" [wikipedia]
- Kamui (gintama/kamui) / role_at_debut: kept "antagonist" [site+fandom]; against "supporting" [wikipedia]
- Shinsuke Takasugi (gintama/shinsuke-takasugi) / role_at_debut: kept "antagonist" [site+fandom]; against "supporting" [wikipedia]
- Oboro (gintama/oboro) / role_at_debut: kept "antagonist" [site+fandom]; against "supporting" [wikipedia]
- Utsuro (gintama/utsuro) / role_at_debut: kept "antagonist" [site+fandom]; against "supporting" [wikipedia]
- Kei Tsukishima (haikyu/kei-tsukishima) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Daichi Sawamura (haikyu/daichi-sawamura) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Yū Nishinoya (haikyu/yu-nishinoya) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Ryūnosuke Tanaka (haikyu/ryunosuke-tanaka) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Kōshi Sugawara (haikyu/koshi-sugawara) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Asahi Azumane (haikyu/asahi-azumane) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Tōru Oikawa (haikyu/toru-oikawa) / role_at_debut: kept "supporting" [wikipedia]; against "antagonist" [site]
- Tadashi Yamaguchi (haikyu/tadashi-yamaguchi) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Inuyasha (inuyasha/inuyasha) / species: kept "demon" [wikidata+wikipedia]; against "dog-hany" [fandom] [TOP200]
- Naraku (inuyasha/naraku) / species: kept "spider-hany-spider-y-kai-spirit" [fandom]; against "demon" [wikidata] [TOP200]
- Dio Brando (jojo/dio-brando) / voice_actor_ja: kept "Norio Wakamoto" [wikipedia]; against "Takehito Koyasu" [wikidata] [TOP200]
- Joseph Joestar (jojo/joseph-joestar) / voice_actor_ja: kept "Kenji Utsumi" [wikipedia]; against "Tomokazu Sugita / Unshō Ishizuka" [wikidata] [TOP200]
- Giorno Giovanna (jojo/giorno-giovanna) / voice_actor_ja: kept "Romi Park" [wikipedia]; against "Kensho Ono" [wikidata] [TOP200]
- Jean Pierre Polnareff (jojo/polnareff) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Rohan Kishibe (jojo/rohan-kishibe) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Bruno Bucciarati (jojo/bruno-bucciarati) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Ai Hayasaka (kaguya-sama-love-is-war/ai-hayasaka) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Dimple (mob-psycho-100/dimple) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Teruki Hanazawa (mob-psycho-100/teruki-hanazawa) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Ritsu Kageyama (mob-psycho-100/ritsu-kageyama) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Aqua Hoshino (oshi-no-ko/aqua-hoshino) / voice_actor_ja: kept "Takeo Ootsuka Yumi Uchiyama" [fandom]; against "Takeo Ōtsuka / Yumi Uchiyama" [wikidata] [TOP200]
- Akane Kurokawa (oshi-no-ko/akane-kurokawa) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- MEM-cho (oshi-no-ko/mem-cho) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Subaru Natsuki (re-zero/subaru-natsuki) / voice_actor_ja: kept "Kobayashi Yūsuke" [fandom+wikidata]; against "Yūsuke Kobayashi (voice actor)" [wikipedia] [TOP200]
- Roswaal L. Mathers (re-zero/roswaal-l-mathers) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Echidna (re-zero/echidna) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Boiled (sakamoto-days/boiled) / role_at_debut: kept "supporting" [wikipedia]; against "antagonist" [site]
- Haruko Akagi (slam-dunk/haruko-akagi) / role_at_debut: kept "supporting" [wikipedia]; against "main" [site]
- Yuri Briar (spy-x-family/yuri-briar) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Leafa (sword-art-online/leafa) / species: kept "fairy" [fandom]; against "human" [wikidata]
- Silica (sword-art-online/silica) / species: kept "beast" [fandom]; against "human" [wikidata]
- Akihiko Kayaba (sword-art-online/akihiko-kayaba) / voice_actor_ja: kept "Ohkawa Tohru" [fandom]; against "Kōichi Yamadera" [wikidata]
- Rimuru Tempest (that-time-i-got-reincarnated-as-a-slime/rimuru-tempest) / species: kept "true-dragon" [fandom]; against "slime" [wikidata]
- Milim Nava (that-time-i-got-reincarnated-as-a-slime/milim-nava) / species: kept "dragonoid" [fandom]; against "demon" [wikidata]
- Masayuki Rudra Nam Ul Nasca (that-time-i-got-reincarnated-as-a-slime/masayuki) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Hinata Sakaguchi (that-time-i-got-reincarnated-as-a-slime/hinata-sakaguchi) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]
- Diablo (that-time-i-got-reincarnated-as-a-slime/diablo) / species: kept "daemon" [fandom]; against "demon" [wikidata]
- Shion (that-time-i-got-reincarnated-as-a-slime/shion) / voice_actor_ja: kept "M.A.O" [fandom]; against "Mao Ichimichi" [wikidata]
- Takemichi Hanagaki (tokyo-revengers/takemichi-hanagaki) / voice_actor_ja: kept "花垣 武道" [fandom]; against "Yūki Shin / Akeno Watanabe" [wikidata] [TOP200]
- Manjiro Sano (tokyo-revengers/manjiro-sano) / voice_actor_ja: kept "佐野 万次郎" [fandom]; against "Yū Hayashi" [wikidata]
- Tetta Kisaki (tokyo-revengers/tetta-kisaki) / voice_actor_ja: kept "稀咲 鉄太" [fandom]; against "Showtaro Morikubo" [wikidata]
- Misa Amane (death-note/misa-amane) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Mello (death-note/mello) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Misato Katsuragi (evangelion/misato-katsuragi) / role_at_debut: kept "supporting" [wikipedia]; against "main" [site]
- Lee Jihye (omniscient-readers-viewpoint/lee-jihye) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Yoo Sangah (omniscient-readers-viewpoint/yoo-sangah) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Jung Heewon (omniscient-readers-viewpoint/jung-heewon) / role_at_debut: kept "main" [fandom]; against "supporting" [site]
- Genos (one-punch-man/genos) / species: kept "human" [fandom]; against "robot" [wikidata]
- Usagi Tsukino (sailor-moon/usagi-tsukino) / voice_actor_ja: kept "Kotono Mitsuishi" [wikidata+wikipedia]; against "月野 うさぎ  セーラームーン / スーパーセーラームーン / エターナルセーラームーン" [fandom] [TOP200]
- Ami Mizuno (sailor-moon/ami-mizuno) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Ami Mizuno (sailor-moon/ami-mizuno) / voice_actor_ja: kept "Aya Hisakawa" [wikidata+wikipedia]; against "水野 亜美  セーラーマーキュリー / スーパーセーラーマーキュリー / エターナル セーラーマーキュリー / プリンセス マーキュリー" [fandom] [TOP200]
- Minako Aino (sailor-moon/minako-aino) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site]
- Minako Aino (sailor-moon/minako-aino) / voice_actor_ja: kept "Rika Fukami" [wikidata+wikipedia]; against "愛野 美奈子  セーラーV / セーラーヴィーナス / スーパーセーラーヴィーナス / エターナル セーラーヴィーナス / プリンセス ヴィーナス" [fandom]
- Mamoru Chiba (sailor-moon/mamoru-chiba) / role_at_debut: kept "main" [wikipedia]; against "supporting" [site] [TOP200]
- Mamoru Chiba (sailor-moon/mamoru-chiba) / voice_actor_ja: kept "Tōru Furuya" [wikidata+wikipedia]; against "地場 衛  タキシード仮面" [fandom] [TOP200]
- Chibiusa (sailor-moon/chibiusa) / voice_actor_ja: kept "Kae Araki" [wikidata+wikipedia]; against "ちびうさ スモール レディ / ラビット / ブラック レディ / プリンセス レディ セレニティ / セーラーちびムーン / スーパーセーラーちびムーン / エターナルセーラーちびムーン" [fandom] [TOP200]
- Moeka Kiryu (steins-gate/moeka-kiryu) / role_at_debut: kept "antagonist" [fandom]; against "supporting" [site]

## Characters added to the site data (116)

| series | name | slug | score |
|---|---|---|---:|
| one-piece | Jinbe | jinbe | 1.982 |
| one-piece | Bartholomew Kuma | bartholomew-kuma | 1.970 |
| one-piece | Marshall D. Teach | marshall-d-teach | 1.970 |
| one-piece | Monkey D. Garp | monkey-d-garp | 1.963 |
| one-piece | Kuzan | kuzan | 1.962 |
| one-piece | Borsalino | borsalino | 1.955 |
| one-piece | Jewelry Bonney | jewelry-bonney | 1.953 |
| one-piece | Caesar Clown | caesar-clown | 1.951 |
| one-piece | Gecko Moria | gecko-moria | 1.950 |
| one-piece | Arlong | arlong | 1.948 |
| one-piece | Kozuki Oden | kozuki-oden | 1.947 |
| one-piece | Silvers Rayleigh | silvers-rayleigh | 1.939 |
| one-piece | Charlotte Katakuri | charlotte-katakuri | 1.936 |
| one-piece | Sengoku | sengoku | 1.933 |
| one-piece | Capone Bege | capone-bege | 1.931 |
| one-piece | Carrot | carrot | 1.928 |
| one-piece | Nerona Imu | nerona-imu | 1.928 |
| one-piece | Wapol | wapol | 1.927 |
| one-piece | Issho | issho | 1.923 |
| one-piece | Hody Jones | hody-jones | 1.922 |
| one-piece | Vegapunk | vegapunk | 1.921 |
| one-piece | Marco | marco | 1.919 |
| one-piece | Bellamy | bellamy | 1.917 |
| one-piece | Kin'emon | kin-emon | 1.916 |
| one-piece | Basil Hawkins | basil-hawkins | 1.912 |
| one-piece | Galdino | galdino | 1.908 |
| one-piece | Hatchan | hatchan | 1.907 |
| one-piece | Foxy | foxy | 1.905 |
| one-piece | Don Krieg | don-krieg | 1.905 |
| one-piece | Perona | perona | 1.903 |
| one-piece | Kuro | kuro | 1.903 |
| one-piece | Shirahoshi | shirahoshi | 1.900 |
| one-piece | Magellan | magellan | 1.899 |
| one-piece | Charlotte Perospero | charlotte-perospero | 1.899 |
| one-piece | Cavendish | cavendish | 1.898 |
| one-piece | Vinsmoke Judge | vinsmoke-judge | 1.893 |
| one-piece | Charlotte Pudding | charlotte-pudding | 1.890 |
| one-piece | Tashigi | tashigi | 1.889 |
| one-piece | Bartolomeo | bartolomeo | 1.887 |
| one-piece | Kaku | kaku | 1.884 |
| one-piece | Kyros | kyros | 1.881 |
| one-piece | Inuarashi | inuarashi | 1.879 |
| one-piece | Helmeppo | helmeppo | 1.879 |
| one-piece | Vinsmoke Reiju | vinsmoke-reiju | 1.879 |
| one-piece | Caribou | caribou | 1.878 |
| one-piece | X Drake | x-drake | 1.874 |
| one-piece | Jesus Burgess | jesus-burgess | 1.874 |
| one-piece | Rebecca | rebecca | 1.874 |
| one-piece | Nekomamushi | nekomamushi | 1.873 |
| one-piece | Hajrudin | hajrudin | 1.871 |
| one-piece | Shiki | shiki | 1.869 |
| one-piece | Kozuki Hiyori | kozuki-hiyori | 1.868 |
| one-piece | Killer | killer | 1.867 |
| one-piece | Neptune | neptune | 1.863 |
| one-piece | Scratchmen Apoo | scratchmen-apoo | 1.862 |
| one-piece | Vinsmoke Niji | vinsmoke-niji | 1.858 |
| one-piece | Jack | jack | 1.856 |
| one-piece | Vinsmoke Yonji | vinsmoke-yonji | 1.855 |
| one-piece | Vinsmoke Ichiji | vinsmoke-ichiji | 1.854 |
| one-piece | Alvida | alvida | 1.853 |
| one-piece | Trebol | trebol | 1.849 |
| one-piece | Uta | uta | 1.849 |
| one-piece | Daz Bonez | daz-bonez | 1.845 |
| one-piece | Diamante | diamante | 1.843 |
| one-piece | Pica | pica | 1.843 |
| one-piece | Viola | viola | 1.841 |
| one-piece | Aramaki | aramaki | 1.838 |
| one-piece | Charlotte Cracker | charlotte-cracker | 1.837 |
| dragon-ball | Android 17 | android-17 | 1.972 |
| dragon-ball | Bardock | bardock | 1.967 |
| dragon-ball | Pan | pan | 1.967 |
| dragon-ball | Cooler | cooler | 1.953 |
| dragon-ball | Vegito | vegito | 1.948 |
| dragon-ball | Nappa | nappa | 1.944 |
| dragon-ball | Gogeta | gogeta | 1.935 |
| dragon-ball | Gotenks | gotenks | 1.933 |
| dragon-ball | Dr. Gero | dr-gero | 1.930 |
| dragon-ball | Chiaotzu | chiaotzu | 1.930 |
| dragon-ball | Baby | baby | 1.928 |
| dragon-ball | Captain Ginyu | captain-ginyu | 1.921 |
| dragon-ball | Mercenary Tao | mercenary-tao | 1.919 |
| dragon-ball | Shin | shin | 1.915 |
| dragon-ball | Shenron | shenron | 1.913 |
| dragon-ball | Android 16 | android-16 | 1.908 |
| dragon-ball | Goku Black | goku-black | 1.897 |
| dragon-ball | Uub | uub | 1.889 |
| dragon-ball | Launch | launch | 1.889 |
| dragon-ball | Babidi | babidi | 1.886 |
| dragon-ball | Dabura | dabura | 1.885 |
| dragon-ball | Syn Shenron | syn-shenron | 1.885 |
| dragon-ball | Zarbon | zarbon | 1.884 |
| dragon-ball | Yajirobe | yajirobe | 1.877 |
| dragon-ball | Mr. Popo | mr-popo | 1.873 |
| dragon-ball | Caulifla | caulifla | 1.871 |
| dragon-ball | Dodoria | dodoria | 1.866 |
| dragon-ball | Kale | kale | 1.864 |
| dragon-ball | King Vegeta | king-vegeta | 1.861 |
| dragon-ball | King Cold | king-cold | 1.859 |
| dragon-ball | King Kai | king-kai | 1.856 |
| dragon-ball | Puar | puar | 1.855 |
| dragon-ball | Grandpa Gohan | grandpa-gohan | 1.845 |
| dragon-ball | Mai | mai | 1.841 |
| dragon-ball | Ox-King | ox-king | 1.840 |
| dragon-ball | Recoome | recoome | 1.838 |
| dragon-ball | Korin | korin | 1.834 |
| dragon-ball | General Blue | general-blue | 1.833 |
| dragon-ball | Master Shen | master-shen | 1.823 |
| dragon-ball | Porunga | porunga | 1.809 |
| bleach | Tōshirō Hitsugaya | toshiro-hitsugaya | 1.894 |
| bleach | Byakuya Kuchiki | byakuya-kuchiki | 1.890 |
| bleach | Kenpachi Zaraki | kenpachi-zaraki | 1.814 |
| bleach | Mayuri Kurotsuchi | mayuri-kurotsuchi | 1.814 |
| bleach | Ulquiorra Cifer | ulquiorra-cifer | 1.771 |
| hunter-x-hunter | Hisoka Morow | hisoka-morow | 1.727 |
| hunter-x-hunter | Phinks Magcub | phinks-magcub | 1.296 |
| hunter-x-hunter | Zeno Zoldyck | zeno-zoldyck | 0.500 |

## ORCH rulings 2026-11-03

Applied after the rule, each recorded on the field as ruling: "ORCH ruling 2026-11-03" with the rule as the source note. Roles at the first appearance (same rule as the Dragon Ball alignment): Bardock, Chiaotzu, Puar, Ox-King and King Vegeta antagonist, Launch supporting. Species: Androids 16, 17 and 18 "android"; Saiyan-human hybrids Gohan, Trunks, Goten and Pan "saiyan-human-hybrid" (Goten and Pan added for consistency); Frieza, Cooler and King Cold "frost-demon"; Tien Shinhan "human"; Oolong and Emperor Pilaf keep their values. Names shown in the game: Jinbe, Kozuki Oden, Kozuki Hiyori, Marco, Don Krieg, Hatchan; Goku Black stays a separate character from Zamasu.

## Species vocabulary per series (after the consistency pass)

- one-piece: human 85, reindeer 1
- dragon-ball: human 20, saiyan 11, saiyan-human-hybrid 4, android 3, frost-demon 3, glind 3, eternal-dragon 3, demon-realm-race 3, demonic-namekian 2, bio-android 1, beerus-race 1, neo-machine-mutant 1, pig 1, creature 1, ginyu-s-race-mutant 1, bibidi-s-race 1, zarbon-s-race 1, god 1, dodoria-s-race 1, namekian 1, animal-type-earthling 1, recoome-s-race 1, cat 1, jiren-s-race 1, majin 1, angel 1
- naruto: human 23, celestial-being 1, kitsune 1
- demon-slayer: human 15, demon 10
- jujutsu-kaisen: human 20, cursed-spirit 3, cursed-womb-death-painting 1, panda 1
- attack-on-titan: human 24
- my-hero-academia: human 20
- bleach: human 7, soul 6, shinigami 5, quincy 2, modified-soul 2, soul-reaper-werecat 1, bount 1, arrancar 1
- hunter-x-hunter: human 18, cat 1
- chainsaw-man: human 6, devil 5, devil-human-hybrid 1
- frieren: human 9, elf 2, demon 1
- black-clover: human 11, dwarf-human 1
- detective-conan: human 25
- code-geass: human 11
- dandadan: human 5, spirit 4, oni 1, sumerian 1
- dr-stone: human 12
- fairy-tail: human 11, demon 1
- fruits-basket: human 10
- fullmetal-alchemist: human 10, homunculu 2
- gintama: human 10, amanto 1, yato-tribe 1
- haikyu: human 5
- inuyasha: human 5, demon 1, dog-daiy-kai 1, spider-hany-spider-y-kai-spirit 1, kitsune 1, wind-y-kai 1, nothing-y-kai 1, imp-y-kai 1
- jojo: human 9, vampire 1, ghost 1
- kaguya-sama-love-is-war: human 10
- mob-psycho-100: human 11, spirit 1
- oshi-no-ko: human 6
- re-zero: human 7, oni 2, half-elf 1, artificial-spirit 1, beast-human 1
- sakamoto-days: human 1
- slam-dunk: human 10
- solo-leveling: human 6, dragon 1, beast 1
- spy-x-family: human 12
- sword-art-online: human 8, fairy 1, beast 1
- that-time-i-got-reincarnated-as-a-slime: human 3, true-dragon 2, dragonoid 1, deathman 1, high-blood 1, divine-human 1, daemon 1, divine-fighter 1, divine-oni 1
- tokyo-ghoul: ghoul 9, one-eyed-ghoul 1, artificial-one-eyed-ghoul 1, human 1
- tokyo-revengers: human 3
- tower-of-god: human 7, silver-dwarve 1, red-witche 1
- apothecary-diaries: human 5
- blue-lock: 
- bocchi-the-rock: human 5
- cowboy-bebop: human 5
- death-note: human 5
- evangelion: human 4, angel 1
- kagurabachi: human 3
- kaiju-no-8: human 3, kaiju 2
- omniscient-readers-viewpoint: human 4, constellation 1
- one-punch-man: human 5
- sailor-moon: human 5
- steins-gate: human 5
- vinland-saga: human 5
- violet-evergarden: human 1

## Added characters whose name was doubtful (settled by the ORCH rulings above)

Checked against the Fandom page title (the name used) and the Wikipedia title, and against the site characters. Of the 108 added characters (68 One Piece, 40 Dragon Ball including the 4 GT ones), these were doubtful (the names now shown are in the ruling above):

- Jinbe: kept (Wikipedia says Jimbei) (https://onepiece.fandom.com/wiki/Jinbe, https://en.wikipedia.org/wiki/Jimbei).
- Kouzuki Oden and Kouzuki Hiyori: Fandom spelling Kouzuki, Wikipedia says Kozuki Oden (https://onepiece.fandom.com/wiki/Kouzuki_Oden, https://en.wikipedia.org/wiki/Kozuki_Oden).
- Polo Marco: the Fandom page title; the character is known as Marco (the page "Marco" redirects to it: https://onepiece.fandom.com/wiki/Polo_Marco).
- Krieg: Fandom title, Wikipedia says Don Krieg (https://en.wikipedia.org/wiki/Don_Krieg).
- Hatchan: Fandom title for Hachi (the octopus fish-man).
- Goku Black (Dragon Ball): the alter ego of Zamasu, who is already in the site data (https://dragonball.fandom.com/wiki/Goku_Black, https://dragonball.fandom.com/wiki/Zamasu): a possible duplicate of the same person; keep it only if the game wants the character as a separate target.
- Grandpa Gohan (Dragon Ball): Wikipedia title is Grandpa Son Gohan; a different person from Gohan (in the site data), not a duplicate.
- King Vegeta (Dragon Ball): a different person from Vegeta, not a duplicate.

## Dragon Ball GT characters

Cooler, Gogeta, Baby and Syn Shenron are in dragon-ball.json with debut series GT and a GT saga (Super 17 Saga, Shadow Dragon Saga, Black Star Dragon Ball Saga, Shadow Dragon Saga). Open fields: home_planet of Cooler and Gogeta (no page states a planet), height_cm (dropped from the game), signature_technique of Syn Shenron (none settled).

## Sources unreachable

None.
