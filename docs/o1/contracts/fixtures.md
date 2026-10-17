# Fixtures (fixtures.md)

Contract `o1-contract-v1`, owner F0. Source: BACKLOG 5.1 ("Fixtures: users (kpop-only, kpop-heavy with bias, groups,
header and bio, dual member, anime-only new, banned, unconfirmed email, Team creator, admin reviewer); series fixtures
Death Note, One Piece, Spy x Family with arcs, characters, themes and 5 quizzes each"), LEDGER D-023 (ORCH's G2
fixture script), COMMON rules 7 and 17. Files: `fixtures/users.json`, `fixtures/series/*.json` with
`fixtures/series-fixture.schema.json`. `contract.test.ts` checks them (section 4).

Fixtures exist on the dev branches only (`o1-scratch`, `o1-dev`), never in production. They are contract artifacts
(COMMON rule 17): a later lane replaces them and R checks that none ships as a result. No agent creates an account:
the users come from the owner's command (rule 7).

## 1. Who creates what, and when

| step | what | who | when |
|---|---|---|---|
| 1 | the 38 auth users and their `profiles` rows (`unconfirmed` gets no profile) | the owner: `sh O1/scripts/o1/fixtures.sh` (gate G2), running `apps/quiz/scripts/o1/fixtures/run.mts` on each branch | after G1 and each `branch-parity.sh` rebuild; idempotent |
| 2 | the ids, usernames and emails per branch | `run.mts` writes `docs/o1/fixtures-<branch>.json` | with step 1 |
| 3 | memberships, `editorial_accounts`, `sites.system_user_id` of anime, so each account has the `sites` of `users.json` | ORCH's fixture step, after B2's 002a, B3's 003 and B5's 009 are on the branch (request F0-15) | after those SQL files |
| 4 | the three series of `fixtures/series/` (groups, series, arcs, characters, themes, quizzes) | ORCH's fixture step (request F0-15) | after 002a and 011 are on the branch |
| 5 | the kpop seed rows `schema.sql` needs (profile ...0001, group `general-kpop`) | ORCH (request F0-13) | after each rebuild |

Fixture accounts are found by email or username, never by a hard-coded id (ids differ per branch and per run).

## 2. Users (`fixtures/users.json`)

Emails: `o1-fixture-<key with each underscore replaced by a hyphen>@example.com` (reserved, never deliverable). No
password is ever set; tests sign in with a magic link read through the admin API or a session minted by the
service role on the branch (Q0b's auth suite decides how, never a real inbox).

| key | username | sites | what it is for |
|---|---|---|---|
| kpop_only | o1_kpop_only | kpop | every kpop DOM and parity check signed in; the B6 menu stays hidden |
| kpop_heavy | o1_kpop_heavy | kpop | bias, bio, stan since 2019, 12000 XP, `ult_groups` and header once the branch has group rows: P2's string leak test on anime |
| dual | o1_dual | kpop, anime | the Your sites menu, the hub passport with two worlds, the jump |
| anime_new | o1_anime_new | anime | a new anime member with no kpop membership: welcome card, anime /me and /u, no K-pop text anywhere |
| banned | o1_banned | kpop | `banned_at` set: handoff `banned`, `/auth/confirm` signs out |
| unconfirmed | o1_unconfirmed | none | email not confirmed, no profile: handoff `unconfirmed` |
| admin_reviewer | o1_admin_reviewer | kpop | the dev servers' admin (`ADMIN_USER_IDS`, added by `scripts/o1/env.sh`): `/admin/review`, `/admin/network` |
| creator_01 to creator_30 | oq_creator_01 to oq_creator_30 | anime | Team creators (placeholders until K2's personas): Team badge, byline, off every board |
| otakuquiz_team | otakuquiz_team | anime | the system account: daily quiz and Anime Mix, `sites.system_user_id` of anime |

`sites` is the state after step 3. Note for step 3 (request F0-15): 003's backfill gives every existing profile a kpop
membership, and step 1 runs before 003 on the branches, so `anime_new`, the 30 creators and `otakuquiz_team` get a kpop
row they must not have; step 3 deletes those rows and adds the anime ones (production does not have this problem:
there, K2's accounts are created after 003 with `create_profile_for_site(..., 'anime', ...)`).

A new fixture user is a CR (BACKLOG 5.2) that changes `users.json` and `run.mts` together (the test compares them).

## 3. Series (`fixtures/series/*.json`)

Death Note (`death-note`), One Piece (`one-piece`), Spy x Family (`spy-x-family`). Each file: the `groups` row (slug,
name, placeholder colours), the `series` row, `arcs` (Death Note: Part 1 and Part 2; One Piece: the eleven arcs from
Romance Dawn to Alabasta; Spy x Family: Season 1 and Season 2), 8 to 10 `characters` (role, debut arc, spoiler level,
a description in our own words), 3 to 5 `themes` and 5 `quizzes`. Keys are the column names of `schema.sql`. Counts that
change while a series runs are left empty (never invented); no Wikidata or MusicBrainz id is typed (SEO rule 7); no
Deezer id is stored (K4 checks previews).

Quizzes: five per series, one per engine type (multiple choice, true or false, guess from clues, intruder) plus a
second multiple choice, by Team creators (`oq_creator_01` to `05`, with `source_url`) and by fans (`o1_dual`,
`o1_anime_new`, without Team fields), slugs prefixed `fx-`. Quiz 1 of Death Note is the S 4.7 sample in its stored form
(E1's quality bar). Each quiz carries `expected_level`, what `computeSpoilerLevel` must return (rpcs.md 3), and the
loader writes it to `quizzes.spoiler_arc_ord` and `spoiler_scope`; together they cover level 0, a level from a single
tagged question, an `anime` scope and the highest arcs, so O2's quiz list, O3's shield and "Safe for you" have every
case. A question is tagged at least at the highest `spoiler_level` of every character it names.

Loading (step 4): `groups` (`site_id` anime, `slug`, `name`, `display_color`, `text_color`), `series` (`group_id`),
`arcs`, `characters`, `series_themes` (`group_id`), then `quizzes` (`site_id` anime, `creator_id` from `account`,
`group_id`, `slug`, `title`, `quiz_type`, `difficulty`, `questions`, `question_count`, `status` published,
`spoiler_arc_ord` and `spoiler_scope` from `expected_level`). Replacement: K1's first load of a series deletes the
fixture's arcs, characters and themes of that series and the `fx-` quizzes, then loads its reviewed rows under the same
slug.

Facts in the fixtures follow S 4.7's quality bar but are not reviewed content: they are written from the sources each
row cites and stay fixtures. A series fixture added later is a CR (BACKLOG 5.2).

## 4. Checks (`contract.test.ts`)

- `users.json` equals `run.mts`: the same keys, usernames, display names, kinds, confirmation and profile values, in
  the same order; every kind and site is closed; usernames follow `username_format`.
- Every series file validates against `series-fixture.schema.json`; every key of a row is a column of its table in
  `schema.sql`; character, theme and arc keys are unique; every debut arc and question tag names an arc of the series
  (or 0); every quiz account is a fixture user with an anime membership; `expected_level` equals the rule of
  `AnimeSpoilerFns.computeSpoilerLevel`; every question that names a character with a `spoiler_level` above 0 is
  tagged at least that high; a Team quiz carries a `source_url` on every question.
