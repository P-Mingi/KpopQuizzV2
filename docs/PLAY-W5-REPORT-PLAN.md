# W5 - THE K-POP KNOWLEDGE REPORT: angle, structure, and the honesty rules

Status: PLAN. No number in this file is verified. Cowork cannot reach the DB (Supabase MCP
has refused with "You do not have permission" since W8), so every figure the report ships
must come from `docs/data/w5-dataset.md`, produced by the worker and committed. If a figure
is not in that file, it does not go in the report.

## WHY THIS IS THE PLAY, AND WHAT WOULD MAKE IT FAIL

The whole point of W5 is Domain Rating 1/100. Nothing else in the plan moves it: we cannot
buy links without a penalty, we have no partners yet for W4, and W7's clusters raise
relevance rather than authority. Original data is the one asset we own that nobody can
copy, because it is a byproduct of people playing.

The two ways this fails, both of them ours:

1. **We publish and nobody pitches it.** A data report with no distribution earns zero
   links and we conclude "data PR does not work". Distribution is not a phase 2. If the
   list of who to send it to does not exist before the writing starts, do not start.
2. **We overclaim and get caught.** This is the real risk and it is worth being blunt
   about the sample. Plays are plentiful. Duel voters are NOT: on the last figures I saw,
   59,508 votes came from about 870 voters. That is a small panel, and any sentence of the
   shape "K-pop fans think X" built on it is a sentence a journalist can dismantle.

## THE ANGLE, AND WHY NOT THE OBVIOUS ONE

The obvious angle is "what K-pop fans believe" - rivalries, favourites, best group. It is
also the one we are least entitled to, because it needs a representative panel and ours is
870 self-selected players.

The angle we ARE entitled to is the one nobody else can run at all:

> **What K-pop fans actually KNOW, measured - not what they say they know.**

We do not survey. We score. Every claim reduces to "on N attempts, the average score was
X", which is a fact about our own measured universe and survives any scrutiny because we
are not extrapolating to a population. It is also inherently interesting: the gap between
fandom confidence and fandom accuracy is a story, and it is ours alone.

Working title, plain rather than clever: **The K-pop Knowledge Report 2026: what fans get
right, and what they get wrong.**

## STRUCTURE

1. **The one-line finding.** One number a journalist can put in a headline. We do not know
   which yet - it is chosen from the dataset, not decided here. Writing the headline before
   seeing the data is how reports get fudged.
2. **Method, up front, not in a footnote.** How many plays, over how many quizzes and how
   many groups, over what window, and what a "score" is. State the limits in our own words
   before anyone else does: self-selected players, quizzes we wrote ourselves, no claim to
   represent all fans.
3. **The knowledge ladder.** Groups ranked by measured average score. The interesting part
   is not the top, it is the DISTANCE between the top and the bottom, and whether the
   biggest fandoms score best or merely play most. Those two are not the same finding.
4. **The hardest and easiest questions.** Concrete, quotable, screenshot-friendly. This is
   the section that gets excerpted.
5. **Girl groups vs boy groups.** Only if the gap survives a fair comparison - same
   difficulty mix, comparable quiz counts. A 68 vs 70 gap on unmatched quiz sets is not a
   finding, it is a selection artefact, and we say so instead of printing it.
6. **Generations.** 1st through 5th gen, if the data supports splitting it that way.
7. **What we cannot say.** A short, honest section. It buys more credibility than any
   finding in the report and it forecloses the obvious critique.

Every section becomes a spoke page for W7 afterwards. That is the compounding half.

## THE HONESTY RULES (these are not decoration, they decide what ships)

- Any group, quiz or question with fewer plays than the floor set in the dataset is
  reported as "not enough data", never as a result. Small-n leaderboards are how a report
  gets torn apart, and the top of the ladder is exactly where small n hides.
- Percentages always carry their denominator in the same sentence.
- No sentence of the form "K-pop fans think". We measure knowledge, not opinion.
- The duel-vote data (~870 voters) may support colour, never a headline.
- If a section's finding is boring, it ships boring or it does not ship. We do not go
  hunting for the cut of the data that produces a spicy number - that is p-hacking with
  extra steps, and it is the exact failure mode of every bad brand data report.

## DISTRIBUTION - DECIDED BEFORE WRITING, NOT AFTER

To be built as part of this workstream, not deferred: the list of K-pop and music-culture
outlets, newsletters and subreddits that have covered fan-data stories before, with the
specific finding each one would care about. A pitch that says "here is a report" is
ignored. A pitch that says "your readers argued about X last month, here is measured data
on X" is not.

Owner gate, unresolved: we have no GSC/Bing export, so we are choosing the report's
keywords blind. It does not block the report - the report is a link play, not a ranking
play - but it does block optimising its landing page for search.

## SEQUENCE

- **PART 0 (worker):** produce `docs/data/w5-dataset.md`. Numbers only, no prose, no
  interpretation. Mission written separately.
- **PART 1 (Cowork):** read the dataset, choose the headline finding FROM it, write the
  report.
- **PART 2 (Cowork + owner):** the outlet list and the pitch, one per outlet.
- **PART 3 (worker):** the landing page, schema, and the internal links that make it a hub.
