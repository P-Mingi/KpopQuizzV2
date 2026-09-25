# R2: Visual critique of the v10 "Air" build

**Does it still feel heavy?**
- **Desktop:** mostly no. The structure is calm now: one nav bar, no section boxes, 64-80px section gaps.
- **What is left is noise, not structure:** pink sprinkled on every row, pastel letter placeholders, and upscaled photos.
- **Mobile:** it goes heavy again. Boxed cards stack up, text wraps badly, and two pages break.

Measured in Playwright:
- Pink marks in the first view (including the logo): home 10, notifications 13, passport 13. The spec allows 2.
- Font sizes in use: 15 steps.
- Photos are served at 480×300 and shown up to 2.33× larger.

## P0: breaks the brief or looks broken

**1. Letter placeholders everywhere.**
- *Where:*
  - Quizzes, grid row 3: four 262×196 tiles in beige, blue, beige and pink, with 64px navy, charcoal and magenta discs saying HE/EN/CO/GG.
  - Home: the New quizzes column is 5 letter tiles; All time best #4 is "GK".
  - Home groups rail: AT, CO, HE. ATEEZ is the 4th most played group and has no photo.
  - Groups A to Z: about 80 pastel circles (lilac, peach, mint, pink, sky, butter) with 11px initials.
  - Leaderboard (AT, EN, TX), search (GK), and the reply avatars in community and posts.
- *In dark mode* they become bright pastel blocks on #141312 (home, dark home, dark search).
- *Why:* it adds 6 extra hues and looks like missing data. It is the single ugliest thing left on the site.
- *Fix:*
  - Quiz with no cover: use the group photo. With no group photo, a #F7F6F4 tile (dark #1C1B19) with the 24px monochrome type glyph in muted. No initials, no hue.
  - Group with no photo: a #F2F0EC circle (dark #252321) with 13/600 muted initials. Every group avatar uses the same neutral.
  - Ship real photos for every group in the top 20 (ATEEZ first).

**2. The pink budget is blown on every page.**
- *Where:*
  - The logo alone uses 2 marks (the K tile and "Quiz" in #C93868), plus the bell dot.
  - Every section link is #C93868: "All 91 groups", "See all", "Most played", "See all new", "Open community", "All 31", "Follow", "Challenge a friend", "Learn before you play".
  - Continue progress bars and the NEW dots on Cortis and Hearts2hearts are pink.
  - The 3 Ways-to-play footers on the blindtest hub are pink.
  - Notifications: 5 pink action links plus 4 dots plus a pink flame.
- *Why:* this recreates v9's "too many accents", only more thinly spread. The one real action no longer stands out.
- *Fix:*
  - `.lnk{color:var(--ink);font-weight:500}` with a 14px muted arrow; hover: underline.
  - Wordmark all in ink; keep only the K tile pink.
  - Continue progress bars: `background:var(--ink)` 3px tall on #ECE9E4.
  - Remove the NEW dots.
  - Ways-to-play footers: 13px muted.
  - Notifications: drop the action links (the whole row is clickable). Unread dots stay pink.
  - Pink is left for: the filled button, the active nav underline, unread dots, selected states, and game progress.

**3. The largest photos are upscaled, blurry and badly cropped.**
- *Where:* every source image is 480×300.
  - Hub hero: 1120×420, a 2.33× upscale (4.7× on a 2x screen). The crop cuts BLACKPINK at the eyes and puts the H1 over their faces. This is the top Google landing page.
  - Quiz cover: 720×300, a 1.5× upscale.
  - Results photocard: a 304×411 portrait cut from a landscape source, so only about 220px of real width.
- *Why:* soft JPEG faces make the whole site look cheap, however good the spacing is.
- *Fix:*
  - Require 2× assets: 2240w for the hub, 1440w for the quiz cover, 640×853 for the photocard.
  - Until then, the hub uses a split hero: H1, intro and CTAs on the left; the photo on the right at 560×350 max, radius 24, `object-position:center 25%`, with no text over it.
  - Quiz cover capped at 1.25× its source (600×300 at most).
  - Photocard: the landscape photo in the top 58% of the card (288×190), with the score block below on #1B1524.

**4. The passport looks unfinished, and it is the pinkest page.**
- *Where:*
  - An empty flat peach slab, 1120×160.
  - The name "mingi" is set in `ui-monospace` 28px in #C93868, which the spec explicitly bans.
  - "Edit passport" sits on the edge of the header band.
  - 6 pink-tinted 64px badge discs with pink icons, a pink XP bar, and 3 pink mastery bars. That is 13 pink marks.
- *At 390px,* the stats wrap into "12 / days" and "quizzes / played".
- *Fix:*
  - Header band 120px (mobile 96). The user's image, or their main group photo blurred at 24px and 35% opacity over their theme tint. Never an empty flat fill.
  - Name in Inter 28/700 ink.
  - Avatar 96px with a 4px `var(--page)` ring, overlapping the band by 40px. Edit and Share sit on the name row, right-aligned.
  - Badges: 56px #F7F6F4 discs with ink 24px icons.
  - Mastery bars in ink, 4px tall. Only the XP bar stays pink.
  - Mobile stats: a horizontal row with `overflow-x:auto` and `min-width:96px` per stat, `nowrap`.

**5. Ranked at 390px breaks.**
- *Where:* the tier labels run together into "PlatinumDiamondMaster". The pinned "#412 mingi" row wraps onto 3 lines, with 8,290 on a line of its own.
- *Fix:*
  - Tier track below 480px: show only the 7 shields at 28px, with a label only under the current tier. Alternatively, a scroll row with `min-width:72px` per tier.
  - Pinned row: `grid-template-columns:40px 32px 1fr auto`, name 1 line with ellipsis, meta on a second line at 13px.

## P1: clearly worse than it should be

**6. The type scale has drifted.**
- *What:* sizes in use are 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 48 and 72.
  - 14px is the most used size on the site (about 900 nodes: footer, segmented controls, nav buttons, group names, breadcrumbs), yet it is not in the spec.
  - 17px is used for page subtitles and the brand.
  - 22px is used for stats.
- *Fix:* map the sizes onto the scale 12/13/15/16/18/20/24/32/48/72.
  - 11 → 12.
  - 14 → 15 for anything clickable (segmented controls, dropdowns, group names); 14 → 13 for breadcrumbs and footer links.
  - Subtitles 17 → 18/1.55 muted, the same as the home lead.
  - Stats 22 → 24/700 tabular.

**7. Boxed text cards pile up on mobile.**
- *Where:* the hub list has 6 bordered cards, about 800px of outlines. "More BTS quizzes" is 2 columns of 165px cards with 4-line titles and meta that wraps.
- *Fix:* below 760px, text cards become rows:
  - `border:0; border-bottom:1px solid var(--hair); padding:16px 0; border-radius:0`.
  - Title 16/600, 2-line clamp; meta 13.
  - A single column.

**8. Blindtest reveal on mobile.**
- *What:*
  - The album art (200px), "CORRECT", title, artist, "Song 1 of 10", the "Song round" pill and the repeated question all stack above the answers. The answers start at y=553, which pushes Next below 844.
  - Three progress readouts show at once: the segments, "Song 1 of 10" and the pill.
- *Fix:*
  - On reveal, hide the pill and the question.
  - Art 120px on mobile.
  - Next row `position:sticky;bottom:0;padding:12px 20px calc(12px + env(safe-area-inset-bottom))`.

**9. Repeated covers in mixed grids.**
- *Where:* Quizzes shows the same Stray Kids, BLACKPINK and BTS photos twice each, and the two BTS cards sit side by side. Home All time best #1 and #2 use the same BTS thumbnail.
- *Fix:*
  - Layout rule: never the same image twice in one row, and never adjacent.
  - Vary the crop per quiz: `object-position` picked by quiz id from {50% 20%, 25% 30%, 75% 30%}.

**10. The share sheet.**
- *What:*
  - It opens with a 2px pink ring on the close button (both themes and mobile). It reads as decoration.
  - On mobile it is a centred modal.
  - The numbers contradict the page: the sheet says 0/8 and "beat 84%", the card says 8/8; the sheet says #38 with best 7/8, the page says #94 with best 8/8; Time shows 0:00.
- *Fix:*
  - `:focus:not(:focus-visible){box-shadow:none}` and put initial focus on "Copy link".
  - Mobile: a bottom sheet with radius 24 24 0 0 and a 36×4 handle.
  - Feed every number from one result object.

**11. The blindtest hero is overloaded.**
- *What:* 7 layers in a 550px plum block: live eyebrow, 2-line 48px H1, 3-line lead, controls, helper line, divider, and a 4-stat strip. The strip adds a third streak ("3 days blindtest streak").
- *Fix:*
  - Drop the helper line, divider and stat strip. Put a muted "Your best 8/10" beside Start, as the home band already does.
  - Lead limited to 60ch.
  - Padding 56, hero about 400px.
  - Equaliser at 50% opacity.

**12. The community rail is cluttered.**
- *What:*
  - A column of 5 heart icons in Happening now.
  - Pink-tinted icon tiles in Badge watch (banned by the spec).
  - The pulse block's 20px bold numbers sit level with the H1 and compete with it.
- *Fix:*
  - Order: Daily debate, then Happening now, with the pulse as one 13px muted line in its header ("312 posts · 1.9k votes today"), then Badge watch.
  - Hearts appear on row hover only.
  - Badge icons 20px in muted, with no tile.

**13. Ranked colour.**
- *What:*
  - The progress bar is a gold-to-teal gradient.
  - Bronze, silver and gold are saturated while the upper tiers are pastel.
  - The ladder shows 8 coloured shields in a column.
- *Fix:*
  - Progress bar in solid tier colour, 6px.
  - All 7 tier colours at one lightness and chroma (HSL S 45%, L 55%).
  - Ladder tier shown as a 12px shield in muted, with the tier colour only on your own row.

**14. Mobile Create stacks three bars.**
- *What:* top bar 56 + sticky status bar 72 + tab bar 64 = 192px, 23% of an 844px screen.
- *Fix:* hide the bottom tab bar on create, the editor and the games (the spec already says so). The status bar becomes the bottom bar with the safe-area inset.

## P2: polish

**15. Uppercase labels are creeping back.** "CORRECT", "RANKED RUN · SEASON 3" in pink, and the photocard's "KPOPQUIZ", "PLAY NO." and "BTS QUIZ" plus a tilted stamp and the mascot make 7 overlays on one photo.
- *Fix:* sentence case at 13/600 with no tracking. On the photocard: at most one label, the score, and one sticker.

**16. Settings.** Six pink toggles stack in one column.
- *Fix:* the on state is ink #1F1B17 with a white knob (dark: #F3F0EB with a #141312 knob).

**17. Wrapping at 390px:**
- Quiz meta leaves an orphan "·" at the start of line 2.
- Hub facts break as "14 songs in the / blindtest".
- Leaderboard shows "CARAT · / SEVENTEEN".
- Share shows "Challenge / link"; Create shows "Cover / image".
- *Fix:* meta items `nowrap`, and on mobile drop "About 2 min" and "Average". Put labels and helper text on stacked lines.

**18. Line length.** Quiz About and the post body run to about 95 characters per line at 720px.
- *Fix:* `.prose p{max-width:64ch}`.

**19. Redundant chrome:**
- A second "Create a quiz" button next to the Quizzes H1 on desktop (the nav already has Create).
- "blindtest" printed under all 10 avatars in Play by group; use "14 songs" or nothing.
- *Fix:* remove both.

**20. Quiz page "Did you know" lost its label.** The bulb and sentence read as a stray paragraph.
- *Fix:* add a 13/600 muted "Did you know" label above the 16/1.6 text, as the spec says.

## Right, do not touch
1. **The top nav:** 64px, aligned to 1120, 15/500 links with a 2px underline, ghost Create, neutral streak pill, and the bell panel.
2. **Frameless photo cards:** 16 radius, 2-line titles, 13px glyph meta. On mobile, 96×72 thumbnail rows.
3. **Quiz page skeleton:** breadcrumb, cover, H1, one meta line, and Start with a share icon above the fold at both 1440×900 (y=664) and 390×844 (y=584). Hall of fame as plain rows.
4. **In-game:** check + "Correct", X + "Your pick", the other answers at full contrast, 1-4 key chips, and Next with an Enter key. Segmented progress. The plum blindtest stage.
5. **Warm dark mode** (#141312/#1C1B19). Community posts without boxes, split by hairlines, with icon + count actions. The 720-wide rhythm of Settings and the post view.
