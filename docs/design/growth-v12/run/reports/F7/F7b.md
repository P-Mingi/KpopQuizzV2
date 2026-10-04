# F7b: home and brand (owner fixes after his Firefox test)

## Progress
- Done: item 4 (rabbit logo), item 5 (New quizzes thumbs), the groups rail crop.
- Not done: item 3 as written. No hero image exists at the top of `/` in this build (details below).
- Blockers: item 3 needs the owner's URL or screenshot.

Branch `v12/f7b-home`, from `d93905c`. Dev server on 3068 (both flags on), the flag-on build on 3071 read only.

## 3. Home hero image: not reproduced
`components/home/ux-v1/home-header.tsx` renders text and two buttons, no image, guest and signed in. The served home
(3071 and dev, 1440 and 390, Firefox, Chromium and WebKit) has no `<img>` and no CSS background above the groups rail;
no picture is wider than 300px at first paint, also with the stylesheets held back 4 s (the head stylesheets block
render in Firefox, nothing flashes full screen). No branch of the repo ever put an image in the home header. The
flag-off home (production) has none either. What I did find and fix on the top of `/`:
- The groups rail photos (first pictures of the page) were cut through the faces: in the grid circle
  `height: 100%` had no definite base (auto row), so each photo kept its own ratio (80 x 120 for a portrait), was
  centred vertically and its `center 25%` focal point never applied. Measured the same in the three browsers. Fix in
  `p1.css`: the photo is pinned to the circle (`position: absolute; inset: 0`), 80 x 80 in Chromium, Firefox, WebKit.
- Resolution checked: the rail serves 96w / 220w for 1x / 2x of 80px; the trending covers pick 640w at 390 DPR 2.
  Nothing blurry measured.
- Unrelated, seen on every page of 3071: a script request answered with HTML (`/` as a script, "expected
  expression, got '<'") in both Firefox and Chromium. Not in my files; reported for ORCH.

## 4. Logo
`UxBrand` now shows `public/mascot/mascot-default.png` (the rabbit of the old top bar and of the favicons, the file
as is) at 28 x 28 next to "KpopQuiz", in place of the pink K tile. The sticker's white edge keeps it visible on the
dark ground. Only the v11 shells use `UxBrand`, so it shows whenever `NEXT_PUBLIC_UX_V1` is on; flag off, nothing
changes. Proof: `b/brand-<browser>-<1440|390>-<light|dark>.png` (12, local), `b/probe.txt`.

## 5. New quizzes rows
Why grey: the four tiles named by the owner (Katseye: its own cover; K-pop Records and Which K-pop Group: the
General K-pop logo; aespa: `/idols/Aespa.jpg`) all have a valid picture that answers 200. They were grey while not
loaded: next/image is `loading="lazy"`, Firefox only requests a lazy image once it is close to the viewport (at
1440 x 900 the last two rows were still unrequested after load), and the tile's ground is grey. Fix:
- new client `components/home/ux-v1/new-thumb.tsx`: the type icon is always drawn in the tile, the picture covers it,
  loaded eagerly (six small files) as a fixed 56 x 56 image (64w / 128w for 1x / 2x); `onError` moves to the next
  candidate (quiz picture, group photo, group logo), then the icon alone. No alt text can show (alt="").
- thumbs 40 -> 56px (`p1.css`).
Proof: `b/new-*.png` (12, local), `b/probe.txt`: every tile 56 x 56 with its icon, every picture loaded, in the three
browsers, both widths, both themes.

## Tests
- `e2e/ux-v12/f7b.spec.ts` (new): 16 passed (ux-1440 + ux-390, light + dark, Chromium, dev 3068, guardWrites, no
  write attempted): rabbit 28 x 28 loaded and no K tile; thumbs 56 x 56 with icon and loaded picture; every
  `/_next/image` answered 404 leaves the icon in every tile; every rail photo 80 x 80.
- Firefox and WebKit: `probe.txt` and the rail measure (80 x 80), by script, not by the spec projects.
- Whole-app tsc green; vitest 99 files, 1953 tests passed.

## v11 specs and references that show the old look
- No v11 spec asserts the K tile (`shell.spec.ts` checks the brand link only; `p1.spec.ts` line 318 needs an img or
  svg in each `.p1-glyph`, still true). The v11 reference PNGs (`reference/v11/*`) show the K tile and the 40px
  thumbs: a capture diff against them will differ there by the owner's request.

## Not verified
- Item 3 as the owner saw it (no image found to fix).
- The spec on the production build (no build in an agent); signed-in home (the header has no image either way).
- Flag states: changes live in v11 components (shown with `NEXT_PUBLIC_UX_V1` on, with or without V12); flag off
  renders none of them (page.tsx legacy branch), not re-captured.
