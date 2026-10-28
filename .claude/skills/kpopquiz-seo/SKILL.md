---
name: kpopquiz-seo
description: Load before creating or changing any public, indexable page on kpopquiz.org or a sister quiz site (copy, titles, meta, schema, internal links, redirects, robots, sitemap, IndexNow, localized or data pages) so every change follows the SEO, GEO and fact-integrity rules.
---

# kpopquiz-seo: the SEO rulebook (v1, 2026-10-14)

Applies to every change that alters what Google, Bing or AI assistants can see. If a feature
request conflicts with a rule, follow the rule and say so in the PR. Workers open PRs. The
owner merges.

## 0. Owner rules (never overridden)
- Real data only. Never invent counts, activity, reviews, testimonials, users, players or opponents.
- Facts come from the allowed sources (section 5). Never scrape protected databases.
- No gossip, dating, scandal, health, family or private life of real people. Nothing
  sasaeng-adjacent. Extra care with minors.
- No lyrics. Images only if official, CC-licensed with credit, or our own.
- No bought links, link exchanges, PBNs, spam outreach or AI-spun mass pages.
- No em dashes or en dashes in user-facing copy. Short, plain sentences.
- Team accounts are labelled Team and publish only through the editorial pipeline.

## 1. One URL per query cluster
1. Before creating or retitling a page, look up the cluster in `docs/seo/TARGETS.md`. If a URL
   owns it, improve that URL. Never create a second page for the same intent.
2. A new URL needs all four: an unowned cluster; demand evidence (GSC or Bing impressions, a
   Bing AI grounding query, or a named gap in the plan); a distinct intent; a unique asset (a
   playable game, our own data, verified facts, original writing).
3. A group variant of a page type (for example /{group}-games) needs 300+ impressions in 90
   days or 30+ Copilot citations in a quarter. Otherwise it is a section of the group hub.
4. Never ship a template where only the entity name changes, or a page whose main content is a
   list of links.
5. Only the hub `/{group}-quiz` may start its title with "{Group} Quiz". A UGC quiz title that
   normalizes to "{group} quiz", "{group} test" or "quiz {group}" gets a content-derived
   qualifier in its SEO title and H1. The creator's title stays visible as a subtitle.
6. New quizzes cannot take the slugs `{group}-quiz`, `{group}-test` or `{group}-trivia`.
7. Add or update the TARGETS.md row (cluster, queries, URL, intent, language, KPI) in the same PR.

Cluster owners at v1 (TARGETS.md is the source of truth):

| Cluster | URL | Status |
|---|---|---|
| kpop quiz, quiz kpop | / | live |
| bts quiz, quiz bts, bts test | /bts-quiz | live |
| bts army test, army ranks | /q/bts-army-level-test | planned |
| bts trivia, bts trivia questions | /bts-trivia | live |
| kpop games, kpop games online | /kpop-games | planned |
| kpop generations, what gen is X | /articles/kpop-generations-explained | live |
| kpop trivia, kpop questions | /trivia | live |
| kpop test | /kpop-test | planned |
| blind test kpop | /blindtest | live |
| guess the kpop song | /guess-the-kpop-song | live |
| which {group} member are you | /which-{group}-member-are-you | live |
| sporcle kpop, name them all | /name-them-all | planned |
| kpop groups a-z | /groups | live |
| {group} quiz, {group} test | /{group}-quiz | live |
| {group} games | section of /{group}-quiz | live |
| kuis bts (id) | /id/kuis-bts | planned |

## 2. Titles, descriptions, headings
1. One primary phrase shared by the title, the H1 and the meta description.
2. Title: 60 characters or fewer including the " | KpopQuiz" suffix the layout adds. Never type
   the brand into a page title. Never cut a word.
3. Meta description: 120 to 160 characters, unique, benefit first, primary phrase once.
4. Exactly one H1. H2s are real questions or plain labels. No keyword stuffing.
5. Entity names come from the groups table name (official stylization: BTS, aespa). Never
   title-case a slug ("Bts").
6. A year in a title only if the content was reviewed that year.

## 3. Answer-first content (GEO)
AI engines lift self-contained chunks. Every indexable page:
1. Opens with a 40 to 60 word answer block in server HTML: what the page is or the answer to
   the query, one number with its date and denominator, understandable when quoted alone.
2. Answers each question H2 in its first one or two sentences, then gives detail.
3. Uses HTML tables for comparisons and for lists of 4+ items with attributes. Never an image
   of a table.
4. Hides nothing important behind tabs, click-loaded accordions, PDFs or text in images. A CSS
   spoiler is fine if the text is in the server HTML.
5. Shows "Updated {Month Year}" only after a material change, and dateModified equals it. Never
   bump dates to look fresh.
6. Server-renders the main content. No spinner shell, no client-only main content.
7. Uses no unanchored superlatives ("the best quiz ever") and no decorative symbols.
8. Links each fact to its source, next to the fact.

## 4. Numbers: one source of truth
1. Every public count (quizzes, groups, songs, plays, players, scores, percentiles) comes from
   the site stats function or the documented query for that page. Never type a number into
   copy, metadata, FAQ, JSON-LD, llms.txt, press text or pitches.
2. A number is identical in the title, meta, body, FAQ and JSON-LD of a page, and across pages
   on the same day. Rounding only through the shared helper (for example "450+").
3. Percentages and averages show the denominator and window ("54% over 3,410 attempts since May
   2026"). Floors: 100 results for distributions, 200 attempts for percentiles, 50 attempts to
   rank a quiz by difficulty. Below the floor, show "Not enough data yet".
   Owner exception (2026-10-28): the average score of one quiz shows from 30 completed plays,
   always written "X% average of N completed plays" (lib/quiz/quiz-average.ts); below 30 the
   page shows no average.
4. No fandom rankings. No "fans think" claims drawn from quiz data.

## 5. Facts and sources
1. Allowed sources: official group, label and artist sites or verified accounts; Wikidata;
   MusicBrainz; Wikipedia; Circle Chart; Billboard; bylined reputable outlets for dated events
   and for attributing debates.
2. Soompi, allkpop and similar news sites are leads. Confirm in an allowed source before use.
3. kprofiles, Fandom wikis and similar fan databases are not sources. Never scrape, copy or
   cite them. Citation over extraction.
4. Load-bearing facts (roster, member count, debut date, label, fandom name) need two agreeing
   sources, one official or Wikidata. On conflict or thin sourcing, write a vaguer true sentence.
5. A fact renders on an indexable page only if stored with status verified and a source URL,
   and the source link is visible.
6. Generation labels come from the group data, with a confidence level:
   - consensus: show the number ("3rd generation");
   - attributed: "commonly described as 5th generation (Korea Times, 2025)", only when a named
     reliable source says it;
   - contested or newest: say so, show both views, or write "newest wave".
   Every page reads the same field. The site never contradicts itself.
7. Facts derived from UGC quizzes are review candidates, never auto-published as facts.
8. Log every correction with a date in the corrections section of /editorial-policy.

## 6. Safety, legal, images
1. Members: stage name and public role. No heights, weights, relationships, "compatibility" or
   "soulmate" framing. Birth dates only for adults and only as Wikipedia shows them.
2. Minors: stage role only. No per-member stats for groups with members under 18.
3. Never headline a negative about a real person ("the forgotten member").
4. No lyrics. Song titles, albums and years only. No ripped audio in videos.
5. Images: official assets, CC-licensed with visible credit, or our own visuals. No posters,
   stills or character art of protected works unless licensed. Every img has alt text; purely
   decorative images use alt="".
6. Third-party brands are named factually only. No logos, no implied affiliation.

## 7. Structured data worth having (2026)
JSON-LD values come from the same functions as the visible text. Validate before merge.

| Type | Where | Why |
|---|---|---|
| WebSite (name, alternateName "kpopquiz.org", url) | home | site name in results |
| Organization (logo, contact, sameAs to live profiles only, founder if named) | home, /about | entity, logo |
| BreadcrumbList | every nested page | still displayed |
| Article with author Person, datePublished, dateModified | articles, data pages | trust |
| CollectionPage plus ItemList | hubs, /kpop-games, /groups | semantics for Bing and AI |
| Quiz with Question and acceptedAnswer | quiz and trivia pages | semantics only |
| MusicGroup and Person with Wikidata sameAs | hubs, trivia, which-member, generations | entity grounding |

- Never set `eduQuestionType: Flashcard` on K-pop quizzes. Google's quiz rich result is for
  education flashcards only.
- FAQPage only where a visible FAQ exists, one answer per question. Google stopped FAQ rich
  results on 7 May 2026. Never add it for search appearance.
- Do not invest in Dataset, HowTo, Practice problem or SearchAction markup.
- Fetch Wikidata IDs programmatically. Never hand-type a QID.

## 8. Internal linking
1. Every new indexable page gets 3+ contextual inbound links from relevant live pages, and links
   to its cluster owner with the exact anchor ("BTS quiz", "K-pop games").
2. UGC quizzes link to their hub with "{Group} quiz", trivia with "{Group} trivia", blind tests
   with "{Group} blind test".
3. A new game type is added to /kpop-games and the main nav the day it ships.
4. No orphans: the orphan check must pass.

## 9. Indexing controls
1. Indexable by default: hubs, quizzes, games, trivia, articles, data pages, reviewed localized
   pages.
2. Noindex allowlist: search, create, login, profile, settings, onboarding, admin, auth, embeds,
   daily leaderboards, profiles under the threshold, unreviewed translations, empty hubs,
   unbounded facets. Any other noindex needs a written reason in the PR.
3. Missing content returns a real 404 (410 when removed with no successor). Never a 200 page
   that says "not found".
4. Redirects: 301 to the exact successor. Never many specific URLs to one generic page. No
   chains. A slug change always ships with its 301.
5. Canonical: self by default. Parameter variants point to the clean URL.
6. The sitemap lists only final, 200, indexable, canonical URLs, with lastmod from real content
   dates, never from play counts.
7. robots.txt never blocks CSS, JS or OG image paths a renderer needs. Googlebot, Bingbot,
   OAI-SearchBot and PerplexityBot stay allowed.

## 10. Localization and hreflang
1. A language gets pages only when all three hold: demand (3,000+ impressions in 90 days on its
   queries, or 50+ Copilot citations in a quarter), a native reviewer, and 3+ native quizzes.
   Indonesian is first. Any other language needs the owner's go.
2. Localize the product, not only the copy: the language-neutral blind test first, native
   quizzes, native title, H1, intro, FAQ and chrome (nav, footer).
3. AI may draft. A native reviewer approves (reviewed_by, reviewed_at). Until then the page is
   noindex and out of the sitemap. Never index raw machine translation. Never auto-translate UGC.
4. Slugs and titles use real local queries ("kuis bts"), not literal translations.
5. hreflang: reciprocal between true equivalents only, plus x-default; each page canonical to
   itself; html lang and content-language set; no IP redirects, a language switcher only.

## 11. Freshness, IndexNow, sitemap duties
1. Never call IndexNow directly from feature code. Write affected URLs to the IndexNow outbox.
   DB triggers cover data changes; the post-deploy diff covers code-defined pages. Until the
   outbox exists, use the shared helper in lib/seo.
2. Submit added, changed and removed URLs. Never resubmit unchanged URLs. Play counts and other
   volatile counters never trigger a submission.
3. A new page type ships with its sitemap entry, TARGETS.md row, outbox enqueue and inbound links.
4. The IndexNow key file stays reachable at the root: 200, text/plain, body equal to the key.

## 12. Trust pages (E-E-A-T)
1. /about names a real person (the owner decides the level of detail), the mission, how content
   is made, the Team accounts, live numbers and a contact.
2. /editorial-policy covers creation, moderation, source tiers, generation labels, AI assistance
   (AI drafts, humans review), image policy and a dated corrections log.
3. /press holds live numbers, the founder bio, contact, logo pack, licences and method links.
4. Articles and data pages carry a named author byline that links to /about.
5. Any comparison that includes our site says we run it, shows the criteria, and does not rank
   us first by default. Every listed site is checked live.
6. Data pages show "How to cite" and CC BY 4.0: "credit kpopquiz.org; a link is appreciated;
   nofollow is fine".

## 13. Links, embeds, outreach
1. Embed attribution: a visible link outside the iframe, anchor "Quiz: {Title} on kpopquiz.org".
   Never keyword anchors, never hidden, never required by terms. Partners may nofollow it.
2. Never ask for links in footers, sidebars or blogrolls.
3. Outreach is drafted by the AI and sent by a human: personal, 15 a day at most, one follow-up.
4. Never buy links, guest posts or "dofollow PR". Never add our own links to Wikipedia.
5. A URL that earned a link is on the linked-URL guard list. It must keep a 200 or a 301.
6. Off-site, the brand is written "kpopquiz.org".

## 14. Pre-merge checklist (paste the results in the PR)
- [ ] TARGETS.md checked; row added or updated.
- [ ] Title 60 or fewer with suffix; description 120 to 160; one H1; same primary phrase.
- [ ] Answer block of 40 to 60 words in server HTML; question H2s answered first.
- [ ] Every number from the stats source; same value everywhere on the page.
- [ ] Every fact verified with a visible source; generation labels from the group data.
- [ ] No lyrics, no unlicensed image, alt on every image, nothing about private life.
- [ ] JSON-LD parses and matches visible values; no Flashcard; no new FAQPage for looks.
- [ ] Canonical, robots and sitemap correct; redirects exact; no unexplained noindex.
- [ ] 3+ contextual inbound links; orphan check passes.
- [ ] IndexNow outbox enqueue confirmed, or listed for the post-deploy diff.
- [ ] No em or en dashes in user-facing copy.
- [ ] Repo checks pass with production flags on (NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1):
      tsc --noEmit, unit tests, next build, check:routes, check:sitemap-hygiene,
      check:metadata-dupes, check:orphans, check:indexability, and every nightly SEO gate that
      exists in the repo.
- [ ] PR body: what changes for search, word counts before and after, owner clicks needed.
- [ ] Not merged. The owner merges.

## 15. Forbidden
- A second page for an owned cluster. Doorway or near-duplicate template pages.
- Typed or estimated public numbers. Fake activity, reviews, users or players.
- Facts from kprofiles, Fandom or any scraped database. Unsourced facts on indexable pages.
- Indexed machine translation without native review. hreflang to non-equivalent pages.
- Off-topic pages on a topical site (anime on kpopquiz.org, "Bing homepage quiz" answers).
- Bumped dates, keyword-stuffed anchors, hidden text or links, cloaking.
- Redirecting many URLs to the home page or a generic list.
- Markup that does not match the page, or FAQPage and Flashcard markup for looks.
- Link schemes of any kind, mass directory submissions, self-links on Wikipedia.
- Team accounts posting in community spaces as if they were fans.

## 16. Sister sites
Each site in the site registry has its own TARGETS.md, brand suffix, IndexNow key, WebSite and
Organization markup, sitemap, and Search Console and Bing properties. These rules apply
unchanged: replace "K-pop" with the site's topic and use that topic's official and open sources
(official studio or publisher sites, Wikidata, Wikipedia). Sister sites link to each other only
contextually and from the network page, never in site-wide footers. Never move content between
sites without 301s and the owner's go.
