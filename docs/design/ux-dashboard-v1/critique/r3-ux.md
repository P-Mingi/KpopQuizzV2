# R3 UX verification of the rebuilt v10

How I checked: I clicked through the rebuilt prototype with Playwright at 1440x900, 390x844 and 375x667, signed in and as a guest. I read state from the page itself (DOM, positions, toasts, `G_`, `B_`) rather than the fix notes.

**Result:** 15 fixed, 5 partly fixed, 0 not fixed, and 5 new problems.

## The 20 items from r2
1. **Sign-in is designed, and guests are gated before Publish, Post and Reply. FIXED.** A sheet (Google, Discord, email link) opens from every Sign in and from the Publish, Post, Reply and "Sign in to save" buttons. After Google or Discord, the action continues: the quiz publishes, the reply posts. The email-link path has its own problem (new item 4).
2. **Comment and reply fields are real. FIXED.** They are textareas with a score chip and a Send / Reply button. An empty send shows "Write something first", and new comments go on top. Small issues: "18 replies" and "Comments (12)" don't go up. A guest sees the chip "Your best: 8/10" without having played. A posted reply's meta line reads "mingi · Your best: 8/10 on this quiz".
3. **Results main action is visible and depends on the score. FIXED.** At 2/8, Play again is the pink button and comes first; at 7/8, Share is. At 390x844, Share and Play again sit at y 640-688, above the tab bar at 779.
4. **Share sheet data and mobile share. PARTLY.** The numbers now match the run (2/8 · 29% · #1,686; 7/8 · 85% · #356), and on mobile it's a bottom sheet. But the phone's own share menu is the third option, labelled "More apps". It shares a URL, not the story image, and Copy link gets the first focus. Put "Share to Instagram / apps" with the story image first.
5. **Quit asks for confirmation. FIXED.** With 0 answers it leaves straight away. From 1 answer on, "Leave this quiz? You answered 1 of 8" appears with Keep playing focused, and Esc keeps you playing. The promise inside it is broken (new item 3).
6. **Blindtest audio controls. PARTLY.** The game bar now has Replay the clip and Sound on/off. There's still no state for blocked autoplay or iOS silent mode ("Tap to play the clip"). That's exactly where phone players will get stuck.
7. **Blindtest reveal on mobile. FIXED.** Next with its countdown is on screen at 390x844 (y=762) and at 375x667 (y=615). The answers still move 14px on mobile and 5px on desktop; that's harmless because they've already been answered.
8. **Daily blindtest is one try. FIXED.** Starting it again sends you to today's board with "One try per day". The Home band says "You scored 3/10 today", the hub card says "Played · 3/10 · #212 today", and the board shows "You 3/10 · played today". Small issue: the band's "See today's board" also shows the "One try per day" scolding toast.
9. **One streak rule. PARTLY.** The copy is now the same everywhere ("Any quiz or blindtest today…"), the separate blindtest streak is gone, and the flame turns pink at risk. But after playing a quiz only the pill updates (13, neutral). See new item 2.
10. **Leaderboard on mobile. FIXED.** The You tab shows a "STAY is #2" strip, and Community links to the leaderboard.
11. **Empty group pages. FIXED.**
    - Chungha shows "No Chungha quizzes yet" with Make the first quiz and Notify me.
    - TWICE opens its own page with 14 real titles.
    - The group count is 90 everywhere.
    - Most played hides while you filter.
    - Small issue: Make the first quiz opens Create with BTS preselected, not Chungha.
12. **Quizzes sort and filters. FIXED.** Filters really filter: "Find the intruder" gives an empty state with Clear filters, and Clear brings back 12. Newest reorders the grid. Home's "Most played" and "See all new" open the matching sort. Small issue: "Load more quizzes" still shows under the empty state.
13. **Ranked target. FIXED.** It reads "Score over 1,420 to count", the best 5 are sorted with 1,420 marked lowest, and they add up to 8,290.
14. **Controls that did nothing. PARTLY.**
    - Now fixed: song rows play, the Challenge a friend card starts a run, "BLINK room" is gone, the Groups mastered rows open the group page, the hero preview starts the quiz, and Continue resumes at question 7.
    - Still toast-only: Settings "Change photo" (no file picker) and the group page "Show all 29".
    - New dead control: avatar menu "Sign out" shows a "Signed out" toast but you stay signed in.
15. **Challenge context during play. PARTLY.**
    - Working: the quiz card in the post view and the notification rematch show "Beat stay4life: 9/10" in the game bar and a win/lose line on results.
    - Not wired: the feed's "Take it" still starts a plain run (`G_.ch = null`). Blindtest "Accept" shows no target and no win/lose; its main button is "Play again".
    - The win/lose logic is also wrong (new item 1).
16. **Search. FIXED.** You get 'No results for "zzzz"' with a hint, "twice" lists the group, 5 TWICE quizzes and a song, and there's no Esc key hint on touch screens.
17. **Daily blindtest shown three times on Home. FIXED.** The hero link and the Continue row are gone; only the plum band is left.
18. **Community. FIXED.** Daily debate is first in the right column, Happening now has the pulse as its subtitle, and Badge watch is kept. An empty post shows "Add a title first", and a valid post appears at the top of the feed. Blog and debate posts have their own post views.
19. **Sound labels and key hints. FIXED.** The "Buzz" / "Fanfare" text is gone. On touch screens, number chips become A-D and no "Enter" hint shows.
20. **Create on mobile. FIXED.** The tab bar and footer are hidden. The title is a real field: "BTS" shows "Add at least 5 characters." and blocks the next step.

## New problems and regressions (ranked)
1. **P1: Challenges can't be won.**
   - Where: the post view quiz card and the notification rematch.
   - What happens: the game bar says "Beat stay4life: 9/10" above "Question 1 of 8", and the run is the BTS era quiz, not the SKZ quiz on the card. A perfect 8/8 ends with "stay4life wins this one (9/10). Try again?".
   - Fix: the challenge should carry the quiz and its question count, launch that quiz, and compare over the same total.
2. **P1: The streak disagrees with itself right after a quiz.**
   - The pill flips to 13 and goes neutral, and results say "streak day 13 saved".
   - Meanwhile the streak popover still says "12 days · Today is not played yet · ends in 5h 12m". Home still says "day 12… keeps your 12-day streak", and the Notifications pinned row still says it's at risk.
   - Fix: one streak state that updates the pill, popover, hero line and pinned row together. The pinned row should become "Day 13 saved" or disappear.
3. **P2: The quit dialog makes a promise the app doesn't keep.** It says "You can pick it up later from Continue playing", but the abandoned BTS quiz never appears in Continue on Home. Either add it there with "1 of 8 answered", or change the sentence.
4. **P2: Signing in by email link loses what you were doing, and Sign out is fake.**
   - After submitting the email form from a guest Post, the editor closes and the typed thread is gone. The pending action is dropped.
   - Fix: keep the draft and show "We'll post it once you open the link".
   - Avatar menu "Sign out" only shows a toast and leaves you signed in. It should switch to the guest state.
5. **P2: Mobile gaps.**
   - At 390px, Happening now, Badge watch and Community pulse disappear from Community entirely, so the owner's must-keep modules are gone for phone users. Fix: a collapsed "Happening now" row after the 3rd post.
   - At 375x667, the quiz "Next question" sits at y=746 after an answer, below the screen with no Enter key available. Fix: pin Next to the bottom, as the blindtest does.
