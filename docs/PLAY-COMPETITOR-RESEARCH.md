# PLAY COMPETITOR RESEARCH (2026-08-04 · Cowork subagent sweep)

Sites audited: kpople.net · kpopless.com · kpopdle.com · kpopdle.app ·
heardle.live · kpopidle.com. Method: direct fetch of every site +
search reconstruction where JS-blocked (flagged inline).

## 1. Precise inventory

### kpople.net (KPOPLE) - partially JS-blocked, reconstructed
- One Wordle-style DAILY idol-guessing game, 8 guesses, attribute
  feedback grid. Modes: Girl Group / Boy Group.
- Accounts + leaderboard (the ONLY competitor with real accounts).
- SEO blog (strategy guides). Stats page: most-guessed idols.

### kpopless.com (Kpopless)
- 3 dailies, all song-heardles: General (2000+ tracks), Boy Groups,
  Girl Groups. Clips lengthen 1-2-4-7-10s over 6 attempts,
  autocomplete guesses, free skip.
- Album Guess: identify album from cover art revealed over 6 guesses.
- Daily only, reset midnight London. Spoiler-free share scorecards,
  results in localStorage. No accounts, no leaderboard.

### kpopdle.com (Kpopdle)
- SIX daily wordles: Girl Groups · Boy Groups · Female Idols · Male
  Idols · Girl Groups MVs · Boy Groups MVs (MV = guess from frames).
- Type-and-select; per-attribute feedback Correct / Partial / Wrong +
  Higher/Lower arrows (debut year, member count...).
- Up to 2 hints, countdown to next puzzle, yesterday's answer,
  copy-to-clipboard share. No accounts.

### kpopdle.app
- 4 daily modes: Group · Idol · Song · Photo, with Girl/Boy filter
  across modes. SPA, sub-modes unverified by direct fetch.
- Daily, resets midnight UTC, streaks + share implied.

### heardle.live (K-Pop Heardle)
- 201 PER-ARTIST heardles (one page per artist, searchable catalog).
- Daily mode per artist (1/2/4/7/10/15s over 6 tries, streaks per
  artist) + Practice mode (unlimited, does not touch daily stats) +
  Multiplayer in nav (mechanics unverified).
- Spoiler-free share grid. Optional sign-in syncs stats. Donations.

### kpopidle.com (Kpopidle)
- One daily idol wordle, 8 attempts. Color feedback: green = match,
  yellow = age/debut within 2 years or height within 5cm. Optional
  silhouette reveal, hints.
- KILLER retention feature: "Previous" archive, replay any past date.
  Local stats (win/loss, guess distribution). No accounts/share seen.

## 2. Market read

Every competitor lives on ONE engine: daily wordle-style deduction +
spoiler-free emoji share grid. That exact habit + virality loop is
absent from our stack (our Blind Test is a heardle but has no share
grid, no streak surfacing, no escalating clips, no archive).

## 3. Ranked gaps for KpopQuiz (retention x cost x legal)

1. DAILY "IDLE" idol-guess with attribute feedback (group, gender,
   gen, debut year, nationality, position, birth year, height with
   Higher/Lower). Pure metadata we already hold. Legal: perfect.
   Cost: low. Add Girl/Boy/Gen filters + replayable archive.
   STATUS: owner-approved to Play backlog 2026-08-04 (L-033).
2. Share grid + streaks retrofitted on the existing Daily Blind Test
   + escalating clips 1-2-4-7-10s over 6 tries. Near-zero cost.
   STATUS: owner-approved to Play backlog 2026-08-04 (L-033).
3. Group-dle: same engine, second daily slot (kpopless proves 3
   dailies/day works). Group metadata only.
4. Album Guess (progressive cover reveal) / MV-frame mode / photo or
   silhouette modes: LEGAL FLAG. Album art + MV frames + idol photos
   are copyrighted; only viable if preview-API artwork licenses cover
   display. Verify BEFORE building. Photo modes: skip without rights.
5. Practice/unlimited mode for dailies (anti-bounce, cheap).
6. Per-artist daily heardles (heardle.live's 201-page model): SEO
   surface + per-fandom habit, fully legal with our 30s previews.

NOT copying: accounts/leaderboards (our Elo duels already exceed) and
lyrics-based modes (standing no-lyrics law).

## 4. G-HUB redesign (locked 2026-08-04, L-033)

Hero carousel removed · dailies first with visible streak · one-click
Play = straight into the default variant (variant landing pages kept
for SEO only, hub skips them) · compact tiles, no animated previews ·
in-game mode switcher with image cards instead of interstitials ·
featured live-ranking bar rotates daily. Hi-fi prototype:
prototypes/games-hub-v2.html.
