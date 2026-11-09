# Contract: the Otakudle character facts of lot A1 (run O1, 2026-10-30)

Between O1 (the daily games) and the old worker (lot A1, the facts). Owner decision of 2026-10-30: Otakudle (the character of the day,
every series) opens on launch day with Bunnyverse and OtakuQuiz. Its pool is the published characters of the 50 launch series; lot A1
supplies the facts the game compares that the database does not hold yet. This file fixes where they go, in what form, and how they are
checked. A change to it is a CR in `docs/o1/LEDGER.md`.

## 1. The columns of Otakudle and where each one comes from

Report `RAPPORT-JEUX-DU-JOUR-v2.md` 5.5 and the owner's list of 2026-10-30 (series, gender, species, role at the start, demographic, debut
year, studio). Values are as the reader first meets the character: never a later reveal. When a value is not known for sure from a source,
it is left out (null), and the character is simply not a target.

| column | kind | near when | comes from |
|---|---|---|---|
| Series | single | the same franchise | `characters.group_id` (L04), already there |
| Gender | single | | **A1**: `character_facts.gender` |
| Species at the first appearance | single | | **A1**: `character_facts.species` |
| Role at the first appearance | single | | **A1**: `character_facts.role_at_debut` |
| Demographic | single | | **A1**: `series_facts.demographic` |
| Year of the work | number | 2 years apart at most | the first publication of the original work, in any form (web novel, light novel, webcomic, manga; the broadcast for an anime original): `series_facts.work_year` first (L18, L23), then `series` (L04): `manga_start_year`, or `anime_start_year` for an anime original |
| Studio of the first adaptation | multi | one in common | the studio of the first TV anime series: `series_facts.first_studios` first (L23), then `series.studios` (L04): the studios whose `seasons` contain 1 |

Hints (optional, shown after errors): Japanese voice actor after 5 errors (**A1**: `character_facts.voice_actor_ja`), initial after 10
(from the name). The first appearance hint is removed for launch (owner, 2026-11-02, CR-020): **A1** still fills
`character_facts.first_appearance`, the view never serves it as a hint.

## 2. The two tables (O1 creates them; A1 only writes rows)

O1's migration `023-dle-otakudle.sql` creates them in session G, right after `022-photos-admin.sql` (SQL-ORDER row 14g once it lands), with
the view `dle_src_anime_character` and the game row `otakudle` (switched off). RLS on, no policy, closed to anon and authenticated, open to
service_role: the browser reads the pool only through `dle_pool`. The DDL, exactly (to try A1's file on a local copy before 023 is on main):

```sql
create table if not exists public.character_facts (
  character_id integer primary key references public.characters(id) on delete cascade,
  gender text check (gender in ('female', 'male')),
  species text check (species ~ '^[a-z][a-z0-9-]{0,39}$'),
  role_at_debut text check (role_at_debut in ('main', 'supporting', 'antagonist', 'other')),
  first_appearance text check (char_length(first_appearance) between 1 and 80),
  voice_actor_ja text check (char_length(voice_actor_ja) between 1 and 80),
  featured boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.series_facts (
  group_id integer primary key references public.series(group_id) on delete cascade,
  demographic text not null check (demographic in ('shonen', 'shojo', 'seinen', 'josei', 'kodomo', 'none')),
  updated_at timestamptz not null default now()
);
```

Value rules:
- `gender`: 'female' or 'male', lower case, as the work presents the character at the first appearance; anything else is left null.
- `species`: one English word or hyphenated words, lower case (`human`, `demon`, `shinigami`, `hollow`, `elf`, `robot`, `alien`...), at the
  first appearance. A species the story reveals later (a human who turns out to be a titan, a hidden demon) is the species shown first.
  The values of one series must be consistent with each other: the same word for the same thing.
- `role_at_debut`: the same four words as `characters.role`, judged at the first appearance, not at the end of the story.
- `first_appearance`: short, no spoiler, in English: `Chapter 1`, `Episode 3`, `Chapter 1 / Episode 1`.
- `voice_actor_ja`: the Japanese voice actor of the first adaptation, as written in the credits (romanized).
- `demographic`: the magazine's demographic of the original work; `none` for an anime original or a webtoon.
- `featured` (CR-023, owner 2026-11-03): true for the 200 best known characters (`scripts/anime/a2/data/TOP200.md`). A character is the target of the day only when
  every column and the voice actor have a value and it is featured (CR-026, owner 2026-11-03: Otakudle has no "How far are you?", so no rule of arc or medium is left): the first 365 days draw only from the TOP200, and one
  statement (`update public.character_facts set featured = true`) widens the draw a year later. Everyone else of the pool stays guessable.

Which characters: `characters.status = 'published'` only (owner, 2026-11-02, CR-023: `spoiler_level` and `identity_spoiler` no longer exclude a character; the values describe
the character as first met, and the debut arc stays as data: it decides nothing, since CR-026 removed "How far are you?" and one character of the day is the same for everyone). A row for a draft
is never read (the view leaves it out) and the check below counts it as an error.

## 3. The file

- Name: `docs/pending-migrations/multisite/launch/L13-A1-character-facts.sql`, with `L13-A1-character-facts.rollback.sql`. Since CR-023 the file holds the whole pool (the
  750 characters of `scripts/anime/a2/data/all-series.json`, which carries A1's values as one of its sources) and is generated by `scripts/anime/a2/gen-l13.mjs`;
  `entity_id` of a source row is the character slug, or `<series>/<slug>` for the one slug two series share (kagura). A role that is the site's own `characters.role` has no source row.
- Order: launch day, part J4 of `docs/launch/o1/session.sh`, right after L12 (owner order 2026-10-30). It needs L04 (series and characters)
  and 023 (the two tables).
- Form: the header of the other launch files (What, Needs, Verify, Undo, `-- o1-transaction: single`), `set lock_timeout = '5s'`, then
  upserts only:
  - a character is found by its series slug and its own slug, never by id:
    `(select c.id from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and g.slug = '<series>' and c.slug = '<character>')`;
  - `insert ... on conflict (character_id) do update set ...` and `insert ... on conflict (group_id) do update set ...`, so a second run
    changes nothing;
  - one `public.entity_sources` row per stored value, as L05 writes them: `entity_type` 'character' (entity_id the character slug) or
    'series' (entity_id the series slug), `field` the column name (`gender`, `species`, `role_at_debut`, `first_appearance`,
    `voice_actor_ja`, `demographic`), `source`, `source_ref`, `source_url`, `fetched_at`, `on conflict (entity_type, entity_id, field, source) do update`.
- It touches no other table, no row of L01 to L12, and no kpop row.
- The rollback deletes the rows of the 50 launch series from the two tables and their `entity_sources` rows with these fields, and refuses
  once the game `otakudle` has a play.
- Only verified values, as the launch files: no DRAFTS file ever reaches `main` for production.

## 4. The check after it (`docs/launch/o1/checks/V-L13.sql`, written by O1 with 023)

Read only. Each row is ok or KO and a count, never a name.

The check is the file `docs/launch/o1/checks/V-L13.sql` (CR-023 changed it from the version first written here): rows 1 to 7: 50 demographics; no fact on a draft; no value
without a source (the site's own role counts as one); the targets of the game reach its minimum; 200 characters featured; and, as information, the characters with the 7
columns and the targets.

`session.sh J4` then runs the launch counts again (`content-verify.sql` must not move) and V-S4. (CR-023 changed row 2: only a draft is out of the pool.) Otakudle is activated on launch day after
these files, by O1's step (never by A1's file).

## 5. Changes

CR-017 (`docs/o1/LEDGER.md`): the species of Goku, Nezuko and Denji by the owner's decision, the studio when `seasons` is empty, the game row of 023 written once L01 is in (session.sh J4), the pool, and the activation file L14, for Kpopdle Idol too, with session part J5.

CR-023 (`docs/o1/LEDGER.md`): L13 covers the 750 characters of the pool, `character_facts.featured` and the TOP200 rule for the targets, the Fandom source, and V-L13.

## 6. The daily games of one series (CR-023, owner 2026-11-02 and 2026-11-03)

Two more games on the same engine, one series each: `otakudle-one-piece` (page `/otakudle/one-piece`) and `otakudle-dragon-ball` (page `/otakudle/dragon-ball`). Never the name
"Onepiecedle". O1 creates `character_game_facts (character_id, game_id, attrs jsonb, hints jsonb, can_be_target boolean, updated_at)` in `024-dle-series-games.sql`
(RLS on, no policy, closed to anon and authenticated, like part 2) and one closed source view per game; lot A2 only writes rows, in
`launch/L15-A2-series-games.sql` (generated by `scripts/anime/a2/gen-sql.mjs`, applied in session.sh J4 right after L13, rollback and `V-L15` included).

| game | column | kind | value stored in `attrs` (`v`; `l` is the words to show) |
|---|---|---|---|
| One Piece | gender | single | `male` or `female` |
| | affiliation | multi (one crew in common is near) | the current crews, main one first |
| | devil_fruit_type | single | `Paramecia`, `Zoan`, `Logia`, `none` |
| | haki | multi (overlapping sets are near) | `observation`, `armament`, `conqueror`; `none` for no haki |
| | bounty | number, arrows | berries; `0` with `l` "No bounty" |
| | height_cm | number, arrows | cm; a single Fandom source is accepted (owner exception) |
| | sea_of_origin | single | the sea |
| | debut_arc | ordinal, arrows | the arc order, `l` the arc name |
| Dragon Ball | gender, race, home_planet, alignment_at_debut | single | words (`good` or `evil` for the alignment) |
| | affiliation | multi | the groups |
| | universe | number, arrows | the universe number |
| | debut_series | ordinal, arrows | DB 1, Z 2, GT 3, Super 4, Daima 5; `l` the series name |
| | debut_saga | ordinal, arrows | the order across all series; `l` the saga name |

Dragon Ball has no height (owner, 2026-11-03). Hints: One Piece, the Devil Fruit name after 5 errors ("No Devil Fruit" for a character without one, put by the view) and the
initial after 10; Dragon Ball, after 5 errors the signature technique when the character has one, else the Japanese voice actor (the view puts exactly one of the two keys in the
hints, so a hint is never empty), and the initial after 10. A value the data does not have is `null`: the cell reads "unknown" and the character is not a target. `can_be_target` is
true only when every column and the 5-error hint have a value. The pool of a view: the characters of the facts table for the game, published, in the published series
(owner, 2026-11-02: `identity_spoiler` and `characters.spoiler_level` do not exclude a character).

Sources: `entity_sources` rows with `entity_type` 'character', `entity_id` the character slug and `field` "<series>.<column>" (so the rows of part 3 keep theirs), `source` wikidata,
wikipedia or **fandom** (a Fandom wiki states the facts of a fiction: facts only, never a text, a picture or a name taken from it; `entity_sources_source_check` knows it since CR-023, and a fact file may cite a `*.fandom.com` page on a `character` fact only: `fact.schema.json`), one row per
supporting source. One Piece `height_cm` is the only column the owner accepts with one source. `L14-O1-dle-on.sql` opens a series game when its pool reaches `min_pool`
(40 and 30); under it the game stays off and the file says so.

## 7. The rules of audit 06 (owner, 2026-11-09; the files are L21, L22 and L23 of lane otkdata)

Everything below is a rule the data now follows. A value that does not follow it is a defect, fixed by an additive guarded file, never by hand.

**Otakudle (part 1)**

- **Voice actor and studio: the first TV anime series (D-5).** The Japanese voice actor is the one of the first TV anime series of the work (not a drama CD, a game, an OVA, a film or an English dub), written given name first as Wikipedia writes it ("Yuki Kaida", "Yūki Ono"). The studio is the one of that series (`series_facts.first_studios` when it differs from the studios of `series`, which describe the later seasons too). Where one work has several casts (Hunter x Hunter 1999 and 2011, Fullmetal Alchemist 2003 and 2009), the first TV series is used for every character of the work; a character that only exists in a later arc keeps the cast that voices it (Meruem, Pariston, Alluka, Komugi). A value in Japanese script, or the character's own name, is never a voice actor: it is null.
- **Year: the first publication of the original work, in any form (D-6).** A web novel, a light novel and a webcomic count (Apothecary Diaries 2011, Slime 2013, Solo Leveling 2016, Omniscient Reader 2018, Re:Zero 2012, Sword Art Online 2002, Mob Psycho 100 2012, One-Punch Man 2009, Steins;Gate 2009). It is `series_facts.work_year`.
- **Species and role: as first met, never a later reveal**, with the spelling of the pool ("shinigami", "yato", "half-demon", "animal" for the animal-type Earthlings). A species the source does not give for the character is null (Mr. Popo), and the character is not a target.
- **Sources.** Every stored value has an `entity_sources` row: the Wikipedia or Fandom page that states it, `source_ref` the revision id read, `source_url` the page, `fetched_at` the day read. A role that rests on the site's own data (`characters.role`, K1) is not enough: it takes a Wikipedia or Fandom row too (OT-D4; the 36 featured roles without a source got one in L22). **One Fandom source is enough** for a value of the series games (D-5 and D-DB5 of the audit, recommended and applied; this replaces "One Piece `height_cm` is the only column with one source" of part 6): the Fandom infobox and the Fandom categories of one page count as one source, as `entity_sources` stores them.
- **Duplicates.** Two characters that are the same person (Hisoka Morrow / Hisoka Morow) are one: the other is excluded with `dle_curation.excluded` (OT-D1), not deleted.
- **Featured.** `character_facts.featured` is the TOP200 plus the characters the owner adds by hand (OT-D2: Goku, Frieza, Gohan, Piccolo, Nezuko, Inosuke, Alphonse, Rimuru, Ken Kaneki) minus the one he replaces (Haise Sasaki, whose facts were Kaneki's, OT-D3). A character is an answer only with a gender, a species, a role and a voice actor. Gender is `female` or `male` (the check of 023); a character without gender (Rimuru) is not an answer until the owner allows a third value.

**The games of one series (part 6)**

- **One Piece, the point of reference of each column.** Bounty = the latest World Government bounty (a Cross Guild rank reward, Doflamingo's Birdcage reward or a lower bound is not a bounty: "No bounty" with value `0`, or null when the source gives none). Height = the adult, latest height (one Fandom source, owner exception). Devil Fruit and Haki = as of the reference point (the Fandom snapshot, then the chapter the owner names), not as first met. Affiliation = the group at the end of the debut arc (rule A, L17).
- **Seas.** "Calm Belt" is a sea (Boa Hancock). "Grand Line" covers the New World: Fandom's own word is used for every character (D-6, D-7).
- **Dragon Ball.** Alignment may be `neutral` besides `good` and `evil` (D-DB1: Beerus, Shenron, Porunga, Whis, Jiren, Hit and others). The affiliation holds canon groups only. One rule for the debut saga is still to be chosen by the owner (D-DB2, the manga saga or the anime saga when they differ); L21 holds no statement for it.
- **Corrections.** `scripts/anime/a2/corrections/` holds the specs (`spec-l21.mjs`, `spec-l22.json`, `spec-l23.mjs`), `apply.mjs` (the last step of the pipeline: a regeneration of L13 and L15 keeps every fix) and `gen.mjs` (the guarded files L21, L22, L23 and their rollbacks).
