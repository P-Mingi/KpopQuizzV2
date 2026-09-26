# Performance probe (C3)

Playwright, no Lighthouse (not installed; adding it is a new dependency): the Lighthouse scores (perf >= 85, SEO 100, a11y >= 95) are PENDING the owner's OK to run Lighthouse. Phone: 390 x 844, DPR 3, touch, Pixel 5 UA; CPU throttled 4x (CDP); cache disabled; 3 runs per cell after one warm load, median shown. Profiles: "local" = no network throttle; "slow 4G" = 150 ms RTT, 1.6 Mbps down, 750 kbps up (Lighthouse's mobile values).

Three servers: **on** = the shared flag-on dcc3159 build (http://localhost:3021) seen through `checks/qa/gzip-proxy.mjs` (http://localhost:4213), which gzips the one response `next start` sends uncompressed (the v11 stylesheet route, 160 KB raw, 28 KB gzip) as Vercel's edge does; **on raw** = the same build without the proxy (the stylesheet uncompressed, so about 130 KB more render-blocking CSS: a local artefact, kept for the record); **off** = the C3 flag-off build of the same head (http://localhost:4203). Runs: 2026-09-26T17:35:14.461Z (on), 2026-09-26T17:26:02.114Z (on raw), 2026-09-26T17:30:12.475Z (off). Not measured on Vercel (previews are behind SSO).

| Page | Profile | LCP on / on raw / off (ms) | CLS on / off | JS on / off (KB) | CSS on / on raw / off (KB) | Images on / off (KB) | Total on / off (KB) | LCP element (on) |
|---|---|---|---|---|---|---|---|---|
| / | local | 364 / 304 / 408 | 0 / 0.0499 | 367 / 320 | 97 / 227 / 69 | 908 / 185 | 1612 / 762 | h1 |
| / | slow 4G | 2220 / 2916 / 3040 | 0.0001 / 0.0687 | 367 / 320 | 97 / 227 / 69 | 908 / 185 | 1608 / 742 | h1 |
| /q/ultimate-bts-era-quiz-only-real-armys-survive | local | 580 / 608 / 688 | 0 / 0 | 402 / 322 | 97 / 227 / 69 | 126 / 172 | 794 / 711 | img.p4-cover-img /_next/image?url=https://rdkgouofytwfdpbxbzio.supabas |
| /q/ultimate-bts-era-quiz-only-real-armys-survive | slow 4G | 2344 / 3908 / 2420 | 0.0003 / 0.0003 | 402 / 322 | 97 / 227 / 69 | 126 / 98 | 792 / 628 | img.p4-cover-img /_next/image?url=https://rdkgouofytwfdpbxbzio.supabas |
| /blackpink-quiz | local | 272 / 360 / 420 | 0 / 0 | 357 / 300 | 97 / 227 / 69 | 97 / 713 | 716 / 1238 | img.p3-photo-img /_next/image?url=/idols/BLACKPINK.jpg&w=1080&q=75 |
| /blackpink-quiz | slow 4G | 2300 / 3076 / 3248 | 0.0003 / 0.0003 | 357 / 300 | 97 / 227 / 69 | 97 / 713 | 714 / 1232 | img.p3-photo-img /_next/image?url=/idols/BLACKPINK.jpg&w=1080&q=75 |
| /blindtest | local | 276 / 308 / 272 | 0 / 0 | 275 / 290 | 97 / 227 / 69 | 261 / 15 | 781 / 523 | p.p6-lead |
| /blindtest | slow 4G | 2216 / 2940 / 2048 | 0 / 0 | 275 / 290 | 97 / 227 / 69 | 261 / 15 | 779 / 519 | p.p6-lead |

## Photos from public/idols (flag on, 390, DPR 3)

Needed = rendered width x DPR. A problem is: served more than 2x the pixels needed, served under 2/3 of it while the source had more, or a srcset without `sizes`.

- /: 17 photos, all with `sizes`: yes; problems 14:
  - /idols/BTS.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/BLACKPINK.jpg&w=640&q=75: served 640px (source 715px) for 80px x3 = 240px, sizes=80px
  - /idols/Stray%20Kids.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/TWICE.jpg&w=640&q=75: served 640px (source 939px) for 80px x3 = 240px, sizes=80px
  - /idols/Aespa.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/SEVENTEEN.jpg&w=640&q=75: served 640px (source 870px) for 80px x3 = 240px, sizes=80px
  - /idols/NewJeans.jpg&w=640&q=75: served 640px (source 735px) for 80px x3 = 240px, sizes=80px
  - /idols/BABYMONSTER.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/EXO.jpg&w=640&q=75: served 640px (source 1200px) for 80px x3 = 240px, sizes=80px
  - /idols/IVE.jpg&w=640&q=75: served 640px (source 828px) for 80px x3 = 240px, sizes=80px
  - /idols/ENHYPEN.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/TXT.jpg&w=640&q=75: served 640px (source 1200px) for 80px x3 = 240px, sizes=80px
  - /idols/LE%20SSERAFIM.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
  - /idols/ITZY.jpg&w=640&q=75: served 640px (source 736px) for 80px x3 = 240px, sizes=80px
- /q/ultimate-bts-era-quiz-only-real-armys-survive: 0 photos, all with `sizes`: yes; problems 0
- /blackpink-quiz: 8 photos, all with `sizes`: yes; problems 0
- /blindtest: 6 photos, all with `sizes`: yes; problems 0
