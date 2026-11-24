# Bunnyverse network: authority, entity, GEO, off-page (agent 4, 2026-11-23)

Base: main f570abc, read only. Paths are under `apps/quiz/src/` unless they start with `docs/` or `.github/`. [U] marks anything unverified.
Not in git history: `docs/strategy/2026-10-SEO-PLAN.md`, `2026-10-MULTI-NICHE.md` (cited by the rulebook and TARGETS.md:9).

**Live state on 2026-11-23 (WebFetch).** bunnyverse.org serves the full hub with `index, follow`. Its sitemap index lists `sitemap-hub.xml` (11 URLs) and `/anime/sitemap.xml`, which root-files.ts:119-130 does only with `NET_INDEXING=1`, so the hub is effectively open [U: header, GSC]. The IndexNow key file answers. On kpopquiz.org the switcher is live, the footer has no network line, there is no home Kpopdle module, and /daily redirects to a quiz.

## 1. Findings

| # | Finding | Where | Sev |
|---|---|---|---|
| F1 | A **site-wide followed footer link** kpopquiz.org to bunnyverse.org is built, allowlisted, and planned "=1" in ENV. This breaks rule 16. It is off live. | docs/o1/contracts/link-allowlist.md:29; components/network/net-footer-line.tsx:8-15; components/layout/ux-v1/ux-footer.tsx:33,140; docs/launch/o1/ENV.md:44 | P0 |
| F2 | UI bridges (switcher, KpopCards button, Binder, Collection, Cards blocks) are nofollow, robots-blocked `/auth/passport/out` jumps. No equity, no scheme: compliant. | lib/site-switch/model.ts:32; components/site-switch/site-switch.tsx:110; components/cards-bridge/nav-bridges.tsx:14; app/robots.ts:25 | ok |
| F3 | Followed editorial links: home module (2), group-hub card (1 per hub), quiz-end row. The quiz-end row renders only on the client results screen, so /q/ pages carry no crawlable link. Brand anchors. | components/home/ux-v1/kpopdle-home.tsx:84,98; components/group/ux-v1/kpopdle-group.tsx:49; components/quiz/ux-v1/quiz-end-bridge.tsx:31; results.tsx:283 | ok |
| F4 | No `parentOrganization` or `@id` anywhere; hub Organization has no founder; hub logo copies kpopquiz's (D-099); all three sites use `hello@kpopquiz.org`. | lib/seo/org.ts:33-45; lib/site/jsonld.ts:47-58; lib/site/registry.ts:20,330-333 | P1 |
| F5 | OtakuQuiz WebSite JSON-LD says "played by thousands" on a site launched today, plus a SearchAction (rules 0, 4.1, 7). | app/sites/[site]/home-anime.tsx:258-273 | P0 |
| F6 | OtakuQuiz's WebSite url is `bunnyverse.org/anime`. Google: "does not support site names at the subdirectory level", so /anime results show the hub's site name. | registry.ts:185,239-242 | info |
| F7 | Hub llms.txt is stale: live it says "It holds no quiz of its own", omits Kpopdle, Otakudle, /daily and KpopCards, never names kpopquiz.org. kpopquiz.org's never names Bunnyverse. OtakuQuiz's "Every quiz is written by a fan" conflicts with the "OtakuQuiz Team" byline [U]. | lib/site/root-files.ts:213-235; lib/seo/llms.ts:57-60; docs/o1/LAUNCH-RUNBOOK.md:100 | P0 |
| F8 | Hub has /privacy, /legal, /terms, /contact, /dmca, /credits; no /about, /editorial-policy, /press. kpopquiz.org /about and /press never mention Bunnyverse. OtakuQuiz /about says "artist, label or agency". | registry.ts:309-311; components/hub/home/home-footer.tsx:2-4; app/sites/[site]/(anime)/about/page.tsx:131 | P1 |
| F9 | Cannibalization traps: kpopquiz.org/daily title and H1 "Daily K-pop quiz, blindtest and Kpopdle" plus a non-allowlisted hub link (flag off). /kpopdle shares "Guess the K-pop Idol" with kpopquiz.org/guess-the-kpop-idol ("guess the kpop idol by picture": 44 impressions, position 5.8). No TARGETS.md /daily row ("daily kpop quiz": 6 impressions). | lib/daily-hub.ts:7; app/(site)/daily/page.tsx:63,74; docs/refonte/gsc/Requetes.csv | P1 |
| F10 | The IndexNow workflow posts only to kpopquiz.org, so bunnyverse.org pages never get pushed. | .github/workflows/indexnow.yml:34,52,55 | P0 |
| F11 | OtakuQuiz has no TARGETS file (rule 16 requires one per registry site). | docs/seo/ | P1 |
| F12 | Every KpopCards page is noindex and Cards has no TARGETS row, so "kpop photocard game" has no landing. | app/sites/[site]/(hub)/kpopcards/page.tsx:14 | P2 |
| F13 | Name collisions: "Kpopdle" is also kpopdle.app and kpopdle.pandarr.games (kwavearcade: a "crowded name"); "Bunnyverse" is shared with an itch.io profile and a Psycho Bunny campaign; "kpopverse" has 10 impressions on kpopquiz.org (KpopVerse, r/Kpop_Verse). | web search; Requetes.csv | info |
| F14 | Hub links to kpopquiz.org carry query strings (`?daily=quiz`, `?daily=true`), which the contract forbids. Canonicals cover it. | live hub home; link-allowlist.md:15 | P2 |

## 2. Compliant link plan, kpopquiz.org to bunnyverse.org

Authority passes only through followed, server-HTML links from strong pages: the kpopquiz.org home (722 clicks over 3 months) and the group hubs. Add entity ties and real referral traffic on top. Never use a redirect, a cross-domain canonical, or moved content.

| Id | Placement | Target | Anchor | Volume | Status |
|---|---|---|---|---|---|
| L1 | Home "Daily game" module | /kpopdle, /daily | "Play Kpopdle", "All daily games" | 2 on 1 page | built (NET_KPOPDLE_HOME) |
| L2 | Group hub card | /kpopdle | "Play Kpopdle" | 1 per hub; raise the floor from 1 to 3 pool members, since "1 member of X" is thin | built (NET_KPOPDLE_GROUP) |
| L3 | /kpop-games, game card (rule 8.3) | /kpopdle | "Kpopdle" | 1 | new; needs a CR row |
| L4 | /about, "Who runs" paragraph: "kpopquiz.org is part of Bunnyverse..." | / | "Bunnyverse" | 1 | new; retarget row `about-kpop` from anime to hub |
| L5 | /press, network line | / | "bunnyverse.org" | 1 | new |
| L6 | One Team article: how Kpopdle picks idols and sources clues | /kpopdle | "Kpopdle" | 1 | row `team-article` exists, path null |
| L7 | Quiz-end row | /kpopdle | "Kpopdle" | client only | keep for UX |

Never do these: the footer line (F1); followed nav links; any followed kpopquiz.org link to /anime or Otakudle (anime is off-topic there, rule 15); keyword anchors such as "kpop wordle"; links to the noindex /kpopcards. The total stays at about 6 pages plus the qualifying group hubs. The reverse direction (hub home to kpopquiz.org quizzes, and /kpopdle "yesterday's idol" to `/{group}-quiz`) is the network page and context, so it complies. Keep it.

## 3. Entity and markup plan

- **Hub Organization** (`@id https://bunnyverse.org/#organization`): name Bunnyverse, alternateName bunnyverse.org, own logo (from RabbitMark/HubWordmark), founder `{@id https://kpopquiz.org/about#founder}`, `subOrganization` KpopQuiz and OtakuQuiz. sameAs only for live Bunnyverse profiles (none yet).
- **KpopQuiz Organization**: add `@id` and `parentOrganization {@id hub}`; keep its sameAs; add `youtube.com/@kpopquizorg` once confirmed live [U]. Never sameAs between the organizations.
- **OtakuQuiz**: Organization with `parentOrganization {@id hub}`. Its WebSite drops the SearchAction and the typed claim, and adds a publisher reference.
- **Daily games** (lib/dle/seo.ts:134): replace the inline publisher with `{@id hub}`.
- **Site name**: the hub WebSite is on the home (components/hub/home/home-page.tsx:102). Expect "Bunnyverse" in results; OtakuQuiz stays as the title suffix. Check FOUNDER.name (org.ts:20) against the public name the owner uses on YouTube, Reddit and in press (the brief calls him Mingi).
- **Hub llms.txt**: a one-line definition; the daily games (/daily, /kpopdle, /otakudle and its series pages); OtakuQuiz (/anime); KpopCards (/kpopcards/odds); "run by the founder of kpopquiz.org (sister site)"; sources and policies. No typed numbers.
- **kpopquiz.org llms.txt**: add one About line naming bunnyverse.org as the sister site for Kpopdle. No anime.
- **Trust pages (rule 12)**: /about (person, mission, how the games are made, pool rules, sources, Team, live numbers, contact); /editorial-policy (dle sourcing, CC photo credits, odds, AI drafts with human review, corrections log); /press (bio, logo pack, live numbers, licences, contact). Link them from the hub footer.

## 4. /anime on a K-pop-leaning domain

Pros: one domain builds authority for both topics, and the declared topic ("K-pop and anime fans" in title, H1, answer block) makes anime on-topic here; rule 15 targets anime on kpopquiz.org. Cons: site-level signals average two audiences, /anime has no site name, anime intent splits between /otakudle and /anime/*. Keep it clean:
- Keep the two sitemaps (live). Create `docs/seo/TARGETS-otakuquiz.md` (boundary: TARGETS-bunnyverse.md:39-40).
- Add a GSC URL-prefix property for `https://bunnyverse.org/anime/`; filter by /kpopdle, /otakudle, /anime/.
- Keep link graphs apart: K-pop hub pages link to kpopquiz.org; anime pages link to /anime and /otakudle. Cross-topic links stay in the switcher.
- The hub index points at `/anime/sitemap.xml`, which has no closed-state guard (LAUNCH-RUNBOOK.md:73): watch anime deploys.

## 5. GEO plan

What ranks now (US web search, 2026-11-23; real AI answers not sampled [U]):

| Query | What ranks now |
|---|---|
| kpop daily game | K-pop Heardle explainers and answer posts (Sportskeeda, Power Up Gaming), apps |
| kpop wordle | 2022 BTS Heardle news (Billboard, NME, The National); listicles (Sportskeeda "10 K-pop Heardle", Nerds Chalk "19 top k pop heardles") |
| kpopdle | kpopdle.app, kpopdle.pandarr.games, alldle.net, kwavearcade.com, plus idoldle.com, kpopidle.com and kpopit.net nearby |
| kpop photocard game | apps (Pocamarket), physical cards, VICE and SCMP explainers. No free web game: open space, but Cards has no page (F12). |

Actions:
1. /kpopdle already opens with "Kpopdle is a free daily K-pop idol guessing game by Bunnyverse." Add an HTML table of the 8 clues, the pool rule, sources beside facts, and one disambiguation line (not affiliated with same-name games).
2. Bing Webmaster (import from GSC, sitemap, Copilot citations), which feeds Copilot and ChatGPT search. One-time IndexNow push of the 11 hub URLs and /anime hubs via the shared helper, then add bunnyverse.org to the workflow.
3. robots.txt allows OAI-SearchBot, PerplexityBot, Googlebot: keep it.
4. Wikidata only after 2+ independent reliable articles (check at day 90). No Wikipedia self-edits.
5. Get onto the lists AI engines quote (section 6).

## 6. Off-page, 30/60/90 (human-sent, at most 15 a day, one follow-up)

- **Days 1-30.**
  - YouTube: channel links to both domains. Shorts description links are not clickable, so put the address on screen (Stan Check keeps kpopquiz.org). New "Kpopdle in 3 clues" Shorts show bunnyverse.org/kpopdle, with yesterday's idol only. A weekly long-form "full quiz" video links the exact quiz; every Short links to it as its related video.
  - r/Kpop_Verse: owner-labelled daily Kpopdle thread (answer spoiler-tagged) and a weekly Cards pulls thread; the sidebar names both domains. No posing as a fan (rule 15); other subreddits only within their self-promo rules [U].
  - Discord: a #kpopdle channel for share results. The share text carries the URL (lib/dle/share.ts:22).
  - Directories: at most 5 that already list K-pop dle games (dlegames.org/submit, wordlealternative.com, alldle.net [U], kwavearcade). No mass submissions (rule 15).
- **Days 31-60.** Offer Kpopdle as an update to the authors of the Sportskeeda, Nerds Chalk and Dot Esports lists, plus fan blogs and newsletters. Offer embeds with a visible "Kpopdle on bunnyverse.org" link and no keyword anchor. Partners may nofollow it.
- **Days 61-90.** A data story from real plays above the floors (most-found idols, with denominators), pitched to fan media; the Wikidata check; the KpopCards explainer decision.

## 7. Measurement

| Area | KPI | Source | Base | Day 90 [E] |
|---|---|---|---|---|
| Brand | "bunnyverse" impressions, position, site name shown | GSC domain | 0 | position 1 |
| Games | impressions and clicks for kpopdle, otakudle, kpop wordle, guess the kpop idol daily | GSC, Bing | 0 | kpopdle top 10; "kpopdle bunnyverse" position 1 |
| OtakuQuiz | /anime/ impressions; series hubs indexed | GSC prefix | 0 | 80% of sitemap indexed |
| Cards | referrals kpopquiz.org to /kpopcards; "kpopcards" query | beacon, GSC | 0 | grow (no search KPI while noindex) |
| Guard | kpopquiz.org clicks over 28 days; "kpop quiz" position (9.57); owner URLs unchanged | GSC kpopquiz | Jun-Sep export | no drop above 10% |
| AI | Copilot citations; monthly 10-prompt panel (ChatGPT, Perplexity, Gemini, Copilot) | Bing, manual | 0 | cited for "kpop wordle" |

**First 2 weeks.** No `X-Robots-Tag`; sitemap index fetched (Google, Bing); URL Inspection on /, /daily, /kpopdle, /otakudle, /anime and two series hubs; crawl stats 5xx on /anime; `?r=` share URLs canonicalized; in kpopquiz.org GSC, which URL ranks for "kpopdle", "guess the kpop idol", "kpop games", "daily kpop quiz"; any "kpop quiz" impressions on the hub home; referral clicks after step C.

## 8. Actions

**P0 (now, the hub is open).**
1. Never set NEXT_PUBLIC_NET_FOOTER on kpopquiz. Drop `kpop` from the `footer` row and fix ENV.md:44.
2. Remove "played by thousands" and the SearchAction (home-anime.tsx:265-272).
3. Rewrite the hub llms.txt and verify the OtakuQuiz "written by a fan" line.
4. GSC: submit the sitemap and inspect the key URLs. Add Bing.
5. One-time IndexNow push for bunnyverse.org.

**P1 (month 1).**
1. /about, /editorial-policy and /press on the hub.
2. The `@id` graph with parentOrganization and an own logo.
3. TARGETS-otakuquiz.md and a TARGETS.md /daily row.
4. L3 to L6 with their CRs.
5. Raise the group-card floor.
6. Retitle daily-hub.ts:7 before DAILY_HUB goes on.
7. IndexNow workflow for bunnyverse.org.
8. OtakuQuiz about wording.
9. YouTube in sameAs [U].

**P2.**
1. KpopCards explainer page (owner decision plus a TARGETS row; card pages stay noindex, rule 1.4).
2. Wikidata at day 90.
3. Strip query strings from cross-site links.
4. A hello@bunnyverse.org mailbox.
5. Data-story press.
6. Refresh link-allowlist.md, which still names otakuquiz.org and fanquiz.org.

Sources: developers.google.com/structured-data/site-name; techcrunch.com/2023/08/10/youtube-is-disabling-links-on-shorts-to-cut-down-on-spam; kwavearcade.com/games/kpopdle.html; dlegames.org; sportskeeda.com/pop-culture/10-k-pop-heardle-know.
