# REPORT - W7c: orphan classes closed, and the scope flag DELETED.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
CWD printed before every gate run, per your standing flag. No DDL. Nothing pushed. Verse
untouched. No title or meta description edited, so W1's July control set stays inside its
window to 2026-08-24.

Gates: tsc **0** · build **0** · check:routes **0** · check:indexability **0** (running
server) · **check:orphans 0, UNSCOPED, complete crawl of all 679 non-verse sitemap URLs** ·
check:metadata-dupes **unchanged** (8 collision groups, 0 non-verse skips).

Proofs: `docs/proofs/w7c-orphans/`. BLOCKED.md `w7b-orphans` cleared.

---

## The goal was to delete the scope. It is deleted.

`ORPHANCHECK_SCOPE` no longer exists in the file. The gate passes with nothing narrowed,
and it still fails on an injected orphan, so the pass is real.

## But the gate was lying to me before any of that

Two sampling defects were **inventing orphans**, and fixing those had to come first or I
would have "fixed" problems that did not exist.

1. **Index pages were not always crawled.** The sampler called only 2-segment paths hubs.
   `/games/name-all` has three, so it usually missed the sample and the five games it
   links looked orphaned. The rule is now: always crawl any sitemap path that is a
   path-prefix of other sitemap paths, because such a page is by definition an index and
   is exactly where inbound links live.
2. **Sampling itself.** The orphan set churned run to run (71 -> 64 -> 59) as pages
   entered and left the sample. The crawl now covers **everything** by default, so the
   output is a proof instead of a floor.

Together these removed **8 phantom orphans**: the 5 name-all games, `/easy-kpop-quizzes`,
`/guess-the-kpop-idol` and `/kpop-quiz-2026`. **None of them needed a link.** You flagged
`/guess-the-kpop-idol` as probably an artefact; it is, linked from its own guide article
in served HTML. Adding a second link would have been the dishonest fix.

## PART 1 - /blindtest links what it indexes

Before: 45 links served, zero to any playlist. After: **71 playlists, 71 link instances,
so each appears exactly once**, and **0 sitemap playlists left unlinked**.

The cause was three disagreeing sources of truth: the sitemap advertised groups found in
`blind_test_songs` (56), the picker offered `songs >= 15` (74), and the game generates
from `songs` needing 10 to fill a round. So 5 advertised playlists were never offered and
23 playable ones were never advertised. `src/lib/blind-test-playlists.ts` is now the one
definition, read by **both** the sitemap and the index, so they cannot drift again.

**Three were removed from the sitemap rather than linked** (your case (b)): measured in the
pool the generate route actually draws from, the-boyz has **9** songs, miss-a **0**, psy
**0**, against a 10-song round. Advertising a playlist that cannot produce a game is
advertising a game that does not happen. akmu (11) and taeyang (13) clear the bar and are
linked, not dropped. Sitemap: 682 -> 679 URLs, on purpose.

## PART 2 - the name-all five

Neither a data condition nor a template gap. All 24 name-all games are published, these
five included, and `/games/name-all` links all five in served HTML. They were an artefact
of the crawler missing that index. Fixed in the crawler, no links added.

## PART 3 - triage

Artefacts, no fix: `/easy-kpop-quizzes`, `/guess-the-kpop-idol`, `/kpop-quiz-2026`,
`/data/pulse/2026-07`. All four have real inbound links once the crawl is complete. Worth
saying plainly: **`/data/pulse/2026-07` did not need removing from the sitemap.** It looked
like an unlinked dated archive, but the `/data/pulse` index links it; the archive theory
was wrong and I am not acting on it.

Linked, case (a): `/trending`, `/new`, `/most-liked`. These were genuinely unlinked, and
the reason is a trap. They appear in `top-nav-links.tsx`, which looks like a link and is
not: they sit in the `match` array of the Home entry, a rule for highlighting the Home tab,
never a rendered anchor. The served home page contains `href="/trending"` **0** times.
They are browse views of the quiz catalogue, so they now sit on `/quizzes` beside the
existing popular-window row rather than in a footer.

## Deviations and flags (loud)

1. **I nearly fixed eight non-problems.** My first instinct on the name-all five was a
   template gap. The mission's instruction to find out why they differed *before* touching
   anything is the only reason I checked the served index first, and it turned out they
   were already linked. The lesson is now encoded in the crawler, not just in this report.
2. **The full crawl is slow.** 679 fetches takes several minutes, and two full runs
   exceeded a 10-minute command budget, so I ran them separately. `ORPHANCHECK_SAMPLE`
   still caps it for a fast local pass, and the output says in words when a run was
   partial and therefore only a floor. If you want this in CI, it belongs in a nightly
   rather than on every push.
3. **A screenshot of the new section came back blank and I did not report a defect from
   it.** The pane was hidden, not the page broken. Measured the cards instead: 424x60,
   real border, real text, 71 of them.

## Covenant

Every count is computed from real rows at read time. The three dropped playlists were
dropped on a measured song count, not a guess, and no link was invented anywhere: every
page that gained one gained it from a surface it genuinely belongs to.

## Next

Nothing outstanding on the orphan arc. Still open: the duplicate SEVENTEEN quiz and the
partner log, both in BLOCKED.md. One thing I did NOT do and would flag as worth a look:
23 playable blind test playlists are still absent from the sitemap, so they are reachable
but unadvertised. That is a different question from orphanhood and I left it alone.

---

STOP. **Nothing was pushed.** report pret.
