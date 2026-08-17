# GEO / AEO AUDIT + AUTHORITY PLAN (2026-08-15, Cowork)

Source: the BabyLoveGrowth SEO/GEO Academy, read in full by 4 Cowork subagents
(56 lessons across Get the basics 15, Get cited by AI 14, Build authority 12,
Know your numbers 1, the 100-Day Plan 4, Checklists 6, Claude MCP 2, Tools 2).
Every lesson URL is listed in the subagent digests. Audited against the live
codebase and the live DB. Nothing here is guessed.

## 0. Honest calibration on the source

The academy is a BEGINNER primer: lessons are 150-400 words, no code samples, no
llms.txt template, and it sells its own products (a free Claude MCP connector, and
an AUTOMATED link-exchange network which we REJECT, see 3.0). Its value to us is
not depth, it is a clean checklist and a sequencing argument. Where it is thin or
wrong for our case, this doc says so.

## 1. What we ALREADY do right (audited, do not redo)

- AI crawlers explicitly allowed in robots.ts: GPTBot, ChatGPT-User, ClaudeBot,
  anthropic-ai, PerplexityBot, Google-Extended, Bytespider, cohere-ai. The academy's
  #1 hard warning ("blocking them means they can never cite you") is already handled.
- FAQ blocks + FAQPage JSON-LD on articles; Article + Breadcrumb JSON-LD; Quiz
  JSON-LD with the group as MusicGroup on /q/[slug].
- Self-canonical everywhere, per-page unique titles and descriptions on quizzes
  (title + question count, stat-driven description).
- The "In this quiz" cold-start block (indexguard PART 3) is SERVER-RENDERED text
  under the client QuizPlayer. This is exactly the academy's "keep content in HTML,
  AI bots do not run your JavaScript" rule. We shipped it before reading the course.
- The CI indexability guard + weekly prod monitor cron cover the academy's technical
  checklist items (robots, sitemap, noindex, canonical) mechanically, forever.

## 2. GAPS to close (ranked by leverage for OUR profile)

Our profile is specific: ~571K Bing impressions at ~0.86% CTR, DR 1, ~1 backlink,
~700 indexed URLs. That means the ceiling is NOT rankings. It is clicks and trust.

G1. CTR IS THE BIGGEST SINGLE WIN. The academy's Phase 1 is "lazy titles: pages that
    rank but nobody clicks. Rewrite the title, win back clicks you'd already earned."
    Their own click curve: position 1 = 27% of clicks, position 5 = 6%. We are at
    0.86% overall, which is far below even position-10 expectation (~2%). Action:
    pull GSC/Bing queries at positions 5-15 with 200+ impressions, rewrite title +
    meta for each. No new content required. This is the single cheapest lever we have.

G2. ANSWER-FIRST + QUESTION HEADINGS on the programmatic pages. The academy's only
    numeric spec: a 40-60 word direct answer near the top, and headings phrased as
    the literal user question ("How many members does TWICE have?" not "Members").
    Our group pages (/{slug}-quiz, /{slug}-trivia) are the biggest surface and do
    not follow this. Each group page should also answer the QUERY FAN-OUT (members,
    debut, discography, fandom name, lightstick, era) as self-contained chunks:
    that turns 1 citation shot into 6-10 per page.

G3. NO llms.txt. Cheap to add. BUT the course itself demotes it: "treat llms.txt as
    a cheap experiment, not a core ranking lever". Do it, expect nothing, do not let
    it displace G1/G2.

G4. BING WEBMASTER TOOLS. The academy argues Bing is uncontested and feeds Copilot.
    We get 571K impressions there already. Submit the sitemap, work the CTR there
    first: it is our largest impression pool and the least competitive.

G5. OFF-SITE MENTIONS (Reddit). The academy is blunt: the extra that GEO adds over
    SEO is "being talked about", and it names Reddit as the corpus AI leans on. We
    have zero presence. r/kpop, r/kpophelp and group subs ask for quiz recs weekly.
    Rule from the course: real account, genuine answers, "don't fake it, planted
    reviews are obvious and they backfire". This is covenant-compatible only if we
    are honest about being the site owner.

G6. FRESHNESS SIGNAL. K-pop churns (comebacks, lineup changes, disbandments). The
    academy counts freshness as a citation signal. We should surface dateModified +
    a visible "Updated <month year>" on group pages and actually update them.

## 3. THE DOMAIN RATING ANSWER (owner asked: how do we upgrade it?)

3.0 FIRST, WHAT WE WILL NOT DO. The academy's own chapter 3 sells an AUTOMATED
    link-exchange network ("swaps real links inside real articles, automatically").
    That is a link scheme. The same chapter elsewhere warns against paid links
    ("risk Google biting you"), mass guest posting ("a known spam pattern"),
    directory blasting ("a spam signal, not a strategy"), fake Reddit activity and
    paying for Wikipedia. We reject the vendor's own product on the same grounds.
    No automated links, no bought links. Final.

3.1 REFRAME. Chapter 3 has NO lesson on DR/DA and never tells you to target the
    score. Authority is described as accumulated votes weighted by relevance and
    trust. DR is an Ahrefs metric, not a Google signal: it is a LAGGING indicator.
    Chasing it directly is optimising the thermometer. The only timeline the course
    commits to is its own case study: <5 backlinks to 60+ in SEVEN MONTHS, i.e.
    ~7 links/month is a good rate. Plan in months, not weeks.

3.2 OUR UNFAIR ADVANTAGE: ORIGINAL DATA. The course names "original data, surveys
    or research nobody else has" as the #1 coverage driver, and claims one strong
    data study earns more links than months of one-by-one outreach. We are sitting
    on exactly that and are not using it:
      - 59,508 fan-duel votes, 870 unique voters, ~68 votes/voter
      - 58,936 quiz plays across 399 quizzes, 88 groups
      - real average scores per quiz, hardest/easiest by measured score
      - the girl-group vs boy-group split (65 quizzes at 68% vs 77 at 70%)
      - roster/knowledge data: which groups fans actually fail on
    Nobody else in the K-pop space has this. It is free to produce, it is honest,
    and it is exactly what a blog or a journalist can cite. THIS is the lever.

3.3 THE RANKED PLAN (legit only, cheapest first)
    A1. UNLINKED MENTION RECLAMATION. Fastest first links. With 571K impressions we
        are likely already named in threads/roundups without a link. Set brand
        alerts, ask politely, prioritise the highest-authority pages. The course:
        "these convert far better than cold outreach".
    A2. THE ANNUAL DATA REPORT ("K-pop Knowledge Report"). Built from 3.2. Hardest
        questions, groups fans confuse, accuracy by fandom, generational gaps. One
        asset, pitched. Every finding also becomes a spoke page (see A5).
    A3. THE EMBED WIDGET. Already fully specced at docs/WIDGET-EMBED-SPEC.md and
        NEVER BUILT. Critical detail already in that spec: an iframe passes almost
        no equity, so the paste snippet must render a visible <a> OUTSIDE the iframe.
        Every partner embed = one real link + referral traffic.
    A4. BROKEN LINK BUILDING. The K-pop web is full of dead quiz/fansite pages.
        Manual, free, and we have the replacement page ready by construction.
    A5. TOPICAL CLUSTERS (no third party needed). The course's rule: "owning one
        topic completely beats being shallow across ten. Go deep before you go wide."
        Hub per group, spokes per member/era/discography, all interlinked. This is
        the ONE authority lever that needs nobody's permission, and our 571K
        impressions prove the topical signal already works.
    A6. REDDIT + branded search (see G5), and YouTube/TikTok clips: the course's
        loop is publish -> people notice -> they Google your name -> Google and AI
        trust you more. Branded search IS an authority signal we can create.
    NOT NOW: Wikipedia (fails notability, and it is downstream of A2), directories
    (no local/NAP angle), HARO/Connectively (few K-pop requests, standing alert only).

## 4. OUR 100-DAY PLAN (adapted; the course's skeleton, our numbers)

The course's own plan is thin (4 short pages, no day-by-day). Skeleton kept, targets
adapted to our profile:
  Days 1-30, harvest what we already earned: fix CTR on the top impression pages
    (G1), verify crawl/render, build the roadmap from real GSC/Bing queries. No new
    content. Baseline recorded day 1: impressions, clicks, avg position, AI traffic.
  Days 30-60, rhythm: Monday = quick wins, monthly = refresh slipping pages,
    quarterly = redo the roadmap. Course's warning: "most people quit around week
    three". Target 10 live backlinks by day 60 via A1/A3/A4.
  Days 60-100, authority + proof: push positions 8-20, build 5-7 page clusters
    around hubs (A5), ship the data report (A2), 20+ backlinks by day 100, then a
    day-100 audit against the day-1 baseline.
Trackers to keep: 25-40 target keywords, content pipeline, backlink log, results at
day 1/30/60/100.

## 5. TOOLING NOTE

The academy's Claude MCP connector (https://api.babylovegrowth.ai/api/mcp) is free,
read-only, works on any Claude plan, and wires Search Console + GA4 so the owner can
run their Quick-Win Finder prompt (queries at 5-15 with 200+ impressions, sorted by
position x impressions, returning CTR + the one on-page change). That is precisely
G1. Owner decision required: connecting it grants read-only access to our GSC/GA4.
Separately, the geo-seo-claude skill (curl install, owner's machine) gives the WORKER
/geo audit commands. Neither is required for the plan above; both accelerate it.
