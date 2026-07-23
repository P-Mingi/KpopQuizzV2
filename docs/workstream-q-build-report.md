# Workstream Q - Creation Overhaul: Build Report

Built per [docs/workstream-q-report.md](workstream-q-report.md) (the audit / source of truth) and the owner-approved 3-step flow. No AI features anywhere. No em dashes. Real data only. Commits are per step, not pushed. All paths relative to `apps/quiz/`.

## Commits (7, on main, not pushed)

| Step | Commit | What |
|---|---|---|
| Q-B1 | `e7f1c5a` | Title mandatory, creator-selectable difficulty, searchable group picker + add-new-group, identity cover copy |
| Q-B2 (migrations) | `2812771` | `116_quiz_language.sql`, `117_create_quiz_bypass_language.sql` (owner ran both on prod) |
| Q-B2 (display+filter) | `d17ec96` | Language picker, card chip (!= en), browse filter with real counts |
| Q-B3 | `6819939` | Shared `QuestionListEditor` (reorder/duplicate/delete/inline badges), converges create + edit, shared `lib/quiz-validation.ts` |
| Q-B4 | `5e196d3` | Step 3 summary card, share-hero step 4 with real context-picked badge nudge |
| Q-B5 | this report | Risk sweep, edit-parity check, build/route/theme verification |

## Verification (authoritative gates)

- `npx tsc --noEmit`: clean (0 errors).
- `npm run build` (production, runs ESLint + type-check + compiles every route + SSG): exit 0, no warnings on any changed file.
- `npm run check:routes`: passed, 198 page routes reachable. No new routes added (all work is components + lib + edits to existing routes), so nothing needed adding to the allowlist.
- Em-dash sweep across all Q-B commits (`git diff main~5..main`): zero em/en dashes added.
- No new npm dependency: `package.json` / `package-lock.json` untouched. Native HTML5 drag + up/down buttons for reorder, no drag library.
- Migrations verified live on prod: `quizzes.language` exists (`en: 373, tr: 1`), the known Turkish quiz is retagged `tr`, and `create_quiz_bypass` accepts `language`.

## Behavioural verification (in-browser, 430px + desktop, light + dark)

- **Anonymous journey**: step 1 (title gate, group search + add-new, difficulty, language default from browser locale), step 2 (list editor), step 3 (summary card + anonymous sign-in). Verified.
- **List editor**: reorder (move down swaps order), duplicate (row cloned, count +1), inline validity badges (green check for valid, "Empty answer +2" for a row with 3 issues), tap-to-expand inline editor (question + 4 answers + correct radio + fun fact). Verified in light and dark.
- **Draft round-trip**: after edits in the list editor, the persisted `localStorage` draft mirrors the live order AND keeps the compact `DraftQuestion` shape (`answers[4]` + `correctIndex`), so the OAuth-survival path is intact.
- **Old-format draft conversion**: a draft saved before Q-B1/B2/B3 (no `difficulty`/`language`/`newGroup`, `funFact`-shaped questions) loads on a real page reload with all 3 questions intact and the new fields defaulted (`medium` / `en` / `null`). This is the path that matters: the OAuth round-trip is a full `window.location` reload, and it was verified there. (A dev-only React StrictMode double-mount during a client-side `/create -> /quizzes -> /create` soft-nav can transiently reset the draft; that is not a real user path and does not occur on full page loads or in the production build.)
- **Badge nudge, both regimes** (unit-verified against the real thresholds, and rendered): `quizzes_created=7 -> "3 more quizzes to the Prolific Creator badge"` (bar 7/10); `quizzes_created=12, plays_received=412 -> "412/1,000 plays to Creator: Silver"` (bar 412/1000); Gold handled as maxed. Numbers come from `total_quizzes_created` + `total_plays_received` returned by the create route (thresholds mirror migrations 009 + 104).
- **Language filter**: `/quizzes` shows only languages that exist with real counts (English (373), Turkish (Türkçe) (1)); filtering to `tr` returns the one Turkish quiz, whose card shows a "TR" chip. Verified.
- **Dark mode**: group picker, difficulty segmented, language select, list editor rows/badges, summary card, and nudge all use theme tokens and render correctly in dark. Verified.

## Edit parity

Verified structurally (an authenticated owner edit session cannot be driven in the headless browser, so no screenshot):
- `/quiz/[id]/edit` (owner) and `/admin/quiz/[id]/edit` (admin) both render the same `QuizEditor`, which now renders the same `QuestionListEditor` as the create funnel. One component, two modes.
- Create (`POST /api/quiz/create`) and owner edit (`PUT /api/quiz/[id]`) both import the identical `validateQuestions` from `lib/quiz-validation.ts`, so validation is identical by construction.
- The production build compiled both edit routes and the shared component with no errors.

## Risk map sweep (from the audit, item by item)

| Risk item | Status |
|---|---|
| Old-format drafts | Convert on load with defaults; verified on real reload (the OAuth path). `DraftQuestion` shape unchanged, so no data loss. |
| Deep links `?group=` / `?resume=publish` | Preserved (untouched mount logic). |
| Deep link `?edit=` (orphan) | Still orphaned - `quiz-card.tsx:78` links `/create?edit=` which the funnel ignores. Out of scope for these 5 steps; recommended follow-up: point that link at `/quiz/[id]/edit` (the real edit route, now on the same editor). |
| `/create-preview` | Still 301s to `/create` via `middleware.ts` (untouched). |
| Analytics events | The funnel fires none today; none added or removed. Existing `share_click` / `cross_promo_click` names untouched. Instrumentation remains a future opportunity, not a regression. |
| pt locale parity | `pt/quizzes` now passes the new `languageCounts` + `initialLanguage` props (caught by the type-checker and fixed); the funnel stays English-only and route-stable, so pt CTA links still resolve. |

## Section 9 "loses nothing" checklist - all 15 preserved

1. **Cover rights checkbox (H9)** - kept as a step-1 publish gate. Preserved.
2. **Cover moderation queue** - `create/route.ts` still inserts the auto-report for user-uploaded covers. Preserved.
3. **Inline username claim** - step 3 `needsUsername` flow untouched. Preserved.
4. **Magic-link email sign-in** - step 3 email OTP path untouched. Preserved.
5. **`?resume=publish` auto-publish after OAuth** - mount-effect resume logic untouched. Preserved.
6. **Orphaned `?edit=`** - unchanged (still ignored); flagged as a follow-up above. Documented.
7. **Cover data-URL localStorage fallback** - `saveDraft` quota fallback untouched. Preserved.
8. **7-day draft TTL + malformed drop** - `loadDraft` guards untouched. Preserved.
9. **Client image compression** - `compressImageToDataUrl` + `pickCover` untouched. Preserved.
10. **IndexNow + follower fan-out + XP (first-time bonus)** - all intact in `create/route.ts`; the XP block only additionally reads `total_plays_received` for the nudge. Preserved.
11. **Share card editor (`canEdit`)** - step 4 still mounts `ShareCardModal` with `canEdit`. Preserved.
12. **Copy-link + Open your quiz + Create another** - all still on step 4. Preserved.
13. **pt CTA links to `/create`** - route stable; pt browse updated for language props. Preserved.
14. **Live `QuizCard` preview on publish** - kept, now joined by the summary card. Preserved.
15. **`create_quiz_bypass` is the only insert path** - migration 117 re-issued it with `language` in the fixed INSERT column list, so funnel language picks are not dropped. Preserved.

## Notes / follow-ups (not blocking)

- `?edit=` link in `quiz-card.tsx:80` should be repointed to `/quiz/[id]/edit` (pre-existing orphan; now that edit uses the shared editor this is a one-line caller fix).
- The funnel still fires zero analytics events; the rebuild is a clean place to add publish/share instrumentation later using the existing event layer.
- Non-MC quiz types remain create-locked by design (funnel sends `multiple_choice`); the shared editor already handles all 5 shapes, so unlocking later is a UI toggle, not a rewrite.
