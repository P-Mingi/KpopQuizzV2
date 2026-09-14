# TIERLIST phase 3.2 proofs (nav room + home CTA + safe seed scripts)

Built on `next build` + `next start` (:3021), never dev. See `docs/loop/REPORT.md`.

ITEM 1 - nav:
- `nav-1024.png`, `nav-1280.png`, `nav-1440.png` - desktop bar with "Tier Lists", NO world toggle,
  no wrap at any of the three widths.
- `footer.png` - Discover column now has Fandoms (-> /verse) and Tier Lists.
- `verse-topbar.png` - the Verse topbar keeps its "Play" toggle (way back to Play untouched).

ITEM 2 - home CTA:
- `home-cta-desktop.png` / `home-cta-dark.png` / `home-cta-390.png` - the one strong launch band
  (dark ink->plum->violet, tilted mini tier board), desktop light, dark, and 390px.
- `home-top.png` - the CTA in the high slot above the daily pair.
- `grep-one-cta.txt` - exactly one <TierListHomeCta />, zero .pq-banner rules; toggle removed from
  top-nav-bar, still used by mobile + verse topbar.

ITEM 3 - seed scripts:
- `seed-scripts-refuse.txt` - each of the four legacy seed scripts, run without the confirmation,
  names the resolved project and REFUSES to write. No env file touched.

Cross-cutting:
- `tests.txt` - 51 unit + 26 e2e passed / 8 skipped.
- `gates.txt` - docs-secrets/routes/indexability/orphans PASS (no new orphan; Verse still linked);
  metadata-dupes = pre-existing verse dupes only.
