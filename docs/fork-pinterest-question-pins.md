# FORK TASK - Pinterest per-question pins (bulk)

## Paste this whole file into a FRESH Claude Code session (a fork). It is
## self-contained. This is a marketing-asset task, SEPARATE from the Verse
## harmonization work running in the main session. Do not touch Verse code.

---

## Background (you are starting cold, read this fully)

kpopquiz.org is a K-pop quiz website (the "Play" product in this monorepo:
apps/quiz). Fans play free quizzes about K-pop groups. The site's home and
per-group quiz hubs are the traffic-converting pages. There is a second
product in the same repo called "Verse" (a fandom wiki platform) being
harmonized in a separate session RIGHT NOW: DO NOT TOUCH anything under
app/verse, components/verse, or any Verse file. This task lives entirely
in the Pinterest admin/marketing area.

Goal of this task: drive Pinterest traffic to kpopquiz.org. Pinterest is a
huge, evergreen, visual channel for K-pop fans. We turn each quiz QUESTION
into a beautiful pin that shows the question and its options but NOT the
answer, so the only way to learn the answer is to visit the site and play.

## There is already a Pinterest system. Read it FIRST, reuse it, do NOT rebuild.

- Dashboard: apps/quiz/src/app/admin/pinterest/page.tsx
- API routes: apps/quiz/src/app/api/admin/pinterest/* - especially
  generate-card, generate-pin, generate-bulk, export-csv, batches, jobs,
  stats. generate-card/generate-pin already RENDER pin images (the
  "visual of the question"): reuse that rendering path, do not invent a
  new one.
- Strategy context: docs/promotion-plan.md and docs/seo-strategy.md.
- The existing bulk CSV export is the format Pinterest expects: MATCH its
  exact schema (columns, headers). Find export-csv and reuse it.

Step 1 of your work is to READ all of the above and report back what
exists (the card renderer, the CSV schema, how a batch is made) before
generating anything. Do not assume: verify.

## The task

Generate a LARGE batch (hundreds) of per-question Pinterest pins from the
real quiz questions in the database, plus the bulk-post CSV, reusing the
existing card renderer and CSV exporter.

## Locked decisions (owner-approved 2026-08-01, do not change)

1. HIDE THE ANSWER. The pin shows the question + its options only. The
   answer appears NOWHERE on Pinterest - not in the image, not the title,
   not the description, not a comment. The unanswered question is the
   click magnet; the answer lives only on the site.
2. LINK TARGET = the matching group's quiz hub, not the bare home. A pin
   from a BTS question links to the BTS quiz hub (the /{group}-quiz style
   page - confirm the exact slug pattern in the repo, e.g. /bts-quiz).
   FALLBACK to the home (kpopquiz.org) only when a question has no clear
   single group. Resolve each question -> its group -> its hub URL; verify
   every generated link returns 200 before it goes in the CSV.
3. LARGE BATCH now (hundreds). BUT build in TEMPLATE VARIETY (rotate a few
   card layouts/color treatments per group) so hundreds of pins are not
   near-identical (Pinterest spam filters on duplicate-looking pins). Note
   in your final report that the owner should DRIP-POST the CSV over days,
   not dump it all at once.
4. LEGAL IMAGERY ONLY. No copyrighted idol photos on the pins. Use the
   site's own brand assets (logo-primary.svg, the mascot PNGs / Mascot
   component) + group color/name text. Text-forward cards. This is a
   public marketing channel: strict-legal only, same as the rest of the
   project.
5. QUESTION FILTER: only self-contained, visually-renderable TEXT
   questions ("which member...", "what year...", "complete the lyric
   [short, non-infringing]..."). EXCLUDE audio/blindtest questions and any
   question whose meaning needs a copyrighted image/sound to answer (a
   static pin cannot carry those). Report how many questions were included
   vs excluded and why.

## Card design (dual-skill: use /frontend-design and /ui-ux-pro-max)

- Pinterest optimal ratio 2:3, 1000x1500px.
- On-brand: kpopquiz.org mark, group color, clean type hierarchy, the
  question prominent, the options clearly listed, a subtle "play at
  kpopquiz.org" call. Beautiful, not a raw screenshot - this is the whole
  point of Pinterest.
- NO em dashes anywhere in any pin copy, title, or description (house
  rule; grep your output).

## Hard rules (house rules of this repo)

- NO em dashes in any generated copy (titles, descriptions, CSV, card
  text). Grep the CSV and card text before finishing.
- Commit your work, do NOT push (the owner batches pushes).
- Do NOT touch Verse (app/verse, components/verse) or any unrelated app
  code. This is Pinterest-admin + generated-assets only.
- Real data only: pull real questions from the DB; no fabricated content.
- Reuse the existing Pinterest machinery; only extend where the
  per-question pin needs something the current system lacks, and justify
  any addition.

## Deliverable

- The generated pin images (in whatever output location the existing
  system uses) + the bulk-post CSV matching the existing export schema,
  ready for the owner to upload to Pinterest.
- A report: what the existing system had, what you reused vs added,
  question counts (included/excluded), a sample of 5 pins described, the
  link-resolution proof (every link 200), the em-dash grep result, and
  the drip-posting recommendation.

## Verify before you hand off

- [ ] Answer appears nowhere on any pin/title/description/CSV field
- [ ] Every pin links to a real 200 group-hub URL (or home fallback,
      flagged), proven
- [ ] Only legal imagery used (no copyrighted idol photos); audio/image-
      dependent questions excluded
- [ ] Template variety present (not hundreds of identical cards)
- [ ] CSV matches the existing Pinterest bulk schema exactly
- [ ] Zero em dashes in all generated copy
- [ ] Committed, NOT pushed; zero Verse files touched
