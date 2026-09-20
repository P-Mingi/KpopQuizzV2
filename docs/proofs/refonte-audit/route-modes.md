# refonte P0 audit - render modes of the killed routes (read from page exports, no build)

Read from `export const dynamic` / `export const revalidate` on each route's page.tsx. This is the
route table the KILL-MAP and KILL-SEO were audited against (a full `next build` was not run: the
mission is recon, no build needed).

| Route | Render mode | In sitemap |
| --- | --- | --- |
| /games (hub) | ISR revalidate 3600 (Static) | yes |
| /pt/games | ISR 3600 | yes |
| /games/sort-it (+ [slug]) | ISR 3600 | yes |
| /games/match-up (+ [slug]) | ISR 3600 | yes |
| /games/name-them-all (+ [slug]) | ISR 3600 | yes |
| /games/name-all (+ [slug]) | ISR 600 | yes |
| /games/this-or-that (+ all, [slug]) | ISR 600 ([slug] 301s) | partial |
| /rankings (+ [group]/[type]) | ISR 3600 | yes (21) |
| /tier-list (+ sub-routes) | ISR 3600 | yes (4) |
| /personality (+ [group], /r/[member]) | ISR 3600 | no (only /which-* alias is advertised) |
| /which-{group}-member-are-you | middleware rewrite to /personality/{group} (no page file) | yes (21) |
| /battle | force-dynamic (noindex) | no |
| /avatar-studio | noindex, absent from KNOWN_ROUTES (already 301s to home) | no |
| /pinterest-feed.xml | route handler (feed) | no |

Consequence: the killed indexed URLs are the ISR game/rankings/tier-list/which- pages (about 98 in
the sitemap). /battle and /personality/[group] are not advertised, so removing them is SEO-neutral.
