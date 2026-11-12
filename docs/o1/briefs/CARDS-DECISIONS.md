# Bunnyverse Cards: what the plan does not say (owner decisions)

Each line: the question, the default the code uses until the owner rules, and where it lives. Lanes add lines here
instead of inventing. ORCH keeps this file.

| # | Question | Default in the code | Where |
|---|---|---|---|
| 1 | Bonus packs (end of a quiz on kpopquiz.org, Kpopdle win): how many a day at most? | 3 a day (`CARDS_BONUS_PER_DAY`), counted per Paris day, and only as many as the quizzes completed and Kpopdle wins of that day | C, B |
| 2 | Order of the set numbers BV1-0001 onward | Groups A to Z, inside a group its idols (Wikidata membership order, then name) then the group cards, events last by year | D |
| 3 | "New group" lock reason: how new? | Debut in the last 24 months | D |
| 4 | "On a break" lock reason | Never set by a script (open data does not say it reliably); the owner sets it in the admin | D, U |
| 5 | Indexing of `/cards` and `/cards/binder` | noindex while the hub is private; card pages are always noindex | U |
| 6 | Report form: is a contact address asked, and how long is it kept? | Optional, kept until the report is closed, then erased | C, U |
| 7 | New analytics properties (pack source, rarity) | None added: `game_start` / `game_complete` with the existing enums | C, U |
| 8 | AdSense: publisher ID, H5 Games Ads approval, binder banner slot | Empty: the ad button stays hidden and no ad script loads | B |
| 9 | Consent banner for the EEA, the UK and Switzerland | Google's certified CMP (AdSense Privacy and messaging), set up by the owner; no ad request before consent | B |
| 10 | Flickr and DVIDS API keys for the census | Without keys the census reads Wikimedia Commons only (Commons already hosts many Korea.net, Flickr and DVIDS files with a licence review) | D |
| 11 | PWA notification "stack full" | Not built: the PWA lane does not exist yet (`docs/o1/PWA-PLAN.md` is a plan) | B |
| 12 | Membership and conviction checks: what excludes an idol? | Nothing is excluded by a script; the owner rules on each line of `out/cards-data/VERIFY-MEMBERS.md` (local only: the repository is public) | D |
| 14 | A photo below 600 px on its short side | Not auto-approved: it goes to the owner's review with the note "small" | D |
| 15 | What the group page block on kpopquiz.org shows | The group's cards (owned in colour, missing as backs), a count, a link to the binder and to the photo credits | B |
| 13 | Duplicates into shards: automatic at the pack, or only with "Recycle extras"? | Only with "Recycle extras", as in the approved prototype | C, U |
| 16 | Card files: crop the 1,200 px bucket copies, or take the same 59 Commons files at full size (no new search)? | The bucket copies (amendment 1). 41 of the 59 crops are then narrower than 640 px and flagged "too small for 2x" | D |
| 17 | "Adult subjects only" for a group photo | A group is in only when all its active members have a known birth date at least 18 years back; unknown means out | D |
| 18 | The group line of a soloist's card | The person's group from the `idols` row when it is another group (Jennie: BLACKPINK), else "Soloist" | D, U |
| 19 | Card shape | 5.5:8.5 (owner, 2026-11-12), the prototype drew 63:88 | U |
| 20 | kpopquiz.org per-fan numbers (home, group page) | Read in the browser from `GET /api/cards-bridge/me` because those pages are cached (lane B) | B |
| 21 | Analytics target for the bridges | None: `cross_promo_click` has no Cards target, a new value is the owner's call | B |
