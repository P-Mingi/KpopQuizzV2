# Content formats (formats.md)

Contract `o1-contract-v1`, owner F0. Sources: BACKLOG 5.1 ("Content formats (JSON Schemas): fact, quiz draft (S 4.7
stored form), daily bank row, creator profile, playlist, Which character set, name-all set, this-or-that bracket,
crossover entry, review packet"), the lane cards E1, K1 to K4, O5, O6, X1 (BACKLOG 3), S 2.4 to 2.8, 3.3 to 3.5, 4.3 to
4.7, Q 3 and D5. The schemas are in `schemas/` (JSON Schema draft 2020-12, a subset); the validator is
`apps/quiz/scripts/o1/contract/json-schema.ts` (no dependency, rule 14), which E1's check C1 and the lanes' tests import.
`contract.test.ts` proves every schema uses only the supported keywords, every `$ref` resolves, each format accepts a
good entry and refuses planted bad ones, the fixtures of `fixtures/` validate, and the enumerations equal `schema.sql`,
`lib/anime/types.ts` and `lib/network/types.ts`.

## 1. Conventions

1. A data file of a content lane is named `<name>.<format>.json` (for example `death-note.quiz-draft.json`) and holds
   one entry or an array of entries of that format. `formatOfFile` and `validateEntries` of the validator read that
   convention. Entries carry no `format` or `version` key: the contract version is the version.
2. Keys are snake_case and equal the SQL columns they land in (section 13), except the crossover entry, which is
   exactly `NetCrossover` (camelCase, X1's TypeScript file).
3. Every text a visitor can read is `plainText` (common.schema.json): one line, trimmed, no U+2013 or U+2014 (rule 10,
   check C11), no emoji. Lengths are the SQL limits where a column has one (titles 5 to 100, bios 160, display names
   40, beats 80, character descriptions 140, trivia facts 280).
4. Every source URL is `sourceUrl`: https, lowercase host, and never a host rule 8 or S C10 bans (MyAnimeList, Jikan,
   Fandom, AnimeThemes, kprofiles, AniList, Sporcle). The schema refuses them, so C10 fails at C1 already.
5. A spoiler tag is `{arc, scope}`: `arc` an `arcs.ord` of the series, 0 for spoiler-free; `scope` anime, manga or
   both (S 3.5). A quiz's level is never in a file: the server computes it (S 3.4 rule 5, `computeSpoilerLevel`).
6. No image field exists in any format (S 3.4 rule 1, C14): intruder options are text labels, profiles carry no
   photo, playlists and crossover entries carry no cover.
7. Ids are never typed by hand for Wikidata or MusicBrainz (SEO rule 7): a fact may carry the id its source returned
   (`ref`), and the seed scripts resolve the rest.
8. Rules a schema cannot state (an equality between two fields, a lookup in another file or table) are listed per
   format below with the check that enforces them (E1's C1 to C14, or the lane's own test).
9. A new optional field or a new format is a CR (BACKLOG 5.2). A new required field, a rename or a tighter limit is a
   re-freeze.

## 2. Shared definitions

`common.schema.json`: `siteId`, `contentSite` (anime, kpop: the hub carries no content), `slug` (`groups.slug`,
character, set and playlist slugs, `^[a-z0-9-]{1,60}$`), `quizSlug` (`quizzes.slug` and `games.slug`, up to 80),
`username` (`^[a-z0-9_]{3,20}$`), `factId`, `plainText`, `sourceUrl`, `isoDate`, `isoDateTime`, `difficulty`,
`spoiler`, `themeKind` (op, ed, insert), `axis`, `creatorAsset`, `repoJsonPath`, `checkCode` (C1 to C99; codes after
C14 are a CR).

`anime-question.schema.json`: one question as `quizzes.questions` stores it on anime (BACKLOG 5.1: today's shape plus
`kind`, `spoiler`, `fact_ids`, `source_url`). Exactly one of four shapes: multiple choice (4 distinct options,
`correct` 0 to 3), true or false (`correct` boolean), guess from clues (3 clues, 4 options), intruder (4 text labels,
`correct` the intruder). `kind` is `ANIME_QUESTION_KINDS` (S 3.3 plus `lore`, F0 decision 75). `teamQuestion` adds the
Team rule (S 3.4 rule 8: `fact_ids` and `source_url` required); `quizTypeAgreement` makes every question of a quiz
take the shape of its `quiz_type` (multiple_choice, true_false, guess_from_clues, intruder; never image). Fan quizzes
store the same shape with the two Team fields optional.

Fact ids: lowercase words joined by hyphens, ending with a counter of 3 or more digits, at most 80 characters
(`dn-creators-001` as in S 4.7, or `death-note-creators-001`). They are unique across the fact files of a site.

## 3. Fact (`fact.schema.json`)

One fact of E1's store (S 4.3 steps 1 and 2). Written by K1 (series data and fact sets) and E1's loaders; read by E1's
checks C2, C3, C5, the second-pass verifier, the review packets and the SQL emitters.

| field | meaning |
|---|---|
| `id`, `site` | the fact id; the site whose content cites it |
| `entity` | `kind` (series, character, arc, theme, episode), `group_slug`, and `ref`: none for a series, the character slug, the arc ord, `op-1` style for a theme, the episode number |
| `field` | for a header or list value: the column or list it fills (`episodes`, `studios`, `title_native`) |
| `value` | the fact itself: a string, a number, a boolean or a list of strings |
| `text` | the trivia sentence in our own words (C7), 3 to 280 characters, when the fact is shown as trivia |
| `category` | today's `trivia_category_check`: production and dates `history`, themes `music`, characters `members`, awards `achievements`, anything else `fun` |
| `load_bearing` | dates, counts and creators (S 2.8) |
| `spoiler` | the arc from which the fact spoils (C5 compares question tags with it) |
| `sources` | 1 to 5: `source` (wikidata, musicbrainz, wikipedia, official, press: Oricon or Anime News Network, D-105; files only: entity_sources_source_check does not know it, the loader skips it, it never counts as the second source of C2), `url`, `ref` (Wikipedia: the revision id read, required; Wikidata: the QID; MusicBrainz: the MBID), `fetched_at` |
| `status`, `verified_at` | draft, verified, rejected; a verified fact has its date |

Schema rules: a verified load-bearing fact has 2 or more sources, one of them Wikidata or official (S 2.8, C2).
Beyond the schema: the two sources agree (E1's verifier); a Wikipedia source was read at that revision.
Landing: `trivia` (`entity_kind` = `entity.kind`, except that `episode` facts never become trivia rows; `entity_id` =
`entity.ref`, or the group slug for a series; `group_id` = the series; `fact` = `text`; `source` = the first source's
name; `source_url` = its URL; `status` published only once verified and approved) and `entity_sources` (one row per
source: `entity_type` = the kind, `theme` as `series_theme`; `entity_id` as above; `field`; `source`; `source_ref` =
`ref`; `source_url`; `fetched_at`).

## 4. Quiz draft (`quiz-draft.schema.json`)

A Team account's quiz before review: the stored form of S 4.7, kept in `editorial_drafts.payload` (kind `quiz`, 012).
Written by K2 (and X1 for the one kpop fallback quiz) through E1's draft step; read by the checks, the second pass, the
review packets, `/admin/review` and the publisher.

Fields: `site`, `account` (the author's username, a Team account of that site), `group_slug` (the series, or
`anime-mix`; on kpop the group), `title` (5 to 100), `slug`, `description` (optional), `quiz_type`, `difficulty`,
`language` (`en`), `title_gives_nothing_away` (the box of S 3.4 rule 4, always true), `questions` (3 to 20 Team
questions), `sources` (1 to 20: `id` S1 to S99, `title`, `url`: the list the quiz page prints), `notes` (for the
reviewer, never published). No spoiler level and no status: the server computes the level, the draft row holds the
status.

Beyond the schema: every question's `source_url` is one of `sources[].url`; every `fact_ids` entry is a verified fact
(C2, C3); the title is not "{series} quiz", "{series} test" or "quiz {series}" and names no `identity_spoiler`
character (C6); at most one quoted line of 10 words or fewer per quiz, none in a music question (C8); distractors are
entities of the same type (C4); the tags follow C5. Landing: `editorial_drafts` (`kind` quiz, `account_id` the
account's user id, `group_id`, `title`, `sources` = `sources`, `payload` = the whole entry, `review_batch_id`); the
publisher inserts `quizzes` with `spoiler_arc_ord` and `spoiler_scope` computed. For a kpop draft the emitter keeps
`source_url` and drops `kind`, `spoiler` and `fact_ids`, so the kpop question shape stays today's.

## 5. Daily bank row (`daily-bank-row.schema.json`)

An anime `quiz_bank` row before review (S 4.4). Written by K3; read by its rotation dry run, E1's checks, the review
packets and the SQL emitter. Fields: `site` (anime), `title`, `description`, `group_slug` (null for a mixed row, which
`ensure_daily_quiz_v2` files under the fallback group `anime-mix`), `quiz_type`, `difficulty`, `category` (the eight of
S 4.4: the seven new values of `quiz_bank_category_check` and the shared `true_false`), `questions` (exactly 8 Team
questions, every one at spoiler arc 0: the bank accepts level 0 only), `sources`.

Beyond the schema: the S 4.4 rotation rules (K3's 110-day dry run). Landing: `quiz_bank` (`site_id` anime, `group_id`
from the slug, `status` draft, then verified with `verified_at` and `verification_notes` = the source list after review;
`scheduled_date` set by the auto-scheduler, never in the file).

## 6. Creator profile (`creator-profile.schema.json`)

One Team account of OtakuQuiz (K2: 30 creators and the OtakuQuiz Team system account, S 4.5). Read by K2's account
script (the owner runs it: rule 7), E1's draft prompts (the style card), O1's `/about` and P1's profile pages.
Fields: `site` (anime), `kind` (series: 1 to 3 series; theme; system: `otakuquiz_team`, no series), `username`,
`display_name` (40), `bio` (160), `beat` (80), `groups` (series slugs), `style` (`voice`, `do`, `dont`: the writing
style card), `avatar` and `header` (`public/brand/anime/creators/<username>-avatar.svg` and `-header.svg`, original
geometric art, never anime art or an AI image in a series' style).

Beyond the schema: the Team badge is not a field (rule 7: always shown); the persona method is the owner's (G6).
Landing: `profiles` through `create_profile_for_site` (service role, `p_user_id`; `avatar_url` and `header_url` = the
site URL plus the asset path, absolute as `avatar_url_format` requires), `editorial_accounts` (`site_id` anime,
`display_name`, `beat`), the anime `world_memberships` row (`bio`), and for the system account
`sites.system_user_id` (L02).

## 7. Playlist (`playlist.schema.json`)

An openings playlist of the anime blind test (K4: 10 playlists of 15 playable themes; O6). Fields: `site` (anime),
`id` (the `[mode]` of `/blindtest/[mode]`), `kind` (series: `id` = `series-{group_slug}` and `group_slug` set;
themed: neither), `title` (60), `description` (160), `title_only` (only "Name the song" questions, the kpop
`PlaylistSpec.titleOnly`), `themes` (15 to 60 distinct themes, each `group_slug`, `kind`, `number`,
`deezer_track_id`), `checked_on` (the date the previews were checked).

Beyond the schema: every theme exists in `series_themes` with `deezer_playable` true at `checked_on`; a series
playlist holds only that series' themes; no cover is stored or shown (rule 9). Landing: none in SQL; O6 reads the
files (series playlists can also be derived from `series_themes` with `MIN_PLAYABLE_THEMES`).

## 8. Which character are you (`which-character-questions.schema.json`, `which-character-set.schema.json`)

Two files, because the engine asks one question set per site and matches a profile per series (S 1 table: "one
anime question set (10 questions)", 8 or more characters per series; F0 decision 76).

- Question set: `site` (anime), `questions` (8 to 12; `ord`, `question`, `options` of 2 to 6, each `text` and
  `weights` on the six axes of `lib/personality/engine.ts`, 0 to 5). Landing: `personality_questions` (`site_id`
  anime, `ord`, `question`, `options`, `active`). The engine asks the first eight by `ord`.
- Set: `site` (anime), `group_slug`, `profiles` (6 to 20: `character_slug`, `name`, `axes` with all six axes 0 to 100,
  `trait_lines` up to 4, `ord`). Landing: `personality_profiles` (`site_id` anime, `group_id`, `member_name` = `name`,
  `member_slug` = `character_slug`, `character_id` from the slug (013), `photo_url` null, `axes`, `trait_lines`,
  `ord`, `active`).

Beyond the schema: the route opens at 6 profiles (O5) and K3 targets 8; every profile is a published character of the
series with `spoiler_level` 0 and `identity_spoiler` false, because the page has no spoiler shield (TWINS row 14);
trait lines describe the character in our own words, never a real person.

## 9. Name-all set (`name-all-set.schema.json`)

A Name them all character set (K3: 15 sets, S 1 table). Fields: `site` (anime), `group_slug`, `set` (the `{set}` of
`/name-all/{series}/{set}`), `title` ("Name All the {Set}", S 2.10), `members` (3 to 60: `character_slug`, `name`,
`spellings`, the other accepted answers), `timer_seconds` (30 to 900), `difficulty`, `spoiler` (the set's tag when the
set itself spoils). Beyond the schema: every member is a published character of the series; the tag is at least the
highest `spoiler_level` of its members. Landing: `games` (`site_id` anime, `game_type` `name_all_characters` (013),
`group_id`, `slug` = `{group_slug}-{set}`, `title`, `content` = `{set, members: [{name, spellings, character_slug}],
timer_seconds, difficulty, spoiler}`).

## 10. This or that bracket (`this-or-that-bracket.schema.json`)

A text bracket (K3: 5 brackets, S 1 table: "Best opening of the 2010s"). Fields: `site` (anime), `group_slug` (absent
for a bracket across series), `slug`, `title`, `entries` (4, 8 or 16 distinct entries: a `label`, and optionally the
`group_slug` with a `character_slug` or a `theme` `{kind, number}` it names), `spoiler`. Round one pairs entries 1 and
2, 3 and 4, and so on. Text only: no image, no cover, no audio. Landing: `games` (`site_id` anime, `game_type`
`this_or_that`, `group_id` or null, `slug`, `title`, `content` = `{matchups: [{id: "m1", option_a, option_b, votes_a:
0, votes_b: 0}, ...]}` with today's `Matchup` shape, `matchup_count` = entries / 2). O5 renders it as the twin's bonus
card (decision 7: no route of its own).

## 11. Crossover entry (`crossover-entry.schema.json`)

One entry of X1's `lib/network/crossovers.ts`, exactly `NetCrossover` (Q D5; `contract.test.ts` compares the schema's
fields with the type). Written by K4 (the registry rows of Q 3 with sources, for the owner's one-hour check); X1
transcribes the verified ones. Fields: `id`, `kind`, `kpop` (`groupSlug`, `deezerId`, `mbid`), `anime` (`seriesSlug`,
`role` op, ed or insert, `season`, `cour`, `year`), `canonical`, `fact` (one sentence per side, 140 at most),
`source`, `checkedOn`, `status` (verified or hold). Schema rule: a `song_in_series` entry has a `deezerId` (never a
name match) and a `role`. Beyond the schema (X1's unit rules, Q D5): no two entries share a `deezerId` with different
series; only verified entries render.

## 12. Review packet (`review-packet.schema.json`)

What the owner reads before `/admin/review` exists (E1 phase 1; S 4.3 review protocol). Fields: `site`, `lane`,
`label`, `format` (the format of every item, or `series-data` for K1's sheet rows), `created_at`, `items` (1 to 50:
`ref`, `title`, `file`, `fact_ids`, `checks` with each code's result), `facts` (every cited fact, side by side),
`sample` (`fraction` 0.25 of the questions, the `seed` that drew it, the `refs` drawn; a question is `ref#n`),
`flagged` (what the reviewer reads in any case: titles, spoiler labels and every flagged item, with codes and a
reason), `review` (written after reading: `status`, `reviewer`, `reviewed_at`, `errors`, `notes`; two errors or more
make the batch `rejected`, S 4.3). Landing: `review_batches` (`site_id`, `lane`, `label`, `size` = items,
`sample_size` = sample refs, `errors`, `status`, `reviewed_by`, `reviewed_at`) and `editorial_drafts.review_batch_id`;
the owner's approval is also recorded in LEDGER (rule 16).

## 13. Who writes and reads what

| format | written by | read by | lands in |
|---|---|---|---|
| fact | K1, E1a | E1a checks and verifier, review packets, O2 (trivia) | `trivia`, `entity_sources` |
| quiz draft | K2, X1 (through E1a's draft step) | E1a checks, E1b (`/admin/review`, publisher) | `editorial_drafts.payload`, then `quizzes` |
| daily bank row | K3 | K3 dry run, E1a checks and emitter | `quiz_bank` |
| creator profile | K2 | owner's account script, E1a prompts, O1, P1 | `profiles`, `editorial_accounts`, `world_memberships`, `sites` |
| playlist | K4 | O6 | files (no table) |
| Which character question set | K3 | O5 | `personality_questions` |
| Which character set | K3 | O5 | `personality_profiles` |
| name-all set | K3 | O5 | `games` (`name_all_characters`) |
| this-or-that bracket | K3 | O5 | `games` (`this_or_that`) |
| crossover entry | K4 | X1, owner check | `lib/network/crossovers.ts` |
| review packet | E1a (for K1 to K4, X1) | owner, R-CONTENT | `review_batches`, LEDGER |
