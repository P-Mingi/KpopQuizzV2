# Performance probe (C3, loop 2, cc6c394)

Playwright, no Lighthouse (not installed; adding it is a new dependency): the Lighthouse scores (perf >= 85, SEO 100, a11y >= 95) are PENDING the owner's OK to run Lighthouse. Phone: 390 x 844, DPR 3, touch, Pixel 5 UA; CPU throttled 4x (CDP); cache disabled; 3 runs per cell after one warm load, median shown. Profiles: "local" = no network throttle; "slow 4G" = 150 ms RTT, 1.6 Mbps down, 750 kbps up (Lighthouse's mobile values).

Three servers: **on** = the shared flag-on build of loop 2, cc6c394 (:3021) seen through `checks/qa/gzip-proxy.mjs` (http://localhost:4213), which gzips the one response `next start` sends uncompressed (the v11 stylesheet route, 160 KB raw, 28 KB gzip) as Vercel's edge does; **on raw** = the same build without the proxy (the stylesheet uncompressed, so about 130 KB more render-blocking CSS: a local artefact, kept for the record); **off** = the C3 flag-off build of the same head (http://localhost:4203). Runs: 2026-09-26T21:23:19.242Z (on), - (on raw), 2026-09-26T21:26:02.115Z (off). Not measured on Vercel (previews are behind SSO).

| Page | Profile | LCP on / on raw / off (ms) | CLS on / off | JS on / off (KB) | CSS on / on raw / off (KB) | Images on / off (KB) | Total on / off (KB) | LCP element (on) |
|---|---|---|---|---|---|---|---|---|
| / | local | 420 / - / 1740 | 0.0546 / 0.0499 | 366 / 320 | 98 / - / 69 | 495 / 185 | 1189 / 737 | h1 |
| / | slow 4G | 2416 / - / 3284 | 0.0542 / 0.0702 | 366 / 320 | 98 / - / 69 | 495 / 182 | 1187 / 737 | h1 |
| /blackpink-quiz | local | 536 / - / 940 | 0 / 0.0003 | 356 / 300 | 98 / - / 69 | 82 / 713 | 697 / 1232 | img.p3-photo-img /_next/image?url=/idols/BLACKPINK.jpg&w=1080&q=75 |
| /blackpink-quiz | slow 4G | 3008 / - / 3308 | 0.0003 / 0.0003 | 356 / 300 | 98 / - / 69 | 82 / 713 | 698 / 1232 | img.p3-photo-img /_next/image?url=/idols/BLACKPINK.jpg&w=1080&q=75 |

## Photos from public/idols (flag on, 390, DPR 3)

Needed = rendered width x DPR. A problem is: served more than 2x the pixels needed, served under 2/3 of it while the source had more, or a width-descriptor srcset without `sizes` (a fixed-size image with a 1x / 2x srcset needs none).

- /: 17 photos (16 loaded and judged), each with `sizes` or a 1x / 2x srcset: yes; problems 0
- /blackpink-quiz: 8 photos (5 loaded and judged), each with `sizes` or a 1x / 2x srcset: yes; problems 0
