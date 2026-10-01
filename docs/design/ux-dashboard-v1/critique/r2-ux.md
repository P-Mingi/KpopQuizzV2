# R2 UX critique of the v10 "Air" build

I clicked through v10 with Playwright: desktop 1440, mobile 390x844 with touch, signed in and as a guest.

Overall: v10 is much calmer than v9, and the top bar, focus mode and answer states work. What's left is mostly broken or missing states rather than layout. Signing in, commenting, sharing and the daily "one shot" either do nothing or show wrong data, and several phone-only issues hide the main action.

## P0

**1. Sign-in isn't designed, and guests can publish and post without an account.**
- Where: every "Sign in" button (top bar, results "Save your 4/8", the guest You tab, Leaderboard).
- Problem: each one flips the page straight to "Signed in as mingi". There is no sign-in screen, so the moment we most want a guest to convert leads nowhere. As a guest, Create > Publish reaches "It's live" and shows the toast "Published. +50 creator XP", and the community editor posts too. Guests end up owning quizzes they can never edit.
- Fix:
  - Design a sign-in sheet (Google, Discord, email link) that returns to the exact moment it was opened from (results saved, draft kept, post sent).
  - Show it before Publish and Post.
  - Add a state that says "Signed in, your 4/8 is saved".

**2. The comment fields are fake.**
- Where: the post view "Reply with your score" and the results "Say something about this quiz". Both are static `div`s.
- Problem: the post view's main action does nothing. A fan who beat the challenge can't reply with their score.
- Fix: a real text field that expands on tap, with a score chip attached automatically, a 44px Send button, and a pinned position above the keyboard on mobile. Design the empty, sending and posted states.

## P1

**3. Results: the main action is hidden or wrong.**
- At 390x844 the photocard fills the first screen, and Share / Play again sit under the tab bar.
- After a 2/8 run with a "다시! TRY AGAIN" stamp, pink Share is still the main button (the agreed rule was Play again when you're below average).
- Fix: shrink the photocard to about 300px on mobile, or hide the tab bar on results. Make the primary button depend on the score.

**4. The share sheet shows the wrong numbers.**
- The brag line is hardcoded: "You beat 84%" while results say 40%, 51% or 96%. It opened on "0/8" when no run had been played. The page behind it said #38 while results said #94.
- On a phone it's a centred modal offering "Post on X" and "Discord". There's no native share and no Instagram or TikTok story option, which is where teens actually post.
- Fix: fill the sheet from the actual result. On mobile, make it a bottom sheet whose first action calls the phone's share menu (`navigator.share`) with the story image.

**5. Quit has no confirmation.**
- In play, a single tap on X instantly throws away progress ("Your answers were not saved"). On phones the X sits right next to the progress bar.
- Fix: a confirm sheet ("Leave? 3 of 8 answered", Keep playing / Leave). Better still, keep the run so it can be resumed from Continue.

**6. The blindtest has no audio controls.**
- The quiz game bar has a sound toggle; the music game doesn't. There's no mute, no volume and no "replay clip". Nothing covers iOS silent mode or blocked autoplay.
- Fix: add sound and replay buttons to the game bar, plus a "Tap to play the clip" state when audio fails.

**7. Blindtest reveal on mobile: the Next button is off-screen.**
- When the answer is revealed, the answers drop about 70px and Next ends up at y=851, below an 844px screen. "Next song in 3 seconds" is invisible too.
- Fix: keep the answer positions fixed. Put the album art in place of the orb at the same size, and pin Next with its countdown to the bottom.

**8. The daily "one shot" isn't one shot.**
- After playing Blindtest of the day, it can be started again.
- Home still says "Not played yet today" in three places, and the hub still shows "Play".
- Fix: show a played state everywhere ("8/10 · #212 today · see the board"), and take the daily out of Continue once it's played.

**9. The streak rules contradict each other.**
- Four different rules are shown:
  - Hero: "Play it before midnight to keep your streak" (reads as Today's Ten only).
  - Notification: "one quiz or the daily blindtest".
  - Results: any quiz saves it.
  - Blindtest hub: a separate "3 days blindtest streak".
- The pill stays neutral even though the streak ends in 5h 12m.
- Fix: one rule (any quiz or blindtest), the same sentence everywhere, drop the blindtest streak, and turn the flame pink when the streak is at risk.

**10. Leaderboard can't be reached on mobile.**
- It's not in the tab bar or on the You page; the only way in is the footer. The fandom war is the weekly reason to come back.
- Fix: a Leaderboard row at the top of You, plus a "STAY #2 this week" strip on Home that links to it.

**11. Groups: "Soon" groups are a dead end.**
- About 40% of the A to Z list are "Soon" groups. Tapping one (for example Chungha) opens the BLACKPINK page with a developer toast. No empty group page is designed.
- The page says "90 of 90" while everywhere else says 91, and the Most played row doesn't respond to the filter.
- Fix: an empty group page ("No Chungha quizzes yet. Make the first one" plus "Notify me"), or show those groups as plain text. Hide Most played while filtering.

**12. Quizzes: sorting and filters don't change anything.**
- Newest, Most played and Type=True/false leave the grid exactly the same. No "no quizzes match" state exists.
- Home's "Most played" and "See all new" open /quizzes sorted by Trending.
- Fix: filter the grid for real, add an empty state with "Clear filters", and have those Home links open the matching sort.

**13. Ranked shows the wrong target.**
- "Your best 5" lists 1,420 after "1,540 (lowest)", so "Beat 1,540 to count" is wrong. The number the whole page exists for is incorrect.
- Fix: sort the five descending and target the true lowest.

**14. Controls that do nothing:**
- Blindtest results, "Tap a song to hear the clip again": nothing happens.
- Blindtest hub, "Challenge a friend" card: only a toast.
- Group page, "BLINK room · 17 online": only a toast (live rooms aren't shipping).
- Group page, "Show all 29": only a toast.
- Settings, "Change photo": nothing happens.
- Passport, "Groups mastered" rows: not clickable.
- Home, hero question preview: numbered answers and a check mark, but tapping does nothing.
- Continue "6 of 10 answered": restarts at question 1.
- Fix: wire each one to something real, or remove it. The hero preview should start the daily; Continue should resume at question 7.

## P2

**15. Challenge context is lost during play.**
- "Accept", "Take it" and "Take the rematch" start a run that never shows the score to beat, and "Take it" / "Take the rematch" open the wrong quiz.
- Fix: show "Beat blink_edits: 9/10" in the game bar, and end with a win/lose result.

**16. Search has gaps.**
- A search with no matches ("zzzz") silently shows popular groups, as if they matched.
- Searching "twice" returns the group and a song but no TWICE quizzes.
- The "Esc" keyboard hint shows on phones.
- Fix: a "No results for …" state, quizzes listed under a matched group, no key hints on touch screens.

**17. Home repeats the daily blindtest three times.** Signed in, it appears as the hero link, a Continue row and the plum band. Keep only the band.

**18. Community problems.**
- The right column opens with Community pulse (numbers only) above Daily debate, the one thing in it you can interact with.
- An empty thread posts successfully and never appears in the feed.
- Every post opens the same Challenge post; blog and debate post views don't exist.
- Fix: Daily debate first; validate the post and insert it at the top of the feed; design the blog and debate post views.

**19. Sound labels show on screen.** Faint "Buzz" and "Fanfare" text appears in play and on results, and an "Enter" key hint shows on touch screens. Remove them, or mark them clearly as prototype-only.

**20. Create on mobile has too much chrome, and its fields can't be edited.**
- The top bar, status bar and tab bar use about 210px, and the footer shows inside the editor.
- The title and about fields are `div`s, so no validation can be tested.
- Fix: hide the tab bar and footer in Create, and make the fields real, including the "5 characters or more" error.

## Right, and must stay
1. The top bar: five links, ghost Create, neutral streak pill with its popover, the bell panel whose dot clears after "Mark all read", and focus mode with no bars during play.
2. Answer feedback: "Correct" and "Your pick" with icons and no fading, a timer showing seconds, the "Time is up" state, "Did you know", and Next with an Enter hint on desktop.
3. The quiz page order: breadcrumb, one meta line, Start plus share, then Hall of fame with "Your best · Beat it · Challenge a friend". On mobile the sticky Start sits cleanly above the tab bar.
4. Blindtest results pick their main action by mode ("See today's board", "Play another ranked run", "Play again"), and the "2 challenges waiting" strip with Accept buttons works.
5. The Groups A to Z index with its filter, and the search overlay grouped into groups, quizzes and songs, which opens the first result on Enter.
