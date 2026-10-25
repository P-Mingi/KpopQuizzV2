# Deezer check, October 2026 (Mission U, part B)

Branch `mission-u/deezer`. Written 2026-10-15. Scope: kpopquiz.org (`apps/quiz`).

## En bref (pour le propriétaire)

- Chaque écran qui joue un extrait Deezer affiche maintenant la mention "Song previews by Deezer, for private, personal listening only." à côté du lecteur. L'écran hôte des salons live affiche "Song previews by Deezer. Not for public or commercial events."
- Le logo Deezer officiel n'est PAS encore dans le site. Le code l'attend à `apps/quiz/public/brand/deezer-logo.svg`. Tant que le fichier n'est pas dans le dépôt, seule la phrase s'affiche et aucune page ne demande le fichier (zéro 404). Dès qu'il est ajouté, le build suivant affiche le logo, sans autre changement. Il faut ton accord pour télécharger le logo officiel (adresse en section 6).
- Aucun MP3 n'est copié ni stocké, aucune route ne relaie ou ne met l'audio en cache : le navigateur lit l'extrait directement chez Deezer.
- Aucune pub, aucune affiliation, aucun paiement sur les pages avec audio. Seul outil tiers : Vercel Web Analytics (statistiques de visite), partout sur le site.
- Questions ouvertes en section 7, dont la plus importante : les conditions Deezer interdisent tout revenu, même indirect, et citent aussi les "données". Confirme qu'aucun revenu n'existe ou n'est prévu sur ce site.

## 1. What Deezer asks (read 2026-10-15)

Pages read (read only, with a fetch tool that returns the page text): <https://developers.deezer.com/termsofuse>, <https://developers.deezer.com/guidelines>, <https://developers.deezer.com/guidelines/logo>, and the pages they link to for the logo (<http://deezerbrand.com/>, <https://newsroom-deezer.com/press-kit/>).

Copyright note: this file reproduces one short verbatim quote and paraphrases the rest closely, with the exact page and section for each clause, so the owner can read the original wording on the page itself. The lead asked for exact quotes; the house rule on reproducing third-party text limits this report to one short quote, so please open the links for the full wording before relying on a clause.

### Terms of use (developers.deezer.com/termsofuse)

| Topic | What the clause says (paraphrase, except where quoted) |
|---|---|
| Non-commercial use | Use of the services is "strictly limited for a non-commercial purpose and in a non-commercial environment." (verbatim) |
| No revenue, even indirect | The developer must not receive, generate or benefit from, directly or indirectly, any money, income, revenue, **data** or any other consideration in connection with the use of the services. |
| Private use only | Use of the Content is limited to strictly private use, within a family scope. |
| Brand association | The services and the Content must not be associated, directly or indirectly, with any trademark, brand name or logo. |
| Trademark guidelines | Deezer's Trademark Guidelines are a full part of the terms for API access (so the logo rules below are contractual, not optional). |
| No reproduction | Reproducing or representing the site or its elements, in whole or in part, without the express authorization of Deezer or the right holders is forbidden. |
| No download | The developer must not bypass Deezer's technical measures in order to download the Content. |
| Preview length | Full-length recordings are for Premium+ subscribers; otherwise tracks are accessible only up to 30 seconds. |
| Written agreement | The fetch tool did not surface a sentence that offers a written agreement path for commercial use. Mission U's context line (from the first reading) says revenue needs Deezer's written agreement; the terms as read today simply forbid it. |
| Last updated | No date shown on the page. |

### Developer guidelines (developers.deezer.com/guidelines)

| Section | What it says (paraphrase) |
|---|---|
| Content access rules (`#content-access`) | Logged-out and freemium users get 30-second extracts only through the API; full tracks are for Premium users. |
| Streaming URL privacy (`#streaming`) | Apart from the 30-second extract MP3s, full-length track URLs must never be reachable by the end user. |
| Local Storage policy (`#local`) | Local or offline storage of audio data is strictly forbidden. Apps that break the rules can be blocked by Deezer. |

### Logo guidelines (developers.deezer.com/guidelines/logo)

| Topic | What it says (paraphrase) |
|---|---|
| Logo required | Every application that uses the Deezer API or SDKs must include a clearly visible Deezer logo. |
| Mandatory | Respecting the logo guidelines is mandatory; the logo must be clearly visible and identifiable. |
| Where the rules live | The detailed rules (size, clear space, colours, misuse) are on the Deezer Brand website, deezerbrand.com. |
| What could not be read | deezerbrand.com renders with JavaScript only: the fetch tool got the page title and nothing else, so the minimum size, clear space and colour rules are **not verified** here. Third-party logo sites were not used as a source. |

## 2. Every surface that plays a Deezer preview, and what was added

All in-app players use the browser's own audio element (`new Audio(url)`) on the preview URL Deezer returns (`cdnt-preview.dzcdn.net`), through `components/blind-test/use-audio-player.ts` or, for the legacy mode player, its own `new Audio()`.

The attribution is ONE shared component, `apps/quiz/src/components/deezer-attribution.tsx`, used on every surface below.

| Surface | Routes | Component | Where the attribution sits | Line |
|---|---|---|---|---|
| Blind test game, v11/v12 (daily blind test, free playlists by all / generation / mix / group, challenge links) | `/blindtest`, `/blindtest?c=CODE` | `components/blindtest/ux-v1/game.tsx` (BtGame) via `controller.tsx` | Last line of the game column, under the answers (and under Next on the reveal); also on the tap-to-play screen | private |
| Blind test modes, themes, group playlists, v11/v12 | `/blindtest/<mode>` (18 modes), `/blindtest/<theme>`, `/blindtest/group-<slug>` | same BtGame via `mode-controller.tsx` | same | private |
| V12 blind test landings | `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`, `/id/tebak-lagu-kpop` | same BtGame via `landing-controller.tsx` (the line stays in English, marked `lang="en"`) | same | private |
| Ranked | `/blindtest/ranked` | same BtGame via `components/ranked/ux-v1/controller.tsx` | same | private |
| Results screen, v11/v12 (every flow above): a play button per song replays its preview | same routes, after a run | `components/blindtest/ux-v1/results.tsx` (BtResults) | Under the "Your songs" list, left-aligned with it | private |
| Legacy blind test game (daily + free) | `/blindtest` when `NEXT_PUBLIC_UX_V1` is off; `/pt/blindtest` always | `components/blind-test/blindtest-game.tsx` | Under the four answers | private |
| Legacy mode player | `/blindtest/<mode>` when `NEXT_PUBLIC_UX_V1` is off | `components/blind-test/blind-test-player.tsx` (round from `lib/blind-test/legacy-round.ts`) | Under the answers / Next button | private |
| Live room, host screen | `/live` | `components/live/stage.tsx` | Under the host controls, in every state (setup, lobby, rounds, board, podium); centred in full-screen mode | live |

Surfaces checked that do NOT play a Deezer preview (nothing added):

- Live room phones, `/join` and `/join/<code>` (`components/live/phone.tsx`): the phone plays no audio by design, only the host screen does.
- Verse song pages, `/verse/<slug>/songs/<id>`: the play button (`components/verse/track-play.tsx`) plays a YouTube video or a curated video, not Deezer. The page does show the Deezer album cover (see open question 5).
- Verse music module (`components/verse/presentation/audio-strip.tsx`): plays curator-entered audio URLs, accepted only from the image-host allowlist (`lib/image-hosts.ts`: Supabase, Cover Art Archive, `cdn-images.dzcdn.net` and a few image CDNs). No Deezer preview host is on it.
- Duels / this-or-that bonus (`components/this-or-that/bonus.tsx`, `lib/duel/*`): Deezer covers only, no audio.
- `/g/<slug>` legacy user game player (`components/game/blind-test-player.tsx`): YouTube IFrame player, not Deezer (YouTube's own terms apply, out of scope here).
- `apps/blindtest`: a separate, older app in the same repo that also plays Deezer previews (see open question 7). Not part of kpopquiz.org and not changed.

### The component

- Text: `Song previews by Deezer, for private, personal listening only.` (variant `private`) or `Song previews by Deezer. Not for public or commercial events.` (variant `live`).
- Logo: an `<img src="/brand/deezer-logo.svg" alt="Deezer">` in front of the text, height 1.4 times the line's font size (about 18 px), width from the file's own ratio.
- **The logo file does not exist yet.** Nothing was downloaded. Until the owner approves fetching Deezer's asset and the file is added at `apps/quiz/public/brand/deezer-logo.svg`, the attribution is text only and no page requests the file (no 404): `next.config.ts` sets `NEXT_PUBLIC_DEEZER_LOGO` at build time only when the file exists, and the component renders the `<img>` only then. The next build after the file is added shows the logo with no other change. The text line carries "Deezer" on its own. No broken-image icon, no empty gap.
- Styling follows each surface: base layout `.dz-attr` in `styles/globals.css`; `.p6-dz` in `styles/ux-v1/p6.css` (`--ux-muted`, 13 px); `.ux-live-dz` in `styles/ux-v12/g4.css` (`--ux-muted`); `.bt-dz` in `globals.css` (`--txt2`); the legacy mode player uses its own Tailwind tokens (`--text-secondary`). The secondary text tokens were chosen over the tertiary ones because `--txt3` / `--text-tertiary` (#9e998f) is about 2.7:1 on the light page, too faint for a notice that must be clearly visible. No Verse surface is touched.
- Guard: `components/deezer-attribution.test.ts` pins the two lines, text only without the logo file (no `<img>`), the logo with its path and alt once the file is in the repo, the build flag following the file, and the presence of the component on each of the five player files.

## 3. Nothing stored, nothing proxied

| Check | Finding | Evidence |
|---|---|---|
| Audio files in the repo / `public/` | None. No `.mp3 .m4a .wav .ogg .aac .flac .opus .weba` file is tracked. | `git ls-files` filtered on audio extensions: empty |
| Supabase Storage | Every upload in code is an image (or one RSS feed file): quiz images (jpeg/png/webp/gif only), Verse space images and stickers, community photos (jpeg only), profile headers (webp), Pinterest pins (png) and `feed.xml`. No audio upload anywhere. | `api/quiz/upload-image`, `api/admin/quiz/upload-image` (ALLOWED_TYPES image/*), `api/verse/space-image`, `api/verse/sticker`, `api/ux-v1/p8/photo` (image/jpeg), `lib/ux-v1/p10/header-store.ts`, `scripts/generate-question-pins.mts` |
| Database columns | No audio blob column (no `bytea` anywhere in `supabase/migrations`). `songs.preview_url` is a TEXT link (migration 024), re-fetched from `api.deezer.com/track/<id>` at play time because Deezer's links expire. Preview links (text) also ride in `live_rooms` state and in challenge question JSON. Links, not audio. | `supabase/migrations/024_songs_deezer.sql`, `lib/live/supabase-store.ts`, `lib/ux-v1/p6/challenge-server.ts` |
| Routes returning audio bytes | None. No route sets an `audio/*` content type or streams a fetched body; every `arrayBuffer()` in routes is an image (uploads, OG images, Reddit share image). | grep of `src/app` and `src/lib` for `audio/`, `arrayBuffer()`, `res.body` |
| Server calls to Deezer | Four places fetch the public track JSON to refresh the preview link and cover: `api/daily/blindtest/route.ts`, `api/blind-test/generate/route.ts`, `lib/ux-v1/p6/challenge-server.ts`, `lib/ranked/db.ts` (`cache: 'no-store'`). JSON metadata only; the audio itself is never fetched server side. | same files |
| Response caching | `/api/daily/blindtest` answers its JSON (which contains the preview links) with `Cache-Control: public, s-maxage=300, stale-while-revalidate=60`, so Vercel's edge keeps the links for 5 minutes. Links only, not audio. The generate route is POST (not cached); the challenge route is `no-store`. | `api/daily/blindtest/route.ts` line 173 |
| next.config rewrites / headers | No rewrite or redirect to any Deezer host; the only custom headers are frame policies. `cdn-images.dzcdn.net` is an image host for next/image (covers), not audio. | `apps/quiz/next.config.ts` (`rewrites()`, `headers()`, `images.remotePatterns`) |
| vercel.json | Regions, git deploy switches and crons only. No headers, no rewrites. | `apps/quiz/vercel.json` |
| Service worker | None. No `serviceWorker` registration, no `caches.open`, no `sw.js` in `public/`. | grep of `src`, `public` |
| Middleware | No Deezer or audio handling. | `apps/quiz/src/middleware.ts` |
| Browser buffering | `use-audio-player.ts` preloads the NEXT clip in a detached audio element during the current question (normal HTTP buffering in the player's memory, dropped on cleanup). Not storage in the sense of the guidelines, but noted. | `components/blind-test/use-audio-player.ts` (`preload`) |
| Ingest script | `scripts/ingest-blindtest-songs.mts` reads the public Deezer API and writes SQL with the preview LINK; it downloads no audio. | same file |

Verdict: no MP3 copied, no audio stored, no route proxies or caches audio.

## 4. Ads, affiliation, commercial scripts on audio pages

Report only, nothing changed.

- No ad network (no AdSense, `adsbygoogle`, GPT/DoubleClick, Ezoic, Mediavine, Taboola, Carbon), no Google Tag Manager or gtag, no Meta/TikTok pixel, no Hotjar/Clarity.
- No affiliate link (no Amazon tag, `amzn.to` or affiliate parameter), no donation link (Ko-fi, Patreon, Buy Me a Coffee), no Stripe or PayPal, no shop.
- Ranked season rewards are switched off (`SEASON_REWARDS_LIVE = false`, `lib/ranked/constants.ts`) and are not money.
- Present on every page, audio pages included: Vercel Web Analytics (`@vercel/analytics`, mounted in `app/layout.tsx`, custom events in `lib/analytics.ts`, e.g. `gameStart` / `gameComplete` for the blind test). Also present but off by default: first-party blind test play tracking behind `NEXT_PUBLIC_BT_TRACKING` (`lib/tracking/bt.ts`). See open question 2.

## 5. Proof

- Served HTML: `/live` carries the line in the server-rendered HTML (`<p class="dz-attr ux-live-dz" lang="en" data-deezer-attribution="live">`). Every other player mounts after a click (the game, the results), so the line is in the client chunk that renders with the player: checked for `/blindtest`, `/blindtest/classic`, `/blindtest/group-bts`, `/blindtest/ranked`, `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`, `/id/tebak-lagu-kpop`, `/pt/blindtest`, with the flags on, and `/blindtest`, `/blindtest/classic` with the flags off.
- Live render in a browser at 720 px and 375 px: game, results, legacy game, legacy mode player, live host screen (normal and full screen). No horizontal overflow anywhere; the line wraps to two lines at 375 px. With a placeholder logo of Deezer's ratio injected in the page (DOM only, no file written), still no overflow.
- Known placement limit: on the legacy `/pt/blindtest` game at 375 x 812 the line sits at the bottom of the answers, right at the fold (one short scroll). The v11/v12 game shows it above the fold at that size.
- Gates: `tsc --noEmit` 0 errors; vitest full suite green with the flags unset (the 15 failures seen with the flags set exist on `origin/main` too: env-sensitive tests written for the flags unset); `check:verse-tokens` and `check:routes` pass. `next build` is left to the lead.

## 6. The logo asset to fetch, after the owner's OK

Nothing was downloaded. To request:

| Source | URL | Format | Size |
|---|---|---|---|
| Deezer newsroom press kit, "Logos" (official, linked from <https://newsroom-deezer.com/press-kit/>) | `https://newsroom-deezer.com/wp-content/uploads/2025/07/DEEZER-LOGO.zip` | ZIP archive (contents not inspected: expected SVG and/or PNG variants) | about 73 KB, as labelled on the page |
| Developers site logo image (the "Deezer for developers" mark used on the guidelines pages) | `https://cdn-files.dzcdn.net/img/developers/logo-deezer-developers-v00403025.png` | PNG | not shown |
| Deezer Brand website (where the developer page sends you for the rules) | <http://deezerbrand.com/> | JavaScript site, could not be read | n/a |

Recommended: the press kit ZIP. Once approved, pick the standard horizontal logo as SVG and save it as `apps/quiz/public/brand/deezer-logo.svg`. Nothing else in the code has to change; the logo then shows in front of every line. If the ZIP only has PNG, either save a PNG and change `DEEZER_LOGO_SRC` in `components/deezer-attribution.tsx`, or ask for the SVG.

## 7. Open questions for the owner

1. **Revenue.** The terms forbid any money, income or other consideration, even indirect. No ad, affiliate or payment exists in `apps/quiz` today. Confirm there is no other revenue tied to the site (sponsorship, paid Discord, donations, the planned multi-site network) and that none is planned while the blind test uses Deezer previews. Any future ad, even on a page without audio, should be checked against these terms first.
2. **"Data".** The same clause lists data among the things a developer must not obtain in connection with the services. Vercel Web Analytics runs on the blind test pages and records `gameStart` / `gameComplete`; the optional play tracking (`NEXT_PUBLIC_BT_TRACKING`, off by default in code: please confirm it is off in production) would record more. A strict reading could object; a lawyer or a written question to Deezer would settle it.
3. **Live rooms.** The terms limit Content to private use within a family scope. A live room takes up to 50 players on phones around one host screen. The new host line says it is not for public or commercial events, but nothing enforces it. Keep live rooms on Deezer previews, cap them lower, or ask Deezer?
4. **Logo rules.** Size, clear space and colour rules sit on deezerbrand.com, which could not be read. The line uses one logo file at about 18 px high. On dark surfaces (dark mode, the live host screen in a dark room) a dark logo may not stand out: the ZIP may hold a white variant, which would need a second file and a small code change.
5. **Cover art.** Deezer album covers show at each reveal, in the results, on Verse song pages, in duels and the this-or-that bonus. The attribution is placed next to players only. Should pages that show Deezer covers without audio carry it too? (Part C of Mission U already hides drama OST covers.)
6. **Link to Deezer.** The developer pages read did not ask for a link back to Deezer; the line has none. Add one if the brand site asks for it.
7. **`apps/blindtest`.** A separate, older app in the repo (`apps/blindtest`, dev port 3022, with party mode) also plays Deezer previews. If it is deployed anywhere, it needs the same line or should be switched off.
8. **5-minute edge cache of the daily JSON.** Links only, not audio, so it reads as compliant. Switch `/api/daily/blindtest` to `no-store` if the owner wants zero caching of anything that comes from Deezer.
