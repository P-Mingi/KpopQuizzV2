# Parity run 7 (2026-10-05, launch prep)

The scripts print "feat/v12" for side a: here side a is `v12/launch-prep` (c23645b, the copy review), side b is
`origin/main` (a16ee15, PR #91). Both built with `NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`, `NEXT_PUBLIC_BT_TRACKING`
unset, built one after the other, served on :3081 and :3082 at the same time.

- Sitemap 3166 = 3166, same URLs. robots.txt byte identical.
- SEO fields: 2 differ, both live data: one more activity link on `/leaderboard` (a fan's play), `/stats` JSON-LD
  counts.
- Server HTML after `c3-parity-normalize.mjs`: 35 of 38 identical; `/leaderboard`, `/news`, `/stats` differ only by
  live counters and the activity feed (`normalized.txt`).
