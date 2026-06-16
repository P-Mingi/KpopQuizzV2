# kpopquiz.org — Quiz Creation Funnel + Share Card (Cowork build spec)

A complete reimagining of the quiz creation experience, engineered to be frictionless, beautiful, account-optional until publish, and share-first. The share card is rendered as a real OG image so every shared link unfurls as an attractive, customizable challenge card on Reddit / Discord / X. This is the direct fix for "nobody creates quizzes": remove every wall, make building feel effortless, and make sharing the rewarding finale.

Workstream H. Same rules: one step at a time, dual-skill audit (`/ui-ux-pro-max` + `/frontend-design`) pre + post on every UI step, backend skill for drafts/auth/OG-image rendering. The two validated prototypes (the 4-screen funnel + the share-card customizer with header-image-default) are the canonical UI references — match them exactly, with one change: replace the placeholder rabbit emoji with the real rabbit logo asset (the mascot, default variant).

---

## 0. The core principles (read first)

The current creator (and every competitor: uquiz, TriviaCreator, Sporcle, JetPunk) fails because it is a FORM — a long scroll of question blocks plus a settings page plus a login wall up front. It feels like data entry, so people bounce. Three moves fix it:

1. **No account wall until publish.** Anyone starts creating instantly. Sign-up triggers only at the moment of publishing, framed as a benefit (publish + track plays), never as a toll. The draft is already saved before auth.
2. **One question at a time.** Not a long form. A single focused question card with a progress-dot row, "Add another" slides in a fresh card. A 7-question quiz never feels long because you only ever see one.
3. **Share is the reward, not an afterthought.** Publishing lands on a celebration screen whose obvious next action is sharing. The share card is auto-generated, beautiful by default, and customizable — and it is a real OG image so it unfurls everywhere.

---

## 1. The funnel — 4 screens

Use the exact frontend from the validated creation-funnel prototype. Swap the rabbit emoji for the real logo.

### Screen 1 — Setup (no account)
- Headline: "What's your quiz about?" Sub: "No account needed to start."
- Fields: quiz title (with a pre-filled example placeholder to model a good title), group picker (chips).
- A 4-dot progress indicator at the top (step 1 of 4 active).
- CTA: "Start adding questions →".

### Screen 1b — Cover image (part of setup, its own moment)
- Headline: "Add a cover image". Sub: "This shows on your quiz card AND becomes your share card background. Quizzes with a cover get way more plays."
- A drag/tap uploader, marked **Recommended** (pink pill). Optional — a "Skip for now →" link exists, but the copy strongly encourages uploading.
- On upload: preview fills the uploader box with a "Change" affordance.
- This cover image does DOUBLE DUTY: (a) the quiz card cover in browse/feed (redesign doc Section 10c), and (b) the default background of the share card (Section 3 below).
- CTA: "Continue →".

### Screen 2 — One question at a time
- Top: "Question N of M" + a mini-dot row (filled green as questions are completed, current one highlighted).
- A single question card: question input (prominent), 4 answer inputs each with a tap-the-circle radio to mark correct (the correct field tints green). Hint: "Tap the circle to mark the correct answer."
- "Add another" slides in a fresh card (250ms slide animation); "Done →" advances to publish.
- A "← Back to details" ghost link.
- Never show all questions as a long scroll. One card, always.

### Screen 3 — Publish + auth gate
- Headline: "Ready to publish?" Sub explains the account benefit: publish + track how many fans play.
- A live preview of the quiz card exactly as it will appear in browse (cover, badges, title, "N questions · by you").
- A reassurance note: "Your quiz is saved. Sign in once to publish it and keep it linked to you — takes 5 seconds."
- Auth buttons: "Continue with Google", "Sign in with email". This is the ONLY auth wall in the entire funnel.
- "← Keep editing" ghost link.

### Screen 4 — Share = the reward
- Celebration: the real rabbit logo (celebrating variant if available, see mascot spec) with a pop animation, "Your quiz is live!", sub: "Now the fun part — see who can actually beat it."
- The three platform share buttons (Reddit, Discord, X) — tapping one opens the share-card customizer (Section 3).
- A copy-link row.
- "Create another quiz" to loop.

---

## 2. Anonymous drafts (no-account creation)

Creation works fully without an account. To support this:
- On Screen 1, create a server-side draft immediately (anonymous, keyed to a session/voter hash) AND mirror to localStorage as a backup.
- Every edit autosaves to the draft. If the user leaves and returns (same browser) within a retention window (e.g. 7 days), the draft is recoverable.
- At publish (Screen 3), the user authenticates; the anonymous draft is then claimed by / linked to their new account and published.
- If they never publish, the draft expires after the retention window. No orphaned public content.

---

## 3. The share card (the growth unit)

This is what makes sharing worthwhile. Use the exact frontend from the validated share-card customizer prototype (header-image-default version). Swap the rabbit emoji for the real logo.

### 3a. When it appears
The customizer is NOT a separate funnel step. It opens as a modal when the user taps a platform share button (Reddit / Discord / X) — on the Screen 4 share screen, AND anywhere else the quiz can be shared later (the quiz detail page, the result screen). The modal title and post-button color/label adapt to the platform tapped ("Post to Reddit" in Reddit orange, "Send to Discord" in Discord blurple, "Post to X" in black). The user can tweak or just hit post immediately.

### 3b. The card design (1200×630, OG image ratio)
- Top: brand mark + real rabbit logo (left), group/type pill (right).
- Center: a short hook line (uppercase, editable) + the quiz title (large, bold, text-shadow for legibility).
- Bottom: question count + "can you beat it?" + a "Play now" pill.
- All text white, with shadow, sitting above the background + gradient overlay.

### 3c. Default background = the cover image + gradient overlay
- If the creator uploaded a cover image (Screen 1b), the card background IS that image by default, with a tasteful dark gradient overlay baked on top (default: dark-bottom gradient) so white text stays readable over any photo.
- If no cover was uploaded, the card falls back to the brand pink gradient.
- Either way, the default card looks good with ZERO customization. The cover-image-plus-gradient default is the key design decision — it means an uploaded photo always produces a professional, readable card.

### 3d. Customization controls (all live-preview)
- **Gradient overlay style:** swatches — default (dark-bottom), full dark, brand pink, purple. These sit OVER the image to control mood and legibility.
- **Opacity slider:** darkens the overlay so text reads over any busy photo. Default ~40%, which works for most images.
- **Editable text:** the hook line and the title, both editable inline. The hook is separate from the stored quiz title on purpose — the share hook can be punchier/more provocative ("Bet you can't get 100%") to drive clicks while the title stays clean.

### 3e. CRITICAL — server-side OG image rendering
The card must be rendered as a real Open Graph image (server-side, e.g. Vercel OG / Satori, or an equivalent image-rendering service) so it actually unfurls when the link is pasted on Reddit, Discord, X, iMessage, KakaoTalk, etc. Flow:
- The customizer saves the chosen background (cover image ref or gradient), overlay style, opacity, hook text, and title to the quiz.
- An OG image endpoint (e.g. `/api/og/quiz/{id}`) renders that exact card as a PNG at request time (cached).
- The quiz page's `<meta property="og:image">` (and `twitter:image`) points to that endpoint.
- Each platform share button opens that platform's share intent (Reddit submit, X intent, Discord — copy-link with a prompt since Discord has no web share intent) pre-filled with the quiz URL + UTM params (consistent with the existing Reddit UTM pattern in the redesign doc).
- Verify the unfurl actually renders on a real Reddit post, a real Discord paste, and a real X post — this is the make-or-break and must be tested live, not assumed.

### 3f. Cover image guardrail
For uploaded cover/background images in V1: include a lightweight confirmation that the user has the right to use the image, and standard image moderation (size limits, format, basic NSFW screen). Keep friction minimal but do not ship a fully unmoderated upload.

---

## 4. Build order (Workstream H)

Cowork first audits this whole spec + both prototypes with `/ui-ux-pro-max` and `/frontend-design`, confirms harmonization with the design system and the existing quiz card / quiz detail specs, and gets user sign-off before building.

1. **H0** — Audit spec + both prototypes with both skills, get user sign-off (mandatory gate).
2. **H1** — Anonymous draft system: server draft + localStorage backup, autosave, claim-on-auth, expiry (Section 2, backend skill).
3. **H2** — Funnel Screen 1 + 1b: setup + cover upload (frontend; cover feeds the quiz card cover field). Dual-skill audit.
4. **H3** — Funnel Screen 2: one-question-at-a-time card flow with progress dots. Dual-skill audit.
5. **H4** — Funnel Screen 3: publish preview + auth gate (progressive auth, claim draft on sign-in). Dual-skill audit.
6. **H5** — OG image rendering endpoint `/api/og/quiz/{id}` + quiz page OG/Twitter meta tags (backend skill). Verify unfurl on real Reddit/Discord/X.
7. **H6** — Share-card customizer modal: opens on platform tap, cover-image+gradient default, overlay/opacity/text controls, saves to quiz, opens platform share intent with UTM (Section 3). Dual-skill audit.
8. **H7** — Funnel Screen 4: share-as-reward screen with the real rabbit logo (celebrating variant), wired to the customizer. Dual-skill audit.
9. **H8** — Wire the customizer to the OTHER share entry points: quiz detail page, result screen (so sharing works everywhere, not just post-creation).
10. **H9** — Cover image guardrail + moderation (Section 3f).
11. **H10** — Replace the old `/create` editor entirely with this funnel; redirect any old create routes. Confirm the old editor is fully removed.
12. **H11** — Monitor: creation start rate, completion rate (start → publish), share rate (publish → share tap), and share-link click-through. These four numbers tell you if the funnel works.

Note: this REPLACES the existing `/create` flow. The redesign doc's "DO NOT CHANGE → the quiz creation flow" line is now superseded by this spec — update that note so Claude Code knows the creator is being rebuilt, not preserved.

---

## 5. Why this is the strategic fix

Every wall that made people bounce is gone: no login to start, no long form, no settings maze. Building feels like a guided 4-step flow with visible progress. Publishing is sold as a benefit, not a toll. And the finale makes sharing the rewarding, obvious next action — with a card that looks professional by default (cover image + gradient) and unfurls as a real OG image everywhere fans gather. Each shared card is a branded challenge that pulls new players back to a quiz page, which is the growth loop the whole site needs. Combined with the battle "add a question" hook (Workstream E) and the duel→ranking engine (Workstream C), creation stops being the bottleneck.
