# G-HUB v2 step 3b - DB lobbies parity + legal wall

## Legal wall (mission point 6): idol photos removed
BEFORE: /games/this-or-that/all cards showed `top_entity.image` (idol photos);
/games/name-all NameAllCard roster avatars showed `item.image_url` (idol photos).
Both violate the CSS-art-only legal wall the redesign enforces.
AFTER: 0 idol-photo refs in either lobby (legal-wall.txt). this-or-that/all uses
a CSS-art .lmc-cover; name-all keeps its overlapping-circle roster preview but
renders initials on a gradient (CSS-art) instead of photos.

## SEO parity (law 1)
- this-or-that/all: H1 "All matchups" (count 1) preserved; the variant Link
  href `/games/this-or-that?group=&type=` preserved; card name (prompt) + meta +
  the "Tap any card to play" intro preserved. Removed only the decorative
  idol `<img alt="">` and the decorative arrow. Identical-or-richer.
- name-all: card title + meta + `/games/name-all/{slug}` link preserved; only the
  roster-avatar photos became initials. No indexable text/link lost.

## Hub tot mapping correction (fixes step 2 inversion)
/games/this-or-that IS the game (DuelGame, auto-starts); /games/this-or-that/all
is the catalog. Step 2 had them inverted. Now Play -> /games/this-or-that (one
tap = playing), All modes -> /games/this-or-that/all. Both links still present
in the hub, so hub parity still holds (identical-or-richer).

## Gates
tsc 0 · check:routes 335 · em-dash clean.
