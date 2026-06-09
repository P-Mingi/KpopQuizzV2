# B0 — Canonical Design-Token Sheet & Harmonization Audit

> **Single source of truth for Workstream B.** Every later step (B1–B22) and any visual touch in A/C/D/E/F must build against the values below. Produced by the mandatory B0 harmonization audit (`/ui-ux-pro-max` + `/frontend-design`) over the whole `kpopquiz_redesign_instructions.md` spec, cross-checked against the actual code on branch `redesign/lobby-blindtest-2026`.

---

## 0. Critical finding — spec vs. current code diverge

The redesign branch's `apps/quiz/src/styles/globals.css` does **not** implement the redesign spec's design system. This must be reconciled in **Step B2** before any page work.

| Concern | Spec (redesign doc §10a/§14b/§12d) | Current code (globals.css) | Action in B2 |
|---|---|---|---|
| Brand pink | `--brand: #E8457A` | `--accent: #D4537E` | Adopt spec `--brand`; keep `--accent` as alias |
| Page bg | `--bg: #FAF8F5` | `--bg-primary: #FAF9F6` | Adopt spec `--bg`; alias `--bg-primary` |
| Text scale | `--txt1/2/3` | `--text-primary/secondary/tertiary` | Adopt spec names; alias legacy |
| Display font | Syne (700/800) | Quicksand | Replace with Syne |
| Body font | DM Sans (400/500/600) | Quicksand | Replace with DM Sans |
| Dark mode | Full system (§12d) | "Light mode only. No dark mode." | Add dark mode (deferred build = B14, tokens reserved now) |
| Image badge | purple `#EDE9FE / #5B21B6` | pink `#FBEAF0 / #72243E` | Adopt spec purple |

**Rule:** spec values win. Legacy token names stay as **aliases** pointing at the canonical tokens so existing components don't break mid-migration (matches the intent of the original commit). Remove aliases only after all components reference canonical names.

### Spec-internal conflict resolved
The spec itself defines tokens twice: §8a (verbose: `--color-brand`, `--color-text-primary`, `--badge-classic`) and §10a (short: `--brand`, `--txt1`). **§10a short names are canonical** (the spec explicitly says 10a "replace any scattered hardcoded colors"). §8a's badge palette is folded in under the canonical set below.

---

## 1. Color tokens (canonical — light)

```css
:root {
  /* Brand */
  --brand:        #E8457A;
  --brand-light:  #FCE8EF;
  --brand-dark:   #B5345F;

  /* Surfaces */
  --bg:           #FAF8F5;
  --surface:      #FFFFFF;
  --surface-alt:  #F3F1ED;

  /* Text */
  --txt1:         #1A1714;
  --txt2:         #6B6560;
  --txt3:         #9E998F;

  /* Borders */
  --border:       rgba(26,23,20,0.10);
  --border-h:     rgba(26,23,20,0.20);

  /* Type badges (from §8a) */
  --badge-classic:#DBEAFE; --badge-classic-text:#1D4ED8;
  --badge-truefalse:#DCFCE7; --badge-truefalse-text:#166534;
  --badge-clues:#FEF3C7; --badge-clues-text:#92400E;
  --badge-image:#EDE9FE; --badge-image-text:#5B21B6;
  --badge-intruder:#FFE4E6; --badge-intruder-text:#9F1239;

  /* Games page tints (§13a) — derived from badge palette */
  --tot-bg:#FCE8EF; --tot-icon:#E8457A;   /* This or That = brand */
  --nam-bg:#E6F1FB; --nam-icon:#1D4ED8;   /* Name all = classic-blue */

  /* Blindtest answer states (§16d) — share the badge palette */
  --bt-green:#166534; --bt-green-bg:#DCFCE7; --bt-green-border:#86EFAC;
  --bt-red:#9F1239;   --bt-red-bg:#FFE4E6;   --bt-red-border:#FDA4AF;
  --bt-amber:#92400E; --bt-amber-bg:#FEF3C7; --bt-amber-border:#FCD34D;

  /* Difficulty: Easy=truefalse-green, Medium=clues-amber, Hard=intruder-coral */
}
```

**Harmony note:** games tints, blindtest states, and difficulty badges are all derived from the five badge colors — no one-off hex. This is the consolidation the audit requires.

## 2. Color tokens (canonical — dark, §12d)

Reserved now, built in B14. Dark = `prefers-color-scheme: dark` + `.dark` class manual toggle (localStorage).

```css
--brand:#F06292; --brand-light:#3D1A26; --brand-dark:#E8457A;
--bg:#141210; --surface:#1E1B18; --surface-alt:#2A2622;
--txt1:#F5F0EB; --txt2:#A89F96; --txt3:#6E675F;
--border:rgba(245,240,235,0.08); --border-h:rgba(245,240,235,0.16);
--correct-bg:#14532D; --correct-border:#166534;
--wrong-bg:#4C0519; --wrong-border:#9F1239;
```

## 3. Typography (§14b)

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```
```css
--font-display: 'Syne', sans-serif;    /* hero titles, mode names, score numbers, daily titles */
--font-body:    'DM Sans', sans-serif; /* everything else */
```
Display applies to: `.hero-title`, `.games-title`, `.mode-name`, `.daily-title`, `.result-score`.
Body: all cards, badges, meta, paragraphs. Body 15–16px / line-height 1.6. Card titles `font-weight:600`. Meta 12–13px `--txt3`. Section labels 11–13px UPPERCASE letter-spacing 0.06–0.08em `--txt2/3`.

## 4. Spacing rhythm (§8f)

- Section gap: **80px** desktop / **48px** mobile.
- Label → content within a section: **20px**.
- Grid gap between cards: **16px** (10–16px range acceptable per component).
- Games page wrapper padding: 28px 24px, max-width 800px.

## 5. Radius scale

- Cards / teaser cards / quiz screen blocks: **14px**.
- Quiz-of-day & result card: **16px**; result share card: **20px**.
- Pills / badges / buttons / filter pills: **100px**.
- Inner chips / answer letters / skeleton lines: **6–10px**.
- Avatars / ring nodes: **50%**.

## 6. Interaction language (§8c/§8g)

- Card hover: `translateY(-2px)` + pink shadow `0 8px 24px rgba(232,69,122,0.10), 0 2px 8px rgba(0,0,0,0.06)`; active resets.
- Transitions: **120ms ease** everywhere (no 0ms swaps).
- Filter pill active: color change + scale 1.0→1.04.
- Grid load: staggered fade-in `animation-delay: i*40ms`.
- Daily CTA: slow 3s box-shadow breathe.
- Result: score count-up 0→value over 600ms (`animateResult()`, §10i).
- Quiz screen keyframes (pop/shake/timer) — **DO NOT CHANGE TIMINGS** (§10k).
- All motion gated by `@media (prefers-reduced-motion: reduce)`.

## 7. Shared components (one implementation each — no per-page reimplementation)

`.quiz-card` (§10c), badge system (§10d), button system `.btn-primary/.btn-outline/.btn-ghost/filter pill` (§10h), ring timer (§10k), filter pills (§10f), section label (§10b), skeleton card (§10j). These appear on multiple pages and must be single shared components.

## 8. Namespace check

Blindtest uses `bt-` prefix (§16d); games use `games-`/`mode-`/`tot-`/`nam-`; quiz screen uses `ans-`/`ring-`/`timer-`/`next-`; Name-all uses `na-` (§18). **No class-name collisions found** across quiz screen (§10k), games (§13a), blindtest (§16d), name-all (§18). Confirmed clean.

## 9. DO NOT CHANGE (spec §17) — respect in every step

Supabase schema for quizzes/users/plays (only remove card/byeol/xp columns) · Reddit UTM params · `r/Kpop_Verse` link · `/about`,`/contact`,`/terms`,`/privacy` · the `/create` editor flow · auth provider config.
