# MISSION (W5-DOCS-2 - stop the leak you just widened, before the push. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W5-DOCS is Cowork-approved (328c6a1). 45 commits local, nothing pushed. Verse PAUSED.
**No application code. No DDL. No push.**

## WHAT YOU GOT RIGHT
Reading all 102 files before adding any of them is the reason this mission exists at all -
the PII was found by the check, not by luck. Excluding `.DS_Store` on its bytes rather than
its name, and refusing to "fix" already-pushed history by editing the working copy, were
both right calls.

## PART 1 - the finding inside your finding
`docs/VERSE-LEDGER.md` had **one** occurrence of the address, at line 97. It now has
**four**. Your L-202 entry reports the leak by quoting both addresses verbatim, at lines
4222-4224, into the same tracked file that will be pushed.

**And that distinction is the whole point: line 97 is already on the remote and cannot be
recalled. Lines 4222-4224 are in local commit 328c6a1 and have never left this machine.**
There is still time for those, and only until the owner pushes.

Rewrite the unpushed local history so the literal addresses in your L-202 entry never reach
the remote. They are your own commits and nothing is published, so this is an ordinary local
amend, not a shared-history rewrite. Keep the finding - it is a good one - but reference it
by location, `docs/VERSE-WORKING-SYSTEM-V2.md:112,114` and `docs/VERSE-LEDGER.md:97`, not by
value. Verify with a grep over the rewritten commits, not over the working tree alone.

**New standing rule, and write it into the loop docs: an incident report names locations,
never values.** Reporting a leak by copying it is how a leak spreads.

## PART 2 - the already-pushed occurrences
Owner ruling: your recommendation stands. Replace the three in
`docs/VERSE-WORKING-SYSTEM-V2.md` and the one in `docs/VERSE-LEDGER.md:97` with a
placeholder in the working copy. **No history rewrite, no force-push.** They are the owner's
own addresses, in a private repo, used as Supabase org labels rather than as contact
details, and 45 unpushed commits sit on top of exactly what a rewrite would touch. The value
does not justify the risk. Say in the file that the string was replaced and why, so nobody
later reads the placeholder as data loss.

## PART 3 - the allowlist decision, which I am overruling with a reason
You framed it as verbose-and-safe versus wildcards-and-brief, and asked to be overruled if I
disagreed. I do, because your framing left out the failure that already happened.

**Deny-by-default is what lost the 101 documents in the first place.** It was in place for
months, nobody added a line, and the entire strategy layer sat outside git while the code was
safe. A 116-line manual allowlist has exactly that failure mode, scaled up: the doc written
next month stays invisible until a human remembers a file nobody opens. That is not a
hypothetical, it is the bug you were sent to fix.

So: **wildcards for the doc families that clearly are documents** - `!docs/PLAY-*.md`,
`!docs/VERSE-*.md`, and whatever other families the directory actually supports - **plus a
scanner that makes the safety property automatic instead of manual.**

Add a `check:docs-secrets` script, in the shape of the other three gates, that fails on any
TRACKED file under `docs/` containing the patterns you already wrote for pass 1: email
addresses, `eyJ` JWTs, `service_role`, `sk-` / `ghp_` / `xox?-` / `AIza`, bearer tokens,
connection strings, URLs with inline credentials. Allow a short, commented exception list -
`hello@kpopquiz.org` is published on the contact page and must not fail the build. Wire it
into `.github/workflows/seo-gates.yml` beside the others; unlike them it needs no server and
no database, so it can run on push rather than nightly, and say so.

Then tracking is the default, nothing gets lost again, and a document with a key in it fails
a gate instead of relying on someone remembering to look.

If you think this is wrong, say so and leave the verbose list. I would rather be argued with
than obeyed.

## PART 4 - the duplicate L-201
Two entries are numbered L-201, yours and mine, written independently. You were right not to
renumber mine. Renumber **yours** to L-201b and leave mine alone, so the ledger's numbering
stays a sequence rather than a collision.

## STANDING RULES
- Print `pwd` before anything.
- An incident report names locations, never values. New, and it came from this mission.
- Prove with `git status` / `git log -p`, not `git check-ignore`.
- No application code beyond the gate script, no DDL, no push.
- Proofs in `docs/proofs/w5-docs-2/`.
