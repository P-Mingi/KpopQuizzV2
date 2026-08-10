# MISSION (Verse iter-8) — 2 micro-fixes desktop (owner-agreed) + mobile global-nav gap. NO PUSH.

iter-7 is accepted on architecture and behaviour (ab84416). Cowork's screenshot audit found 2 desktop
finish defects, owner agreed both. Plus one gap Cowork spotted in the mobile condensed bar. Small,
surgical mission. Prototype prototypes/verse-nav-notion.html stays authoritative for placement.
Scope /verse only; tsc 0 + build green; light + dark; nothing pushed.

## FIX A — hero title clipped under the fixed top bar (desktop)
On all desktop pages the space hero band slides under the 52px fixed top bar: the top of the hero
title (e.g. "ARMY") is visibly cropped (see docs/proofs/iter7-notion-nav/01/02/05). The shell offset
exists but the hero's own top spacing is short. Give the hero band enough top padding/offset that the
title never touches the bar edge (match the prototype's breathing room). Check home + content pages,
open AND hidden sidebar states.

## FIX B — the HIDE button belongs INSIDE the space header row
The hide chevron currently floats on a small grey notch straddling the sidebar/hero edge. Per the
validated prototype it sits INSIDE the space header row: [chip][name+meta][hide button] right-aligned,
inside the grey panel, aligned with the chip. Move it there; remove the notch. Hover = --v2 hover bg.
The floating REOPEN tab (when hidden) is correct as-is; do not touch it.

## FIX C — mobile: Fandoms / Community / theme are unreachable
The condensed mobile top bar drops Fandoms + Community + theme toggle, and the drawer only carries the
space nav, so on mobile those destinations are now unreachable. Add a compact global section at the
BOTTOM of the mobile drawer (thin divider, then Fandoms / Community rows + the theme toggle row),
mobile-drawer only, desktop sidebar stays space-only. Keep crawlable <a>.

## VERIFY
1. Desktop home + content page: hero title fully visible below the bar (open + hidden), light + dark.
2. The hide button sits in the space header row per the prototype; the notch is gone.
3. Mobile 390: drawer shows the global section at the bottom; links work; theme toggles.
Screenshots to docs/proofs/iter8-finish/. REPORT to docs/loop/REPORT.md + ledger entry. Nothing pushed.
