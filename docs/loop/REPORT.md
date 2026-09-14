# REPORT - TIERLIST phase 3.2: navbar room + one strong home CTA + safe legacy seed scripts. No push.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). Last polish before the push: three items, all done.
Built and proven on `next build` + `next start` (:3021), never dev. No env file touched, no new
migration, no push, no em dashes. Proofs: `docs/proofs/tierlist-p3.2/`.

## ITEM 1 - navbar room, Verse kept reachable

- Removed `<WorldToggle />` (and its import) from `src/components/layout/top-nav-bar.tsx` ONLY. The
  Verse topbar toggle (`verse-topbar.tsx`, the way back from the Verse) and the mobile top bar
  toggle are untouched (proof `verse-topbar.png` shows the "Play" toggle still there).
- Consequence handled: the Play shell had no other /verse entry, so a Verse link ("Fandoms" ->
  /verse) was added to the site footer's Discover column (`footer.tsx`), keeping /verse reachable at
  every viewport (proof `footer.png`). A "Tier Lists" footer link was added alongside it in the same
  column.
- Nav fits on one line with "Tier Lists" present and no toggle at 1024 / 1280 / 1440 (proofs
  `nav-1024/1280/1440.png`): no wrap. e2e asserts the desktop bar has no world toggle and the footer
  /verse link resolves.

## ITEM 2 - one strong tier-list CTA in the high slot

- Removed the personality `pq-banner` from the home page (its own comment marked it a launch-week
  banner) and its now-unused styles from globals.css. Personality quizzes keep every other presence
  (nav, /games, sitemap, their pages) - only the home banner is retired.
- Exactly ONE tier-list CTA on the home page now (`grep-one-cta.txt`: one `<TierListHomeCta />`,
  zero `.pq-banner` rules), placed in the slot the personality banner occupied - above the daily
  pair (e2e asserts the CTA's Y is above `.daily-twoup`, so it does not push the daily pair below
  the fold).
- `TierListHomeCta` rewritten to a dramatic launch band per `docs/design/tier-list/Home.dc.html`
  and the `frontend-design` skill: a dark ink -> plum -> violet card (house tokens only: brand rose,
  --photocard-plum / --photocard-violet, DM Sans, radius 20, --shadow-lift), a "NEW MODE · JUST
  LAUNCHED" kick, a big tight title, and a tilted mini tier board (S/A/B face tiles) as the
  memorable element, with a staggered row entrance and a button hover-lift. No emoji (inline SVG
  only, one stroke set). Primary "Start ranking" -> /tier-list/new, secondary "Browse tier lists"
  -> /tier-list; both links work. Responsive (board hides < 760px, buttons stack at 390px), dark and
  light both correct (the card is dark by design in both), keyboard reachable. Proofs
  `home-cta-desktop.png`, `home-cta-dark.png`, `home-cta-390.png`, `home-top.png`.

## ITEM 3 - legacy seed scripts made loud + safe (no env file touched)

`scripts/import-batch1.ts`, `seed-platform.ts`, `seed-comments.ts` and `seed-expanded-games.ts`
read the repo-root `.env.local` (the DEAD project). No env file was edited, moved or deleted, and
they were NOT silently repointed at production. Instead each now, before any write:
1. resolves its env preferring `apps/quiz/.env.local` (the `ENV_CANDIDATES` convention from
   `seed-duels.ts`), failing loudly if none is found;
2. prints the resolved Supabase project ref (host only, never a key);
3. REFUSES to run unless `SEED_CONFIRM_PROJECT=<ref>` matches the resolved ref, exiting with a
   message naming the ref it would have written to.
Their seeding logic is otherwise untouched. Proof `seed-scripts-refuse.txt`: each of the four,
run without the confirmation, prints `target Supabase project: rdkgouofytwfdpbxbzio` and
`REFUSING to write. Re-run with SEED_CONFIRM_PROJECT=rdkgouofytwfdpbxbzio`, and performs no write.

## Explicitly NOT done (per the mission)

The `/api/tier-list/view` throttle is unchanged (the in-memory per-instance Map is the repo pattern;
views rank nothing). No Redis/KV, no view-dedup migration. No audited phase 1-3.1 work reopened.

## Tests

Unit (vitest, 51): unchanged, all green. e2e (Playwright, 26 passed + 8 skipped desktop-only-on-
mobile): the home CTA is present in the high slot with working links AND the personality banner is
gone AND exactly one tier-list CTA; the desktop nav has no world toggle; the footer /verse link
resolves. Every prior phase-1/2/2.5/3/3.1 test still green.

## Render modes + SEO

Route modes unchanged from phase 3.1 (`nav-*`/CTA are chrome + a static home band; no route added or
changed). Gates (`gates.txt`): docs-secrets + routes PASS. indexability / orphans / metadata-dupes
are NONZERO, but every offender is pre-existing and unrelated: the recurring katseye/bts quizzes
(/katseye-trivia, /q/katseye-quiz, /q/bts-true-or-false...) that flip in and out of the local
sitemap by seed-data state, and the verse-inflation /verse/* dupes. The load-bearing check for this
phase: NO NEW orphan from removing the toggle or the personality banner - `/verse` has 0 orphan
hits (the footer Fandoms link keeps it reachable) and `/personality` has 0 orphan hits (it keeps
its nav/games/sitemap presence); a grep for tier-list across every failing gate = none. Zero emoji
in the CTA (inline SVG), zero em dashes.

## Owner gate

1. **Push** - local main is ahead of origin; nothing pushed (including this report).

---

STOP. Navbar has room (toggle removed from the desktop bar only, Verse kept reachable via the
footer + the Verse/mobile toggles), the home page shows exactly one strong tier-list launch CTA in
the high slot (personality banner retired), and the four legacy seed scripts now refuse to write
without an explicitly confirmed target. 51 unit + 26 e2e green; docs-secrets + routes gates PASS and
the three NONZERO gates carry only pre-existing, non-tier-list offenders (/verse and /personality
are NOT orphaned, so nothing was stranded). The whole tier-list feature (phases 1 -> 3.2) is complete
and push-ready. Nothing pushed.
