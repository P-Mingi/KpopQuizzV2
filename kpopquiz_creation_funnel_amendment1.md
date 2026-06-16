# kpopquiz.org — Amendment 1 to the Creation Funnel Spec (Workstream H)

Small change to `kpopquiz_creation_funnel_spec.md`. Apply this when Workstream H is built. Everything else in the creation funnel spec stays as written.

## Change: merge the cover image into Screen 1

The original spec had Screen 1 (title + group) and Screen 1b (cover image) as two separate moments. **Combine them into a single Screen 1.** The cover-image upload now lives on the same page as "What's your quiz about?".

### New Screen 1 layout (top to bottom)

1. Eyebrow: "Create a quiz · details" + a 4-dot progress indicator (step 1 active).
2. Headline: "What's your quiz about?"
3. Sub: "No account needed to start. You can change everything later."
4. Field: **Quiz title** (pre-filled example placeholder).
5. Field: **Group** picker (chips).
6. Field: **Cover image** — marked with the pink "Recommended" pill. The tap/drag uploader sits right here on the same screen. Helper copy under it: "Shows on your quiz card and becomes your share card background. Quizzes with a cover get way more plays." A subtle "Skip for now" remains, but the upload is encouraged.
7. CTA: "Start adding questions →" (advances to Screen 2, the one-question-at-a-time flow).

### What this changes vs the original spec

- There is no longer a standalone Screen 1b. The funnel is now: **Screen 1 (title + group + cover) → Screen 2 (questions) → Screen 3 (publish + auth) → Screen 4 (share).**
- The progress indicator stays 4 dots (the four screens above), not 5.
- The cover image still does double duty exactly as before: it's the quiz card cover in browse AND the default background of the share card (cover image + gradient overlay). None of that logic changes — only its placement in the UI moves onto Screen 1.
- Order on Screen 1: title first, then group, then cover. Cover is last so the upload doesn't block someone who just wants to type a title and move on, but it's visible without scrolling on most screens.

### Build-step impact

In the Workstream H build order, this merges the old H2 ("Screen 1 + 1b") cleanly — it's now just "Screen 1 with title, group, and cover upload on one page." No new steps, no reordering. The dual-skill audit (`/ui-ux-pro-max` + `/frontend-design`) on that step should specifically check that the three fields plus the recommended-cover nudge fit on one screen without feeling cramped on mobile (the cover uploader can be a compact tap-target that expands to a preview once filled).
