# Requests of lane B (BRIDGES)

To ORCH
1. Flags. NET_CARDS_BRIDGES, NET_CARDS_ADS, NEXT_PUBLIC_NET_CARDS_ADS are read straight from the env (`lib/cards-bridge/flags.ts`) and are NOT in `O1_FLAGS`: adding them breaks `contract.test.ts` until `docs/o1/contracts/flags-env.md` gets the same rows, a file this lane cannot edit. Please add the rows and the registry entries together. Two more names are needed:
   - `NEXT_PUBLIC_NET_CARDS_BRIDGES` (public twin of NET_CARDS_BRIDGES): the quiz-end line, the Kpopdle-win line and the account menu Binder link live in client components, so they read a build constant. Off, they compile to nothing.
   - Ads env: `NEXT_PUBLIC_CARDS_ADSENSE_CLIENT` (ca-pub-...), `NEXT_PUBLIC_CARDS_BANNER_SLOT`, optional `NEXT_PUBLIC_CARDS_ADS_TEST=1`. Empty: no ad loads, the button stays hidden.
2. New same-origin route `GET /api/cards-bridge/me` (kpop and hub, 404 while NET_CARDS_BRIDGES is off): add to `docs/o1/contracts/apis.md` and routes if a table needs it. Needed because the kpopquiz.org home, group pages and quiz pages are cached: the fan's own numbers are read after hydration, never in the page.
3. Link allowlist rows (kpop to hub): home block `/cards`, group block `/cards/binder` and `/credits`, quiz end `/cards`, passport `/cards/binder`, menu `/cards/binder`. All go through `/auth/passport/out?to=hub&next=...&via=k.pp`.
4. No analytics call was added: `cross_promo_click` has no target for Cards in `CROSS_TARGETS` and a new value is an owner decision.

To lane C
- Checked against 002-functions.sql (merged): `cards_wallet` already returns stock, next_at, midnight_at, bonus_left; the bridge passes p_ads_limit and p_bonus_cap from CARDS_ADS_PER_DAY and CARDS_BONUS_PER_DAY. No change needed. When `lib/cards/flags.ts` lands, `lib/cards-bridge/flags.ts` can read from it.

To lane U
- Ads components: `components/cards-bridge/ads-client.tsx` exports `RewardedAdButton({ ctx, onGranted })` and `BinderBanner({ ctx })`; `ctx` comes from `readAdsContext()` in `lib/cards/ads-server.ts` (server). Place the banner on binder pages only, never next to an Open button.
- `/cards` should accept the bonus visit from the quiz-end line (a plain `/cards`): offer the bonus pack there when `bonusLeft > 0`.
