# MISSION (W7-CLOSE - decide the CI key with a measurement, then the arc is shut). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7d is Cowork-approved (3c1cbf4). Verse PAUSED. Nothing pushed. 38 commits local.

This is the LAST mission of the W7 arc. After it the owner pushes and we go back to
PLAY-MASTER-PLAN. Do not open new fronts. If you find something big, write it in BLOCKED.md
as a candidate mission and leave it there.

## WHAT W7D EARNED
You disproved two things you could have simply agreed with, and both cost you extra work:
the clip condition (five clipless groups returning full rounds against a bts control) and
the 15-song threshold (a comment's assertion, beaten by measuring pools of 11). PART 5 was
exhaustive rather than sampled, and you asked the right first question instead of repairing
a join nobody wants. That is the standard.

## PART 1 - the CI block: measure before anyone ships a key (owner ruling)
Your BLOCKED `w7d-ci` is right that a gate grading a static-only sitemap is a green that
means nothing. The owner has ruled on the ask itself: **test anon first, do not request the
service role key yet.**

The reason is in the codebase, not in taste. `src/lib/supabase/server.ts` says the service
role client is for admin API routes only, and `sitemap.ts` calls it three times.
`getAdvertisablePlaylists` already reads `songs` and `groups` with the ANON client inside
that same raced batch, so anon is proven for part of the sitemap already. A full RLS bypass
living in a GitHub runner is a permanent security cost; it must be the answer to a measured
question, not the first idea.

Measure, table by table, what the ANON key can actually read of what the sitemap needs:
`quizzes` (published), `groups`, `games` (published), `tot_categories` (published),
`pulse_reports`, `verse_seed_ids`, `idols`, `albums`, plus the songs reads already proven.
Report a row count per table under anon, not a yes/no feeling.

Then land in exactly one of these and say which:
  (a) **Anon covers everything the sitemap needs.** Switch the sitemap's clients to
      `createPublicReadClient`, prove the sitemap still emits the same URL count (705
      non-verse, and the verse total unchanged), wire the workflow with the two secrets
      that already exist, and CI is real with no new key. This is the good outcome.
  (b) **Anon covers all but a named few.** Say which tables and what they contribute. If
      what is lost is only Verse URLs, note that Verse is PAUSED and a gate that grades the
      non-verse sitemap completely is still a real gate - propose that, do not just block.
  (c) **Anon covers too little.** Then the service role key is genuinely the answer, and
      the BLOCKED entry says so with the measurement behind it instead of an assumption.

Whatever ships, the gate must still fail on an injected orphan, run from the workflow, and
the failure must be visible where the other six workflows already report.

## PART 2 - two small things, because you are already in the file
Not design decisions, so they do not deserve their own mission. If either turns out to be
more than it looks, stop and write it down instead.

1. `/blindtest` runs the same paginated read twice per render: `page.tsx` awaits
   `getBlindtestGroups()` AND `getAdvertisablePlaylists()` in one `Promise.all`, and the
   first is now a wrapper around the second. Dedupe it (React `cache()` on the shared
   function is the obvious shape). Prove it with a query count or a timing, not by reading
   the code back to me.
2. `/pt/blindtest` is the second caller of `getBlindtestGroups` and it is in the sitemap,
   and W7d's report never mentions it. Check it renders correctly with the new set, and say
   plainly whether the picker's order changing from count-descending to alphabetical is
   right for that page too. If /pt should also link its playlists, say so - do NOT add the
   section in this mission.

## STANDING RULES
- Print `pwd` before every gate run.
- Anything that must be ABSENT is proven against the served HTML of a production build.
- Never `git diff` to prove a covenant: it does not see untracked files. Grep the tree.
- Capture exit codes, not just the last line of output.
- Numbers in the REPORT must match the numbers in the proof files. W7d's report said the
  playlist read cost "153-253 ms" while `part4-timing.txt` recorded 364, 235, 256. The
  conclusion held at either number, which is exactly why nobody would have caught it.
- No DDL, no deletes, no push. Prepared SQL goes to `docs/pending-migrations/`.
- Proofs in `docs/proofs/w7-close/`, committed.
- When two honest options exist and you cannot choose on evidence, BLOCK and say so.
