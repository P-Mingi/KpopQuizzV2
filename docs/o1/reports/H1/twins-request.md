# H1 request to ORCH: three rows of docs/o1/contracts/twins.json

Lot (d), lane H1. `/passport`, `/settings` and `/u/{username}` of the hub now render nothing of their own (they redirect to the
home site of the member), so three rows can no longer list a mustImport. With the changes below, `twins.mts --twins` on the
H1 tree reports only the 3 `copy` violations that the base already has (passport-ui/login-body.tsx and
passport-ui/world-settings.tsx, lane P1); without them it adds 4 `missing-import` lines.

| row | file | change |
|---|---|---|
| H-3 | `apps/quiz/src/app/sites/[site]/(hub)/passport/page.tsx` | `mustImport`: `[]` (was `@/components/profile/ux-v1/passport` and `passport-guest`). `renders`: nothing of its own; the page redirects. `body`: `shared` stays or becomes `none`, as the contract allows. |
| H-5 | `apps/quiz/src/app/sites/[site]/settings/page.tsx` | `mustImport`: `[]` (was `@/components/profile/ux-v1/settings`). Same note as H-3. |
| 18 | same file as H-5 | `mustImport`: `["@/components/passport-ui/world-settings"]` (was `@/components/profile/ux-v1/settings`, which this file only reached through the kpop page that the hub copy imported). The anime branch renders `UxWorldSettings`. |

Row H-4 (`u/[username]/page.tsx`) is unchanged: its anime branch still imports `@/components/profile/ux-v1/passport`.

Not touched, and open for P1: the 3 pre-existing `copy` violations above.
