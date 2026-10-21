# Content fix, lane K1: one fact per character, then retag the Characters quizzes
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-K1, branch o1/K1. Read this brief, docs/o1/briefs/K1-series.md
(its rules apply), and per series only docs/anime/data/series/<slug>.json, facts/<slug>.json and quizzes/<slug>/*characters*.json.
## The defect
Cast-list facts (one fact naming many characters) carry the arc of their latest character, so every Characters quiz that cites them is
lifted to that arc, even when the characters asked about are spoiler-free.
## Do, for each of the 30 series
1. Replace each cast-list fact by one fact per character it names: entity the character, value the name (and native name when the
   series file has it), spoiler arc and scope from that character's debut_arc_ord and spoiler_level in the series file, the same source
   URL and revision, an excerpt that is the source line about that character. Keep the old fact ids out of use (status retired) so
   nothing breaks; a retired fact may no longer be cited.
2. In every quiz and daily row that cited a cast-list fact, cite the per-character facts instead, and set each question's arc and scope
   from what it really reveals. The quiz level then follows; a Characters quiz about arc 0 characters becomes arc 0.
3. Starter quizzes stay at arc 0; no question about an identity spoiler (identity_spoiler true) below its arc.
## Checks
- `node scripts/anime/editorial/check.mjs docs/anime/data --facts-draft-ok`: 0 fail. No question cites a retired fact.
- `node scripts/anime/k1/validate-data.mjs --tier-counts`: 30 series ok. Load on o1-scratch twice: same counts.
- Packet: `node scripts/anime/editorial/packet.mjs --batch k1-cast --lane K1 --facts-draft-ok --out docs/anime/editorial/packets/k1-cast.html`
  with the changed quiz folders. In the hand-back, the list of Characters quizzes whose level changed (from and to).
Commit on o1/K1 ("o1: K1 cast facts per character ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 8 lines: sha, facts split and retired, quizzes retagged, levels before and after, checks, packet path.
