# KpopCards lot 6: the photo harvest (integrator brief of 2026-11-16)

Goal: at least 1,000 cards. Branch `o1/cards-harvest` from main (00eb85a, #231 merged). `o1/cards3` is never touched.
If 1,000 cards are out of reach with the rules below, the report says so with the numbers; no rule is loosened to get there.

State read in production by the integrator (read only): 185 photos for 45 subjects (27 groups, 18 people), 174 cards. Kpopdle has
218 idols, the database 291 active idols and 154 groups. No pack is open: the catalog is rebuilt once, at the end.

## What a card is (unchanged)

One card per edition and per photo, as today: two editions of a subject never share a photo, an occasion (event) or a date
(`photo-checks.ts sameOccasion`). Aim: 6 photos a subject (C, U, R, SR, UR, L), 2 at least to enter the packs. A group photo
gives a pair (1/2 and 2/2). Stage: a stage photo when one exists. Full Art only with a real 2x (the 5.5:8.5 window 640 px wide;
for a group each half of the 11:8.5 window 640 px wide). Status `auto` or `pending` exactly as in lot 3 (decision 41).

## Scope

1. Every Kpopdle idol becomes a subject of its own: a `cards_entities` row of kind `idol` with its `group_id`, next to the groups
   and soloists already there. A Kpopdle idol who is already a subject (same Wikidata QID: jimin, jungkook, v-bts, jennie, rose...)
   keeps that entity and only gains photos. Order: CORTIS first, then the idols most played in Kpopdle.
2. Groups: up to 6 group photos each.
3. Groups with a member under 18 (CORTIS, Hearts2Hearts, BABYMONSTER...):
   - their adult members become subjects, with photos taken after their 18th birthday;
   - a member under 18: no photo, no card in packs. The binder shows a locked pocket with the name and "Carte à venir", with NO
     date. The opening month shows only in the admin. On the day, the pocket unlocks by itself and takes the normal state of an adult
     member without a photo, until a valid photo goes through the circuit;
   - the group card stays locked the same way until the youngest member is 18; then only photos where everyone present was an
     adult on the photo date count (the age rule as it is);
   - locked pockets never count in the binder's completion (percentage, "X sur Y", goals and badges). Nothing ranks them, puts them
     forward or invites a player to collect them: no favourite star, no wishlist, no "new" mark, no ranking, no search result.

## Rules (unchanged)

- `age-rule.ts` as it is: 18 or older today AND on the photo date, two agreeing sources for a birth date, any doubt excludes.
- Sources and licences of lot 3 only: Wikimedia Commons (its public API only), Korea.net / KOGL Type 1 through Commons, Flickr CC BY
  or CC BY-SA with a named author through Commons (decision 10: no Flickr key). Named author, no deletion request on the file.
- Never Fandom, AniList, fan sites, kprofiles, screenshots without a verified free licence, generated images.
- Birth dates never enter the repository, a commit, a report or a test. Not even the month of a minor's 18th birthday.

## Files and formats

Private, outside the repository (`$HOME/kpq-o1/notes/cards-lot6/`, mode 700; the scripts refuse a path inside the repository):

- `people/<lane>.json`: one row per person met (subject, group member, anyone else visible in a photo):
  ```
  { "qid": "Q...", "name": "Stage name", "birth_date": "YYYY-MM-DD" | null, "birth_precision": "day" | "month" | "year" | null,
    "birth_sources": [{ "site": "wikidata" | "enwiki" | "kowiki" | "musicbrainz" | "agency", "value": "YYYY-MM-DD", "ref": "revid, MBID or URL" }],
    "birth_confirmed": true | false,
    "memberships": [{ "group": "<groups slug>", "joined": "YYYY-MM-DD" | null, "joined_precision": "day" | "month" | "year" | null,
                      "left": "YYYY-MM-DD" | null, "left_precision": ..., "current": true | false }] }
  ```
  `birth_confirmed` is true only when two sources give the same day. `joined: null` means a member from the start.
- `candidates/<slug>.json`: lot 3's `CandidateFile` (`apps/quiz/src/lib/cards/photo-checks.ts`), one file a subject, at most 8
  candidates of distinct occasions, best first. For an idol photo, `people_visible` counts everyone in the frame and `who` names
  them; a photo where anyone else is visible goes to the owner's review at best, and is left out when that person is under 18.
- `locked.md`: the locked pockets with their opening month (written by the verify script, given to the integrator in the chat).

In the repository (public, no birth date, no month of a 18th birthday):

- `docs/design/cards/data/lot6/subjects.json`: the subjects of lot 6
  `{ slug, kind: "idol" | "group", name, qid, group: "<groups slug>" | null, idol_id: number | null, why: "kpopdle" | "minor-group" | "group" }`.
  New member slugs are `<name-slug>-<group-slug>` (as `v-bts`); existing subjects keep their slug.
- `docs/design/cards/data/lot6/photos.json`: verdicts and credits (lot 3's `photos.json` shape), the input of the 116 generator.
- `docs/pending-migrations/cards/116-photos-harvest.sql` and its rollback.

## SQL 116 (one DO block, `-- Verify:` lines, rollback, additive)

It never updates or deletes an existing photo or status. It adds: the member and group entities that are missing, the new photos
(`auto` or `pending`, next free slots, a page or sha1 already in `cards_photos` is skipped with a notice), and what the age locks
need. People resolve at apply time by Wikidata QID from `public.idols` (a QID that matches no row, or two, is skipped with a
notice). The owner applies it after a backup, never between 23:50 and 00:30 UTC, then "Reconstruire le catalogue", then
`pnpm --filter quiz owner:cards`.

The age lock is computed at read time from the database (`public.idols.birth_date`, never from the repository): locked while the
person is under 18 or has no known birth date; a group while any current member is. The opening month is served to the admin only
(service role); the public API sends a boolean, never a date.

## Work

Rule 13: no write in production, no connector, no push without the owner's go. At most 4 agents. Commons, Wikidata and Wikipedia
through their public APIs only, one request a second per lane, User-Agent `BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)`.
No agent downloads or views a picture of a person under 18. Research lanes write only under `$HOME/kpq-o1/notes/cards-lot6/`.
