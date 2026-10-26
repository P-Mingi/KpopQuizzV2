# ADM front: requests, assumptions on part 1, and decisions

Lane ADM front (branch o1/admfront). The admin UI and the display of the owner's images on otakuquiz.org. Part 1 (ADM back) was not merged when this
was written, so everything below that touches its API is an assumption, held in one place: `lib/anime/entity-images-api.ts` (paths, shapes) and
`lib/anime/entity-images-rules.ts` (types, the character key). ORCH: read this list before the two lanes are merged and reconcile.

## Assumptions on ADM back (change them in the two files above, nothing else moves)

1. Paths. `GET /api/admin/images/list?site=anime`, `POST /api/admin/images/upload` (multipart: kind, slug, file, meta as a JSON string),
   `POST /api/admin/images/import` (json: kind, slug, url, meta), `PATCH /api/admin/images/focal` (json: kind, slug, x, y),
   `DELETE /api/admin/images` (json: kind, slug). The brief names the verbs and the folder, not the exact paths of focal and delete.
2. Answers. `{ ok: true, image }` or `{ error }` (a code such as `too_large`, `url_blocked`, or a sentence; the UI turns known codes and the HTTP
   status into plain words). List: `{ ok: true, series: [{ slug, name, image, bundled: { file, alt } | null, characters: [{ slug, name, role, image }] }] }`,
   `image` being the display columns of the row (kind, slug, path, width, height, focal_x, focal_y, source_url, author, license, license_note, updated_at).
3. The key of a character. The unique key of the table is (site_id, kind, slug) and a character slug is unique inside its series only (011:
   `characters_series_slug_key unique (group_id, slug)`). The UI sends and reads `slug = "<series-slug>/<character-slug>"` for kind 'character'
   (`characterImageSlug`). If part 1 chose another key, change that one function.
4. `path` is the path inside the public bucket `entity-images`; the display URL is
   `<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/entity-images/<path>?v=<updated_at>`. The 2x files are not used: their names are not in the brief,
   and a guessed name would be a broken image on a retina screen. When part 1 fixes the 2x name, add a `srcSet` in `ownerPictureOf` (one place).
5. Revalidation. The display reads the whole table once through a cache tagged `entity-images` (`lib/anime/entity-images-read.ts`, also 1 hour TTL),
   not one cache per slug (50 series and about 400 characters make one small read; per slug would be 460 cached calls on every page). Every write of
   part 1 must call `revalidateTag('entity-images')` in addition to its per-slug tags, or a new image shows only after the hour.
6. The display columns (anon select) are exactly the 12 listed in ADM-back item 1; the front selects those and no other, with `site_id = 'anime'`.

## Requests to the owners of shared files (rule 11 and 18; nothing is edited by this lane)

- R-1 `components/ux-v1/result-card.tsx` and `cover-img.tsx`: an optional `photo.position` (CSS object-position) so the focal point applies on the
  result card of a Which character are you quiz. Until then the portrait shows centred in its 92 px box (the page passes `photo: <url>`, nothing else).
  The credit of a CC BY or CC BY-SA portrait is printed under the quiz (`PortraitCredits`), not on the card.
- R-2 `components/group/ux-v1/member-tiles.tsx`: an optional `photoStyle` would let the characters row use `photoUrl` instead of the overlay that
  `CharacterTiles` lays over the monogram (`anime-adm-portrait`). Not needed to ship; it would remove the overlay.
- R-3 `docs/o1/contracts/twins.json` row 39 (`/admin`): the page is now the tabbed admin (Images, Overview); its `renders` should read "images tab,
  then app/(site)/admin/page.tsx on the Overview tab". No page file was added under app/sites (a new one needs a twin row), so check.sh needs nothing.
- R-4 `apps/quiz/src/middleware.ts`: `/admin` is a protected prefix, so a signed-out visitor is redirected to /login before the page runs; the
  page itself answers 404 to every signed-in account that is not in ADMIN_USER_IDS, on every tab. Left as it is (the kpop admin behaves the same).

## Decisions

- D-1 Counter and filter count the owner's own images (entity_images rows), not the bundled photos: all 50 series have a bundled photo, so counting
  those would read 50/50 and hide the work left. "With image" / "Without image" filters on the cover of the series; the search also matches the names of
  its characters.
- D-2 `/admin` opens on the Images tab; the existing dashboard is the Overview tab (`/admin?tab=overview`), the same shared page as before.
- D-3 Series pictures reach every component through a module store filled by the site layout (server graph) and by the `OwnerPictures` island next
  to `ArtRegistry` (client graph), the same order the SERIES_ART slot relies on, because SeriesArt is rendered by shared client and server components
  that take no data. Characters are never put in that store (their names are spoilers): the series page and the personality page pass the portraits of the
  characters they may show, and the characters a reader unlocks are looked up in the browser from the public table.
- D-4 A character above the spoiler floor (spoiler_level 0) is listed on /credits without its name or its picture ("A character of <series>").
- D-5 A bundled photo that an owner image replaces is no longer listed on /credits (it is no longer shown).
- D-6 The admin strings are inline in the admin components: `copy/anime/` takes only the lanes of COPY_LANES, and this is an owner-only screen.
- D-7 New CSS: `styles/sites/anime/adm.css`, anime scope only, `anime-adm-*` classes, tokens only (checked by contract.test.ts and anime-orange.test.ts).
