# TIERLIST phase 3 proofs (the DB half)

Built on `next build` + `next start` (:3021), never dev. Every live check seeded rows via the
service role and TORE THEM DOWN (DB + bucket clean). See `docs/loop/REPORT.md`.

- `part0-probe.txt` - migration 146 confirmed APPLIED (both tables + full column set).
- `partAB-live-verify.txt` - publish auth posture; the public slug page (real photos + fandom
  agrees); the subject/community page; visibility (public indexable, unlisted noindex, private 404,
  unknown 404). Seed rows torn down.
- `public-list.png` - a published list page: ranking with real photos, byline, like, "Where the
  fandom agrees" (correct live aggregate across 2 lists), "Remix", "Make your own version".
- `subject-page.png` - the community page for BTS members: consensus board + community lists grid.
- `partC-seam-verify.txt` - custom upload -> pending; admin gate (401 without admin); a pending
  asset hidden from a public page (RLS) and blocked from public publish, approved allowed; the
  closed L-223 seam. Seed rows + storage objects torn down.
- `seam-custom-og.png` - the OG card for a board with an APPROVED custom asset: the custom face
  (from *.supabase.co) renders as a real photo beside the bank faces, no OG change.
- `tests.txt` - 34 unit (vitest) + 23 e2e passed / 7 skipped (Playwright desktop + mobile).
- `route-modes.txt` - public + subject pages ● (SSG/ISR indexable); tools f; no existing URL changed.
- `gates.txt` - docs-secrets + routes PASS; the 3 failing gates report only pre-existing,
  non-tier-list offenders (grep for tier-list = none).
- `no-emoji.txt` - 0 emoji across 36 tier-list source files; every icon is inline SVG.
