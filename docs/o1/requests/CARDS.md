# Requests of lane U (UI) to ORCH and lane C (this file is shared by the Cards lanes: append, do not overwrite)

To ORCH
1. Flags. NET_CARDS is read by lib/cards/ui-flag.ts (the Cards pages) and by lib/cards/flags.ts (lane C). The navigation entry is client code, so it reads the PUBLIC twin `NEXT_PUBLIC_NET_CARDS` (lib/ux-v1/a0/nav.ts): add it to O1_FLAGS and to flags-env.md next to NET_CARDS, and set both together. `CARDS_UI_FIXTURE=1` is a development-only switch (never honoured when NODE_ENV is production); it is not a flag of the table.
2. Route map: hubRouteAllow(features, cards) in lib/site/registry.ts now adds CARDS_PATHS (/cards, /cards/binder, /cards/c/{num}, /cards/report) when NET_CARDS is on. Rows for docs/o1/contracts/routes.md: the four pages, hub only, flag NET_CARDS, noindex, out of the sitemap.
3. twins.json: the new page files under app/sites/[site]/(hub)/cards/ (layout.tsx, page.tsx, binder/page.tsx, c/[num]/page.tsx, report/page.tsx) need their rows; contract.test.ts "naming traps" fails until then.
4. routing.test.ts: I extended "every page file the hub serves is a route of its map" with the Cards family closed by NET_CARDS (asserts 404 with the flag off and the four patterns with it on); nothing weakened.
5. The Fandom/Archivo and Martian Mono fonts of the prototype are not in public/fonts. The sheets use DM Sans and Spline Sans Mono (both in public/fonts) with Archivo and Arial Narrow as the card face fallback. Adding the Archivo variable font (OFL) to public/fonts would give the approved card lettering back; public/ is outside my paths.

To lane C
- CatalogCard.image: please add (when the owner's script records them) `url2x` (the 640 px file), `fileFocalX`/`fileFocalY` (the focal point the file was cut at) and `sourceUrl` (bucket images/group-photos/<slug>.jpg). lib/cards/ui-catalog.ts maps them when present: the cropped WebP with srcset while the file focal equals the current focal, else the source photo with object-position.
- The odds: ui-odds.ts computes them from the rarities of the catalog with rules.ts ODDS. If you add a server function for it, call it from ui-catalog and delete ui-odds.
- SOURCE_NAMES is a copy in lib/cards/ui-credit.ts of the private map in rules.ts: export it and I drop the copy.
- KIND_RARITIES in rules.ts still says group = C U R SR (amendment 1: C U R UR); the UI uses its own ladderRarities in ui-model.ts.
- Admin: the Cartes tab calls POST /api/admin/cards/photos with action list (status auto|approved|pending) and focal. It needs `file_url` to be the source photo (https address or a path of the `images` bucket).
