# REPORT - MEMBER-RAIL: did-you-know + play cards on tree member pages

The two rail widgets the validated member-page prototype has (a "Did you know?" card + a
"Play" card) are added on the live tree member page, in the same rail column under the fact
infobox. Verified live on jungkook + v. No schema (READ only). NOTHING PUSHED.

## WHAT SHIPPED
- lib/trivia/stored-facts.ts: new getStoredEntityTrivia(groupId, entityKind, entityId) reads
  published rows for ONE bound entity (entity_id is text -> coerced), same TriviaFact shape +
  fail-closed as the existing getStoredGroupTrivia (shared mapRows helper).
- app/verse/[slug]/[pageSlug]/page.tsx: computes (server, fail-closed via safeFetch)
  - didYouKnow: ENTITY-FIRST for a member (this idol's stored fact), else the group pool; one
    fact picked by stableIndex(page.slug, pool.length) - stable + distinct per member.
  - playLinks: getQuizzesByGroup(group.id, 'popular', 0, 3) -> up to 3 /q/<slug>; playCount =
    group.quiz_count. Passes all three to DocumentPage.
- components/verse/tree/document-page.tsx: DocumentPageProps gained optional didYouKnow /
  playLinks / playCount; the vdoc-rail renders the two cards AFTER the fact infobox. The rail
  now shows when facts OR either card exist; other callers (portal, non-idol) are unaffected.
- globals.css: .vdoc-card* using only existing verse-v2 tokens (no new colours, no new font).

## VERIFIED LIVE (receipt docs/proofs/vfoundation-memberrail/rail.txt + member-{jungkook,v}.png)
- /verse/bts/jungkook: DYK = his ENTITY fact "Jungkook, born September 1, 1997, is the youngest
  member of BTS, often called the maknae." (tag members). Play: the 3 top BTS quizzes + "30
  quizzes for this group".
- /verse/bts/v: DYK = "V, born Kim Taehyung on December 30, 1995, is a vocalist in BTS." -
  DIFFERENT per member (entity-first works).
- UNCHANGED: the fact rail (.vdoc-infobox + railnote) and the navbox (.vdoc-navbox "BTS members"
  roster) are byte-identical - the cards were ADDED, nothing restyled. One H1 per page (verified).

## GATES
- tsc --noEmit: EXIT 0.
- full build (check:routes + check:verse-tokens + next build): EXIT 0. check:routes pass (353
  page routes); verse-tokens pass; "Compiled successfully".
- em-dash / en-dash scan on the changed files: clean.

## COMMIT
Committed as a single small commit ON main (never pushed). Note: while this ran, the owner/a
concurrent session advanced main to 2671887 ("quiz stats block: hero Plays + secondary grid",
which committed the earlier user-approved quiz-stats UI tweak) on top of the play-seo final
merge (0027c58). That cleared the globals.css entanglement, so member-rail committed cleanly on
top. Only member-rail files + this report + the receipts were staged (by path).

## STOP
MEMBER-RAIL complete + verified. Deferred (per the mission): deepening the short member pages
(Cowork content) + organic child pages. Nothing pushed.
