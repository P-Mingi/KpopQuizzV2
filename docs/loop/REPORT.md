# REPORT - SEO QUICK WINS (from docs/seo/AUDIT.md)

Branch `seo/p1-quickwins` off main `0cc9399`. Code changes, behaviour-preserving, PR-gated. No push to
main. ZERO DB writes/DDL. Verse untouched (except the one explicitly-listed teaser link). Proofs in
`docs/proofs/seo-quickwins/`.

## Items done (each: file + proof)
1. **P1.1 Home title** - `(site)/page.tsx`: gave `/` a `title.absolute` so the rendered `<title>` is
   `K-pop Quiz - 380+ Free Fan-Made Quizzes for Every Group` (was `KpopQuiz - K-pop Quizzes Made by
   Fans | KpopQuiz`, brand doubled). Left the root template untouched (correct for every other page).
   Benefit-driven meta description added. Proof: `runtime.txt` (before/after title).
2. **P1.4 Dead /games links** - repointed EVERY live internal `/games*` link to a live surface across
   11 files (blindtest + pt/blindtest "more games" tiles -> /trivia//groups//pt/leaderboard//pt/quizzes;
   news -> /trivia; pt/stats -> /pt/blindtest; popular-page + both hardest-* articles +
   blind-test-player + verse-teaser -> /blindtest; the 9 `registry.ts` article links -> /quizzes,
   /blindtest, /groups). Also fixed the stale `/games` line in `llms.txt` (AI-crawler entry point).
   Proof: `games-links.txt` - ZERO live `/games` links remain. The only 2 left are deep-Verse
   (`verse/[slug]/members`, `space-home-modules`), behind the `verseHidden` gate and the
   Verse-untouched fence, so not live/indexable on the Play site.
3. **P2.1 Blindtest count** - `blindtest/page.tsx:28` OG subtitle 4000+/87+ -> 300+/60+ to match the
   desc/FAQ/JSON-LD. Proof: `runtime.txt`. **CAVEAT for Cowork:** the blind-test-guide article FAQ
   (`registry.ts` ~line 137-142) says "nearly 4,000 songs / 87+ groups", and the live /blindtest label
   matches the getBlindtestStats FALLBACK ({300,60}) exactly - so the TRUE active-song count is
   unconfirmed. I standardized on 300+/60+ per the item's instruction, but the owner should confirm the
   real count and, if it is ~4000, update the label/desc/OG/FAQ together. Did NOT edit the article FAQ
   (out of item 3 scope + uncertain truth).
4. **P2.2 robots.txt** - `robots.ts`: added `/admin/ /settings/ /onboarding/` Disallow under
   `User-Agent: *`. Proof: `robots-diff.txt`.
5. **P2.3 ItemList JSON-LD** - added a valid schema.org ItemList of real quizzes to the home
   (`page.tsx`, a cached trending read -> `/q/<slug>` items) and to `/quizzes` (`quizzes/page.tsx`, the
   rendered grid). No fabricated data. Proof: `runtime.txt` (both present, valid structure).
6. **P2.5 Blindtest H1** - `blindtest-game.tsx`: the setup eyebrow `Blind test` -> `K-pop Blind Test`
   (the exact ranking phrase, above the "Name that K-pop song" H1). Ranks "kpop blind test" pos 3.97.
7. **P2.4 Member alt** - `group-hub-sections.tsx`: member faces `alt=""` -> `alt="{member} of {group}"`
   for image search.
8. **P1.3 COER hub - PATH TAKEN: pure-code 301, NO DB row.** DISCOVERY: "COER"/"COERS" is the CORTIS
   FANDOM NAME, not a group - the quiz `/q/are-you-a-real-coer` belongs to the Cortis group and the
   real hub is `/cortis-quiz` (the #1 hub, 635 clicks). So there is no COER group and no DB row is
   needed. Added a permanent 301 `/coer-quiz -> /cortis-quiz` in `next.config.ts` (fandom-name ->
   real group hub consolidation). Proof: `runtime.txt` (308 -> /cortis-quiz). No `COER-HUB.sql` was
   staged because none is needed. This is more correct than a fabricated COER hub, which would
   duplicate Cortis.
9. **P0.1 /news made indexable** - `news/page.tsx`: removed `robots:{index:false}`; added `/news` to
   `sitemap.ts`; it was already footer-linked (`footer.tsx:24`). CONTENT NOTE for Cowork: /news is a
   curated-headline AGGREGATOR - the feed items link OUT to allkpop/Soompi/Koreaboo, so its own
   crawlable text is thin. It is now indexable + in the sitemap + linked, but to actually EARN
   rankings it needs its own original context/text, not just outbound headlines. Flagged, not built.

## Verification
- tsc 0, unit 118/118, `next build` exit 0 (795 static pages, ZERO 522 - DB Pro/micro stable),
  check:routes + check:verse-tokens + check:env green in the build. The three crawl gates
  (check:metadata-dupes, check:indexability, check:orphans) run in `qw-gates.log` [result folded in].
- All runtime proofs green (`docs/proofs/seo-quickwins/runtime.txt`).
- No em dashes, zero emoji.

## What stays for Cowork's strategy / a later build
The bigger plays deliberately NOT started: the full fresh-group-hub auto-create/refresh pipeline
(freshness engine), lifting `/quizzes` off page 2 (authority + internal links), the hub-vs-quiz
cannibalization guard, `/pt` localization (the PT "quiz do illit" / "test cortis" demand), and giving
/news real content so it can rank. Plus: confirm the true blindtest song count (item 3 caveat).
