# Packs for a rewarded ad: what exists, what is built, what the owner must do

Lane CARDS, lot LAUNCH-PREP, 2026-11-17. The mechanism is built and OFF. No ad account exists and no agent creates one.

## What existed before

- Ad layer of lane B (`lib/cards/ads.ts`, `ads-server.ts`): Google AdSense H5 "Ad Placement" rewarded flow, hub only, behind `NET_CARDS_ADS` + `NEXT_PUBLIC_NET_CARDS_ADS`, an AdSense client id, the country header (US and unknown country count as child directed, EEA/UK/CH and unknown count as consent regions) and a CMP address.
- The reward of that flow is 25 shards (`CARDS_AD_SHARDS`), not a pack, up to `CARDS_ADS_PER_DAY` (10) a day. The grant (`POST /api/cards/ad/grant`, SQL `cards_ad_grant`) is triggered by the browser's `adViewed` callback: it is the browser's word, backed only by a ticket (`cards_ad_tickets`) that must be 10 s to 1 h old. This flow is untouched.
- Table `cards_ad_tickets` (id, user_id, issued_at, used_at) and `cards_issue_ticket` (`POST /api/cards/ad/ticket`).
- Consent: `consentAllows` (TCF v2 purpose 1 via the CMP).

## What is built now (flag OFF)

- `NET_CARDS_AD_PACKS` (default off). With it off, `GET /api/cards/ad/ssv` answers 404 and nothing is read or written.
- `GET /api/cards/ad/ssv` (`app/api/cards/ad/ssv/route.ts`, logic in `lib/cards/ad-packs.ts`): the ad network's signed completion callback (server side verification of rewarded ads: ECDSA P-256 / SHA-256 signature over the query string, public keys fetched from the network's key list, kept 24 h). A pack is given only if: the flag is on, the signature is valid, `ad_unit` is ours, the timestamp is under 2 h old, `custom_data` is a ticket id, the `user_id` of the callback is the ticket's owner.
- SQL 121 (`docs/pending-migrations/cards/121-ad-packs.sql`, after 120): table `cards_ad_events` (one row per transaction id) and `cards_ad_pack_grant`: idempotent per ad event (the network's `transaction_id`), the user is read from the ticket, the ticket is spent once, +1 pack to the stack, at most `CARDS_AD_PACKS_PER_DAY` (default 3, max 20) a Paris day per user; past it the event is recorded and gives nothing. The stack may pass 7 by this grant (like a claimed set); the timer never does.
- Consent: `adPersonalisation` gives personalised ads only with consent for TCF purposes 1, 3 and 4; every other case (no answer, refusal, partial answer) is a non personalised request. `rewardedRequestOptions` builds what the browser sends with the request (ticket as custom data, user id, non personalised flag).
- Not built: the browser button for the pack ad (it needs the real ad unit and the real SDK calls to be written and tried against your account; the pure helpers above are ready for it).

## What the owner must do

1. Create the ad account and a rewarded ad unit for the web (Google Ad Manager rewarded ads for web, or the network of your choice that offers server side verification with the same callback shape; Google AdSense H5 Games Ads, which the older flow uses, has no server callback). The agents created none.
2. Enable server side verification on that ad unit and set the callback URL to `https://<the hub host>/api/cards/ad/ssv` (the network appends the query and the `signature` and `key_id` last).
3. In the ad unit's request, the page sets `custom_data` to the ticket id and `user_id` to the player's user id (the helper `rewardedRequestOptions` does it). Check in your console that the callback parameter names are `ad_unit`, `custom_data`, `user_id`, `transaction_id`, `timestamp`, `signature`, `key_id` (they are isolated in `SSV` of `lib/cards/ad-packs.ts`) and that the key list address is the one in `VERIFIER_KEYS_URL`.
4. Vercel environment variables (hub project, Production): `CARDS_AD_SSV_AD_UNIT` (the ad unit id exactly as the callback sends it), `CARDS_AD_PACKS_PER_DAY` (optional, 3 by default), and last `NET_CARDS_AD_PACKS=1`. Keys are public: no secret is needed for the verification. The existing `NET_CARDS`, `NET_CARDS_ADS`, `NEXT_PUBLIC_NET_CARDS_ADS` and the AdSense client id stay as they are for the older flow.
5. Consent settings: configure the certified consent message (CMP) for the EEA, the UK and Switzerland with the ad vendor listed, so the TCF string carries purposes 1, 3 and 4. Without a consent answer the request is non personalised, by the code; check with your adviser that serving non personalised ads without any consent is acceptable in your markets, and if not, keep the consent rule of `consentAllows` in front of the request.
6. Privacy and policy pages: name the ad vendor, the daily limit and the consent choice. Child directed treatment for US and unknown countries stays as in lane B.
7. Apply SQL 120 then 121 (after a backup, never between 23:50 and 00:30 UTC). 121 refuses to run without 120.
8. Try one ad with the network's test mode before the flag goes on; watch `cards_ad_events` (granted true/false, reason daily_cap).
