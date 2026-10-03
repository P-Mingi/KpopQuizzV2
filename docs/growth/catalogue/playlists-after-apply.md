# What becomes playable once the pending v12-g2 files are applied

Generated 2026-10-02T16:54:51.746Z by `apps/quiz/scripts/v12/catalogue/playlists-after.mts` (anon key; the pending files are replayed in memory, nothing is written to the database).

Catalogue today: 4120 songs, 4120 active. After 01 to 08: 4296 songs (176 inserted: 10 with the status `soundtrack`), 95 years corrected, 3076 years filled, 41 title tracks flagged.

## Group playlists (a group with at least 10 clean active songs linked to it)

Today: 79. After apply: 83.

| New group playlist | Clean songs today | After |
|---|---|---|
| Hearts2hearts (`hearts2hearts`) | 0 | 16 |
| KickFlip (`kickflip`) | 0 | 10 |
| NCT WISH (`nct-wish`) | 0 | 25 |
| RESCENE (`rescene`) | 0 | 10 |

Clean songs of the four acts of the brief, after apply: Hearts2hearts 16, KickFlip 10, RESCENE 10, NCT WISH 25.

## Themed playlists and decision 33 playlists (the pool generate reads, curated subset on)

| Playlist | Kind | Today | After apply, without 05 (years backfill) | After apply, all files |
|---|---|---|---|---|
| kpop-hits-2026 | themed | 0: hidden (under 10) | 60: playable | 60: playable |
| kpop-hits-2025 | themed | 51: playable | 60: playable | 60: playable |
| 5th-gen | themed (legacy playlist of generate) | 284: playable | 346: playable | 346: playable |
| tiktok-viral | themed | 26: playable | 26: playable | 26: playable |
| kpop-demon-hunters | themed | 2: hidden (under 10) | 12: playable | 12: playable |
| recent-hits | decision 33 | 134: playable | 308: playable | 1279: playable |
| kpop-legends | decision 33 | 0: hidden (under 10) | 0: hidden (under 10) | 493: playable |
| 4th-gen-gg | decision 33 | 320: playable | 353: playable | 353: playable |
| 4th-gen-bg | decision 33 | 337: playable | 370: playable | 370: playable |
| title-tracks | decision 33 (legacy playlist of generate) | 0: hidden (under 10) | 41: playable | 41: playable |

The hits playlists keep their 60 best-ranked songs, so 60 is their ceiling. Songs with the year before the cap, all files applied: 2026: 479 songs by 115 acts; 2025: 442 songs by 120 acts. Without 05: 2026: 200 songs by 61 acts; 2025: 71 songs by 12 acts.
