# MISSION (GAMES HUB FIX 1 - close the audit findings on fa91886, re-prove on next start. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file.** The rebuild in fa91886 on `feat/games-hub-redesign` was audited. The
structure is faithful, the cost fence holds (both routes Static 1h, new reads inside
`getGamesData`, no new route), scope is clean (only games files), no em dashes, zero emoji. It is
NOT accepted yet. Two proof problems and a set of visual and data defects below. Fix all of
them on the same branch, re-prove, then report. Same rule: stop at a clean boundary if you
cannot finish honestly.

The spec was revised after your build (revision 3, see `docs/design/games/README.md`): the
owner's ZIP / `docs/design/games/` now carries shorter stat lines, an honest "Coming soon"
chip, "N votes" without "today", "Elo, best of 7" for Duel, and a mobile ranking strip that
wraps. The committed copy in this repo is being updated with this mission; the artboards and
`renders/` decide.

## BLOCKER 1 - THE PIXEL PROOFS WERE CAPTURED ON A DEV SERVER
`pixel/render-390.png` shows the Next.js dev-tools badge (the round "N" bottom-left, over the
tab bar). That badge only exists on `next dev`. The mission said prove on `next build` +
`next start`, never dev. The e2e output also says ":3021", the same port. So every proof is
in doubt. Redo: stop every dev server; `next build`; `next start -p 3021`; re-run the capture
harness and the e2e suite against that; put the exact start command and its first log lines
in `test-output.md`; the new screenshots must show no dev badge. Do not reuse any old PNG.

## BLOCKER 2 - DATA HONESTY VIOLATIONS THAT SHIPPED
1. `games-hub.tsx` line ~255: `${votes} votes today`. `total_votes` is all-time. The mission
   said no "today" unless the number is a real daily count. Ship `${votes} votes`.
2. The This or That preview mixes the REAL vote total ("2,258 votes, live") into a FAKE
   matchup (Seven vs Slow Dancing, 61/39). A real number under an invented split is
   misleading. Either render the featured ranking's real top two entries with their real
   share (only if `getRankingsIndex` / the cached data exposes per-entry votes), or keep the
   demo split and label it "live" with NO number. No third option.
3. `/pt/games` renders the band with an EMPTY answer panel (deviation 13). A hole is not
   honesty. Pass the same `bandAnswers` to `GamesHub` from the pt page: move the band reads
   into a shared helper used by both `getGamesData` caches, or have the pt page's cache call
   the same helper. Still inside `unstable_cache`, still no per-request read.

## VISUAL DEFECTS (all visible in your own renders)
4. Mobile Name Them All preview overflows: RM is cut off on the left. The Mobile artboard uses
   46px faces and THREE slots at 390. Match it (media query at 640px or the same breakpoint
   the hub already uses).
5. Foot stats wrap to two lines at 390 ("Beat the clock, all members", "Timer counts up, beat
   your time", "Wrong pair adds 3 seconds"). Use the revised copy: Name Them All "Beat the
   clock" (when no personal best), Sort It "Timer counts up", Match-Up "+3 s per wrong pair",
   This or That "N votes", Which member "Made for sharing", Duel "Elo, best of 7", Tier Lists
   "Just launched", Idle "Daily, soon". Chips and stats are `white-space: nowrap`; the stat
   gets `min-width: 0`. Assert in e2e that no `.gh-stat` and no count chip exceeds one line
   height at 390.
6. Mobile header sub: the Mobile artboard trims it to "Name every member. Beat the clock.
   Out-vote the fandom." Wrap the second sentence in a span hidden under the mobile breakpoint
   (stays in the HTML for crawlers).
7. Match-Up hook orphans "K-" / "pop" at both widths. Use a non-breaking hyphen in "K-pop"
   there (U+2011), as the artboard does.
8. K-pop Idle "Coming soon" is styled as an outline button, so it still reads as clickable.
   Render it as the count-chip style (surface-alt fill, no border-h, 36px tall), exactly as the
   revised artboard draws it.
9. Mobile ranking strip: the artboard wraps the actions (Live / Vote / All rankings) onto a
   second row under the title, with the live dot inline before the title. Match it; no
   4-line title.
10. Band answer chips: the artboard puts the artist inline after the title in muted text
    ("Supernova  aespa"), not right-aligned uppercase. Match the artboard.

## COST NIT (fix if cheap, otherwise hand to the COST mission)
11. `games-streak.tsx` fetches `/api/daily/streak` (force-dynamic) on EVERY load, anonymous
    included. Same as the old BlindStreak, so not a regression, but it is one function
    invocation per /games view for nothing. If the Supabase auth cookie is readable from JS
    (check `document.cookie` for `sb-` on a signed-in session on `next start`), gate the fetch
    on its presence and render nothing otherwise. If the cookie is httpOnly, leave it and write
    one line in the REPORT so the parked COST mission picks it up.

## RE-PROVE (docs/proofs/games-hub/, overwrite, all on build + start)
- Pixel: new captures at 1440 and 390 vs the REVISED `renders/`, diff percentages, deviation
  list updated (items 4 to 10 above must disappear from it). No dev badge anywhere.
- Data-honesty table updated (items 1 to 3).
- e2e green desktop + mobile including the new one-line assertion; unit green; tsc 0;
  `next build` green; route table still `○ /games` and `○ /pt/games` at 1h.
- No em dashes, zero emoji, scope still only games files.

## CI
The mission's CI requirement stands. Pushing the FEATURE BRANCH to origin to run CI is
allowed (main stays owner-gated). Do it after the re-prove: `git push -u origin
feat/games-hub-redesign`, wait for both jobs on the CURRENT head, paste the run URL. If the
owner has said otherwise in the meantime, follow the owner.

## WHEN DONE
Update `docs/loop/REPORT.md`: each item above with what changed, the new diff numbers, the
CI run URL on the current head, and the one owner gate that remains (push to main). Recompute
every number. Do not push main. No em dashes.
