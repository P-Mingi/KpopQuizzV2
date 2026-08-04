# G-HUB v2 step 5 - daily ranking rotation

## What changed
The hub's featured live-ranking bar was the single top-voted public ranking
(static). It now rotates DAILY among ALL live (public) rankings via pickDaily():
a deterministic pick by UTC day (days since epoch % list length). Applied on both
/games and /pt/games. The "changes daily" badge (shipped in step 2) now reflects
real behaviour.

## ISR-safe + deterministic (mission point 5)
- No randomness at render: the pick is a pure function of the day, so every
  viewer sees the same ranking on a given UTC day.
- ISR-safe: the cached render holds one day's pick; on the next revalidation
  (revalidate 3600) after the UTC day rolls over, it re-picks the new day's
  ranking. No client work, no per-request variance.
- Proof (rotation-check.txt): same UTC day -> same pick (A); six consecutive days
  -> A B C D A B (rotates + wraps); empty list -> null.
- Stable order before the date pick (votes desc, then group:type key) so ties do
  not make the sequence non-deterministic.

## SEO parity (law 1)
The bar still emits a /rankings/{group}/{type} link + the /rankings link every
day; only WHICH specific ranking is featured rotates. The link category + counts
are unchanged, so the hub link set stays identical-or-richer. Min-gate: when no
public ranking exists, pickDaily returns null and the whole bar self-hides
(unchanged behaviour).

## Gates
tsc 0 · check:routes 335 · em-dash clean.
