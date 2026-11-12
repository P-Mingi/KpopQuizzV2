# Bunnyverse Cards: product plan v3 (6 November 2026)

Copied from the owner-approved prototype artifact "Bunnyverse Cards" (claude.ai, version 1793986746-dee7). The prototype itself is in bunnyverse-cards-prototype-v4.html next to this file: its card design is approved as is.
Product plan · version 3 · 6 November 2026

# Bunnyverse Cards: rules, catalog, credits and money
This version follows your review: light mode on the kpopquiz.org kit, the real Bunnyverse logo on the pack and the card back, no daily gift, the biggest catalog at launch, no age question, and credits on every card. The card design itself is unchanged.

## The loop
| Rule | Setting |
|---|---|
| Stack | Up to 5 packs. No daily gift and nothing to claim |
| Refill | 1 pack every 10 minutes while the stack is under 5 (empty to full in 50 minutes) |
| Midnight | At 00:00 Paris time the stack is topped up to 5 and the ad counter starts again |
| Ads | A rewarded ad opens a pack straight away. Up to 10 a day (a setting). No ad available: the button hides and only the timer shows |
| Shards | Duplicates become shards (Common 1, Uncommon 2, Rare 5, Super Rare 12, Ultra Rare 30, Legendary 80). 50 shards open a pack straight away |
| Pack | 5 cards. The fifth is Uncommon or better. Odds are shown on the page |
| Card | Stage name, group, debut year, edition, set number. Photo credit and licence on the back and under the card in its detail view |
| Binder | Two views: pages of 9 pockets, one group per run of pages, or a flat grid of 36 cards a page with a sort (rarity, number, newest). Filters by type, rarity, owned, missing or favorites, search, completion count. A star on any owned card marks it as a favorite |
| Not now | Trading, quiz duels, agency cards. No age question |

## Rarity and photos
Every idol exists in up to six editions with the same odds for everyone. Four editions reuse the first photo with a different finish, so an idol needs 1 free photo for 4 cards, 2 for 5 and 3 for all 6.
| Edition | Rarity | Photo | Odds |
|---|---|---|---|
| Standard | Common | Photo 1, silver keyline | 60% |
| Stage | Uncommon | Photo 1, spotlight beams | 24% |
| Holo | Rare | Photo 1, rainbow film that moves with the card | 10% |
| Era | Super Rare | Photo 2, from another event | 4.5% |
| Gold | Ultra Rare | Photo 1, gold foil frame | 1.2% |
| Full Art | Legendary | Photo 3, full bleed, rainbow edge | 0.3% |

When an edition can't exist yet, the binder shows a locked pocket and the card page says why, in one of five sentences: only one free photo so far; all free photos come from the same day; new group; on a break; only in group shots.

## Catalog at launch: the high case
| Part | Count | Cards |
|---|---|---|
| Idols (adults, current members, at least 1 free photo) | about 1,200 | about 6,400 |
| Groups with a free photo (4 editions each) | about 500 | about 2,000 |
| Events with a free stage or venue photo (3 editions) | about 100 | about 300 |
| Total |  | about 8,700 |

What the high case takes before launch:
- A data run beyond your idol table: names, birth dates, current memberships and Wikidata IDs for about 1,200 idols, then about 7 hours of membership and conviction checks.
- The photo census on your Mac (O1 has the spec): every idol, group and event, free licences only, one edition count per idol.
- Photo approval: about 3,400 photos. Photos whose licence the script verifies (CC0, public domain, CC BY, CC BY-SA, KOGL Type 1, named author, no deletion request) are approved automatically; you review only the 15 to 20% it flags, about 2.5 hours.
- Card numbers become four digits (BV1-0001 to BV1-8700). This prototype holds a sample of 557 cards.

## Credits, done properly
Google reviews ad sites built on photos of real people more closely, and the licences require attribution, so every photo is credited in four places:
- On the card back: "Photo by [author], CC BY-SA 4.0, via Wikimedia Commons, cropped", with the photo's number for that idol.
- Under the card in its detail view, visible without flipping, with links to the author, the source page and the licence.
- On /credits: every photo used, with a thumbnail, the card names, author, licence, source link and what was changed (cropped, frame and text added). Linked from the footer of every Cards page.
- "Report a photo" next to every credit: a short form for the person shown, the photographer or an agency. Removal within 48 hours, card retired from packs.
A card made from a CC BY-SA photo is itself shared under CC BY-SA, and the credit says so. The admin keeps, per photo: source page, file, author, licence and its link, the date checked, the event and date, and the crop.

## Where the free photos come from
| Source | Licence | What it adds |
|---|---|---|
| Wikimedia Commons | CC BY, CC BY-SA, CC0, PD | The base for every idol. Big stars have hundreds of files |
| YouTube press channels (K-POPIT, Marie Claire Korea, NewsInsta, NINE STARS) | CC BY | The largest source for mid-tier idols. A still is credited "screenshot, cropped" |
| Korea.net on Flickr | CC BY-SA 2.0 | 891 photos in its K-pop album. Flag captions that say "news only" |
| Flickr photographers | CC BY, BY-SA | Mostly Western concerts |
| US military (DVIDS) | Public domain | Concerts for troops |
| Unsplash, Pexels, Pixabay | Their own | Not usable for named idols |

## Ads: the honest numbers
| Traffic | Ad money a month |
|---|---|
| Today, about 205 players a day | $4 to $118, most likely about $30 |
| 20 times today's traffic | about $550 (middle case) |

- Start with AdSense H5 Games Ads (Google's rewarded ads for web games). Ad Manager rewarded comes later through a partner, around 500,000 visitors a month.
- Rewarded web video pays about $8 to $15 per 1,000 views in the US, UK, Canada and Germany, $2 to $5 elsewhere. Banners pay $0.50 to $2.
- Placement: "Watch an ad" when the stack is empty or any time from the side panel, one ad for one pack, up to 10 a day. One banner on binder pages only.
- Safety: the server issues a single-use ticket before the ad and grants the pack only on Google's "rewarded" event. A consent banner for Europe, the UK and Switzerland.
- No age question (decided). So ad requests from the US go out marked child-directed: lower pay in the US, much lower risk under US children's privacy law, which counts "celebrities who appeal to children" as a sign a site is for kids. Everywhere else, ads run normally.

## Where it lives, and the bridges
- bunnyverse.org/cards , with the collection in the passport. Ads run here only; kpopquiz.org stays ad-free because of Deezer's terms.
- kpopquiz.org home: a "Your packs" block with the stack and the timer.
- Group pages: "BLACKPINK cards" with the group's cards, owned or missing.
- End of a quiz and Kpopdle win: +1 pack, opened on Bunnyverse.
- Profile menu and passport: a Binder link and a Collection section.

## Build order for O1
- Census and candidates: the exact photo census and the data run for the high case, with candidates in the images admin.
- Generator and database: the card list as an SQL file you apply, the wallet (stack of 5, refill every 10 minutes, top-up at midnight Paris), packs opened, shards, and one server function that draws with the published odds.
- Pages: /cards, /cards/binder, one page per card (not indexed), /credits and the report form.
- Bridges on kpopquiz.org and the passport.
- Ads: H5 Games Ads, the consent banner, server-side grant, US child-directed setting.
- Push with the PWA lane: one notification when the stack is full, offered after the first pack.

## Risks
| Risk | Level | Note |
|---|---|---|
| Image rights of the idols | Medium | Free licences cover the photographer's copyright, not the idol's own image rights. Commons marks these photos with a "personality rights" warning: using a recognisable person in something commercial may still need their consent, and Korea's 2022 law protects a celebrity's likeness. Free photos make the risk much lower than press photos, not zero. The report form and 48-hour removal are the answer. |
| Children and ads | Medium | No age question, so US ad requests go out child-directed. |
| Ad approval | Medium | Google may refuse sites built on photos of real people. Visible credits, licences and the /credits page are what reviewers look for. |
| Deezer | Low | As long as no ads appear on kpopquiz.org. |

Research, not legal advice. Sources: WikiMasters press coverage; DBpedia; Wikipedia; Wikimedia Commons categories and its personality rights guideline; Korea.net Flickr; Google AdSense and Ad Manager help; AppLixir, Playwire and Raptive requirements; eCPM benchmarks; FTC COPPA rule (16 CFR 312.2); Korea's Unfair Competition Prevention Act coverage.