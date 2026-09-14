# MISSION (TIERLIST PUSH - commit the decision trail, then fast-forward main to production. Owner has said GO.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file.** The tier list feature (phases 1 to 3.4) is audited, CI is green on the
exact branch head, and the owner has authorised the production push. The steps below are ORDERED.
Do not skip ahead. If any step fails, STOP and report; do NOT improvise a fix on main.

State at the time this mission was written: `origin/main` = 75dcabb, `origin/preview/verse-stack`
= 3a4a067, a clean fast-forward, 14 commits ahead. Re-verify these before acting; if they differ,
STOP and report rather than assuming.

## STEP 1 - COMMIT THE DECISION TRAIL (before anything is pushed)
Three tracked docs are modified and uncommitted: `docs/VERSE-LEDGER.md` (the audit ledger, L-218
through L-228), `docs/loop/BLOCKED.md` and `docs/loop/MISSION.md`. The code must not ship without
its decision history.
- **THIS REPO IS PUBLIC.** Before committing, run `check:docs-secrets` and confirm it PASSES. If it
  flags anything, STOP and report; do not commit and do not redact on your own judgement.
- Commit the three files to `preview/verse-stack` as a docs-only commit and push the branch.
- Change NO code in this step.

## STEP 2 - FAST-FORWARD MAIN (the production push the owner authorised)
- Re-confirm `origin/main` is an ancestor of `origin/preview/verse-stack`: a clean fast-forward, no
  merge commit, no rebase. If it is not, STOP and report.
- Fast-forward `main` to the branch head and push `main`.
- Expected: 15 commits land on main (the 14 above plus the docs commit from STEP 1). Report the
  exact count and the new `main` sha.

## STEP 3 - WATCH THE PRODUCTION DEPLOY
- Watch the Vercel production deployment for the new `main` sha until it reaches READY or ERROR.
- The build now runs `check:env` before `next build`, so a missing production variable fails fast
  and names itself. Report that line if it appears.
- If it ERRORS: STOP. Report the build log excerpt that explains it. Do NOT push a fix to main.
  The rollback target is the previous production deployment `dpl_7PF9HwCDF48hykBnudTMJkZCX3LC`
  (commit 75dcabb), flagged rollback-capable. Rolling back is the OWNER's action, not yours.
  Migrations 146 and 147 are additive and inert for the older build, so the database needs no
  rollback and must not be touched.

## STEP 4 - THE THREE CHECKS ONLY PRODUCTION CAN ANSWER
A preview could never prove these, because Vercel SSO protection blocks the OG route's server-side
fetch of its own assets. On the live domain that protection is off, so verify against the LIVE
domain and report each with its actual value:
1. **Share card photos.** Build a board from a bank subject, open the share link, and confirm the
   OG route returns `image/png` AND the faces are real photos, not initials. State the byte size
   and compare it against an initials-only card. This is the headline check.
2. **The unfurl.** Confirm the share page carries an absolute `og:image` on the production domain
   that resolves to that card (the metadataBase now points at the live site, so this is the first
   environment where the unfurl can be correct).
3. **The canonical.** `/tier-list` self-references the production domain, and `/tier-list/new`,
   `/tier-list/create` and `/tier-list/share` are noindex and absent from `/sitemap.xml`.
Also report, quickly: `/tier-list`, `/tier-list/create`, `/tier-list/new` return 200, the home page
carries exactly ONE tier-list CTA and no `pq-banner`, and the general board loads its items.
Do NOT attempt the signed-in publish, upload, moderation or mobile checks: those are the owner's,
with `docs/loop/POST-PUSH-SMOKE.md`.

## SCOPE FENCE
No code change in this mission. No migration. No env file touched. No rollback performed by you.
No em dashes. If anything looks wrong at any point, stopping and reporting beats improvising on
production.

## WHEN DONE
Update `docs/loop/REPORT.md`: the new main sha and commit count, the production deployment id and
its state, and the STEP 4 results with their actual values. Say plainly whether production is
healthy, and name anything you could not verify.
