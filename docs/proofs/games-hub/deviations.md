# Games hub, deviations from the artboard (with reason)

Every difference between the rebuilt `/games` and `docs/design/games` artboards,
and why. Grouped by cause. None are layout or structural drift.

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
5. Name Them All foot stat is "Beat the clock, all members" instead of the
   artboard "Your best: 5 of 7" (no per-user best is available here).
6. Duel foot stat is "Elo, best of 7" instead of the artboard "Fans online now"
   (no live presence count).

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

## Minor, documented

12. On mobile, the band drops the sub line and the answer panel to match the mobile
    artboard's compact CTA (they stay in the DOM for SEO, hidden by media query).
    The header sub keeps its full desktop copy on mobile (the mobile artboard trims
    it to one sentence); this adds one line of height and is the main contributor to
    the small cumulative vertical drift down the 390 column.
13. `/pt/games` renders the same eight cards via the same `GamesHub`, but without
    the band answer chips (its page does not run the band-song read); the band
    answer panel is empty there rather than faked.
