## What this PR does

Fixes "Reconstruire le catalogue", which answers 400 in production (integrator, 2026-11-17, read in the Postgres logs). Supabase loads
the extension `safeupdate` for the API's sessions (PostgREST): a `DELETE` or an `UPDATE` without `WHERE` is refused there, inside a
function too ("DELETE requires a WHERE clause"). `cards_build_catalog()` (file 103) runs `delete from public.cards_catalog;`. The SQL
Editor has no such guard, which is why the function works there and not from the admin's button.

1. **`docs/pending-migrations/cards/117-catalog-safeupdate.sql`** (one DO block, `-- Verify:` lines, rollback): `cards_build_catalog()`
   with `delete from public.cards_catalog where true;` and no other change. The body is 103's, byte for byte, but that one `WHERE`: the
   file checks the md5 of the body before (103's) and after, keeps the privileges (service role only), and is idempotent.
2. **Every other cards function was scanned:** the 53 `cards_*` functions the database holds after 099 to 116, their dynamic `EXECUTE`
   statements included. That `DELETE` is the only `UPDATE` or `DELETE` without a `WHERE`.
3. **A test that fails** when a `cards_*` function holds an `UPDATE` or a `DELETE` without a `WHERE`
   (`apps/quiz/src/lib/cards/safeupdate.test.ts`, with `safeupdate-scan.ts`). It builds the database as production (the bundle 099 to
   115), applies every later numbered file (116, 117 and the next ones), and scans every `cards_*` function. Without 117 it names
   `cards_build_catalog`.
4. **The admin shows the database's own message** when "Reconstruire le catalogue" or "Ajouter au catalogue" is refused, instead of the
   guess "une carte est déjà possédée, ou le fichier 103 n'est pas appliqué" (`lib/cards/admin-photos.ts` sends it with the 409,
   `cards-panel.tsx` shows it).
5. **The preview of a pair's halves** in the admin: each half's picture gets `maxWidth: 'none'`, so the admin's `img` reset no longer
   shrinks it to the half (half 2/2 showed the wrong window).

6. **Otakudle, the owner's private preview (integrator, 2026-11-17):** on the card of the result ("full") the preview picture of the
   character is small (1,012 files of about 160 x 240, 56 of 360 x 480) and the card stretched it to more than 800 px wide, so it blurred.
   Now a preview picture narrower than half the card's rendered width is shown at most twice its natural size (never larger than the card),
   centred, over the same picture blurred and darkened that fills the card; the name and the series stay on top as before. The browser
   measures the picture once it has loaded and again when the card is resized (`components/hub/dle/dle-card-preview.tsx`, rule
   `dle-card-fit.ts`, styles in `styles/sites/hub/dle.css`). Unchanged: the tiles of the list and of the guesses, and the public view (the
   series photo and the name). No larger file was looked for (the pictures are not free; the preview is private).
   Before and after, with neutral placeholder pictures of the same sizes on an 860 x 560 card:
   `docs/o1/evidence/cards/otakudle-preview/before-160.png`, `after-160.png`, `before-360.png`, `after-360.png`.

## For the owner

1. Backup, then apply `docs/pending-migrations/cards/117-catalog-safeupdate.sql` in the SQL Editor (never between 23:50 and 00:30 UTC).
   The notice says "117-catalog-safeupdate: cards_build_catalog() deletes with WHERE true".
2. The Verify lines of its header (four queries).
3. Merge this PR (the admin's message, the preview of the halves, and the Otakudle preview card).
4. "Reconstruire le catalogue" then works from the admin.

117 and the merge are independent: either can come first. `ALL-verify.sql` does not read the body of `cards_build_catalog()`, so
`TOUT_OK` does not change.

## Checks

- Full unit suite under Node 22 (11,314 tests) and `tsc --noEmit`: green.
- 117 on PGlite on the production-like fixture: the body changes only by its `WHERE`, the rebuild gives the same catalog as before,
  a second run changes nothing, a body that is not 103's is refused, the rollback gives 103's body back.
- Exact test value changed on the integrator's request (listed): `catalog-sql.test.ts`'s file set gains the two 117 files.
- Otakudle: `dle-card.test.ts` gains the size rule (160 x 240 and 360 x 480 on an 820 x 560 card, half the card or wider covers it as
  before, unknown sizes change nothing) and the markup (the preview goes through the measured part; the series photo does not). The
  `components/hub`, `lib/dle` and stickers suites (501 tests) and `tsc --noEmit`: green. The screenshots come from the real component,
  bundled into a local page with the site's `dle.css`.

Not merged: the owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
