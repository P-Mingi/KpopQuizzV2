# E1a: anime editorial toolchain, scripts only (light mode, sonnet)

Worktree `ROOT/.claude/worktrees/o1-E1a`, branch `o1/E1a`, guard agent E1a. Files: `scripts/anime/editorial/**` and
`docs/anime/editorial/**` only. Contract: `O1/docs/o1/contracts/formats.md` and `schemas/` (fact, quiz draft, daily
bank row, review packet), `schema.sql` (editorial_drafts, trivia, entity_sources shapes). No app code, no build.

## Do
1. Fact store: JSON keyed by `fact_id` (value, entity, sources with URL, Wikipedia revision id, fetched_at, status),
   with a validator against the fact schema.
2. Checks C1 to C14 as one CLI (`node scripts/anime/editorial/check.mjs <draft.json>`), each with one passing and one
   failing fixture: schema valid, 4 distinct options, one right answer, every answer backed by a cited fact, allowed
   sources only (Wikidata, MusicBrainz, Wikipedia, official sites; never MyAnimeList, Jikan, Fandom, AnimeThemes,
   kprofiles), spoiler tag on every question, title not "{series} quiz", no dash, no emoji, no lyrics, no image field,
   C7 copy guard (normalized n-gram similarity against stored source text), C9 dedupe against the corpus, title
   similarity against inspiration titles. Thresholds written in the file header.
3. Second-pass verifier: answers each question from the cited facts only and flags ambiguity.
4. Review packet generator: batches of 10, facts side by side, a 25% sample drawn, flagged items listed, Markdown.
5. SQL emitters for quizzes, quiz_bank and editorial_drafts rows (files only, never applied).

## Checks
- `node --test scripts/anime/editorial/` green; each check fails on its failing fixture.
- A sample Death Note quiz built from 9 sourced facts passes every check; a copied source sentence fails C7; a spoiler
  mismatch fails C5.
- No network call in tests (fixtures only). No dashes, no emoji. Report `docs/o1/reports/E1a.md`, 20 lines at most.

## Return
`ready <sha>` / `progress <sha>` / `blocked <why>`. Budget 1.5 M tokens. No production access, no push.
