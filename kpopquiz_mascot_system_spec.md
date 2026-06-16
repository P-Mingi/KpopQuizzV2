# kpopquiz.org — Mascot System (Cowork build spec)

The black rabbit logo (pink star + sparkles, the current favicon) becomes an expressive mascot with a small set of emotional states, placed at emotional peaks and dead moments across the site. This turns a static logo into a character fans feel something toward — the difference between a quiz site that feels alive and one that feels corporate.

Workstream F. Same rules: one step at a time, dual-skill audit (`/ui-ux-pro-max` + `/frontend-design`) pre + post on every placement. Mostly frontend — the only backend touch is choosing which expression to show based on state (win/loss/loading/daily-done), which is trivial client logic.

This is the LAST cosmetic layer — it goes on after the core redesign, games, blindtest, duel, and battle are built, because it decorates those screens. See sequencing.

---

## 0. The asset set

Five PNG variants of the same rabbit head, transparent background, identical silhouette, only the face (and accessory) changes:

1. **Default** — happy sparkle face, pink star + 3 sparkles. The logo / favicon / nav mark. (Already exists.)
2. **Celebrating** — closed happy upward-arc eyes, wide open smile, brighter/bigger star.
3. **Sad / teary** — droopy downturned eyes, one teardrop, drooping star.
4. **Thinking** — one round eye + one squint, wavy "hmm" mouth, pink "?" accessory.
5. **Sleeping** — closed downward-arc eyes, calm mouth, pink "z z z" accessory.

(The icon-generation process for producing these from the base logo is documented at the END of this spec — Section 5. The PNGs already generated should be dropped into the repo as-is.)

Store all five at the same canvas size so they're swappable in code. Serve transparent PNG (or convert to SVG if a vector version is later produced). Keep file sizes small — these render at 30-140px, never larger.

---

## 1. Placement rules (the scarcity principle)

The mascot appears ONLY at: (a) emotional peaks and (b) dead moments. Core browsing/playing screens stay clean. Overusing him tips from charming into noisy. Scarcity keeps him special.

**Use the mascot here:**

| Screen / moment | Variant | Animation | Notes |
|---|---|---|---|
| Navbar logo + favicon | Default | none | Everyday brand mark, 30px nav / 32px favicon. |
| Win screen, perfect score, correct-answer peak | Celebrating | gentle bob | The emotional high. Also on the shareable result card (redesign 12b) — boosts screenshots. |
| Battle reveal — you won | Celebrating | gentle bob | Reinforces the 1v1 win moment (battle spec). |
| Loading / "finding opponent" / "generating" | Thinking | slow tilt | Turns dead wait into a brand moment. Highest-ROI placement. |
| Empty state (no quizzes for filter) | Sad | none | Softens the dead end (redesign 14h). Pair with "be the first to create one". |
| Wrong answer / lost battle | Sad | none | Calm, not bouncing — don't celebrate a loss. |
| Daily already played | Sleeping | none | "Come back tomorrow" + streak pill. Reinforces daily ritual (Workstream D). |
| 404 page | Thinking or Sad | none | A lost rabbit. The kind of detail fans screenshot. |
| First-visit welcome (one-time) | Default/Celebrating | gentle bob | Optional light onboarding. |
| Faint background watermark (home hero / footer) | Default silhouette | none | Very low opacity, large, behind content. Brand texture only. |

**Do NOT put the mascot on:** the quizzes browse grid, the live quiz question screen, the duel question screen, the blindtest playing screen, the leaderboard table. These are focus/play surfaces — keep them clean.

---

## 2. The two animations (CSS only)

Only two, both subtle. Static everywhere else.

```css
/* Gentle bob — for celebrating (win moments) */
.masc.bob { animation: bob 2.2s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

/* Slow tilt — for thinking (loading moments) */
.masc.tilt { animation: tilt 3s ease-in-out infinite; }
@keyframes tilt { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
```

Sad and sleeping stay static on purpose — a bouncing rabbit during a loss or a rest state reads wrong. Respect `prefers-reduced-motion`: disable both animations under it.

```css
@media (prefers-reduced-motion: reduce) { .masc.bob, .masc.tilt { animation: none; } }
```

---

## 3. Component

Build one reusable `<Mascot>` component (or equivalent) taking a `variant` prop (`default | celebrate | sad | think | sleep`) and an optional `animate` prop (`bob | tilt | none`). It renders the right PNG at a given size. Every placement uses this one component — do not scatter `<img>` tags per screen. The validated placement prototype is the canonical visual reference — match its sizes (104px in-context, 30px nav) and layout.

```css
.masc { object-fit: contain; display: block; }
/* size set per context: nav 30px, in-screen 104px, watermark large + low opacity */
```

---

## 4. Build order (Workstream F)

1. **F0** — Audit: review this spec + the placement prototype with BOTH `/ui-ux-pro-max` and `/frontend-design`. Confirm the placement/scarcity rules harmonize with the built screens, confirm where the mascot must NOT appear, confirm the two animations feel right and respect reduced-motion. Report + user sign-off before building.
2. **F1** — Drop the five PNG assets into the repo; build the reusable `<Mascot>` component (Section 3).
3. **F2** — Navbar + favicon (default variant).
4. **F3** — Win / result / battle-win (celebrating + bob), including the shareable result card.
5. **F4** — Loading / finding-opponent / generating states (thinking + tilt).
6. **F5** — Empty states + wrong-answer + lost-battle (sad).
7. **F6** — Daily-already-played + streak rest state (sleeping), coordinate with Workstream D.
8. **F7** — 404 page + optional first-visit welcome + optional faint home/footer watermark.
9. **F8** — Audit the whole set in context with both skills; confirm no screen feels noisy and core play surfaces stayed clean.

Dual-skill audit pre + post on F2-F7. F0 is a mandatory sign-off gate.

---

## 5. Icon-generation process (how the expression PNGs were made — reference for future variants)

This documents how to produce new expression variants from the base logo, using Gemini (Nano Banana 2) image editing, so the set can be extended later consistently.

**Source:** the base mascot — black rabbit head, kawaii face, pink five-point star + sparkles, transparent background, flat minimal hand-drawn vector style, off-white/transparent ground, brand pink #E8457A.

**Method:** feed the base logo to the image editor and instruct it to change ONLY the facial features (and the accessory where noted), keeping the head silhouette, ears, proportions, style, and outline identical. Always request a transparent background and the same square canvas size.

**Prompt pattern (reuse for any new emotion):**
> Edit this image. Keep the exact same black rabbit head — identical shape, ears, proportions, the flat minimal hand-drawn vector style, and outline. Change ONLY the face to a {EMOTION} expression: {describe eyes, nose, mouth}. Keep the two white blush marks on the cheeks. {Accessory instruction: keep the pink star / replace it with a pink "?" / "zzz" / etc., same solid warm pink #E8457A, flat single-color, no gradient}. Do not change the head silhouette at all, only the facial features and accessory. Same composition, centering, square format. Transparent background.

**The four expressions already produced used these specifics:**
- Celebrating: closed upward-arc happy eyes, wide open smile, bigger brighter star.
- Sad: droopy downturned eyes, one teardrop under the left eye, downturned mouth, drooping/lowered star.
- Thinking: one round eye + one squint, off-center wavy "hmm" mouth, pink "?" replacing the star.
- Sleeping: closed downward-arc eyes, calm closed mouth, pink "z z z" replacing the star.

**Correction tips:** if the editor drifts the head shape, add "do not change the head silhouette at all, only the facial features". If an accessory comes out too big/cartoonish, add "make it smaller and flatter, single solid color, no outline". Generate every variant at the same canvas size so they're swappable. Keep the set small (5-6) — one emotion per genuine product moment, no more.
