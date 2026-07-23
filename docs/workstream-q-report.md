# Workstream Q - Creation Overhaul: Audit + Comparison Report

Report only. No code was changed to produce this. All prod numbers are as of Jul 2026, read from the live DB (project rdkgouofytwfdpbxbzio) via a one-off service-role script that was deleted after running. All file:line references are against `apps/quiz/`.

Target flow decision on record: **NO AI anywhere.** No AI question generation, no answer suggestions. The overhaul is pure UX. Creators write every question themselves.

---

## 0. Executive summary

The current funnel (`src/components/create/create-funnel.tsx`, 545 lines) is a 4-screen wizard that is already strong on the two things the target most wants to keep: anonymous-first creation and a draft that survives the OAuth round-trip. It is weak on exactly the three things the target wants to add: it hardcodes `multiple_choice` + `difficulty: 'medium'`, it edits questions one-at-a-time (dot navigation, no list), and the group picker is a full chip wall of all 87 groups.

Three findings change the spec and must be read before building:

1. **The "1 more quiz to Creator: Silver" nudge is factually wrong against the current data model.** Creator: Bronze/Silver/Gold tiers key off `total_plays_received` (100 / 1,000 / 10,000 plays), NOT quizzes created (`supabase/migrations/104_badge_awards.sql:72-74`). Quiz count only drives two one-shot badges: `quiz_maker` (1 quiz) and `prolific_creator` (10 quizzes) (`009_likes_xp_badges.sql:142-146`). There is no quiz-count "Creator" ladder to count down to. See section 8 for the three ways to make the nudge honest.

2. **The "quizzes with a cover get way more plays" line is not supported by the data, and the current copy already overstates it.** With-cover quizzes (n=46) average 281.6 plays vs 126.9 without, but the *median* is the other way round: 59 with cover vs 93 without. The mean is dragged up by a handful of admin-featured covered quizzes. See section 4.4.

3. **A list editor that handles all 5 quiz types already exists** for edit mode (`src/components/quiz/quiz-editor.tsx`). The overhaul should converge create and edit onto one list-based component rather than build a second editor. See sections 3 and 4.

Nothing in the current funnel is safe to silently drop. Section 9 is the "loses nothing" checklist; the prototype description omits at least 6 shipped behaviours (rights checkbox, cover moderation queue, inline username claim, magic-link email path, `?resume=publish` auto-publish, the orphaned `?edit=` param).

---

## 1. Current funnel inventory

### 1.1 Route + entry
- `/create` IS the funnel. The old editor was retired (`src/app/create/page.tsx:7-15`). Page is server-rendered, loads all groups via `getAllGroups()` and passes them to `<CreateFunnel>` (`create/page.tsx:22-35`).
- `robots: { index: false, follow: true }` - the tool is deliberately non-indexable (`create/page.tsx:14`).
- Deep-link params accepted: `?group=<slug>` (`create/page.tsx:18-30`) and `?resume=publish` (`create-funnel.tsx:174-175`). See section 6.4.
- `/create-preview` is retired and 301-redirects to `/create` (`src/middleware.ts:40-46`).

### 1.2 The 4 screens (`create-funnel.tsx`)
- **Screen 1 setup** (`:333-380`): title input, group chip wall, cover picker + rights checkbox. No language, no difficulty, no question-count target.
- **Screen 2 questions** (`:383-439`): one question at a time, dot navigation (`cf-minidots`, `:387-389`), 4 answers + correct radio + optional fun fact, add/remove question.
- **Screen 3 publish + auth** (`:442-503`): live `<QuizCard>` preview, requirement checklist, anonymous OAuth (Google/Discord) or magic-link email, inline username claim for new accounts.
- **Screen 4 share** (`:506-542`): celebrate mascot, Reddit/Discord/X buttons opening `ShareCardModal`, copy-link, "open your quiz", "create another".

### 1.3 Feature -> keep / change / drop table

| # | Current feature | Location | Target verdict |
|---|---|---|---|
| Title input, `maxLength=100` | `create-funnel.tsx:340` | **KEEP** (maxLength unchanged; already the DB reality, `001_schema.sql`) |
| Title effectively required at publish only (`MIN_TITLE=5`) | `:38, :95, :102` | **CHANGE** - target says title MANDATORY. Verified: today the title is *not* a hard gate to advance past Screen 1 (only group is, `:375`); it is only enforced at publish (`:102`). Make it a Screen 1 gate. |
| Group = chip wall of all groups | `:344-350` | **CHANGE** - target wants a searchable picker (search bar in the feed) + "add a new group". |
| "Add a new group" | not in funnel UI; only the API supports `group_name` | **CHANGE/ADD** - see section 1.5. |
| Cover image, optional, "Recommended" tag | `:352-373` | **KEEP** (visibly recommended already) - but fix the overstated copy, section 4.4. |
| Cover rights checkbox (H9) | `:362-371, :106-111` | **KEEP** - prototype omits this; it is a publish gate. |
| Difficulty hardcoded `'medium'` | `:134` | **CHANGE** - target wants creator-selectable. Data proves difficulty is real: 104 easy + 13 hard quizzes exist (section 4). |
| Quiz type hardcoded `'multiple_choice'` | `:133` | **KEEP for now** (target flow is MC only) but do not hardcode in a way that blocks the future unlock - section 2. |
| Question count target (5/10/15/20) | absent today | **ADD** - soft guide only; min 3 / max 20 stays (`:37`, `create/route.ts:12-13`). |
| One-at-a-time question editor + dot nav | `:383-439` | **DROP/REPLACE** with the list editor (section 4). |
| Fun fact per question, `maxLength=280` | `:408-422` | **KEEP** - carry into the inline row editor. |
| localStorage draft, 7-day TTL | `src/lib/create-draft.ts:41-43` | **KEEP** - fully encapsulated, reusable as-is (section 6.5). |
| Draft survives OAuth (`?resume=publish` auto-publish) | `:174-195` | **KEEP EXACTLY** - the funnel's best part. |
| Anonymous-first (auth only at publish) | `:296-307` | **KEEP EXACTLY**. |
| Inline username claim for new accounts | `:197-236, :460-478` | **KEEP** - prototype omits this. |
| Magic-link email sign-in | `:301-307, :490-497` | **KEEP** - prototype omits this. |
| Cover upload at publish (`/api/quiz/upload-image`) | `:116-128` | **KEEP** - see 1.4. |
| Publish via `/api/quiz/create` -> `create_quiz_bypass` RPC | `:146-155`, `create/route.ts:284-299` | **KEEP** - RPC must gain a `language` column (section 5). |
| IndexNow ping | `create/route.ts:310` | **KEEP** - never blocks. |
| Follower fan-out (`fanout_followed_new_quiz`) | `create/route.ts:316-324` | **KEEP** - flag-gated. |
| Cover moderation queue (auto-report) | `create/route.ts:333-341` | **KEEP** - prototype omits this. |
| XP award (25 base / 75 first) | `create/route.ts:343-364` | **KEEP**. |
| Share step (Reddit/Discord/X + copy) | `:506-542` | **KEEP + PROMOTE to hero** (section 8). |

### 1.4 Image pipeline
- Client: pick -> `validateImageFile` (type + 5MB, `create-draft.ts:31-39`) -> `compressImageToDataUrl` (canvas resize to 1280px JPEG q0.82, `:117-140`) -> held as a data URL in the draft so it survives OAuth.
- Publish: `dataUrlToFile` (`:143-146`) -> `POST /api/quiz/upload-image` (multipart) -> Supabase `quiz-images` bucket, path `quiz-images/YYYY/MM/<uuid>.<ext>` (`upload-image/route.ts:48-60`).
- Server re-validates authoritatively: allowed types JPEG/PNG/WebP, 5MB cap, and a **magic-byte check** (`isValidImageBuffer`, `upload-image/route.ts:9-16`). Also supports an `external_url` fetch path (HTTPS-only, SSRF guard on localhost, 10s timeout, `:63-103`) which the funnel does not currently use but the admin editor does.

### 1.5 Group creation (API path verified)
- `create_quiz_bypass` takes a resolved `group_id`. Group creation happens in `create/route.ts:166-239`: if `group_id` is absent but `group_name` is present, it does a case-insensitive `ilike` match, and if none, inserts a new group with `is_custom: true, needs_review: true, created_by_user: true, display_color '#F1EFE8'` (`:218-231`).
- **The funnel never uses this path** - it only ever sends `group_id` (`create-funnel.tsx:131`). So "add a new group" is a fully built server capability with no UI. The overhaul wires the searchable picker's "add new" branch to send `group_name` instead of `group_id`.
- Current custom-group reality: 7 of 87 groups are `is_custom`, 0 currently flagged `needs_review` (section 4).

---

## 2. The 5 quiz types at creation time

Types: `multiple_choice`, `true_false`, `guess_from_clues`, `image`, `intruder`. The DB `quiz_type` CHECK constraint was **dropped** in `035_drop_quiz_type_constraint.sql` (PostgREST cache issue); validation is now code-only in the API routes.

Prod distribution (374 published): multiple_choice 293, true_false 60, guess_from_clues 7, image 11, intruder 3.

**Creatable via UI today: only `multiple_choice`.** The funnel hardcodes it (`create-funnel.tsx:133`). The other 81 non-MC quizzes were authored via SQL seed / quiz-bank migrations (e.g. `039_seed_image_quizzes.sql`, `040_seed_quiz9_4thgen_intruder.sql`), not by users. There is no interactive create UI for TF/clues/image/intruder - admin surfaces (`src/app/admin/quiz-bank/`, `admin/quiz/[id]/edit`) only edit/import.

However, `/api/quiz/create` and its validator already accept all 5 types (`create/route.ts:127-130, validateQuestions :10-90`). So the server is unlock-ready; only the client is MC-only.

**Per-type field requirements the list editor must not paint us into a corner on** (from `validateQuestions`, `create/route.ts:10-90`, mirrored in `quiz-editor.tsx`):

| Type | Per-question shape | Correct field | Extra assets |
|---|---|---|---|
| multiple_choice | `question` + exactly 4 `options: string[]` | `correct: 0-3` | - |
| true_false | `question` | `correct: boolean` | no options array |
| guess_from_clues | `question` + 4 `options: string[]` + exactly 3 `clues: string[]` | `correct: 0-3` | 3 clues |
| image | `question` + 4 `options: string[]` + `image_url` (required) | `correct: 0-3` | question image |
| intruder | 4 `options: {label, image_url}[]` (both required) | `correct: 0-3` | 4 images per question |

Design constraints this imposes on the target list editor (do NOT design the unlock now, just do not block it):
- The "correct answer" model is not uniform: index-based for 4 of 5 types, boolean for TF. The row/validity model must not assume a 4-option radio.
- Options are `string[]` for most but `{label, image_url}[]` for intruder. The inline editor's option row must be polymorphic.
- image + intruder need per-question image uploaders (the `quiz-editor.tsx` `ImageUploader`, `:153-164, :178-184, :218-225`) - the list editor must have a slot for per-question media, not just text.
- clues need a 3-field sub-list.
- The existing `quiz-editor.tsx` already branches on all of this (`:175-322`) - it is the proof the polymorphism is manageable and the reference implementation for the new list editor.

---

## 3. Owner edit mode - current state

- Route: `/quiz/[id]/edit` (`src/app/quiz/[id]/edit/page.tsx`). Gated to creator or admin, 404 (not 403) for non-owners to avoid leaking draft existence (`:37-40`). This is the Q0-a fix that already shipped: the "Edit quiz" button used to point at `/admin/quiz/[id]/edit`, which hard-redirected every non-admin to `/` (`page.tsx:9-13`).
- Component: `<QuizEditor quiz mode="owner" />` (`page.tsx:42`).
- `QuizEditor` (`src/components/quiz/quiz-editor.tsx`) is a **single-component, two-mode** editor already:
  - `mode="owner"` -> `PUT /api/quiz/[id]` (owner-scoped, no status control, `quiz-editor.tsx:58-71`; route `src/app/api/quiz/[id]/route.ts:89-206`).
  - `mode="admin"` -> `PATCH /api/admin/quiz/[id]` (can set status, `:72-76`).
  - Renders a **question LIST** (`:170-333`) with per-type branches, cover uploader, difficulty select, and a save button. This is much closer to the target Step 2 than the create funnel is.
- Supporting GET: `/api/quiz/[id]/edit/route.ts` returns quiz data for editing (owner/admin gated, `:7-30+`).

**"Reuse funnel in edit mode" - verified state:** it is the reverse today. Create uses the wizard (`create-funnel.tsx`); edit uses the list editor (`quiz-editor.tsx`). They are two separate components. The target's Step 2 list editor is essentially what `quiz-editor.tsx` already is, minus drag-reorder, duplicate, inline validity badges, and add-question.

**Recommendation:** build the new Step 2 as one list-editor component that both `/create` and `/quiz/[id]/edit` mount. What each must add on top of today's `quiz-editor.tsx`:
- drag-to-reorder (absent),
- per-row duplicate (absent),
- inline validity badges: missing correct answer, duplicate options, empty fields (absent; validation is server-only today and only surfaces as an `alert()` on save, `quiz-editor.tsx:82`),
- "add question" appends a blank row (absent in editor; present in funnel, `create-funnel.tsx:263`),
- a create-mode path that ends in publish+auth vs an edit-mode path that ends in PUT.
Gap to close: edit mode PUTs the whole quiz (`/api/quiz/[id]` PUT) while create POSTs (`/api/quiz/create`). One component, two submit paths - the same split `quiz-editor.tsx:58-76` already models.

---

## 4. Language field

### 4.1 Schema
- **`quizzes.language` does NOT exist** (probed live: "column quizzes.language does not exist"). Confirmed against migrations too - no migration adds it (the `language` hits in migration greps are song lyrics / plpgsql `language` keywords, not a quiz column).
- New column needed: `quizzes.language TEXT NOT NULL DEFAULT 'en'` + a CHECK or lookup for the allowed set, plus a b-tree index for the browse filter. See section 5.

### 4.2 Where it must be threaded (from the cards/browse audit)
Display + filter touch points, all in `apps/quiz/`:
1. `src/lib/db/types.ts` - add `language` to `QuizCardData` (currently `:185-209`, carries `quiz_type`/`difficulty` but no language) and a `Language` union.
2. `src/lib/db/queries/quizzes.ts` - `QUIZ_CARD_SELECT` (`:5-9`), `RawQuizRow` (`:17-34`), `toQuizCardData` (`:36-62`), and a `.eq('language', ...)` in `getBrowseQuizzes` near `:172`. This one constant feeds ~12 query functions (getAllQuizzes, getBrowseQuizzes, getTrending/New/Hardest/MostLiked, getQuizzesByGroup/Creator/Difficulty/Year/Type, getQuizOfTheDay).
3. Duplicated inline selects that each need `language` added separately: `src/app/api/quizzes/route.ts:9` (+ `RawRow :14-20`, `toCard :22-33`), `src/app/api/quizzes/search/route.ts:8`, `src/app/api/quizzes/liked/route.ts:53`, `src/app/search/page.tsx:29`.
4. Card chip: `src/components/ui/quiz-card.tsx` - add a `LANG_BADGE` map next to `TYPE_BADGE`/`DIFF_BADGE` (`:17-29`) and a third `<span className="badge">` in `.badge-row` (`:86-89`).
5. Browse filter: `src/app/quizzes/page.tsx` (parse/validate `language` searchParam near `:112-118`) + `src/components/quiz/browse-quizzes.tsx` (new state near `:110-112`, pill row after `:349`, `comboKey :68-70`, `buildApiUrl :136-149`, `syncUrl :152-159`, `popstate :199-214`).
6. Create: `src/components/create/create-funnel.tsx` - add the language selector (default from `navigator.language`) and send it in the publish payload (`:130-145`).

Reusable pattern: `src/components/ui/quiz-type-badge.tsx` is the reference for a `LanguageBadge` component if we want one shared across surfaces (the card itself uses its own inline map, though).

### 4.3 Existing quizzes default + non-English content on prod
- All 374 existing quizzes have no language today; they must default to `'en'` on the column add.
- **Non-English content is present but rare and currently invisible to the system.** With no language column, detection is heuristic. A reliable diacritic scan of title + question bodies finds exactly **1 unambiguously Turkish published quiz**: "GERÇEK BİR CORTİS FANISAN?". A looser stopword heuristic flags 35 more, but those are false positives (English K-pop titles coincidentally containing substrings like "bir", "kim"), so the trustworthy count is 1.
- Owner note said Turkish quizzes (plural) exist. The gap between "owner knows there are several" and "diacritics find 1" is exactly the problem the language column solves: Turkish written without diacritics, or as-yet-unpublished drafts, are undetectable. **Recommendation:** add the column defaulting to `'en'`, ship the creator picker so new quizzes self-declare, and give the owner/admin a one-off re-tag for the known non-English rows (at minimum the 1 Turkish quiz above; ask the owner for the full list since the system cannot enumerate them).

### 4.4 Cover "more plays" claim - real data check (requested)
| Cohort | n | avg plays | median plays |
|---|---|---|---|
| With cover | 46 | 281.6 | 59 |
| Without cover | 328 | 126.9 | 93 |

The mean says covers win 2.2x; the median says covers *lose* (59 vs 93). The mean is skewed by a few heavily-promoted covered quizzes (admin-featured), and covered quizzes are a biased 12% sample. **There is no clean causal evidence that adding a cover raises plays.** The current copy already asserts it twice - "Quizzes with a cover get way more plays" (`create-funnel.tsx:359`) and it is stated as fact. Recommend softening to a benefit that is true by construction, e.g. "Covers make your quiz stand out on the browse grid and become your share-card background" (both verifiable: card render `quiz-card.tsx`, share card `ShareCardModal`). Keep "Recommended", drop the unbacked plays claim.

---

## 5. Migration needs list (numbered against current prod state)

Current head is `115_like_xp.sql`. Migrations are applied manually by the owner in the prod SQL editor; MCP has no prod write permission. Proposed new migrations:

1. **116_quiz_language.sql**
   - `ALTER TABLE public.quizzes ADD COLUMN language TEXT NOT NULL DEFAULT 'en';`
   - `ALTER TABLE public.quizzes ADD CONSTRAINT quiz_language_valid CHECK (language IN ('en','tr','es','pt','ko','fr','de','id','ja',...));` (finalise the set with the owner; keep it a CHECK, matching the difficulty pattern `001_schema.sql:75-76`).
   - `CREATE INDEX idx_quizzes_language_status ON public.quizzes(language, status);` (mirrors `idx_quizzes_difficulty` for the browse filter).
   - `NOTIFY pgrst, 'reload schema';`
2. **117_create_quiz_bypass_language.sql** - `CREATE OR REPLACE FUNCTION public.create_quiz_bypass` to add `language` to the INSERT column list and read `coalesce(p_data->>'language','en')`. The RPC was last redefined in `048_create_quiz_cover_override.sql`; its INSERT is a fixed column list (`048:...INSERT INTO public.quizzes (...)`), so it must be re-issued or new-language quizzes silently drop the field. **This is the easy-to-miss migration.**
3. **(optional) 118_retag_non_english.sql** - one-off `UPDATE quizzes SET language='tr' WHERE id IN (...)` for the owner-supplied non-English list.
4. **(only if a quiz-count Creator ladder is chosen, section 8)** a badge-definitions + threshold migration. Not needed if the nudge reuses existing badges.

No new column is needed for difficulty (already exists, `001_schema.sql:59`), question-count target (soft UI-only guide), or group creation (`is_custom`/`needs_review`/`created_by_user` already exist).

---

## 6. Risk map (what breaks if we replace the wizard)

| Risk | Reality | Action |
|---|---|---|
| Old-format drafts mid-flight | Draft keys `kq_create_draft_v1` / `kq_create_step_v1` are defined only in `create-draft.ts:41-42`, consumed only by the funnel. Fully encapsulated. | Reuse `create-draft.ts` as-is, or bump the key version knowing in-flight OAuth-round-trip drafts drop. Extend `Draft`/`DraftQuestion` for language + difficulty + question type without a key bump if additive. |
| Deep links | `?group=<slug>` (`create/page.tsx:18`) and `?resume=publish` (`create-funnel.tsx:174`) must be preserved. | Reimplement both in the new component. |
| `?edit=` orphan | `src/components/quiz/quiz-card.tsx:78` links to `/create?edit=${quiz.id}` but nothing reads `edit` - it silently starts a blank draft. Pre-existing bug. | The overhaul (unified create/edit) is the chance to either honour `?edit=` or fix the caller to point at `/quiz/[id]/edit`. |
| `/create-preview` | Already retired -> 301 to `/create` (`middleware.ts:40-46`). | Keep the redirect. Nothing to migrate. |
| Analytics events | The funnel and its share step fire **zero** analytics events (no `@/lib/analytics` import in the funnel or `share-card-modal.tsx`). The 6-event wrapper (`analytics.ts:53-72`) has `share_click` fired only from result/fan-card surfaces, and a `cross_promo_click` -> `create` fired by callers linking TO create (e.g. `fresh-quizzes.tsx:43`). | Nothing breaks. Treat the rebuild as the moment to ADD publish/share instrumentation that is missing today. |
| pt locale | No `/pt/create` route and `/create` is not in `TRANSLATED_ROUTES` (`src/lib/i18n/config.ts:22-37`). pt users already drop into the English funnel; only 7 pt CTA links point at `/create` (listed in the i18n audit). | Nothing pt-specific breaks as long as the route stays `/create`. Optional: add `/create` to translated routes later. |
| Route allowlist | `/create` is in `src/lib/route-allowlist.ts:19` so the SEO catch-all does not 301 it. | Keep. |
| Callers of `/create` | 15 plain links + 1 `?group=` + the 7 pt links (full list in the i18n audit). | All survive if the route + params stay stable. |

---

## 7. Effort estimate + proposed build order

Sizing is rough (S = <0.5 day, M = ~1 day, L = ~2-3 days), single-dev.

**Chunk A - Step 1 quick wins (ship first, independent of the list editor):**
- A1. Mandatory title gate on Screen 1 (`create-funnel.tsx:375` gate). **S**
- A2. Creator-selectable difficulty; unhardcode `:134` and add to payload; difficulty already flows through the RPC. **S**
- A3. Searchable group picker (search bar over the 87 groups) + "add a new group" wired to the existing `group_name` API branch. **M**
- A4. Question-count target selector (soft guide). **S**
Chunk A ships real value (kills the medium hardcode, kills the chip wall) with no schema change and no editor rebuild.

**Chunk B - Language (schema + surfaces):**
- B1. Migrations 116 + 117 (column, index, RPC). **S** (owner runs them)
- B2. Thread `language` through types + the shared select + duplicated selects + card chip. **M**
- B3. Browse language filter (page + browse-quizzes state/URL/pills). **M**
- B4. Creator language picker (default from `navigator.language`). **S**
- B5. Owner re-tag of known non-English rows. **S**
Chunk B is mostly independent of A and C; B2/B3 are the bulk.

**Chunk C - Step 2 list editor (the big one):**
- C1. New list-editor component from `quiz-editor.tsx` as the base: list view, tap-row inline editor, add appends. **M**
- C2. Drag-to-reorder + per-row duplicate/delete. **M**
- C3. Inline validity badges (missing correct, dup options, empty) - lift validation from server-only to shared client rules. **M**
- C4. Unify: mount the same editor in `/create` (ends in publish+auth) and `/quiz/[id]/edit` (ends in PUT). Retire the wizard's Screen 2. **L**
Chunk C is the largest and the one that must respect the per-type polymorphism in section 2 even though only MC ships.

**Chunk D - Step 3 publish + share hero:**
- D1. Summary card (title, group, count, difficulty, language chip). **S**
- D2. Preserve anonymous-first + `?resume=publish` exactly (do not touch `:166-236`). **S** (mostly carry-over)
- D3. Share-as-hero rework of Screen 4 + the honest creator-progress nudge (section 8). **M**
- D4. Add share/publish analytics events. **S**

**Recommended order:** A -> B -> C -> D. A and B both ship visible value before the heavy editor rebuild; C is the risk concentration; D depends on the section-8 nudge decision.

---

## 8. The share-step nudge - making it honest (blocking decision)

The prototype's "1 more quiz to Creator: Silver" cannot ship as written. Ground truth:
- Creator: Bronze/Silver/Gold = `total_plays_received` >= 100 / 1,000 / 10,000 (`104_badge_awards.sql:72-74`), granted by a trigger on `profiles.total_plays_received`, highest tier only.
- Quiz-count badges are one-shot: `quiz_maker` at 1 quiz, `prolific_creator` at 10 (`009_likes_xp_badges.sql:142-146`). No Silver/Gold quiz-count ladder exists.
- There is **no** existing "N more to next badge" component (badge UI is earned-vs-locked tiles only: `badge-grid.tsx`, `badge-shelf.tsx`). The nudge is net-new UI either way.
- There is **no XP for sharing** today (grep of all `award_xp` reasons: create/play/like/battle/daily, none for share).

Prod audience for a nudge (from live profiles): 51 creators have >=1 quiz; 31 have >=100 plays (past Bronze), 17 have >=1,000 (past Silver), 0 have >=10,000 (Gold).

Three honest options:
- **(a) Reword to plays, not quizzes.** "You are 40 plays from Creator: Silver" using the real `total_plays_received` thresholds. Truthful, reuses the existing badge family, needs the profile's play count on the publish response. But plays are not in the creator's direct control at publish time, so it is a weaker motivator right after publishing.
- **(b) Reword to the real quiz-count milestones.** "1 more quiz to the Prolific Creator badge" (the 10-quiz `prolific_creator`) or "That is your first quiz - Quiz Maker unlocked!". Truthful and directly tied to the action just taken. Recommended default.
- **(c) Introduce a real quiz-count Creator ladder.** New thresholds + a shared TS constant + a badge-definitions migration. Most work, and it collides with the existing plays-based "Creator" name, so it would need a different family name.

Recommendation: **(b)** for launch (honest, action-tied, no migration), with `total_quizzes_created` already available in profile/passport queries to power the countdown. Revisit (c) only if the owner wants a dedicated creation ladder.

---

## 9. "Loses nothing" checklist - items the prototype description omits

Every current behaviour the 3-step prototype write-up does not mention. Each must be explicitly carried into the final spec.

1. **Cover rights checkbox (H9).** "I have the right to use this image" is a hard publish gate (`create-funnel.tsx:106-111, 362-371`). Not in the prototype. KEEP.
2. **Cover moderation queue.** Every user-uploaded cover auto-inserts a `reports` row for human review (`create/route.ts:333-341`). Not in the prototype. KEEP.
3. **Inline username claim for brand-new accounts.** New OAuth accounts pick a username in the funnel, no `/onboarding` redirect (`:197-236, :460-478`), with debounced availability check against `/api/auth/check-username`. Not in the prototype. KEEP.
4. **Magic-link email sign-in.** Not just Google/Discord - there is an email OTP path (`:301-307, :490-497`). Not in the prototype. KEEP.
5. **`?resume=publish` auto-publish after OAuth.** The draft not only survives the round-trip, it auto-fires publish for users who already have a profile (`:185-195`). Not spelled out in the prototype. KEEP EXACTLY.
6. **Orphaned `?edit=` param.** `quiz-card.tsx:78` links to `/create?edit=<id>` but the funnel ignores it (silently blank draft). Pre-existing bug; the unify-create-and-edit work should resolve it.
7. **Cover data-URL localStorage fallback.** If the compressed cover blows the localStorage quota, the draft re-saves without the cover so text still persists (`create-draft.ts:76-88`). Preserve this resilience.
8. **7-day draft TTL + malformed-draft drop** (`create-draft.ts:43, 63-66`). Preserve.
9. **Client image compression before storage** (canvas resize 1280px, `create-draft.ts:117-140`). Preserve - it is what makes the cover survive OAuth.
10. **IndexNow ping + follower fan-out + XP award** on publish (`create/route.ts:310, 316-324, 343-364`). Not in the prototype's publish step. KEEP all three.
11. **Share card editor (`canEdit`) in ShareCardModal.** The creator can edit the OG share card (overlay/hook/title) via `PUT /api/quiz/[id]/share-card` (`share-card-modal.tsx:125`). The "share as hero" step should surface this, not just plain share buttons.
12. **Copy-link + "Open your quiz" + "Create another quiz"** on Screen 4 (`:530-536`). Keep in the promoted share step.
13. **pt CTA links** (7 of them) point at `/create`. Keep the route stable so they do not 404.
14. **Live `<QuizCard>` preview** on the publish screen (`:447-450`). The prototype's "summary card" should be at least this - reuse the real card.
15. **`create_quiz_bypass` RPC is the only insert path** and has a fixed column list - any new field (language) needs the RPC re-issued (section 5.2), not just a route change.

---

## Appendix - prod snapshot (as of Jul 2026)

- Quizzes: 379 total, 374 published.
- By type: multiple_choice 293, true_false 60, guess_from_clues 7, image 11, intruder 3.
- By difficulty: medium 257, easy 104, hard 13 (the 117 non-medium prove difficulty is real despite the funnel hardcoding medium).
- Covers: 46 with (avg 281.6 / median 59 plays), 328 without (avg 126.9 / median 93).
- Groups: 87 total, 7 custom, 0 needs_review.
- Non-English published quizzes detectable: 1 (Turkish, by diacritics).
- Creators with >=1 quiz: 51. Past Creator: Bronze (100+ plays) 31, Silver (1,000+) 17, Gold (10,000+) 0.
- No `quizzes.language` column. Migration head: 115.
