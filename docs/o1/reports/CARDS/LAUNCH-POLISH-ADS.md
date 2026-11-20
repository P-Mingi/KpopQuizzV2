# Rewarded ads on the hub: what is built, what the owner does in AdSense

Lane ADS, lot LAUNCH-POLISH, 2026-11-20. Everything below is built and OFF. The site opens before Google approves the account: with no variable set, nothing about ads exists on any page. This file comes after `LAUNCH-PREP-ADS.md` (the signed callback path, still there, still off).

## In one minute

1. Create the AdSense account and add the site. Set ONE variable, `NEXT_PUBLIC_ADSENSE_PUB_ID`, on the hub project. The site then serves the verification meta tag and `/ads.txt`. No ad runs.
2. Wait for Google's approval. Create the rewarded ad format, set up the consent message.
3. Only then turn the two ad switches on. An ad appears behind a screen the player must accept. One ad gives one pack, three a day at most.

## The variables

All on the hub Vercel project (Production). None on the kpopquiz.org project, none on the anime project: a value there is ignored (the hub build is the only one that reads them to serve anything).

| Name | Format | Default | When |
|---|---|---|---|
| `NEXT_PUBLIC_ADSENSE_PUB_ID` | `ca-pub-` then 16 digits, exactly as AdSense shows it (Account, Settings, Account information, Publisher ID). Example shape: `ca-pub-1234567890123456` | unset: nothing served | Step 1, before asking Google to verify |
| `NET_CARDS_ADS` | `1` | off | After Google approves and the consent message is live |
| `NEXT_PUBLIC_NET_CARDS_ADS` | `1` (read at build, so redeploy after setting) | off | Same time as `NET_CARDS_ADS` |
| `NEXT_PUBLIC_CARDS_AD_PROVIDER` | `adsense` or `applixir` | `adsense` | Leave unset. `applixir` is for later and sends the player down the signed callback path (needs `NET_CARDS_AD_PACKS`, see LAUNCH-PREP-ADS.md) |
| `CARDS_AD_PACKS_PER_DAY` | whole number 0 to 20 (0 turns ad packs off) | 3 | Optional |
| `CARDS_AD_MIN_SECONDS` | whole number 5 to 120 | 15 | Optional. The shortest time between asking for the ad and being able to claim the pack. Google rewarded videos run 15 to 30 seconds, so 15 is the shortest real ad |
| `NEXT_PUBLIC_CARDS_BANNER_SLOT` | 6 to 20 digits | unset: no banner | Optional, the one banner on the binder pages |
| `NEXT_PUBLIC_CARDS_ADS_TEST` | `1` | off | Only while trying with Google's test mode |
| `NET_CARDS`, `CARDS_ADS_PER_DAY` | as before | | Unchanged. `CARDS_ADS_PER_DAY` above 0 is still needed for the ticket route |

Replaced: `NEXT_PUBLIC_CARDS_ADSENSE_CLIENT` no longer exists. One variable now serves the verification tag, `/ads.txt` and the ad script. If you had set the old name, set `NEXT_PUBLIC_ADSENSE_PUB_ID` instead.

A malformed value (a bare `pub-...`, 15 or 17 digits, a letter, a space inside) is treated as not set: no tag, `/ads.txt` answers 404, no ad.

## What to do in AdSense, in order

1. Sign up for AdSense with the site address of the hub. Copy the Publisher ID (`ca-pub-...`).
2. Set `NEXT_PUBLIC_ADSENSE_PUB_ID` on the hub project and redeploy. Check: view source of the home page of the hub and find `<meta name="google-adsense-account" content="ca-pub-...">`, and open `/ads.txt`: one line, `google.com, pub-..., DIRECT, f08c47fec0942fa0`.
3. In AdSense, Sites: add the hub domain, choose the meta tag method (or ads.txt) and ask for the review. The site must be open to the public and not behind the private launch gate while Google crawls it.
4. Wait for the approval. Nothing else is needed from the code.
5. In AdSense, create the rewarded ad. Two options, both go through the same button:
   - the rewarded ad unit of AdSense (beta), if your account has it, or
   - H5 Games ads (the Ad Placement API, `adBreak` of type reward), which the code uses today.
   The code asks Google for a rewarded ad and shows the button only when Google says one is available. Check in the AdSense console that the unit is enabled for the hub domain.
6. In AdSense, Privacy and messaging: create the consent message (European regulations, and the UK and Switzerland), with the TCF option on and the ad vendors listed. This is the ONE consent tool. Do not add any other cookie banner. Publish the message.
7. Check the three names the code could not confirm against your console (listed in `UNCONFIRMED_FOR_OWNER` of `lib/cards/ads.ts`): the attribute that marks a request as for a user under the age of consent, the test-mode attribute, and the consent script address.
8. Try one ad with test mode (`NEXT_PUBLIC_CARDS_ADS_TEST=1`) on a preview. Then set `NET_CARDS_ADS=1` and `NEXT_PUBLIC_NET_CARDS_ADS=1`, redeploy, and try one real ad with a real account of yours: press the button, read the screen, press Watch, wait, check the pack arrived.
9. Remove `NEXT_PUBLIC_CARDS_ADS_TEST`.

Until step 4 is done, leave both ad switches off. With them off: no ad script, no consent script, no button, no banner, and the ticket and claim routes answer 404.

## How an ad gives a pack

AdSense gives no server callback on the web, so the server cannot see the ad. It does this instead:

1. The player presses "Watch an ad". This opens a screen: "Watch an ad, get 1 pack", with a link to the odds of a pack (`/kpopcards/odds`). Nothing starts. "Not now" closes it.
2. The player presses "Watch the ad". The server issues a ticket (`POST /api/cards/ad/ticket`): a random single-use id, bound to the player, held in `cards_ad_tickets`. It refuses (limit) when the player already got the day's ad packs, so no ad is shown for nothing.
3. Google plays the ad. Only Google's `adViewed` event calls the claim (`POST /api/cards/ad/claim`). A dismissed ad, an error, a click, any other status calls nothing.
4. The server accepts the claim once only: the ticket must be the caller's own, at least `CARDS_AD_MIN_SECONDS` old (else answer `too_soon`, nothing spent), under 2 hours old, not used before, and within `CARDS_AD_PACKS_PER_DAY` for the Paris day. The pack is +1 in the stack (the SQL of file 121, already applied). A retry gets the first answer, never a second pack.

Honest limit: the server cannot prove the ad played, only that a ticket was asked for, waited for and not reused. A player who skips the ad in the browser can still claim a pack after the delay, up to the daily cap. A signed callback closes this: AppLixir has one, and its path (`/api/cards/ad/ssv`, `NET_CARDS_AD_PACKS`) is kept, off. Say so if you want to move to it.

The older 25-shard ad (`POST /api/cards/ad/grant`) is retired: the route answers 404 whatever the flags, because it granted on the browser's word. The SQL function `cards_ad_grant` stays in the database, unused.

## Google's rules and where each is proved

All in `src/lib/cards/ads-rules.test.ts` (one test group per rule), plus `claim.routes.test.ts` for the server.

| Rule | How it is respected |
|---|---|
| Only official rewarded formats, never a reward for a normal ad or a click | The code only asks for `type: 'reward'`. Only `adViewed` claims. The banner and the consent code have no route to a reward |
| The player chooses to watch | The screen before every ad, with the link to the odds. One yes is good for one ad |
| Never an automatic start | Probing for an ad shows nothing and asks for no ticket; the ad starts only from the Watch button of the screen |
| Packs and cards won by an ad are not tradeable or transferable | There is nothing to block: the repo has no trade, gift or transfer. Friends are codes, wish lists and a ranking. A test fails if a route or a SQL function named for a trade, gift or transfer appears, or one that takes a second player |
| No incentive outside the game | A test fails on any copy that asks to watch or click ads to support the site. The ad is offered on the Cards pages only |

## Consent and age

- One consent tool: Google's (TCF, certified message of AdSense, script from Funding Choices). A test fails if another cookie or consent vendor appears in the code. The Google message loads on every visit of an ad-enabled page; you choose in AdSense who sees it. In the EEA, the UK, Switzerland and when the country is unknown, no ad request goes out before the message has an answer.
- Personalised ads only with consent: a request is personalised only when the message says yes to purposes 1, 3 and 4. In every other case (no answer, a refusal, a partial answer, a country with no message) the request is non personalised. This costs some revenue outside Europe and is the rule you asked for.
- No general teen or child tagging. The old rule (every US and unknown-country visitor tagged child-directed) is gone.
- A player the site KNOWS to be under 18 is tagged under age and never personalised. WHAT THE SITE KNOWS: nothing. There is no birth date, no age question at sign-up and no age range in the profile or the passport (the terms ask for 15 or older and a parent's yes under 18, as a promise, not a field). So today nobody is a known minor and nobody is tagged. The code is ready (`isKnownMinor`, `knownMinor` on the ads context, the tag, the non personalised mode); `playerKnownMinor` in `lib/cards/ads-server.ts` returns false until an age exists. A test fails if a birth or age column is ever added to the profile, to remind whoever adds it to wire this. Because no age is known, tell AdSense honestly in the account that the site is general audience, and keep the consent message and the non personalised default as the protection.
- The privacy page (lane LEGAL) says the same: Google AdSense, the TCF message, personalised only with consent, never for a known minor.

## No database change

SQL file 125 is NOT needed. The claim reuses `cards_ad_tickets` and `cards_ad_pack_grant` of file 121 (already applied) with the transaction id `web:<ticket>`. Nothing for the owner to apply.
