# KILL-SEO - SEO impact of the kill (READ ONLY audit, 19 Sep 2026)

Grounded in the GSC 3-month export (docs/refonte/gsc/, DATA-19SEP.md) and the live prod sitemap
(738 URLs, fetched 19 Sep). The kill is settled; this document sizes its SEO cost, states the 301
map that turns the kill into consolidation, and lists the gate fixtures the execution mission must
update so the kill lands green.

## Indexable surface before / after

- Prod sitemap today: 738 `<loc>` URLs (measured).
- Killed URLs in the sitemap (measured by pattern):
  - games family: about 52 (`/games` 1, `/games/sort-it` 5, `/games/match-up` 15,
    `/games/name-them-all` 4, `/games/name-all` 25, `/games/this-or-that/all` 1, `/pt/games` 1).
  - `/which-{group}-member-are-you` (personality pretty URLs): 21.
  - `/rankings` + `/rankings/{group}/{type}`: 21.
  - `/tier-list` family (`/tier-list`, `/tier-list/l/{slug}` x2, `/tier-list/subject/...`): 4.
  - Total killed and in the sitemap: about 98 URLs (13 percent).
- After the kill: about 640 URLs. Not in the sitemap and therefore SEO-neutral to remove:
  `/battle` (force-dynamic, noindex) and `/personality/[group]` (only the `/which-*` alias is
  advertised).

## Are the killed URLs indexed, and what do they earn

The 738 are the indexable set the site advertises; GSC shows the killed patterns earn almost
nothing:

| Killed pattern | Organic clicks (3 mo, GSC) | In sitemap | Likely indexed |
| --- | --- | --- | --- |
| /games (hub) | 17 | yes | yes |
| name-them-all / name-all | 12 | yes (29 URLs) | yes |
| personality / which-* | 10 | yes (21) | yes |
| this-or-that | 7 | yes (1) | partial |
| rankings | 1 | yes (21) | thin |
| sort-it, match-up, tier-list, battle | 0 to 1 each | mixed | thin |
| KILL LIST TOTAL | about 48 (1.5 percent of 3,100) | | |

Reading: the entire kill costs about 1.5 percent of organic clicks. The site's real SEO engine is
untouched: the group `-quiz` / `-trivia` hubs (1,680 clicks, 54 percent), the home (722), the `/q/`
quiz pages (248), and blindtest (190, already ranking with no push). Nothing in the kill is an
acquisition surface; the losses are internal-engagement surfaces (nav and cross-promo driven).

## The 301 map (never mass to home; conserve equity to the nearest kept surface)

| Killed URL pattern | 301 target | SEO reasoning |
| --- | --- | --- |
| `/games`, `/pt/games`, `/games/sort-it`, `/games/match-up`, `/games/name-them-all` (indexes) | `/quizzes` | generic "play a kpop quiz" intent lands on the kept browse hub |
| `/games/name-all/[slug]`, `/games/name-them-all/[slug]` (group-scoped) | `/{group}-quiz` | "name all BTS members" carries BTS intent; the group hub is the kept surface with that fandom and the strongest ranking |
| `/games/this-or-that*` | `/{group}-quiz` if group-scoped, else `/quizzes` | keep fandom intent on the fandom hub |
| `/rankings` | `/quizzes` | generic |
| `/rankings/{group}/{type}` | `/{group}-quiz` | group intent to the group hub |
| `/which-{group}-member-are-you` (+ `/r/{member}`) | `/{group}-quiz` | 21 indexed URLs, real "which BTS member are you" intent; the group hub conserves fandom equity far better than /quizzes or home. IMPLEMENT AS a next.config redirect once the middleware rewrite is removed |
| `/personality`, `/personality/[group]` | `/{group}-quiz` (group) or `/quizzes` (index) | same intent, kept surface |
| `/tier-list`, `/new`, `/create`, `/share`, `/mine/*` | `/quizzes` | generic "make/browse" intent |
| `/tier-list/l/[slug]` (published lists, 2 live, in sitemap) | `/{group}-quiz` (resolve subject_group_id) | a public "aespa members" list points at the aespa hub |
| `/tier-list/subject/[group]/[kind]` | `/{group}-quiz` | group intent |
| `/battle`, `/battle-preview` | `/quizzes` | noindex, SEO-neutral internal redirect |
| `/pinterest-feed.xml` | remove (410 or delete) | a feed, never an indexed page |
| `/avatar-studio` | already 301s to home (absent from allowlist), noindex, no inbound links | leave as-is |

Every 301 must be a real edge redirect (next.config `redirects()` for the static patterns, so no
runtime middleware cost) with the killed URL removed from the sitemap at the same time. Four weeks
of GSC watch after, per the owner's ritual.

## The Name Them All case, argued with its numbers

Name Them All plus the DB-backed name-all quizzes earned 12 organic clicks in 3 months (GSC),
against 4,549 internal plays in the last 30 days (name_all_member_results). It is played
internally (nav and cross-promo) but does not acquire from search. The "name all X
members/songs" search intent is real but sits at 0 to 2 clicks per query. Verdict: it dies with
the games page; the intent is captured later as a quiz TYPE inside the quiz house (same engine, a
new mode), not as a standalone product. The 29 name-all sitemap URLs 301 to their group hubs, so
the little equity they hold moves to the fandom hubs that already rank.

## Gate fixtures the execution mission must update (so the kill is green, not red)

The five SEO gates plus the tier-list gate:

- `check:routes` (check-route-allowlist.mts): walks `app/` and fails when a page route is not
  reachable via `isKnownRoute`. Remove the app routes AND their KNOWN_ROUTES entries in the same
  change, or the guard flags the orphaned routes. This is the gate most likely to go red if the
  kill is half-done.
- `check:orphans` (nightly): crawls every sitemap URL and flags orphans. After the killed URLs
  leave the sitemap and every inbound link is removed, it stays green. Watch: a missed inbound
  link to a killed page will not fail orphans (that checks sitemap membership), but a killed URL
  left in the sitemap while its page is gone WILL surface as a non-200. Remove sitemap entries and
  pages together.
- `check:indexability`: checks each sitemap URL returns 200 and is not noindex. Removing killed
  URLs cannot break it; leaving a killed URL in the sitemap that now 301s WILL (a 301 is not 200).
  So the sitemap edit is mandatory alongside the redirects.
- `check:metadata-dupes`: checks sitemap URLs for duplicate or blank title/description. Removing
  URLs only shrinks the set; stays green. (The one live collision, two SEVENTEEN quizzes, was
  already fixed by the sitemap title-dedup in PR #24; unrelated to the kill.)
- `check:tier-list` (check-tier-list.mts): a dedicated gate for the tier-list feature. It dies
  with tier-list; remove the script and its CI step (in `.github/workflows`), do not leave a gate
  pointing at deleted code.
- `check:verse-tokens`: unaffected (Verse untouched).
- `middleware-matcher.test.ts`: the matcher unit fixture (the one that proved PR #24) asserts on
  `/games*`, `/rankings*`, `/battle`, `/personality`, `/tier-list`. Update it when those
  exclusions and the personality rewrite are removed, or the unit gate goes red.

Net: the kill is SEO-safe (1.5 percent of clicks, all consolidated to group hubs), and the only way
it turns red is a half-done change (a page removed but its sitemap entry, allowlist entry, or
inbound link left behind). The gates exist precisely to catch that; keep every kill atomic
(route + sitemap + allowlist + inbound links + redirect together).
