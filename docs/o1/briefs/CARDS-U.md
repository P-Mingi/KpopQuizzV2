# Lane U (UI): the Cards pages on bunnyverse.org

Read first: `docs/o1/briefs/CARDS-CONTRACT.md` (sections 1, 3, 5, 6), `docs/o1/briefs/CARDS-DECISIONS.md`, and the WHOLE
prototype `docs/design/cards/bunnyverse-cards-prototype-v4.html` (open it in a headless browser to see it; read its CSS
and markup). Its card design is approved as is: dark photocard cards, light mode on the kpopquiz.org kit, the real
Bunnyverse logo on the pack and the card back. Port it faithfully; do not redesign.
Worktree `.claude/worktrees/o1-cardui`, branch `o1/cardui`. Commit with `git -c o1.agent=CARDS` (the id of all four card lanes in OWNERSHIP.json). Never push.

## Pages (hub build, `NET_CARDS` on; off = a 404 like any unknown URL)

- `/cards` (the prototype's Packs view): the pack (tap to rip, the tear and the reveal of 5 cards one by one, skip), the
  stack of 5 and the two timers (next pack, midnight Paris), Open, Last pull, the aside: "Watch an ad" only when lane B's
  ad layer says an ad is available (render nothing otherwise), "Use 50 shards", the binder progress, and the drop rates
  with BOTH lines: each card, and the fifth card (U 84, R 10, SR 4.5, UR 1.2, L 0.3) with one plain sentence saying a
  Common in fifth place becomes an Uncommon. No "Notify me" (no PWA yet, decision 11). Guests see the page with
  "Sign in to open" (the hub's sign-in), never a fake stack.
- `/cards/binder`: pages of 9 pockets, one group per run of pages, events at the end; or the grid of 36 a page with the
  sort (rarity, number, newest); filters type, rarity, owned, missing, favorites; search; the completion count; the star
  on owned cards; locked pockets with the reason sentence; "Recycle extras" with its exact shard count.
- `/cards/c/[num]` (e.g. `/cards/c/BV1-0042`): the card front, the back with the credit, and under it, visible without
  flipping, the credit with links to the author, the source page and the licence; "This card is shared under CC BY-SA"
  when the photo is CC BY-SA; the photo's number for that idol; "Report a photo". `noindex`. A card that cannot exist yet
  shows its lock sentence. Unknown number: 404.
- `/credits` (the existing hub page `app/sites/[site]/credits/page.tsx`): add a Cards section: every photo used, thumbnail,
  the card names, author, licence, source link, what was changed ("cropped, frame and text added"), "Report a photo"
  next to each. Keep what is there unchanged (its tests must pass as they are).
- `/cards/report`: the form (role: the person shown, the photographer, an agency, other; message; optional contact),
  `noindex`, posts to `/api/cards/report`, says removal within 48 hours.
- A footer on every Cards page: Photo credits, Report a photo, "Bunnyverse Cards is free. Packs are never sold."
- The hub navigation gets a Cards entry only with the flag on.

## How

Server components read the catalog (lane C's `lib/cards` server helpers, or a typed fixture until they land: put the
fixture under `apps/quiz/src/lib/cards/ui-fixture.ts`, clearly a test fixture, never rendered in production); the client
reads `/api/cards/state` and posts to `/api/cards/open`, `recycle`, `favorite`. Card art: the photo from the `cards`
bucket with the focal point as `object-position`, and the edition finishes (silver keyline, spotlight beams, holo film,
era, gold foil, full art) in CSS as in the prototype; respect `prefers-reduced-motion`. Measurement:
`game_start` at the open and `game_complete` after the fifth card, contract section 6. Tokens: the kpopquiz.org kit
tokens, no raw hex outside the card art module. One H1 per page. Desktop and 375 px. Accessible: buttons with names,
focus order, the reveal usable with the keyboard, `aria-live` for the result.

## Tests and checks

Render tests (renderToStaticMarkup, as in `components/admin/photos/photos-admin.test.ts`): one H1, the exact odds lines,
the five lock sentences, the credit present on every card page and in its detail, noindex on card pages and the report
page, 404 when the flag is off, nothing rendered on kpopquiz.org or anime. Screenshots with Playwright at 1440 and 375 px
of `/cards`, the opening, the binder (both views), a card page, `/credits` and the report form, on a local dev server of
the hub build with the fixture (`scripts/o1/env.sh offline`), saved under `docs/o1/evidence/cards/ui/`. tsc and your
tests green. No dash. Do not run `next build`.

## Report (to ORCH, English, short)

Commits, the screenshots, what differs from the prototype and why, anything you could not do.
