# Lane B (BRIDGES): kpopquiz.org, the passport, the ads layer

Read first: `docs/o1/briefs/CARDS-CONTRACT.md` (sections 1, 3, 4, 6), `docs/o1/briefs/CARDS-DECISIONS.md`,
`docs/design/cards/CARDS-PLAN-v3.md` (sections "Ads" and "Where it lives, and the bridges").
Worktree `.claude/worktrees/o1-cardbridge`, branch `o1/cardbridge`. Commit with `git -c o1.agent=CARDS` (the id of all four card lanes in OWNERSHIP.json). Never push.

## The hard rule

With `NET_CARDS_BRIDGES` off, kpopquiz.org renders byte for byte what it renders today: no new read, no new component, no
new CSS in the served pages. Follow the pattern of `apps/quiz/src/lib/passerelles/group-line.ts` (a server flag, a
dynamic import, fail closed: any error renders nothing). kpopquiz.org never loads an ad script, flag or not.

## Bridges

1. kpopquiz.org home: a "Your packs" block (the stack of 5 and the timer to the next pack, the midnight top-up line), read
   on the server through lane C's read-only `cards_wallet` for a signed-in user; guests see one line and a link. The link
   opens bunnyverse.org/cards through the existing signed-in jump (`commonPassportHref` style,
   `/auth/passport/out?to=hub&next=/cards`).
2. Group pages (`/{group}-quiz`): "BLACKPINK cards" (decision 15): the group's cards from the catalog, owned in colour and
   missing as backs for a signed-in user, all backs for a guest, a count, a link to the binder and to the photo credits.
3. End of a quiz (the result screen kpopquiz.org serves with the production flags) and a Kpopdle win (the hub): "+1 pack,
   open it on Bunnyverse", shown only while the bonus allowance of the day is above 0 (contract section 1, decision 1).
   The pack is opened on bunnyverse.org/cards (source `bonus`); nothing is granted from the client.
4. The profile menu (kpopquiz.org and hub) gets a Binder link; the common passport (`/passport` on the hub) and the
   kpopquiz.org passport get a Collection section (cards owned of the total, from the database).

## Ads (hub only, behind `NET_CARDS_ADS` and `NEXT_PUBLIC_NET_CARDS_ADS`, both off)

- Read Google's own documentation (support.google.com and developers.google.com only) for H5 Games Ads: the
  `adsbygoogle` tag, `adConfig`, `adBreak({ type: 'reward', beforeReward, adViewed, adDismissed, adBreakDone })`. Write
  `apps/quiz/src/lib/cards/ads.ts` and its client component: before showing the button, preload; no ad available
  (`adBreakDone` with a not-viewed status, or no `beforeReward`) hides the button. The flow: `POST /api/cards/ad/ticket`,
  then `adBreak`, and only in `adViewed` `POST /api/cards/ad/grant { ticket }`. A dismissed ad grants nothing.
- One display banner on the binder pages only, never next to an Open button.
- Consent: Google's certified CMP (decision 9); no ad request before the CMP says so. EEA, UK and Switzerland.
- US visitors: ad requests marked child-directed (the plan). Decide the country on the server from the platform's
  country header and render the tag accordingly; document the exact parameter from Google's documentation.
- With the publisher ID or the slot IDs missing (decision 8): nothing loads, the button stays hidden.

## Tests and checks

Render tests: each bridge absent with its flag off and present with it on (with fake data), the home and group page
identical with the flag off (compare against the current markup snapshot tests that exist, e.g. the `__o1_kpop_tree__`
trees, which must stay green unchanged), the bonus line hidden at allowance 0, no ad script on kpopquiz.org, the ad
button hidden with no publisher ID, the grant called only from `adViewed`. tsc and your tests green. No dash. Do not run
`next build`; ORCH runs parity.

## Report (to ORCH, English, short)

Commits, the files touched on kpopquiz.org surfaces, the Google parameters used with their documentation links, anything
you could not do.
