# R3: Visual verification of the v10 fixes

I checked the fresh screenshots in `/home/claude/shots10` and re-measured the live build in Playwright (1440 and 390 wide).
- **Result:** 11 FIXED, 8 PARTLY, 1 NOT FIXED.
- **Regressions:** 2 new P0s (passport avatar, community sideways scroll).

## The 20 items from r2

1. **Placeholders: PARTLY.**
   - Fixed: every group avatar is now neutral (#F0EEEA with muted initials), and dark mode no longer glares.
   - Still wrong: list thumbnails still use initials (HE/EN/CO/CO/GG in New quizzes; "K" twice in All time best).
   - Still wrong: reply avatars on the post view are still pastel (H/Q in #3C3489 on #EEEDFE, M in #0C447C on #E6F1FB).
2. **Pink budget: FIXED.** The first view now has 2-5 pink marks per page, counting the K tile and bell dot. Notifications has 7, but 4 are unread dots, which the spec allows.
3. **Low-res photos: PARTLY.**
   - Fixed: the hub split hero (520×325, 1.08× upscale, faces intact).
   - Not fixed: the quiz cover is still 720×300 from a 480px source (1.5×) and visibly soft.
   - The blog cover repeats the problem (see new item 4).
   - The photocard is kept by the owner. The design can stay, but it still needs a 640×853 source; this is about resolution, not design.
4. **Passport: PARTLY, with a regression.**
   - Fixed: Inter ink name, neutral badges, ink mastery bars, and the 120px blurred band.
   - Broken: the 96px avatar now renders behind the band (see new item 1).
5. **Ranked at 390: FIXED.** Only the current tier is labelled. The pinned row is one line with an ellipsis.
6. **Type scale: PARTLY.**
   - Segmented controls, dropdowns and chips moved to 15.
   - 14px is still the most used size: 776 text nodes across the views (footer links and headings, group names, nav Create and streak, community action counts).
   - 17px remains on the brand wordmark (67 nodes) and 22px on 3 stats.
7. **Mobile text cards to rows: FIXED.** The hub list and "More BTS quizzes" are hairline rows now.
8. **Blindtest reveal on mobile: PARTLY.**
   - Fixed: Next is visible at y≈778, the answers stay put, and the art is 116px.
   - Not fixed: the "Song round" pill and the repeated "Which song is this?" are still shown after the answer is revealed.
9. **Repeated covers: NOT FIXED.**
   - Quizzes row 2 shows BTS at card 5 and card 8. BLACKPINK sits directly above BLACKPINK (cards 3 and 7). Stray Kids appears at cards 1 and 6. Home All time best #1 and #2 share one thumbnail.
   - Varying the crop cannot work here: a 480×300 source in a 262×197 box leaves about 80px of horizontal slack, so 28%, 50% and 72% look the same.
   - Fix: dedupe by image, not by crop. The same image never appears twice in a row or in a column.
10. **Share sheet: FIXED.**
    - It is a bottom sheet on mobile, and the numbers match (8/8, 96%, #95).
    - The pink ring only appears in the captures, which opened the sheet by script. After a real mouse click on Share, `:focus-visible` is false and no ring shows (verified).
11. **Blindtest hero: FIXED.** The helper line, divider and stat strip are gone. "Your best 8/10 · Idol" sits next to Start. The equaliser is at 0.6 opacity. The hero is about 405px.
12. **Community rail: FIXED.** Order is debate, then Happening now, then Badge watch. The pulse is one muted line, the heart icons are gone, and badge icons have no tiles.
    - Minor: the pulse line wraps to 2 lines. Shorten it to "312 posts · 1.9k votes today".
13. **Ranked colour: PARTLY.**
    - Fixed: the progress bar is solid gold.
    - Not fixed: on the tier track, bronze, silver and gold are saturated while Platinum through Legend are pastel.
    - Worse: the same tier now has two colours. Platinum is pale mint on the track but deep teal in the ladder and results chip; Diamond and Master split the same way.
    - The ladder colours were kept on purpose, which is acceptable. The track must use the same tokens.
14. **Mobile Create chrome: FIXED.** The tab bar and footer are hidden. The status bar is the only bottom bar.
15. **Uppercase labels: FIXED.** "Correct" and "Ranked run · Season 3" are sentence case. The photocard's caps are kept by the owner, which I accept.
16. **Toggles: FIXED.** They are ink now, and the Settings column is calm.
17. **Wrapping at 390: PARTLY.**
    - Fixed: hub facts (2×2), share and create label stacking.
    - Not fixed: the quiz meta still wraps to "Classic · Medium · 8 questions / · 2,375 plays", with an orphan "·" starting line 2.
    - Fix: render the separator as `::after` on each item and hide it on the last. Or keep 3 items and put plays on the author line.
18. **Line length: PARTLY.**
    - Quiz About is capped (about 635px).
    - The post and blog body is 686px at 17px with `max-width:none`, about 80 characters per line.
    - Fix: `.post-body p{max-width:64ch}`.
19. **Redundant chrome: FIXED.** The second Create next to the Quizzes H1 is gone, as are the 10 "blindtest" sublabels.
20. **Did you know label: FIXED.** It is on the quiz page (13/600 muted) and in-game.

## New problems and regressions, ranked

1. **P0: the passport avatar sits behind the header band.**
   - `elementFromPoint` at the top of the avatar returns `.pbimg`. Only the bottom third of the face shows under the band, on desktop, dark and mobile.
   - In dark mode the band is also a pale blurred photo, the only light block on #141312.
   - Fix: `.pav{position:relative;z-index:2}` and `.pband{position:relative;z-index:0}`.
   - Dark band: `.pband::after{content:"";position:absolute;inset:0;background:rgba(20,19,18,.5)}`.
2. **P0: the community page scrolls sideways at 390.**
   - `scrollWidth` is 399. The composer `button.inp` keeps its placeholder "Start a thread, a blog, a debate or a challenge" on one line, which forces the feed column to 379px (20 + 379 = 399).
   - The composer, debate card and posts all touch the right edge. This is the v9 bug the owner saw, back again.
   - Fix: `.composer,.composer .inp{min-width:0}`, then `.composer .inp{overflow:hidden;text-overflow:ellipsis}`. Feed grid `grid-template-columns:minmax(0,1fr)`. Mobile placeholder "Start a post".
3. **P1: photo-less quiz covers look like loading skeletons.**
   - Quizzes row 3 is four identical #F7F6F4 blocks with a tiny glyph and a group name. Next to the repeated photos above (item 9), the catalogue reads as half-loaded.
   - Fix: never more than one typographic cover per row in mixed grids (interleave on sort).
   - Give the typographic cover a deliberate layout: group name 18/600 top-left with 20px padding, and the type glyph at 64px and 10% opacity bottom-right.
4. **P1: the blog post cover repeats the old hub mistake.**
   - It is 720×300 from a 480px source (1.5×) and crops BLACKPINK at the eyes.
   - Fix: cap it at 1.25× (600×300), or at the source's natural 480px width, with `object-position:center 22%`. Better: require 1440w uploads for blog covers.
5. **P2: small polish regressions.**
   - A missing space before the separator: "kwangya_notes· Master" (ranked ladder) and "kwangya_notes· 10/10" (Today's board). Fix: add `margin-left:4px` on the separator span.
   - The desktop footer tagline breaks into "Made with ♥" / "by fans, for every fandom", leaving the heart on its own line (hubX). Fix: `white-space:nowrap` on the tagline.
   - The mobile share sheet says "They play your exact questions" twice (the helper line and the footnote). Remove the footnote.
