# BLINDTEST-X - future product workstream (2026-08-05)

Owner directive: the blindtest V1 works but should become a complete,
very high quality product: subdomain, multiplayer, multi-niche,
money-making, maybe sellable one day. Cowork verdict below, brutally
honest, research-backed (heardle.live, songtrivia2, kpopless,
SongPop, the Spotify/Heardle acquisition and shutdown, Spotify/
Deezer/Apple developer terms, music-licensing counsel opinions).

## 1. Honest state of our V1

Good: the config UX (type/gen/group filters, rounds picker) is clean;
the daily exists; the clip pipeline works. Missing for "product":
single-player only, no share grid, no visible streaks, no
per-artist dailies, no rooms, no standalone identity. As a FEATURE
of KpopQuiz: solid V1. As a PRODUCT: it is 20% of one.

## 2. The market truth

The category is real: Heardle peaked at 2M+ daily players;
songtrivia2 runs 100-player no-account rooms; heardle.live retains a
K-pop niche beautifully (7.8 pages/visit) on donations. AND: nobody
in the category makes real money, the crowded long tail is ad-free
or near-zero, and the biggest property ever (Heardle, bought by
Spotify itself) was shut down within a year. The moat in this
category is not features. It is AUDIO RIGHTS.

## 3. The legal wall (the make-or-break, no sugar)

- Spotify: BANS games in its developer policy explicitly ("a name
  that tune quiz would not be allowed") and killed preview_url for
  new apps in 2024. Dead end.
- Deezer: developer terms ban ANY direct or indirect revenue. Dead
  end for monetization.
- Apple previews: the only workable grey. 30s previews served
  DIRECTLY from Apple's CDN, linking back to Apple Music: tolerated,
  revocable, untested in court (kpopless runs openly on this).
- Copyright bottom line from counsel: snippets need master +
  composition licenses regardless of length; fair use is weak for
  entertainment use. No label has sued a heardle clone YET because
  they are small and unmonetized.
- THE RISK LADDER: free fan site on Apple previews = tolerated ·
  ads/premium on that audio = ToS breach + real exposure · SELLING
  the product = structurally impossible (acquirers diligence rights;
  unlicensed catalog is a deal-killer; Wordle sold for low seven
  figures precisely because it was pure text, zero rights debt).

## 4. The strategy (force de proposition): three honest stages

STAGE A - V1.5 INSIDE KPOPQUIZ (cheap, next Play slot):
share grid + visible streaks + escalating clips 1-2-4-7-10s +
per-artist daily pages (SEO surface, heardle.live's 201-page model)
+ audio-source conformity audit: our clips must follow the
Apple-CDN-direct pattern, never rehosted. Goal: retention + SEO.
Mostly already in the backlog (L-032 items 2 and 6).

STAGE B - THE REAL BET, MULTIPLAYER (workstream BLINDTEST-X):
- Rooms a la skribbl: ONE LINK, ZERO account, 2-16 players, live
  scoreboard, host picks the filters (the V1 config screen becomes
  the room setup), rounds with buzz-in or type-to-answer, emotes.
- Architecture win: Supabase REALTIME (channels/presence/broadcast)
  is ALREADY in our stack: rooms without a new dependency or new
  infra. This is the single biggest feasibility unlock.
- Daily for acquisition + rooms for parties (the proven shape).
- Subdomain blindtest.kpopquiz.org, same codebase, shared auth
  optional (guest-first, G-CLAIM logic applies).
- Monetization AT THIS STAGE: donations only (heardle.live model).
  Ads on preview audio would convert us from tolerated to target:
  refused as long as the audio is preview-based.
- Multi-niche: the engine is built niche-agnostic (config = catalog
  source + branding), like the Verse core law; K-pop is verse 1.

STAGE C - MONEY/SALE (only if B wins big):
a monetized or sellable Blindtest requires RE-FOUNDING the audio:
label/publisher deals (five to six figures minimum, SongPop path),
or the B2B host-screen model where the venue/host plays audio from
THEIR OWN premium streaming account (pub quiz / party licensing:
the one model where money can pencil legally), or licensed indie/
cover catalogs for non-K-pop niches. Decision AT stage C, with
stage-B traffic as leverage. Never before.

## 5. Sequencing + next steps

- BLINDTEST-X enters the Play backlog QUEUE: after G-CLAIM (accounts
  logic feeds rooms) - order: G-CLAIM -> stage A -> BLINDTEST-X
  stage B. G-PULSE can interleave (small).
- Immediate cheap action (one worker line, any next Play mission):
  audit the current clip pipeline vs the Apple-CDN-direct pattern.
- Prototype-first: room screen + host screen + join flow get
  co-design mockups before any build.
- Verse stays the critical path; this document is the product map,
  not a start order.
