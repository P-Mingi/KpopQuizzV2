# v12-g2-07-kpdh: KPop Demon Hunters soundtrack songs (dry-run report)

Generated 2026-10-02T16:42:06.744Z by `apps/quiz/scripts/v12/catalogue/build-kpdh-sql.mts` (anon key, nothing written to the database).

Songs in the playlist (lib/blind-test-curated.ts KPDH_SONGS): 12. Already stored: 2. Inserts in the SQL file: 10, all with status `soundtrack`.

Playable in the kpop-demon-hunters playlist today: 2 (hidden, under 10). After the file is applied: 12.

| Deezer id | Act as credited | Title | State | In the SQL file |
|---|---|---|---|---|
| 3412534541 | TWICE | TAKEDOWN (JEONGYEON, JIHYO, CHAEYOUNG) | already stored: status active, group_id 4 | no change |
| 3412534591 | TWICE | Strategy | already stored: status active, group_id 4 | no change |
| 3412534551 | HUNTR/X | How It’s Done | Deezer: preview yes, 176s, rank 855958, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534561 | Saja Boys | Soda Pop | Deezer: preview yes, 150s, rank 806817, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534581 | HUNTR/X | Golden | Deezer: preview yes, 192s, rank 979012, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534601 | HUNTR/X | Takedown | Deezer: preview yes, 182s, rank 832269, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534611 | Saja Boys | Your Idol | Deezer: preview yes, 191s, rank 814735, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534621 | Rumi and Jinu | Free | Deezer: preview yes, 187s, rank 817645, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3412534631 | HUNTR/X | What It Sounds Like | Deezer: preview yes, 250s, rank 819584, released 2025-06-20, year written 2025 | insert, status soundtrack |
| 3541756631 | Jinu | Jinu’s Lament | Deezer: preview yes, 47s, rank 423236, released 2025-09-05, year written 2025 | insert, status soundtrack |
| 3412534641 | MeloMance | 사랑인가 봐 Love, Maybe | Deezer: preview yes, 185s, rank 577013, released 2025-06-20, year written none | insert, status soundtrack |
| 3412534651 | Jokers | 오솔길 Path | Deezer: preview yes, 223s, rank 510058, released 2025-06-20, year written none | insert, status soundtrack |

## Track list: the two sources (opened 2026-10-02)

- A, the label: Republic Records store, [CD](https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-cd): "1. TAKEDOWN - TWICE (Jeongyeon, Jihyo, Chaeyoung) 2. How It's Done - HUNTR/X (EJAE, Audrey Nuna, and REI AMI) 3. Soda Pop - Saja Boys (Andrew Choi, Neckwav, Danny Chung, Kevin Woo, and samUIL Lee) 4. Golden - HUNTR/X 5. Strategy - TWICE 6. TAKEDOWN - HUNTR/X 7. Your Idol - Saja Boys 8. Free - Rumi and Jinu (EJAE and Andrew Choi) 9. What It Sounds Like - HUNTR/X 10. Love Maybe - MeloMance 11. Path - Jokers 12. Score Suite - Marcelo Zarvos". "Jinu's Lament by Jinu (Ahn Hyo-seop) & EJAE" is track 2 of the [deluxe digital album](https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-deluxe-digital-album).
- B, the reference wiki: [Wikipedia, KPop Demon Hunters (soundtrack)](https://en.wikipedia.org/wiki/KPop_Demon_Hunters_(soundtrack)): same twelve tracks in the same order, artists "Jeongyeon, Jihyo, Chaeyoung", "Huntrix (Ejae, Audrey Nuna, Rei Ami)", "Saja Boys", "Twice", "Ejae, Andrew Choi", "MeloMance", "Jokers", "Marcelo Zarvos"; the deluxe edition "adding Prologue (Hunter's Mantra) and Jinu's Lament".
- Deezer: album 771853201 (standard, 12 tracks) and 816455081 (deluxe); the ids above are the standard edition's, except Jinu's Lament (deluxe only).

## Choices

- Left out: "Score Suite" (Marcelo Zarvos), an instrumental score cue, and "Prologue (Hunter's Mantra)", a score piece. Sing-along, instrumental and a cappella versions of the deluxe edition are not songs of their own.
- "Strategy" on the soundtrack is the version without the featured artist ([Wikipedia](https://en.wikipedia.org/wiki/Strategy_(Twice_song)): "The solo version was later included on the soundtrack to the film KPop Demon Hunters"); it is the stored row 3412534591. The stored "Strategy (feat. Megan Thee Stallion)" (3125530581) is another recording and is not in the playlist.
- MeloMance and Jokers are real acts, but they are not in the catalogue and their songs are there only because the film uses them: they get the same status as the fictional acts, so they never enter a K-pop pool. Owner decision if they should be ordinary active songs instead.
- Fictional rows carry no group, no gender, no generation, `is_curated = false` and no tier: even if a reader forgot the status, the daily (curated + tier), the generation and gender playlists and the group playlists would still not pick them.
- Artist names as credited on the label's track list: "HUNTR/X", "Saja Boys", "Rumi and Jinu", "Jinu", "MeloMance", "Jokers". Titles as Deezer serves them.
- Not verified by two sources: the release date 2025-06-20 on an official page (Wikipedia and Deezer state it; the store pages carry no date). The file does not depend on it beyond the `year` value, which follows the same Deezer rule as the years files.
