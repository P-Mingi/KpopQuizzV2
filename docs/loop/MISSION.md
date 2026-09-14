# MISSION (GAMES HUB NIT - one non-breaking hyphen in the band H2, re-prove, re-CI. NO push to main.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file.** The games hub redesign on `feat/games-hub-redesign` was audited and
ACCEPTED (fd59db6, PR #23, CI green). One cosmetic nit remains and this mission closes exactly it,
nothing else. Do NOT touch anything but the band H2 string. Do NOT start the parked COST mission.
Stay on `feat/games-hub-redesign`, do not re-branch, do not merge (the owner merges).

## THE ONE FIX
In `apps/quiz/src/components/game/games-hub.tsx`, the daily band H2 renders
`Name the song <br .../>from a 10-second clip.` The `10-second` uses a normal hyphen, so at 390 it
can break as `10-` / `second`. The mission spec (and the Mobile artboard) require `10-second` to
stay on one line. Replace ONLY that hyphen with a non-breaking hyphen (U+2011). In JSX text, write
it as the entity `10&#8209;second` or the literal `10‑second` character, whichever the file's
other entities already use for consistency. Change nothing else, no other line, no CSS.

## PROVE (docs/proofs/games-hub/, overwrite only what this touches, on next build + next start)
- `next build`; `next start -p 3021`; capture /games at 390; the band H2 reads `10-second` on one
  line (no mid-word break). Save the new mobile capture; keep the "no dev badge" file naming.
- Confirm the desktop 1440 render is unchanged (the explicit `<br>` still controls the desktop
  break; the non-breaking hyphen is inert there).
- Full suite still green: unit, e2e desktop + mobile, tsc 0, `next build` green. Route table
  unchanged (`○ /games`, `○ /pt/games`, 1h). No em dashes, zero emoji, scope = this one file
  (+ the refreshed mobile proof).

## CI
Push the feature branch (main stays owner-gated): `git push origin feat/games-hub-redesign`. Wait
for both jobs on the CURRENT head, paste the run URL in the REPORT. Do not merge.

## WHEN DONE
Update `docs/loop/REPORT.md`: the one-line change, the before/after of the band H2 wrap at 390,
the new CI run URL on the current head, and that the only remaining owner gate is merging PR #23
to main. Recompute nothing else changed. Do not push main. No em dashes.
