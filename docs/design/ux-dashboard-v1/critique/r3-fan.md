# r3: re-test of the rebuilt v10 (fan, accessibility, SEO)

**How I tested:** Playwright on Chromium 1194 with `prototype-full.html` (13:32 build):
- all 18 views in light and dark at 1440px
- 390px with touch emulation (`pointer:coarse` matches)
- guest (`body.guest`) and signed-in, including the sign-in dialog round trip
- keyboard with Tab, Enter and Space
- contrast measured as text colour blended with its real background, including opacity

**Result:** 15 fixed, 4 partly fixed, 1 not fixed, and 1 new P0 regression.

## The 20 items from r2
1. **PARTLY.** Links.
   - **Fixed:** 271 of 288 `<a>` now have real hrefs (`/`, `/quizzes`, `/groups`, `/blackpink-quiz`, `/q/{slug}`, `?page=2`). Tab on Home now reaches the nav, groups rail, cards, rows and footer. "Show all 24" is `/blackpink-quiz?page=2`. Space on `role=button` works and doesn't scroll the page.
   - **Still wrong:** of the 17 that remain buttons, "Learn before you play: BTS trivia" (quiz page) and "BLACKPINK trivia" (hub) go to indexable pages but only show a toast. Make them `<a href="/bts-trivia">`, and the same for "All 14 badges" and passport rows.
2. **FIXED.** Play feedback. The live region says "Not quite. The answer is Love Yourself: Tear. 0 of 1 so far.", focus moves to "Next question", and the key chip is `aria-hidden` with `aria-keyshortcuts="1"`.
3. **FIXED.** Correct and wrong colours: no failing text in play or leaderboard, light or dark.
4. **FIXED.** Hub hero: split layout, no text over the photo at 1440 or 390, and the intro sentence is plain text.
5. **FIXED.** Share: the sheet says "4/8 on Ultimate BTS era quiz / You beat 51% of players · #1,164 of 2,375", matching results; Challenge uses the real score.
6. **PARTLY.** ARIA states.
   - **Fixed:** `aria-pressed` on the blindtest 5/10/15 and hub Popular/Newest; `role=tab` + `aria-selected` in Community; the streak and playlist triggers have `aria-haspopup`, `aria-expanded` and `aria-controls`.
   - **Still wrong:** the Type, Level and Group dropdowns (`.dd`) have no `aria-haspopup`, and get `aria-expanded` only after the first open. The Community tabs have no `tabpanel` and no arrow-key support.
7. **FIXED.** Create: 5 native radios inside labels and a native rights checkbox. Nit: the stepper is a `div role=button` without `aria-current="step"`.
8. **PARTLY.** Tap targets at 390px.
   - **Fixed:** Quit, Sound, bell and streak are 44px; Beat it and the segmented buttons are 40; breadcrumbs reach 43 through padding.
   - **Still small:**

     | Element | Size (px) |
     |---|---|
     | Search icon (both states) | 40x36 |
     | Sign in | 87x36 |
     | Section links ("See all", "All 90 groups", "Most played", "See all new", "Open community") | 24 tall |
     | "Learn before you play" | 24 tall |
     | "All 27" | 40x24 |
     | Hub "See the war" | 79x22 |

   - "See the war" still fails the WCAG 2.2 minimum of 24px.
9. **PARTLY.** Head and focus.
   - **Fixed:** each view sets its own title (for example "BLACKPINK Quiz: 24 free quizzes and a blindtest | KpopQuiz"), and the H1 gets focus on 16 of 17 views.
   - **Still missing:** no meta description, canonical or JSON-LD anywhere, not even FAQPage on the hub. The Passport view leaves focus on `BODY`.
10. **FIXED.** Hub FAQ is back to 8 questions, including generation, company, songs in the blindtest, and "Are the BLACKPINK quizzes free?".
11. **FIXED.** H1s: results "4/8 on Ultimate BTS era quiz" (visually hidden), blindtest results "Your blindtest result", Passport "mingi".
12. **FIXED.** Enter chip: outlined, white text on #D13A6E, 4.62:1.
13. **FIXED.** No text under 12px in any of the 36 audited views (18 views, light and dark).
14. **FIXED.** Sound captions removed (`sndp` no longer exists).
15. **FIXED.** Korean stickers render inside `<span lang="ko">`.
16. **FIXED.** The word "New quiz" replaces the colour-only dot, and the count reads 90 everywhere.
17. **NOT FIXED.** Home still shows letter tiles for ATEEZ (AT), Cortis (CO), Hearts2hearts (HE), "K-pop company" (K) and all 5 New quizzes thumbnails. Use the site's group photos wherever one exists.
18. **FIXED.** Groups marked "Soon" are plain text (0 links), and the spec adds noindex until a group has 3 quizzes.
19. **FIXED.** One streak: the blindtest hero no longer shows a separate blindtest streak.
20. **FIXED.** "Play without a timer" sits under Start, and relaxed runs skip the hall of fame. Nits: the label swaps but there's no `aria-pressed`, and it's a 24px inline link on mobile.

## New problems and regressions, ranked
1. **P0 regression: every load opens the Community post, not Home.**
   - **Cause:** startup runs `renderHome();openPost('challenge');`. `openPost` ends with `go('postview')`, which rewrites the hash before the router reads it.
   - **Evidence:** a plain load, `#home` and `#guest` all end with `CUR=postview` and the title "Community post | KpopQuiz". The owner and engineer open the file and see a post, and the guest preview link no longer works.
   - **Fix:** separate rendering the post from navigating to it, and read the starting hash before any render.
2. **P2: the hidden sticky Start bar is still focusable and shows through.** When hidden it has no `visibility:hidden` and no `inert`, so it stays in the tab order and the accessibility tree. At the top of the quiz page it sits at y 808-856, behind the tab bar that starts at 779. The tab bar is 86% white with a blur, so a pink "Start quiz" shows through it (see the r3-quiz screenshot).
   - **Fix:** `visibility:hidden` + `inert` until `.show`, and move it fully below the screen.
3. **P2: on mobile the hub photo now sits above the H1**, 218px tall. "Play the top quiz" lands around y 563: fine on a 390x844 screen, but below the fold on an iPhone SE (about 548px usable).
   - **Fix:** cap the photo at 160px on mobile, or put it beside the H1 as a 96px thumbnail.
4. **P2: the mobile quiz meta line drops "About 2 min" and "Average 52%"** (desktop keeps both). The average is the "can I beat it" hook the spec puts in the meta line.
   - **Fix:** keep both and let the line wrap.
5. **P2: the sign-in providers' names include their letter glyph.** Screen readers hear "GContinue with Google" and "DContinue with Discord".
   - **Fix:** `aria-hidden="true"` on the letter glyph.
