# Workstream S - SEO / GEO / Marketing: become the K-pop quiz leader

Status: strategy (not yet a build workstream). Owner-facing. Data as of 2026-07-22.

## The one-sentence diagnosis

kpopquiz.org **already ranks on relevance** (bts-quiz alone pulls ~448K Bing
impressions) but has **almost no domain authority** (trust ~2/100, ~1 backlink
site-wide). We are a strong page on a weak domain. Every growth lever flows from
that: the ceiling is not our content, it is our trust and our click-through.

## The numbers that set the strategy (Bing, last 6 months)

| Signal | Value | Read |
|---|---|---|
| bts-quiz | 447.9K impr / 2.5K clicks | CTR ~0.56%. We are shown constantly, rarely clicked. |
| Homepage | 107.6K impr / 1.1K clicks | Same story, brand query + generic. |
| Site total | 571.7K impr / 4.9K clicks | ~0.86% CTR overall. |
| Backlinks | ~1 total | This is the whole game. |
| Domain / page trust | ~2/100 | Ranking DESPITE this = huge unrealized ceiling. |
| Indexed URLs | 797 | Programmatic pages work; long tail is thin. |

Two facts matter most:
1. **We rank without authority.** If a 2/100 domain earns 448K impressions on one
   page, moving trust to even 15-20/100 could multiply traffic several times over
   with zero new content.
2. **Our CTR is ~0.6%.** We are leaving most of our own impressions on the table.
   Doubling CTR is a faster win than doubling rankings.

## Strategy: five pillars, ranked by leverage

### Pillar 1 - Domain trust / backlinks (THE lever, do first)

We have the traffic that proves demand; we lack the links that unlock scale.
Fastest honest ways to earn links in the K-pop niche:

- **Data-driven PR ("linkbait").** We sit on unique first-party data: which
  fandom is "winning the week" (war map), most-played groups, hardest quizzes,
  average scores, duel results ("fans voted X the ultimate K-pop girl, 1.7K
  votes"). Package these as shareable stat stories / an annual "K-pop Fan Report"
  that music blogs, allkpop, Koreaboo, and fan accounts cite and link. This is
  the single highest-ROI move: press links to data they cannot get elsewhere.
- **The Fan Card as a link + traffic engine (F2c).** Every shared Fan Card
  carries `kpopquiz.org/u/{username}`. Make it beautiful (re-prototype in flight)
  and frictionless to share; fans posting cards on Twitter/TikTok/Discord is
  organic reach and referral traffic that compounds.
- **Embeddable widgets.** A "quiz of the day" or "how well do you know {group}"
  embed that fan blogs / Tumblr / Amino can drop in, each carrying a followed
  link back. Low effort once built, links accrue passively.
- **Community seeding, done right.** r/kpop and group subreddits, Twitter/X fan
  accounts, Discords. Not spam: genuinely useful posts (a hard BTS quiz, the
  weekly fandom war result). One viral Reddit post on a group sub can outrank
  months of on-page work.
- **Reference-grade citations.** Fandom wikis, "best K-pop quiz sites" listicles,
  Wikipedia-adjacent references. Reach out to existing "best kpop quiz" list
  authors (they exist and rank) to be added.
- **HARO / journalist requests** for K-pop / music / fandom stories, offering our
  data as the quotable source.

Skills to execute this pillar: `deep-research` (find the exact blogs / list
authors / journalists to pitch), `searchfit-seo:ai-visibility` (see who already
links competitors), and the outreach playbook already in `docs/`.

### Pillar 2 - CTR optimization (fastest traffic, low effort)

We are shown 571K times/6mo at ~0.86% CTR. Levers:

- **Rich results.** Add Quiz / FAQ / HowTo structured data so our snippets show
  star-adjacent widgets and take more SERP real estate. (`searchfit-seo:schema-markup`.)
- **Title + description testing.** The Bing fixes (done) lengthen thin
  descriptions and cap long titles; next, iterate the highest-impression pages
  (bts-quiz, homepage) toward click-earning copy ("Only 3% of ARMY score 10/10").
- **Numbers and stakes in titles.** Social proof ("2.5K fans played") and a
  challenge frame consistently lift CTR for quiz content.

### Pillar 3 - GEO (get cited by AI answer engines)

Increasingly, "best K-pop quiz" and "how well do you know BTS" are answered by
ChatGPT / Gemini / Perplexity, not ten blue links. To be the cited source:

- Authoritative, well-structured answer content on the group hubs (clear
  headings, factual trivia, schema) so LLMs extract and attribute us.
- Be present where LLMs ground: Reddit, Wikipedia, high-authority listicles
  (overlaps with Pillar 1).
- Track and improve AI mentions with `searchfit-seo:ai-visibility` (GEO/AEO).

### Pillar 4 - Content depth + programmatic scale

The group-page machine works; extend and strengthen it:

- **Fix thin pages.** Individual-idol pages (jimin-quiz, taeyeon-quiz) get ~0
  traffic - either enrich them (real questions, member facts) or consolidate.
- **New page types that match search demand:** era/comeback quizzes, discography
  quizzes, "guess the song", member-bias quizzes, debut-year quizzes. Each is a
  new indexable long-tail surface.
- **Internal linking.** Tighten hub-and-spoke so authority flows from bts-quiz
  (our strongest page) into weaker group and trivia pages.
  (`searchfit-seo:internal-linking`.)
- **Trivia format is underperforming** (bts-trivia 169 impr vs bts-quiz 448K).
  Either upgrade trivia to earn its own demand or lean harder into quizzes.

### Pillar 5 - Retention loops (indirect SEO + LTV)

Already largely built (F2a community, F2b debate/cheers, F2c Fan Card, daily
quiz + streaks). These matter for SEO indirectly: engagement signals, return
visits, and shareable artifacts (Fan Card) that generate the Pillar-1 links.
Keep the daily loop sticky and the share surfaces frictionless.

## Sequencing (highest ROI first)

1. **Ship the on-page Bing fixes** (descriptions + titles) - DONE.
2. **Schema markup** (Quiz/FAQ) on group + quiz pages - CTR + GEO, one build.
3. **Fan Card re-prototype** (in flight) - make the share artifact worth sharing.
4. **Data-PR engine**: turn our first-party data into a monthly "Fandom Report"
   + pitch list. This is the backlink flywheel.
5. **Embeddable widget** for fan blogs.
6. **Community seeding cadence** (weekly war-map result, hard quizzes) on Reddit /
   Twitter / Discord.
7. **Content depth**: era/song/member quiz types + fix thin idol pages.
8. **GEO tracking + iteration** with ai-visibility.

## What NOT to do

- Do not buy links or spam communities - a 2/100 domain gets penalized fast and
  the K-pop fandom is ruthless about inauthentic accounts.
- Do not fabricate stats for PR - our real data is the moat; keep it real.
- Do not chase every group with a thin page; depth on the ranking groups beats
  breadth on dead ones.

## Definition of "leader"

Domain trust 2 -> 20+/100, backlinks 1 -> 100+ referring domains, CTR ~0.86% ->
2%+, and being the site AI answer engines cite for "K-pop quiz". The demand is
already ours (571K impressions prove it); this workstream converts demand into
authority and clicks.
