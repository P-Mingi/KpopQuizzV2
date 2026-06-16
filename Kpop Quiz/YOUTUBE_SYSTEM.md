# Group YouTube auto-post system

Posts new videos from each group's **official YouTube channel** into that group's Discord channel
AND the central **#youtube** feed. No server/host: it runs as a **GitHub Actions cron**. Posts the
video **link** so Discord renders its native preview (thumbnail + title) — nothing is copied or
re-hosted, so it's fully legit.

**Status: live.** Runs hourly. Posts go to the group channel (if it exists) AND #youtube.

## Sources (official channels only, verified)

Every ID below was verified against its RSS feed — correct channel name and live uploads confirmed.
Fan channels, label channels, and archive-only channels are excluded.

| Group | Channel name | Channel ID | Gen |
|---|---|---|---|
| SHINee | SHINee | `UCyPwRgc3gQGqhk6RoGS50Ug` | 2nd |
| BIGBANG | BIGBANG | `UCzw-C7fNfs018R1FzIKnlaA` | 2nd |
| Super Junior | SUPER JUNIOR | `UCFipx49muiJ8-d2YsnLlNVw` | 2nd |
| Girls' Generation | GIRLS' GENERATION | `UCPENYtHg4Xhmm6oX8zaQA7Q` | 2nd |
| Apink | Apink (에이핑크) | `UCmW1Pq56lA-k-GWpX1z8WPg` | 2nd |
| EXO | exo | `UCI11qSMqkCabthSqJtQwfPA` | 3rd |
| BTS | BANGTANTV | `UCLkAepWjdylmXSltofFvsYQ` | 3rd |
| Red Velvet | Red Velvet | `UCk9GmdlDTBfgGRb7vXeRMoQ` | 3rd |
| SEVENTEEN | SEVENTEEN | `UCfkXDY7vwkcJ8ddFGz8KusA` | 3rd |
| TWICE | TWICE | `UCzgxx_DM2Dcb9Y1spb9mUJA` | 3rd |
| BLACKPINK | BLACKPINK | `UCOmHUn--16B90oW2L6FRR3A` | 3rd |
| MAMAMOO | MAMAMOO | `UCuhAUMLzJxlP1W7mEk0_6lA` | 3rd |
| MONSTA X | Monsta X Official | `UC3_V7iN57XplhOV3Gd94SGQ` | 3rd |
| NCT | NCT | `UC2G3s1ooMBdmY6ICBHtEesQ` | 3rd |
| iKON | IKON YG | `UC4mu91NEK86LV_a-b27N0qQ` | 3rd |
| Oh My Girl | OH MY GIRL | `UC-qYkzKFdekoEniRu_FS3zg` | 3rd |
| WJSN | 우주소녀 WJSN | `UCVaIiqzfKQsi7Qw4-X8TmmA` | 3rd |
| ASTRO | ASTRO | `UCZqY2yIsAM9wh3vvMwKd27g` | 3rd |
| The Boyz | THE BOYZ | `UCkJ1rbOrsyPfBuHNfnLPm-Q` | 3rd |
| Dreamcatcher | Dreamcatcher official | `UCijULR2sXLutCRBtW3_WEfA` | 3rd |
| DAY6 | DAY6 | `UCp-pqXsizklX3ZHvLxXyhxw` | 3rd |
| Stray Kids | Stray Kids | `UC9rMiEjNaCSsebs31MRDCRA` | 4th |
| (G)I-DLE | (G)I-DLE Official YouTube Channel | `UCcAZEZvmy3C3cCBWaHrfJvA` | 4th |
| ITZY | ITZY | `UCDhM2k2Cua-JdobAh5moMFg` | 4th |
| ATEEZ | ATEEZ | `UC2e4Ukj5Pfr7cb3KpJAFBdQ` | 4th |
| TXT | TOMORROW X TOGETHER OFFICIAL | `UCtiObj3CsEAdNU6ZPWDsddQ` | 4th |
| aespa | aespa | `UC9GtSLeksfK4yuJ_g1lgQbg` | 4th |
| ENHYPEN | ENHYPEN | `UCArLZtok93cO5R9RI4_Y5Jw` | 4th |
| IVE | IVE | `UC-Fnix71vRP64WXeo0ikd0Q` | 4th |
| LE SSERAFIM | LE SSERAFIM | `UCs-QBT4qkj_YiQw1ZntDO3g` | 4th |
| NewJeans | NewJeans | `UCMki_UkHb4qSc0qyEcOHHJw` | 4th |
| NMIXX | NMIXX | `UCnUAyD4t2LkvW68YrDh7fDg` | 4th |
| STAYC | STAYC | `UCod5V2dpnpJLklGvVOv5FcQ` | 4th |
| TREASURE | TREASURE (트레저) | `UCWdPwo5wZs4h8i5ctGbuzrg` | 4th |
| Purple Kiss | PURPLE KISS | `UCor8nQnEdMs4eBcU-uVBQ8g` | 4th |
| Billlie | Billlie | `UCyc9sUCxELTDK9vELO5Fzeg` | 4th |
| ZEROBASEONE | ZEROBASEONE | `UCSAp0Yl9S0Zq5uDqE6im_XQ` | 5th |
| RIIZE | RIIZE | `UCdVD0MsYecQaIE5Ru-pOIQQ` | 5th |
| KISS OF LIFE | KISS OF LIFE | `UCvEEeBssb4XxIfWWIB8IjMw` | 5th |
| BOYNEXTDOOR | BOYNEXTDOOR | `UChhKBlh_wvspTh5n4mL0b5g` | 5th |
| ILLIT | ILLIT | `UCEpFoWeCMCo5z3EvWaz6hQQ` | 5th |
| NCT WISH | NCT WISH | `UCiZqWVAeChfqlom5ZPR3ZJA` | 5th |
| tripleS | tripleS official | `UCJnL-TBcsYrF2SLs7tmiC8Q` | 5th |
| MEOVV | MEOVV | `UCowiwt93gqGlNG4k5VDxO-w` | 5th |
| &TEAM | &TEAM | `UCHD1jo5RhijLfx5-0Ehe_cg` | 5th |
| TWS | TWSofficial | `UCZDQ1OJSqH0WYI0QtZzsC6w` | 5th |
| izna | izna (이즈나) | `UCfbYNlxgLuKJXQZEhkMmaCQ` | 5th |
| ARTMS | Official ARTMS | `UChXC6ok0LaZIpf-50SIFf0Q` | 5th |

Feed used per channel: `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` (free, official, no API key).

### Groups not tracked (reason)

| Group | Reason |
|---|---|
| GOT7, WINNER | Official channel exists but has 0 recent uploads |
| P1Harmony, PENTAGON, Oh My Girl (old), GFRIEND | Handle not resolvable or disbanded |
| Kep1er, FIFTY FIFTY, CRAVITY, Weeekly, BABYMONSTER | 0-1 uploads in feed at time of verification |
| MONSTA X | Handle returns fan channel; official unclear |
| H.O.T., Sechskies, S.E.S., Fin.K.L, Shinhwa, g.o.d, Baby V.O.X | 1st gen; no active YouTube presence |
| TVXQ, KARA, 2NE1, 2PM, 2AM, BEAST, 4Minute, f(x), SISTAR, INFINITE, B1A4, Block B, EXID, Girl's Day, AOA, B.A.P, VIXX, Teen Top | 2nd gen; disbanded or no active uploads |
| GFRIEND, Lovelyz, MOMOLAND, NU'EST | Disbanded |
| Hearts2Hearts | Handle not found |

To add a group: verify its channel ID via `curl "https://www.youtube.com/feeds/videos.xml?channel_id=<ID>"` (check channel name matches + entries > 0), then add it to `GROUP_YOUTUBE` in `Kpop Quiz/src/config.js`.

## What gets posted

**In the group channel** (e.g. `💜・bts`):
> 🎬 **BTS** just posted a new video!
> `https://www.youtube.com/watch?v=...`

**In `#youtube`** (central feed, all groups):
> 🎬 **BTS** just posted a new video!
> `https://www.youtube.com/watch?v=...`

Discord turns the link into a playable preview with thumbnail + title. No image copying.

## How it works

1. For each group, read its official channel's RSS feed (`rss-parser`).
2. Take the newest videos (max **2 per group per run**, so a batch upload can't flood).
3. **Dedup:** scan the channel's (and `#youtube`'s) last ~40 messages for already-posted video ids; skip those. No database / stored state.
4. Resolve the Discord channel by stored ID, else **by name** (so it works in CI without `generated-ids.json`).
5. Post to the group channel (if it has one), then to `#youtube` (deduped separately).

Groups without a dedicated Discord channel (most 2nd/3rd gen roles) still post to `#youtube`.

## Automation (cron)

- **Workflow:** `.github/workflows/youtube.yml`
- **Schedule:** `0 * * * *` — **hourly** (UTC). Plus manual `workflow_dispatch`.
- **Runs on:** GitHub Actions (`main`). **Free** (public repo), no host.
- **Secrets used:** `DISCORD_TOKEN`, `GUILD_ID`.

## Files

| File | Role |
|---|---|
| `Kpop Quiz/src/youtube.js` | the poller (`npm run youtube`) |
| `.github/workflows/youtube.yml` | the hourly cron |
| `Kpop Quiz/src/config.js` | `GROUP_YOUTUBE` map (group name to official channel ID) |

## Tweaking

- **Add/swap a channel:** edit `GROUP_YOUTUBE` in `src/config.js` (verify the new ID via its RSS feed first).
- **More/fewer per run:** `MAX_PER_GROUP` in `src/youtube.js`.
- **Frequency:** the `cron` in `youtube.yml`.
