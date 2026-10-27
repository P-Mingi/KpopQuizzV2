# Content, lane K1: series data for otakuquiz.org, one batch of series (the batch is named in your prompt)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1. C = docs/o1/contracts.
Read this brief, C/fixtures/series-fixture.schema.json, C/fixtures/series/death-note.json (the model), C/schemas/fact.schema.json,
scripts/anime/k1/load-fixtures.mjs, and your web sources; nothing else.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open ~/kpq-o1/secrets. Only o1-scratch may be written, by the loader.
- Sources allowed: Wikipedia (record the revision id), Wikidata, MusicBrainz, the official sites of the series, publisher and studio.
  Never MyAnimeList, Jikan, Fandom wikis, AnimeThemes, AniList bulk, kprofiles. Use WebSearch and WebFetch only to read those sources.
- Facts in your own words: never copy a source sentence (a copy guard compares). No image, no artwork, no image URL field. No lyrics.
- No en or em dash, no emoji. Write files with Bash (heredoc, python), never the Write or Edit tools.
## Per series of the batch (tier given in your prompt)
1. docs/anime/data/series/<slug>.json, the fixture shape without quizzes: group (slug, name, site 'anime'), series (titles en, native,
   romaji, studios, director, authors, magazine or publisher, anime and manga years, status, episodes or chapters, official_url,
   wikidata_qid, tier), arcs (ord from 1 in story order, name, kind saga or arc or season, episode and chapter ranges, manga_only,
   anime_only), characters (tier A 30, B 20, C 12: name, native name, role, affiliation, debut_arc_ord, spoiler_level, identity_spoiler,
   description up to 140 characters, no spoiler above its level), themes (the openings and endings of the main TV series: kind, number,
   title, artist, season; deezer_playable false).
2. docs/anime/data/facts/<slug>.json: tier A 30 facts, B 20, C 15. Each: fact_id, entity, value, sources (url, revision id for
   Wikipedia, fetched_at), the short source excerpt it rests on, spoiler arc and scope, status 'draft'. Every number, date, name and title
   in the series file must be backed by one fact.
3. Spoilers: arc 0 means safe for someone who has not started; tag anything later with its arc and scope (anime, manga, both).
## Loader and checks
- Extend scripts/anime/k1/load-fixtures.mjs with `--data docs/anime/data` (loads every series file there; facts go to trivia and
  entity_sources) and create the 'anime-mix' group (site anime) if missing. Load on o1-scratch twice: same counts.
- If scripts/anime/editorial/check.mjs exists on o1/integration (merge it in with `git merge o1/integration`), run it on your files and
  fix until it passes; then build the packet: `node scripts/anime/editorial/packet.mjs --batch k1-<batch> <your files>
  --out docs/anime/editorial/packets/k1-<batch>.html`. If it does not exist yet, say so; ORCH runs it later.
Commit on o1/K1 ("o1: K1 <batch> ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, per series the counts (arcs, characters, themes, facts), checks result, packet path, doubts on any fact.
