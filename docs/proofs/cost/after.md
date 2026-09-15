# COST, the AFTER proof (on next build + next start)

## PART 1, middleware invocations (the 67k)

The matcher now EXCLUDES the known cached page prefixes so they never invoke the
middleware function; everything that needs runtime logic still matches.

Behaviour matrix against `next start` on :3021 (every case identical to before):

```
/blind-test            -> 301 /blindtest          (legacy 301, kept)
/blind-test/sample     -> 301 /blindtest/sample   (sub-path + query, kept)
/create-preview        -> 307 /create             (kept)
/battle-preview        -> 307 /battle             (kept)
/which-bts-member-are-you -> 200                  (personality rewrite, address bar kept)
/q/seventeen-true-or-false -> 200                 (excluded page renders)
/games                 -> 200                      (excluded page renders)
/games/does-not-exist  -> 404                      (bad sub-path, unchanged)
/zzz-nonexistent-xyz   -> 301 /                    (unknown-route 301, kept)
/q                     -> 301 /                    (unknown exact, kept)
```

The matcher exclusion is unit-proven: `src/middleware-matcher.test.ts`, 85 cases,
asserts every excluded prefix (/q/*, /, /games, the -quiz/-trivia group pages, ...)
does NOT invoke middleware, while /verse/*, /login, /onboarding, /settings, /admin,
the retired 301 sources, the /which-* rewrite and genuinely unknown paths still do.

Arithmetic. The auditor's split had middleware 67,739 / day, dominated by cached
known pages (/q/[slug] alone 17,139). Those pages now match none of the middleware
work and are excluded from the matcher, so they pay zero middleware invocations. The
residual middleware invocations are the genuinely runtime paths only: /verse/*, the
protected auth prefixes, the low-traffic legacy redirect sources, and truly unknown
URLs. On the measured traffic mix that is the large majority of the 67,739 removed;
the owner can read the exact new number on the Vercel "by source" panel after deploy.

## PART 2, /api/auth/me per-pageview calls

The four nav islands (profile chip, notification bell, mobile top bar, home streak
nudge) now share one `useMe()` request via a module-level cache, so a page view makes
at most one `/api/auth/me` call instead of 2 to 4. Login/logout behaviour is
unchanged: the cache clears on a full reload exactly like the mounted islands did, so
the nav updates on the next full navigation, never on a pure client refresh (same as
before). Signed-out remains the fail-soft default.

## PART 5, the duplicate-title collision

`check:metadata-dupes` against live production found exactly ONE collision across 738
indexable URLs: two published SEVENTEEN true-or-false quizzes rendering an identical
title. The sitemap now advertises only one URL per (title, question count), the
most-played, so after this deploys the sitemap carries `/q/seventeen-true-or-false-65`
(390 plays) and drops `/q/seventeen-true-or-false` (265 plays). Proven on the local
build: the sitemap now emits a single seventeen-true-or-false entry. The dropped page
still works and self-canonicals; it just leaves the sitemap.

The local build (service-role key, Verse visible) reports 7 collision groups across
1027 URLs, but those extra 6 are Verse/rankings pairs that do NOT appear in the
production sitemap (Verse is hidden and rankings need votes the anon key reads as 0) -
the same VERSE_PUBLIC-vs-hidden scope point the mission flagged. Production, the real
indexed set, had only the one, and it is fixed. The nightly `gates` job (anon key,
Verse hidden, rankings excluded) sees a subset of production, so it clears too; the
branch CI run is the authoritative check.
