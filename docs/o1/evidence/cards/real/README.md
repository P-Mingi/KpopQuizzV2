# Bunnyverse Cards: real pages (ORCH, 2026-11-12)

A local development server of the hub build on the `o1-scratch` Supabase branch (not production), with `NET_CARDS` on, after
`001` to `003` and `101-catalog.sql` were applied there to test groups and idols carrying the 59 slugs (scratch-only test
rows: the names come from the photo file; debut years were left empty, so the cards show none; birth dates are adult
placeholders). The photos are the public bucket copies of production (`images/group-photos/<slug>.jpg`), read only.
Visitor view (agents never sign in): the signed-in states (a stack, the opening, owned cards) are in `../ui/`, drawn on the
development fixture by lane U.

1440 x 900 (`-desktop`) and 375 x 812 (`-mobile`), full page cut at 3,600 px: Packs, Binder (pages and grid), an idol card
(Gold, Holo), a group card (Holo), a locked edition, /credits with its Cards section, the report form. Every page: one H1,
noindex, no horizontal overflow at 375 px, no em or en dash, no broken image, no hydration error.
