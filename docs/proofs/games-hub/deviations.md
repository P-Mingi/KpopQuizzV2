# Games hub, deviations from the artboard (with reason)

Every difference between the rebuilt `/games` and the revision-3 `docs/design/games`
artboards, and why. The audit's visual defects (items 4 to 10) are fixed and no
longer appear here. What remains is data honesty, real data replacing sample data,
and out-of-scope site chrome. None are layout or structural drift.

## Data honesty (required by the mission, see data-honesty.md)

1. Header "fans playing today" chip removed. No server read can cheaply count 24h
   plays (the plays index is keyed quiz_id/player_id; no owner-gated index to bound
   it under 200ms). Real or absent -> absent.
2. Band "played today" note removed. Same missing read.
3. Band answers ship un-picked. The artboard highlights one answer (white "pick");
   marking a correct answer before the player has guessed would be a fabricated
   state, so none is picked.
4. Streak chip and streak pill are absent for anonymous viewers (the captured
   render is logged out). The artboard shows "Your streak: 1 day" / "Streak 1".
5. This or That preview split (61/39) carries no vote number, only a "live" label,
   because the split is an invented demo; the real total is in the foot stat.
6. Name Them All foot stat is "Beat the clock" (no per-user best is available).
   Duel foot stat is "Elo, best of 7" (no live presence count).

## Real data replacing sample data

7. Band answers are four real songs rotated per UTC day (Saki, UNFORGIVEN, THAT'S
   A NO NO, Motto on the captured day), not the artboard's Supernova/Ditto/etc.
8. Mode counts are the site's real values (53 groups, 4 modes, 14 boards, 20
   rankings), not the artboard's numbers.
9. The live ranking strip shows the real featured public ranking (Greatest K-pop
   song ever, #1 Supernova, 2,258 votes), not the artboard sample.
10. Idol faces are real `/idols/*.jpg` images, not the artboard's placeholder crops.
    This is the largest source of pixel mismatch and is a fidelity gain, not a loss.

## Scope (explicitly out of scope per the mission)

11. Site chrome is the real `TopNav` / `MobileTopBar` / `MobileTabBar`, not the
    artboard's mock nav and tab bar. These were not to be rebuilt, so they are
    excluded from the pixel diff (the diff clips to the hub root).

## Fixed since the first build (audit items 4 to 10, now gone)

- Mobile Name Them All uses 46px faces and three slots at 390: RM is no longer
  clipped.
- Foot stats use the short revised copy and stay on one line at 390 (asserted in
  e2e): "Beat the clock", "Timer counts up", "+3 s per wrong pair", "N votes",
  "Made for sharing", "Elo, best of 7", "Just launched", "Daily, soon".
- Mobile header sub trims its second sentence (kept in the DOM for crawlers).
- Match-Up hook uses a non-breaking hyphen in "K-pop", so it never orphans.
- K-pop Idle "Coming soon" is a non-interactive chip, not an outline button.
- Mobile ranking strip wraps its actions to a second row with the dot inline before
  the title.
- Band answer chips put the artist inline after the title in muted text, not
  right-aligned uppercase.
