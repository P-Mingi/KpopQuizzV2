# Lane H1, lot H2a: the new FanQuiz home, pixel for pixel, and the logos (owner, 2026-10-25, validated design)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-H1, branch o1/H1 (at o1/integration). Q = apps/quiz/src.
SOURCE OF TRUTH: docs/o1/design/fanquiz-hub/ in your worktree (Main.dc.html desktop, fluid, content max 1120 px, side margins 24 px,
drawn at 1440; Mobile.dc.html at 390; Plan.dc.html block order, algorithms, harmony rules, SEO; canvas.json board sizes). Plain HTML
with inline styles: <sc-for> is a loop, <sc-if> a condition, {{x}} a value computed by the script at the bottom of each file (sample
data and interaction logic: filter, question, blindtest, Surprise me, signed in or out). Commit the folder with your work.
Read this brief, those files, docs/o1/briefs/LD.md (rule 18 and kpop render tree rules apply), the current hub home
(Q/app/sites/[site]/home-hub.tsx and what it imports), Q/styles/sites/hub/*, Q/lib/site/registry.ts, and the code you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets; never print a key or a URL with a key.
No en or em dash, no emoji in code or copy. Never `git add -A` or `git add .`: add files by path. Never edit docs/o1/contracts/**,
scripts/o1/**, middleware, next.config. kpopquiz.org unchanged: same client modules on every route (apps/quiz/e2e/o1/P1/kpop-chunks.sh)
and chunk count (apps/quiz/e2e/o1/O2/kpop-chunk-count.sh) against the base; a shared component changes only through an optional prop
whose default keeps kpop as today.
## 1. Pixel for pixel (this lot: structure, styles, interactions; data in lot H2b)
Same structure, order, texts; the exact values of the file for font sizes, weights, line heights, letter spacing, paddings, gaps,
radii, borders, shadows, colours, button heights (44 and 48), tile sizes (36, 40, 44, 60), grids (repeat(auto-fit, minmax(...)) with
the same minimums), hovers (translateY -1 or -2 px, shadow), focus rings. No approximation, no improvement. Translate inline styles
into hub classes in Q/styles/sites/hub/ (prefix hub-h2-*, every selector starting `html.ux-v1[data-site="hub"]`); a --ux-* token
only when its value is identical, else a local --hub-* variable with the file's exact value. Hub chrome is neutral (ink #1F1B17,
cream #FAF8F5): no pink in the hub navigation, Home pill and buttons. Pink #D13A6E only for KpopQuiz, orange #C2410C only for
OtakuQuiz, as in the file. Dark mode with the existing dark tokens (and the dark orange tokens of OtakuQuiz). AA contrast, 44 px
targets, the file's aria-labels. Interactions as the file's script does them. Each block takes its data from one typed loader per
block (Q/lib/site/hub/home-*.ts) that returns the file's sample shape; lot H2b replaces their bodies with real data.
## 2. Logos (the only exception, owner)
The "F" square becomes the KpopQuiz rabbit (apps/quiz/public/logo-primary.svg, rendered as in kpopquiz.org's navigation) followed
by the site's wordmark: FanQuiz (navigation, footer, favicon, icons, OG image) on the hub; OtakuQuiz on the whole anime site
(replaces the "O" square: navigation, favicon, icons, manifest, OG, email templates); in the two hub doors, the "K" and "O" tiles
become the rabbit in white on the site's colour tile. Sizes of the canvas tiles: 36 px desktop navigation, 32 px mobile, 40 px
doors. KpopQuiz does not change.
## 3. SEO
The only indexable page of the hub: title "FanQuiz: K-pop and anime quizzes, one account", the canvas H1, JSON-LD WebSite and
ItemList (Hot now, from the loader). Every link points to the canonical page on its own site (registry netOrigin); no quiz is copied
onto fanquiz.org. The passport block reuses HubShares and the existing sign-in sheet.
## 4. Control
Full-page screenshots of your implementation at 1440 and 390, signed out and signed in, light (Playwright from the repo, a local
hub server: scripts/o1-tools/dev-up.sh or the offline build); save them in docs/o1/reports/H2/ with the file's own render at the same
widths; compare block by block and list every difference in docs/o1/reports/H2/diff.md. Zero must remain, except logos and data.
Unit tests per block (structure, aria, links canonical, JSON-LD), tsc 0, vitest of touched folders green, check.sh ok, hub and anime
builds green, the two kpop chunk scripts.
Commits on o1/H1 ("o1: H2a ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 8 lines: sha, files (count), screenshot paths, differences left, checks, what lot H2b must wire.
