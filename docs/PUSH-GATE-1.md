# PUSH-GATE-1 - publish the quiz, hide the Verse (2026-08-05)

Owner chose OPTION 1 (push everything after a pre-push gate) and asked:
can we push all AND hide the Verse totally from the public? Answer:
YES, cleanly, and it is strategically RIGHT given V-FOUNDATION. Design
and plan below; three rulings at the end.

## 1. The hide design (VERSE_PUBLIC flag)

- One env flag VERSE_PUBLIC=false in prod. Middleware rule: any
  /verse/* request WITHOUT a curator/admin session -> 302 to /verse,
  which serves a single honest TEASER page ("Le Verse arrive: the
  fan-built BTS encyclopedia, in construction"; no fake countdown, no
  fake screenshots; covenant link kept). Logged-in curators/admin see
  EVERYTHING (builder, spaces, admin queues keep working in prod).
- SEO mechanics: teaser page indexable (ONE page keeps the story
  alive); every other verse route noindex + OUT of the sitemap while
  the flag is off; 302 (temporary) not 410, so Google understands
  "coming back", existing equity parked rather than executed.
- Fail-closed: flag missing = hidden. Flip the env var to relaunch.
  Zero data touched, zero code deleted, reversible in one deploy.

## 2. Why hiding is the right call (honest reasoning)

- V-FOUNDATION will rebuild the public verse surface (new URLs, new
  document pages, new nav). Every public bascule would otherwise need
  an SEO-parity proof against live prod: the strangler law would
  handcuff the rebuild. Hidden verse = we iterate at full speed and
  relaunch ONCE, perfect, with fresh sitemap + redirects from any old
  indexed URLs (they must 301 at relaunch, never 404: eternal-redirect
  law C2 applies retroactively).
- Cost, stated honestly: current verse indexing pauses for some weeks
  (present equity is small and its URLs change at F-launch anyway);
  no public verse until the relaunch gate.
- Community: existing curators keep full access (session-gated), the
  recruitment thread pauses until relaunch.

## 3. The gate plan (who does what, in order)

G1 WORKER (verse) - finish step 5 + receipts R-A/R-B (in flight).
G2 WORKER (verse) - short mission PUSH-GATE: build VERSE_PUBLIC flag +
   teaser page + middleware rule + sitemap/noindex wiring, prove:
   anonymous 302 on every /verse route (probe list), curator session
   passes, teaser renders, sitemap excludes verse, gates green. Also
   produce HEAD SNAPSHOTS of the top quiz routes (home, /games, each
   game lobby, rankings, pt pages) as files for G3.
G3 COWORK - audit: compare worker head snapshots vs LIVE PROD heads
   (fetched from kpopquiz.org): title/meta/canonical/JSON-LD diffs on
   quiz surfaces must be intentional-only; screenshot pass on the
   games hub; verify the games-worker fixes are committed (the 4 tsc
   repairs must be in a commit, not floating in the working tree).
G4 OWNER - final rulings re-raised (below), then OWNER pushes
   (git push origin main: the only hands allowed; hooks keep blocking
   the workers). Vercel env: set VERSE_PUBLIC=false BEFORE the push
   lands, so the deploy comes up hidden.
G5 COWORK + OWNER - post-deploy smoke: quiz features live, anonymous
   /verse/* -> teaser, curator login sees the verse, GSC: nothing
   alarming in 48h. Log everything to the ledger.

## 4. Rulings needed (oui / non / amende)

P1 Hide method as designed (flag + 302 + one indexable teaser +
   curator bypass). REC: OUI.
P2 pt-leaderboard fake users: this push makes the Play side the whole
   public story. The covenant tension stands (fabricated rows on a
   public leaderboard). REC: purge or clearly label them BEFORE this
   push; owner previously chose KEEP: final call now, it ships with
   this push.
P3 After this push, pushing becomes routine for the quiz side (the
   games worker's future commits ship whenever owner pushes). The
   verse relaunch keeps its own gate (full QA + redirects + sitemap)
   at the end of V-FOUNDATION. REC: OUI.

Backup note: this push also resolves the L-031 backup worry: GitHub
holds the full history again.
