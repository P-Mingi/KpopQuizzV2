# ADM join: the UI and the server of admin images on otakuquiz.org, joined (owner, 2026-10-26)

Branch o1/adm = o1/integration + ADM back (7aa6365) + ADM front (b13e76d). This lane replaces the guesses of ADM front (docs/o1/requests/ADM-front.md,
assumptions 1 to 6) with the routes and shapes of ADM back (docs/o1/requests/ADM.md item 3). Nothing in SQL, docs/o1/contracts or docs/launch changed.

## What changed

1. One typed client, `lib/anime/entity-images-api.ts`. Paths, methods and the JSON content type are those of the routes: GET `/api/admin/images/list?site=anime`,
   POST `upload` (multipart through XMLHttpRequest, for the progress), POST `import`, PATCH `focal`, DELETE `/api/admin/images`. A success is `{ ok: true, ... }`;
   a failure is `{ error, code }` and the UI says it from the `code` (`errorWords`, a `Record` over every `ImageErrorCode`, so a new code in part 1 fails tsc).
   The types are part 1's own (type-only imports of `lib/entity-images/{types,list,errors}`): `AdminImage` = `EntityImageDto` (url, url2x, focalX, focalY, sourceUrl,
   licenseNote, updatedAt), `AdminSeries` = `ListedSeries` (published, image, bundled `{ url, alt }`, source, counts, characters with `<series>/<character>` slugs).
   `lib/anime/entity-images-api.routes.test.ts` calls the real route handlers through the client (fetch and XMLHttpRequest are answered by the routes on the
   in-memory database and bucket of part 1): every action, every failure code that can be provoked, the local update of the list equal to the server's list after
   each write, the url and 2x file of an answer equal to what the display builds from the row, and a check that each path the client names is a route file that
   exports the method the client uses.
2. One cache scheme. `lib/entity-images/constants.ts` names `IMAGES_LIST_TAG` (`entity-images:anime`) and `tagsOfImage(kind, slug)` (the tag of the image and the list tag);
   `revalidateImage` expires both on every write (upload, import, focal point, delete). The display's list read (`lib/anime/entity-images-read.ts`, and the credit names)
   is tagged with `IMAGES_LIST_TAG`; the per-image read of part 1 (`display.ts`) keeps its per-slug tag. The test provokes the four writes for a series and a character and
   checks that every image tag the display reads is expired. Cache key of the list read moved to `v2` so no entry of the old scheme can survive a deploy.
3. 2x. `OwnerPicture` carries `src2x` (the `-2x.webp` name of part 1, `path2x`) and `ownerSrcSet` builds `url 736w, url2x 1472w`. The series art (cards, rows, header) draws the owner's image as a
   plain `img` with that srcset and the same `sizes` as the bundled photo, the width and height of the row, eager for the header and lazy elsewhere; the bundled photo still goes
   through next/image. Character portraits are drawn at 80 and 92 px: the 1x file (360 px) is enough there, so they keep the 1x file.
4. Focal point on the personality result. `ResultCard` takes an optional `photo.position` (a CSS object-position) and `CoverImg` an optional `style`; both are added to the element
   only when set (a conditional spread), so on kpopquiz.org the props, the children and the HTML are the base's byte for byte. `ResultView.photoPosition` is set by the anime
   `character-page.ts` only. Proof: `components/o1-result-card-tree.test.ts` (Flight tree snapshots made from the base ResultCard before the change, `__o1_kpop_tree__/result-card-*.json`),
   the existing `o1-kpop-tree.test.ts` and `o1-kpop-personality-tree.test.ts`, and the two kpop chunk scripts (see the report below).
5. /admin: signed out, the middleware sends the visitor to `/login?returnTo=...` with no body (`lib/supabase/middleware.admin.test.ts`); signed in and not in ADMIN_USER_IDS, the page answers the 404
   of the site on every tab (`admin.site.test.ts`, unchanged). Both are also checked live on o1-dev.

## Decisions

- D-8 The characters of the list already carry the key of the routes (`<series>/<character>`), so the UI no longer builds it.
- D-9 An image removed from the admin goes back to the bundled photo (`source: 'bundled'`) or to nothing (`'none'`); `withImage` keeps `source` and `characterImageCount` as the list route would.
- D-10 The owner's series image has its own class (`anime-adm-photo-img`, in adm.css) because the per-site sheet contract forbids an anime sheet to target the o2 classes.
- D-11 The licence label of the form ("My photo") stays the UI's; the database codes are part 1's.

## Requests (rule 11)

- R-1 of docs/o1/requests/ADM-front.md (ResultCard position) is done here, as the owner's brief for this lane asks. Owners of `components/ux-v1/result-card.tsx` and `cover-img.tsx`: the change is
  two optional props, nothing else.
- R-3 of ADM-front.md and request 4 of ADM.md (twins.json row 39, a lane ADM in OWNERSHIP.json and lanes.json) are still for ORCH.

## Proof on o1-dev (dual fixture as the only admin of a server started for the run, 26 October 2026)

Builds of kpop, anime and hub by scripts/o1-tools/dev-up.sh at 6f09e6f (green); anime server on port 3195 with ADMIN_USER_IDS = the dual fixture. A browser script (Playwright, 1440 by 900) drove the
real UI and read the real pages after each write: 33 of 33 checks passed. Signed out: /admin is a 307 to /login?returnTo=%2Fadmin with no admin content; a signed in account that is not an admin gets 404 on /admin and on the list route.
On the series death-note: upload of a file, then import of a Commons address (a panorama that is too small for a cover is refused in plain words first; nothing stored), then a focal point, then a portrait of Light Yagami
(the character the quiz gives with all first answers) with its focal point, then removals. After each write, in a fresh page load: the series hub header, the card on /series, the characters row (portrait tile) and the
personality result showed the right image or the bundled photo, with the focal point as object-position (20% 30% on the cover, 70% 20% on the tile, 30% 75% on the result), the hub image offering `736w, 1472w` (the 2x file), the bucket holding exactly the 1x and 2x file of the current image,
and the answer coming 3.5 s after the click. At the end o1-dev has no test row in entity_images and no file in the bucket entity-images (checked with the service role). Screenshots: docs/o1/reports/ADM/real-*.png (list, open series, upload in progress at 29 percent; light and dark).
Part 1's e2e (apps/quiz/e2e/o1/ADM/images-api.o1.ts) passed 9 of 9 against the same server.

Limit of this proof, for ORCH: `next start` (not Vercel) cannot regenerate a prerendered page of the anime build once its cache entry is expired, because `sites/[site]/layout.tsx` has `dynamicParams = false` and
next start answers NoFallbackError for the rewritten path (non minimal mode, app-page template, `!isMinimalMode`): the pages become a 404 shell after the first write. Any tag expiry does it (the layout reads the cached image rows, so
every anime page carries the list tag); it is not caused by the tag scheme of this lane, which only makes it visible (before, no write expired a tag a page carried). Vercel runs in minimal mode and regenerates. For the proof only, the anime build was
made with `dynamicParams = true` in that layout (a one line edit, reverted before the commit, never committed). Owner: the production behaviour needs one look on the Vercel preview (write an image, reload the series page).
