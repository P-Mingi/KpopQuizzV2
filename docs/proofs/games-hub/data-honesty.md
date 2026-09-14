# Games hub, data honesty

Rule: every value the hub states AS real is real or absent. The artboard SAMPLE
literals never ship. The card preview zones are illustrative gameplay mock-ups,
marked `aria-hidden` exactly as the artboard draws them; they are labelled below as
"illustration" and are never presented as the viewer's live stats.

## Values the hub states as real

| Element | Artboard SAMPLE | Ships as | Source |
| --- | --- | --- | --- |
| Header "fans playing today" chip | `3,204 fans playing today` | REMOVED | no cheap 24h plays read exists (plays index is keyed quiz_id/player_id; cannot bound a count under 200ms without an owner-gated index). Dropped rather than faked. |
| Header streak chip | `Your streak: 1 day` | real or absent | client read of `/api/daily/streak`; renders nothing for anon or streak 0 |
| Band countdown | `12:27:14` static | live, ticking | client `msUntilUtcMidnight()` to the UTC reset (the daily blind test's own key) |
| Band "played today" note | `3,204 played today` | REMOVED | same missing 24h read as the fans chip |
| Band streak pill | `Streak 1 . keep it` | real or absent | same `/api/daily/streak`; absent for anon |
| Band answer chips | 4 songs, one PICKED (white) | 4 real songs, NONE picked | `pickDailyMany(bandSongs, 4)` over a real song pool inside `getGamesData`, excluding today's daily-blindtest answers; no pick state |
| Name Them All foot stat | `Your best: 5 of 7` | `Beat the clock, all members` | replaced the fake personal best with the game's mechanic (no per-user best is surfaced here) |
| Name Them All count | `53 groups` | `{nameThemAll} groups` | real: name-them-all playlists + published name-all games |
| Sort It count | `4 modes` | `{sortIt} modes` | real: `SORT_IT_PLAYLISTS.length` |
| Match-Up count | `14 boards` | `{matchUp} boards` | real: `MATCH_UP_PLAYLISTS.length` |
| This or That foot stat | `12,880 votes today` | `{votes} votes today` or `Live fandom ranking` | real featured-ranking total, else the neutral label |
| This or That count | `20 rankings` | `{categories} rankings` | real: rankings index length |
| This or That preview vote label | `12,880 votes, live` | `{votes} votes, live` or `live` | real featured total when present (inside the aria-hidden preview) |
| Duel foot stat | `Fans online now` | `Elo, best of 7` | replaced the fake presence claim with the game's mechanic (no live presence count) |
| Live ranking strip | `#1 Supernova . 2,221 votes` | real prompt, `#1 {top} . {votes} votes` | real featured public ranking from `getRankingsIndex` |

## Illustration (aria-hidden preview mock-ups, not live data)

These reproduce the artboard's "see the game before you play it" previews and are
marked `aria-hidden`. They show what a round looks like, not the viewer's results:
the card timers (0:42, 0:09, 1:15), the This or That 61/39 split with the Seven vs
Slow Dancing demo, the Which member "82% Jimin" demo result, and the Duel demo
match (YOU vs army_lee, Elo 1,240/1,198). The Duel Elo numbers and the member
percentage are demo values inside these hidden previews; they are never read out as
the viewer's own and never appear in a foot stat or a chip. Every face in them is a
real idol photo.

## Dead buttons

None. K-pop Idle carries no link, only a non-interactive "Coming soon" label (it is
not launched). Every other card action is a real link to a live route.
