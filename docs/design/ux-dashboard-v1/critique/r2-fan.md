# r2: v10 "Air" build review (fan, accessibility, SEO)

**How I checked:** I read the 52 screenshots and ran Playwright in Chromium 1194 on `/home/claude/v10/prototype-full.html`:
- all 18 views in light and dark at 1440px
- guest and signed-in states at 390px
- measured contrast (text colour blended with its background, including opacity) and tap-target sizes
- stepped through with the keyboard, and played a full quiz as both a guest and a signed-in user

**As a fan:** this is the first version I'd actually play and share. The weak spots are below.

## P0: blocks a core task or costs Google traffic
1. **Links aren't real links: 284 of 286 `<a>` have no `href`, only `onclick` (the whole site).**
   - **Evidence:** Tab on Home cycles through only 11 stops (skip link, Search, Create, streak, bell, avatar, 2 Play buttons, Dark mode, Design notes, and one stop on the page body). Keyboard users can't reach the nav links, the groups rail, any quiz card, breadcrumbs or footer links. None of these are links Google can crawl either: the 102 items on /groups, "Show all 29" on the hub (it only shows a toast) and all 5 nav items.
   - **Fix:** every navigation item is an `<a href>` with a real path (`/blackpink-quiz`, `/q/{slug}`, `/groups`, `/quizzes?page=2`, `/blackpink-quiz?page=2`), and the router intercepts the click. `<button>` is only for actions. Write this in the spec, because the engineer copies the markup.
2. **Play: screen readers get no answer feedback, and focus is lost.**
   - **Evidence:** after answering (key 2), `document.activeElement` is `BODY` because the answer buttons become disabled. The only live region on the page is the toast, so "Correct" and "Your pick" are never announced. The answer's accessible name is "1AWings" because of the hidden letter chip.
   - **Fix:**
     - announce "Correct" or "Not quite, the answer is Love Yourself: Tear" in a polite live region
     - move focus to the Next button
     - hide the key chip from screen readers (`aria-hidden`) and put `aria-keyshortcuts="1"` on the answer button

## P1: accessibility failures or broken brag moments
3. **Correct and wrong colours fail contrast (Play, Leaderboard).**
   - **Light:**

     | Pair | Ratio | Size |
     |---|---|---|
     | "Correct" #2F8A55 on #E9F4EC | 3.81 | 13px |
     | "Your pick" #C8423B on #FBECEA | 4.25 | 13px |
     | White on the #2F8A55 key chip | 4.30 | 12-13px |
     | Leaderboard "+3" on white | 4.30 | 13px |

   - **Dark:** white on #4FC07F is 2.29, and white on #FF7A70 is 2.54.
   - **Fix:** ok = #257547 (5.01 on the soft background, 5.65 with white); no = #B83A34 (4.95 and 5.69). In dark mode, chips use #141312 text (8.11 on #4FC07F, 7.31 on #FF7A70).
4. **Hub hero on desktop: white text on the photo fails.**
   - **Evidence:** sampled pixels behind the eyebrow give a median of 2.65:1 (1.44 at the brightest). The intro sentence falls to 1.73 over skin highlights. The overlay is only .5 at 42% height. On mobile it passes (12.4).
   - **Fix:**
     - overlay `rgba(0,0,0,.82) 0%, .66 55%, 0 85%`, plus a gradient from the left behind the text column
     - eyebrow in solid #FFF instead of .85 white
5. **The share sheet gets the brag wrong.**
   - **Evidence:** results says "4/8, You beat 51%" but the sheet says "You beat 84%", which is hardcoded in `SHARE.quiz`. The challenge text is hardcoded as "Beat my 2/8". A fan who screenshots both catches the mismatch.
   - **Fix:** the sheet, the story image and the challenge link all use the actual run's score, percentile and rank.
6. **Selected and open states are only visual.**
   - **Evidence:** there's no `aria-expanded` or `aria-pressed` anywhere in the build. `segOn()` sets `aria-selected` on plain `<button>`s, which has no effect without `role="tab"`, and doesn't set it at all before the first click. Affected: blindtest playlist and 5/10/15 rounds; hub Popular/Newest; Quizzes sort; the Type, Level and Group dropdowns; the avatar menu; the streak popover.
   - **Fix:**
     - segmented controls: `role="radiogroup"` + `aria-checked`, or `aria-pressed`
     - dropdown and popover triggers: `aria-expanded` + `aria-haspopup`
     - tabs: `role="tab"` + `aria-selected`
7. **Create can't be used with a keyboard.**
   - **Evidence:** there are 37 `div`, `li` or `span` elements with `onclick`, and the type rows (`.opt`) and stepper (`.st`) have no tabindex or role.
   - **Fix:** native `<input type="radio">` for the 5 type rows; the stepper as `<ol>` with `aria-current="step"`.
8. **Mobile tap targets are under 44px at 390px.**
   - **Header and game controls:** Quit 40x40, Sound 40x40, bell 40x40, search 40x36, streak 64x36, Sign in 87x36.
   - **Page controls:** hub sort buttons 32px tall, Beat it 32px tall, blindtest "Play" by group 30x24.
   - **Small links:** breadcrumb "BTS" 26x22, Follow 43x22, Report 22px tall, "Challenge a friend" 22px tall.
   - The breadcrumb and Follow even fail the WCAG 2.2 AA minimum of 24px (2.5.8).
   - **Fix:** 44px hit areas (padding, or a transparent ::after that extends the tap area), keeping the visual size.
9. **The page `<head>` never changes on navigation.**
   - **Evidence:** `document.title` is "KpopQuiz Air" on all 18 views. There's no meta description, no canonical and no JSON-LD. `go()` leaves focus on `BODY`.
   - **Fix:**
     - per-page titles ("BLACKPINK Quiz: 29 free quizzes and a blindtest | KpopQuiz")
     - meta description and canonical
     - server-rendered JSON-LD: FAQPage and BreadcrumbList on hubs, BreadcrumbList on quiz pages
     - on client-side navigation, focus the H1 (`tabindex="-1"`)
10. **The hub FAQ was cut from 8 questions to 4.**
    - **Evidence:** dropped "What generation", "What label", "How many songs in the blindtest" and "Are BLACKPINK quizzes free?". That last one is the question most likely to get a Google rich result.
    - **Fix:** restore all 8 as `<details>`, first one open, with JSON-LD that matches the visible text.
11. **Results and blindtest views have no H1** (end, btplay, btend), and the Passport H1 reads "mingiLv 7".
    - **Fix:** results H1 "4/8 on Ultimate BTS era quiz", shown as the photocard title. The Passport H1 is the name only, with the level outside the heading.

## P2: polish
12. **The "Enter" chip inside Next** is white on a translucent fill, 3.56:1 at 12px. **Fix:** no fill, a 1px white border and white text straight on #D13A6E (4.62).
13. **Text under 12px:** "correct" in the game bar and "pts" in blindtest play are 11.67px; group initials are 11px. **Fix:** 13px.
14. **The "Buzz" and "Fanfare" sound captions** show for 1.1s, only when sound is on. With reduced motion the animation ends at opacity 0, so they never appear. They're also cryptic to a fan. **Fix:** remove them; the Correct and Your pick labels already carry the meaning.
15. **The Korean stickers** ("대박! PERFECT", "화이팅! NICE ONE") have no `lang="ko"`, so VoiceOver reads them with an English voice. **Fix:** wrap them in `<span lang="ko">`.
16. **"New" is shown by colour alone** (the pink dot before Cortis and Hearts2hearts in the rail). **Fix:** add the word "New" at 13px.
    - The group count is also inconsistent: "All 91 groups" and "Filter 91 groups" versus "90 of 90 groups".
17. **Initials where photos should be:** ATEEZ (20 quizzes, in Most played), Cortis, (G)I-DLE, all 5 New quizzes and "GK" in All time best. It looks unfinished, and ATINYs will notice they're the only big fandom without a photo. **Fix:** use the site's group photos, and keep initials only for groups that truly have no photo.
18. **Groups marked "Soon" (0 quizzes) risk becoming thin, empty hub pages.** **Fix:** make them plain text, not links, or noindex the hub until it has at least 3 quizzes.
19. **Two streaks:** the 12-day streak pill and "3 days blindtest streak" in the blindtest hero. **Fix:** keep one site-wide streak and replace that hero stat with "best combo" or "rank".
20. **Answers time out after 15s with no way to extend** (WCAG 2.2.1). **Fix:** a "Relaxed, no timer" toggle on the quiz page. Relaxed runs don't count for the hall of fame.

## Right, and must stay
1. **Guest mobile Home.** The H1 "Free K-pop quizzes and blindtests", an intro, a full-width Play and the groups rail all fit above the fold. "Sign in" replaces the account controls, and guest results say "Save your 4/8 and start a streak".
2. **Answer states.** "Correct" and "Your pick" have icons and labels; other options are muted, not faded. Progress segments are hollow or filled, the timer shows "15 s", and keys 1 to 4 plus Enter work.
3. **Results.** The photocard with its Korean sticker, "You beat 51%", "+40 XP · streak day 13 saved", and the rank line are what a fan brags about. The Share sheet has a story image and a challenge link, focus goes to Close, and Esc closes it.
4. **SEO content on the quiz page and hub:** breadcrumb, H1, meta line, visible About, the 3 "In this quiz" questions, "Did you know" with its trivia link, "All 31" to the hub, the FAQ answers in the DOM, "Fans also play", the footer's Top groups row, and a real "Load more" link.
5. **Token discipline:**
   - 0 icon buttons without a label, 0 emoji, 0 em or en dashes found
   - `lang="en"`, zoom not blocked, a reduced-motion rule, a 2px pink `:focus-visible` ring
   - the #D13A6E fill (4.62)
   - the streak in the mobile top bar
