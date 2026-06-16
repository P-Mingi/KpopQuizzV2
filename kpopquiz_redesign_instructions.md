# kpopquiz.org — Claude Code Redesign Instructions

Full specification for the next development sprint. Apply every section in order. Do not skip sections.

---

## 0. DELETIONS — Do these first, before any other change

Remove every file, component, route, and database reference related to:

- **Cards / Byeol system**: delete `/cards`, `/cards/*`, any `CardComponent`, `byeol`, card-related API routes, card-related DB tables or columns, any `⭐ byeol` display, card inventory UI, card pack UI.
- **Blindtest**: delete `/blindtest`, any blindtest route or page, blindtest links in nav/footer, the "Blindtest" footer link pointing to kpopblindtest.com.
- **Star / XP system**: delete all `⭐ +N` badges on game cards, all XP counters, XP earning logic, XP display on profiles, leaderboard XP columns. The gamification system is removed entirely.
- **Hall of Fame / Ranks page via old route**: if `/hall-of-fame` and `/ranks` are two separate routes pointing to the same page, delete the `/hall-of-fame` route and keep only `/leaderboard` (see nav unification below).
- **Redundant "You" nav item on mobile**: the bottom mobile nav had a "You" tab — remove if it links to an unauthenticated profile shell.

After deletions, do a project-wide search for `byeol`, `blindtest`, `kpopblindtest`, `hall-of-fame`, `star`, `xp` and remove any orphaned references.

---

## 1. NAVIGATION — Unify and simplify

### Desktop navbar (left to right)

```
[KpopQuiz logo]   Home   Quizzes   Games   Leaderboard   [Search]   [+ Create]   [Sign in]
```

- Remove: `Cards`, `Ranks` (replaced by `Leaderboard`), any `Byeol` link.
- Add: `Quizzes` linking to `/quizzes` — this must be a top-level nav item.
- Rename `Ranks` → `Leaderboard`, route `/leaderboard` (redirect `/ranks` and `/hall-of-fame` there).
- `Sign in` stays in nav for now (see Section 6 for contextual auth — implement nav removal last once contextual auth is built).
- `+ Create` button: keep as primary CTA button (pink/brand color, pill shape).
- Active state: current page link gets underline or bold weight, not background highlight.

### Footer — three columns

```
Discover          Community              Support
Quizzes           Create a quiz          About
Games             Reddit (r/Kpop_Verse)  Contact
Leaderboard                              Terms
                                         Privacy
```

Remove: `Cards`, `Blindtest` link, `Byeol` anything.

### Mobile bottom nav (if exists)

```
Home | Quizzes | Games | + Create | Leaderboard
```

Maximum 5 items. No Cards, no Byeol, no Blindtest.

---

## 2. HOME PAGE — Lobby redesign

The home page is the **lobby**: visitors see the full scope of what the site offers and are pulled toward every section. It is NOT a quiz list — that lives on `/quizzes`.

### 2a. Hero section

Keep the current headline and subline. Add two CTA buttons side by side below the subline:

```
[▶ Browse quizzes]    [+ Create a quiz]
```

- "Browse quizzes" → `/quizzes`, filled pink button.
- "Create a quiz" → `/create`, outlined button.

Do not add a third button.

### 2b. Quiz of the day — move above the fold

Move the "Quiz of the day" block to directly below the hero (it is currently below the fold). It should be the first content section after the headline.

Design changes to the Quiz of the day card:
- Full-width card with group banner image as background (keep current approach).
- Add a countdown timer "Resets in Xh Xm" displayed as a subtle pill in the top-right corner of the card — it is already there, keep it.
- Remove the play count ("8 plays") from this card — it's irrelevant for a daily pick and makes it look unpopular.
- CTA button text: "Play today's quiz →" (keep pink, full-width inside the card).
- Section label: "Quiz of the day" with a `⚡` icon (SVG, not emoji — use the existing lightning bolt or a Lucide/Tabler icon).

### 2c. Trending this week — horizontal scroll carousel

Keep the horizontal carousel of top 4–6 quizzes. Changes:

- Label: "Trending this week" + "See all →" link to `/quizzes?sort=trending`.
- Cards show: cover image, group badge, quiz type badge, title (truncated at 2 lines), play count only (remove avg score from this surface).
- Remove the `#1`, `#2` rank numbers from the cards — ranking is for the Leaderboard page.
- Add a "See all quizzes →" button below the carousel (text link, not a card).

### 2d. Games teaser section — NEW

Add a section between Trending and the group filter. Label: "Play games".

Show 3 game mode cards in a horizontal row (or 2 on mobile):

```
[This or That]   [Name all members]   [Coming soon...]
```

Each card:
- Icon (SVG) + game name + one-line description (e.g. "Pick your bias in head-to-head matchups").
- "Play →" link.
- Subtle background color per card to differentiate.

This section links to `/games`. Add a "See all games →" text link below.

### 2e. Browse by group — group filter with labels

Replace the current logo-only filter row with labeled pills. Each pill = group logo (24×24px) + group name text.

Groups to show (in this order): General K-pop · BTS · BLACKPINK · Stray Kids · TWICE · aespa · SEVENTEEN · NewJeans · EXO · IVE · ENHYPEN · TXT · LE SSERAFIM

On click: navigate to `/quizzes?group=bts` (or equivalent filter parameter).

This replaces the duplicate quiz list below it. Do NOT show a quiz grid on the home page below this section.

Add a "Browse all quizzes →" button below the group pills that links to `/quizzes`.

### Home page section order (final)

1. Navbar
2. Hero (headline + 2 CTAs)
3. Quiz of the day
4. Trending this week (carousel)
5. Play games (teaser)
6. Browse by group (labeled pills)
7. Footer

---

## 3. QUIZ PAGE (`/quizzes`) — Browse redesign

The quiz page is the **dedicated exploration hub**. It should feel complete and filterable.

### 3a. Page header

```
Browse quizzes
Filter by group, type, or sort however you like.
```

No hero image. Clean, minimal header.

### 3b. Filter bar — sticky on scroll

Sticky below navbar on scroll. Two rows:

**Row 1 — Group filter (horizontal scroll, pill chips with logo + label):**
All · General K-pop · BTS · BLACKPINK · Stray Kids · TWICE · aespa · SEVENTEEN · NewJeans · EXO · IVE · ENHYPEN · TXT · LE SSERAFIM

**Row 2 — Type filter + Sort:**
Type: All types · Classic · Image · Intruder · True/False · Clues
Sort: Trending · Newest · Most played · Top rated

Active filter pill = pink background, white text. Inactive = outlined.

Both rows are horizontally scrollable on mobile (no wrap, `overflow-x: auto`, hide scrollbar).

### 3c. Quiz grid

Two-column grid on desktop, one column on mobile.

Each quiz card contains (in order of visual hierarchy):
1. Cover image (right side, 80×80px rounded, or left-aligned thumbnail)
2. Group badge (small logo pill, top-left of text area)
3. Type badge (colored chip: Classic=blue, True/False=green, Clues=amber, Image=purple, Intruder=coral)
4. Quiz title (font-weight 600, 2-line clamp)
5. Play count (primary metric — large, muted icon + number)
6. Avg score shown as colored percentage (green ≥65%, amber 50–64%, red <50%)
7. Author name (smallest, tertiary color)

Do NOT show: question count (not valuable on browse), pass rate (save for post-play).

Card interaction: hover = subtle lift (box-shadow transition 150ms). Entire card is clickable.

### 3d. Create CTA — inline after every 8 quizzes

After every 8 quiz cards, insert a full-width "Got quiz ideas? Create one!" banner (pink tinted background, "Create a quiz" button). This replaces the single banner at page bottom.

### 3e. Pagination / load more

Keep "Load more quizzes" button. Style as outlined pill button, centered. Shows remaining count: "Load 20 more (74 remaining)".

---

## 4. QUIZ DETAIL PAGE — Pre-play changes

### 4a. Hide stats before play

Remove from the pre-play view:
- Avg score (e.g. "64%")
- Pass rate (e.g. "46%")

These numbers demotivate before engagement. They must only appear on the **result screen** after the user completes the quiz.

On the result screen, display them as social proof:
```
You scored 7/8 — better than 54% of players
Average score: 64% · Pass rate: 46%
```

### 4b. Keep on pre-play view

- Cover image
- Group badge + difficulty badge + type badge
- Quiz title
- Author (with avatar)
- Play count (trust signal — keep)
- "Start quiz" CTA button (full-width, pink)
- Reddit share button (see Section 7 for fix)

---

## 5. GAMES PAGE — Add descriptions per game type

On `/games`, each game type section needs a one-line description added below the section title.

**This or That:**
> Pick your favourite in head-to-head matchups. Two options, one winner.

**Name all members:**
> Type every member's name before the timer runs out. Harder than you think.

If other game types are added later, follow the same pattern: title + one-line description + time estimate (e.g. "~2 min").

Remove all `⭐ +N` XP badges from game cards (deleted per Section 0).

Game cards: show play count instead of XP. No difficulty badge needed (the timer IS the difficulty).

---

## 6. CONTEXTUAL AUTH — Replace ambient sign-in pressure

This is a lower-priority item. Implement after all above sections are done.

Remove `Sign in` from the top navbar. Instead:

- Trigger auth modal at high-intent moments:
  1. After completing a quiz → "Save your score and track progress — sign in"
  2. On clicking "Create a quiz" → "You need an account to create quizzes — sign in"
  3. On clicking Leaderboard → "Sign in to appear on the leaderboard"
- Each trigger shows a modal with Google / email sign-in options.
- Add a small "Sign in" text link in the footer Support column as a fallback.

---

## 7. REDDIT SHARE BUTTON — Fix title

On quiz detail pages, the Reddit share button pre-fills the post title. Change the pre-filled title from:

```
[Quiz name] - free K-pop quiz on kpopquiz.org
```

to just:

```
[Quiz name]
```

The subreddit context (r/Kpop_Verse) makes the source implicit. The promotional suffix reads as spam and may trigger Reddit filters.

The UTM parameters on the URL are correct — keep them:
`?utm_source=reddit&utm_medium=social&utm_campaign=quiz_share`

---

## 8. UI IDENTITY — Visual system upgrade

The site currently has good content but a generic visual feel. Apply the following design system changes to make the site feel distinctive, fan-native, and addictive.

### 8a. Color system

Current: pink (#e85d75 or similar) as accent on cream/off-white bg.

Keep the pink as primary brand color. Add a defined palette with CSS variables:

```css
:root {
  --color-brand:        #E8457A;   /* primary pink — CTAs, active states */
  --color-brand-light:  #FCE8EF;   /* tinted bg for cards, banners */
  --color-brand-dark:   #B5345F;   /* hover state on brand elements */

  --color-bg:           #FAF8F5;   /* page background — warm off-white */
  --color-surface:      #FFFFFF;   /* card surfaces */
  --color-surface-alt:  #F3F1ED;   /* secondary surfaces, filter bars */

  --color-text-primary: #1A1714;   /* near-black, warm */
  --color-text-secondary: #6B6560; /* muted body text */
  --color-text-tertiary:  #9E998F; /* meta, author names */

  --color-border:       rgba(26,23,20,0.10); /* card borders */
  --color-border-hover: rgba(26,23,20,0.20);

  /* Type badge colors */
  --badge-classic:    #DBEAFE; /* blue tint */
  --badge-classic-text: #1D4ED8;
  --badge-truefalse:  #DCFCE7; /* green tint */
  --badge-truefalse-text: #166534;
  --badge-clues:      #FEF3C7; /* amber tint */
  --badge-clues-text: #92400E;
  --badge-image:      #EDE9FE; /* purple tint */
  --badge-image-text: #5B21B6;
  --badge-intruder:   #FFE4E6; /* coral tint */
  --badge-intruder-text: #9F1239;
}
```

### 8b. Typography

Current fonts are acceptable. Enforce these rules:

- Display / hero: keep existing font (appears to be a rounded sans or custom). If none: use `Nunito` or `Plus Jakarta Sans` for warmth.
- Body: `Inter` or `DM Sans` at 15–16px, line-height 1.6.
- Quiz titles on cards: `font-weight: 600`, not 700 (too heavy).
- Meta text (author, play count): 12–13px, `--color-text-tertiary`.
- Section labels ("Trending this week", "Quiz of the day"): 13px, uppercase, letter-spacing 0.06em, `--color-text-secondary`. This creates clear hierarchy without using h2 for every label.

### 8c. Card design

Quiz cards need a tactile, satisfying feel. Apply:

```css
.quiz-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  cursor: pointer;
}

.quiz-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(232, 69, 122, 0.10), 0 2px 8px rgba(0,0,0,0.06);
  border-color: var(--color-border-hover);
}

.quiz-card:active {
  transform: translateY(0px);
  box-shadow: none;
}
```

The pink-tinted shadow on hover is subtle but creates a brand-consistent "warmth" effect.

### 8d. Badge design

Type badges (Classic, True/False, etc.) should be small pills, 11px, uppercase, letter-spacing 0.04em, with the colors defined in Section 8a. No icons inside badges — text only.

Difficulty badges (Easy, Medium, Hard): use the same pill shape but with:
- Easy = green tint
- Medium = amber tint
- Hard = red/coral tint

### 8e. Button system

```
Primary (brand):   bg var(--color-brand), white text, border-radius 100px, px 20px py 10px
                   hover: bg var(--color-brand-dark)
                   active: scale(0.97)

Outlined:          transparent bg, 1.5px border var(--color-brand), brand-color text
                   hover: bg var(--color-brand-light)

Ghost/text:        no border, no bg, brand-color text, underline on hover

Filter pill:       bg var(--color-surface-alt), 1px border var(--color-border), border-radius 100px
Active filter pill: bg var(--color-brand), white text, no border
```

All buttons: `transition: all 120ms ease`. No 0ms state changes.

### 8f. Section rhythm

Use consistent vertical spacing between home page sections:
- Section gap: `80px` desktop, `48px` mobile.
- Within a section (label → content): `20px`.
- Between cards in a grid: `16px` gap.

Section labels must be visually distinct from card titles — use the uppercase/tracked style (Section 8c) not an h2.

### 8g. Micro-interactions for addictiveness

These small details make the site feel alive and pull users back:

1. **Quiz card hover**: the pink shadow + lift (Section 8c). Already specified.

2. **Group filter pill active state**: when a group pill is selected, animate it with a 120ms scale-up (1.0 → 1.04) in addition to the color change.

3. **Play count pulse on load**: quiz cards load with a staggered fade-in (using `animation-delay: N * 40ms` for each card in the grid). This creates a cascade effect that feels dynamic, not static.

4. **"Play today's quiz" button**: add a subtle pulse animation on the CTA button of the daily quiz card — a slow `box-shadow` breathe every 3s. This draws the eye on page load without being annoying.

5. **Score reveal on result screen**: animate the score number counting up (0 → actual score over 600ms) when the result screen appears. K-pop fans are competitive — watching the number tick up is satisfying.

6. **Trending badge on carousel cards**: add a small "🔥" text label (not emoji — use a Lucide Flame icon, 12px, orange) on trending quiz cards. This signals social proof without adding clutter.

### 8h. Empty and loading states

- Loading state for quiz grid: show 6 skeleton cards (gray animated shimmer) while data loads. Prevents layout shift.
- Empty state for filtered view (no results): show a cute illustration placeholder (can be a simple SVG of a question mark + group logo) with text "No quizzes found for this group yet — be the first to create one!" + "Create a quiz →" button.

### 8i. Mobile-specific

- Bottom safe area padding on all pages.
- Group filter row: horizontal scroll, no visible scrollbar (`scrollbar-width: none`).
- Quiz cards on mobile: single column, full-width, cover image left-aligned (smaller, 64×64px).
- "Play today's quiz" button: full-width on mobile.
- Trending carousel: snap scroll (`scroll-snap-type: x mandatory`, each card `scroll-snap-align: start`).

---

## 9. SUMMARY — Implementation order

Execute in this order to minimize regressions:

1. **Deletions** (Section 0) — Cards, Byeol, Blindtest, XP/star system
2. **Nav unification** (Section 1)
3. **Quiz page redesign** (Section 3) — browser page is self-contained
4. **Quiz detail pre-play fix** (Section 4) — hide stats, fix Reddit title (Section 7)
5. **Home page lobby redesign** (Section 2) — after quiz page is stable
6. **Games page descriptions** (Section 5)
7. **CSS design system** (Section 8a–8f) — apply site-wide
8. **Micro-interactions** (Section 8g–8i)
9. **Contextual auth** (Section 6) — last, lowest priority

---

## 10. UI COMPONENTS — Exact reference code

**IMPORTANT:** The components below are the canonical implementation. Use these exactly — same class names, same values, same animation timings. Do not reinterpret or simplify. Copy them verbatim into your global stylesheet and component files.

---

### 10a. Global CSS variables

Add to your root stylesheet (e.g. `globals.css` or `app.css`). These replace any scattered hardcoded colors across the codebase.

```css
:root {
  --brand:        #E8457A;
  --brand-light:  #FCE8EF;
  --brand-dark:   #B5345F;
  --bg:           #FAF8F5;
  --surface:      #fff;
  --surface-alt:  #F3F1ED;
  --txt1:         #1A1714;
  --txt2:         #6B6560;
  --txt3:         #9E998F;
  --border:       rgba(26,23,20,0.10);
  --border-h:     rgba(26,23,20,0.20);
}
```

Set `background-color: var(--bg)` on `body`. Set `color: var(--txt1)` on `body`.

---

### 10b. Section label

Used above every content section (Trending this week, Play games, Browse by group, etc.).

```css
.sec-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--txt3);
  margin-bottom: 14px;
}
```

```html
<p class="sec-label">Trending this week</p>
```

---

### 10c. Quiz card

Full card component with hover lift and pink shadow. The `animation-delay` must be set inline per card using the card's index (`index * 40` ms) to produce the staggered cascade on page load.

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.quiz-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  animation: fadeUp 300ms ease both;
}

.quiz-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(232,69,122,0.10), 0 2px 8px rgba(0,0,0,0.06);
  border-color: var(--border-h);
}

.quiz-card:active {
  transform: translateY(0);
  box-shadow: none;
}

.quiz-cover {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--surface-alt);
  flex-shrink: 0;
  overflow: hidden;
}

.quiz-body {
  flex: 1;
  min-width: 0;
}

.badge-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.quiz-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--txt1);
  line-height: 1.4;
  margin-bottom: 7px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.quiz-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--txt3);
}

.quiz-plays {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: var(--txt2);
}

.quiz-score { font-weight: 600; }
.score-green { color: #166534; }
.score-amber { color: #92400E; }
.score-red   { color: #9F1239; }

.quiz-author { color: var(--txt3); }
```

HTML structure — set `animation-delay` inline per card:

```html
<!-- index = card's position in the list, starting at 0 -->
<div class="quiz-card" style="animation-delay: {index * 40}ms">
  <div class="quiz-cover">
    <img src="{coverUrl}" alt="{quizTitle}" width="72" height="72" />
  </div>
  <div class="quiz-body">
    <div class="badge-row">
      <span class="badge b-classic">Classic</span>
      <span class="badge b-medium">Medium</span>
      <!-- add .trending-badge here if quiz is trending -->
    </div>
    <p class="quiz-title">{quizTitle}</p>
    <div class="quiz-meta">
      <span class="quiz-plays">
        <svg .../>  {plays}
      </span>
      <span class="quiz-score score-amber">{avgScore}%</span>
      <span class="quiz-author">{authorName}</span>
    </div>
  </div>
</div>
```

Quiz grid wrapper — 2 columns desktop, 1 column mobile:

```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 640px) {
  .cards-grid { grid-template-columns: 1fr; }
}
```

---

### 10d. Badges

All badges share one base class. Each type/difficulty has its own color modifier.

```css
.badge {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
}

/* Type badges */
.b-classic  { background: #DBEAFE; color: #1D4ED8; }
.b-tf       { background: #DCFCE7; color: #166534; }
.b-clues    { background: #FEF3C7; color: #92400E; }
.b-image    { background: #EDE9FE; color: #5B21B6; }
.b-intruder { background: #FFE4E6; color: #9F1239; }

/* Difficulty badges */
.b-easy   { background: #DCFCE7; color: #166534; }
.b-medium { background: #FEF3C7; color: #92400E; }
.b-hard   { background: #FFE4E6; color: #9F1239; }
```

Trending badge (shown on top quiz cards in the carousel):

```css
.trending-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: #fff3ec;
  color: #c2410c;
  padding: 2px 7px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 3px;
}
```

```html
<span class="trending-badge">
  <!-- Lucide Flame icon, 12px, no fill, stroke currentColor -->
  <svg width="12" height="12" .../>
  Trending
</span>
```

---

### 10e. Quiz of the day card

The CTA button has a `pulse-shadow` animation that breathes every 3 seconds. Do not remove it.

```css
.daily-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.daily-banner {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  /* use the group's banner image as background-image here */
  background-color: var(--brand-light);
  background-size: cover;
  background-position: center;
}

.daily-reset {
  font-size: 11px;
  color: var(--brand-dark);
  font-weight: 500;
  background: #fff;
  padding: 3px 10px;
  border-radius: 100px;
}

.daily-body {
  padding: 14px 16px;
}

.daily-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--txt1);
  margin-bottom: 8px;
}

.daily-author {
  font-size: 12px;
  color: var(--txt3);
  margin-bottom: 14px;
}

@keyframes pulse-shadow {
  0%,100% { box-shadow: 0 0 0 0 rgba(232,69,122,0.00); }
  50%      { box-shadow: 0 0 0 6px rgba(232,69,122,0.15); }
}

.daily-cta {
  width: 100%;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
  animation: pulse-shadow 3s ease-in-out infinite;
}

.daily-cta:hover {
  background: var(--brand-dark);
  transform: scale(1.01);
}

.daily-cta:active {
  transform: scale(0.98);
}
```

```html
<div class="daily-card">
  <div class="daily-banner" style="background-image: url('{groupBannerUrl}')">
    <span class="daily-reset">Resets in {hours}h {minutes}m</span>
  </div>
  <div class="daily-body">
    <div class="badge-row">
      <span class="badge b-classic">Classic</span>
      <span class="badge b-easy">Easy</span>
    </div>
    <p class="daily-title">{quizTitle}</p>
    <p class="daily-author">{authorName}</p>
    <button class="daily-cta" onclick="navigateTo('{quizUrl}')">
      ▶ Play today's quiz
    </button>
  </div>
</div>
```

---

### 10f. Group filter pills

The active pill scales to 1.04 on selection. This is handled by the `.active` class, not JavaScript transforms — the CSS `transition` does the work.

```css
.group-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* On /quizzes filter bar — no wrap, horizontal scroll */
.group-pills.scrollable {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}
.group-pills.scrollable::-webkit-scrollbar { display: none; }

.group-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;
  color: var(--txt1);
  white-space: nowrap;
}

.group-pill:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-light);
}

.group-pill.active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  transform: scale(1.04);
}

.group-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  /* use <img> inside for the actual group logo */
}
```

```html
<div class="group-pills">
  <button class="group-pill active" data-group="all">
    <span class="group-dot"></span>
    General
  </button>
  <button class="group-pill" data-group="bts">
    <span class="group-dot"><img src="/logos/bts.jpg" width="18" height="18" alt="" /></span>
    BTS
  </button>
  <!-- repeat for: BLACKPINK, Stray Kids, TWICE, aespa, SEVENTEEN, NewJeans, EXO, IVE, ENHYPEN, TXT, LE SSERAFIM -->
</div>
```

JS for group pill interaction (router navigation on click):

```js
document.querySelectorAll('.group-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.group-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const group = pill.dataset.group;
    // On home page: scroll to filtered section
    // On /quizzes page: update URL and re-fetch
    router.push(`/quizzes${group !== 'all' ? `?group=${group}` : ''}`);
  });
});
```

---

### 10g. Games teaser cards

```css
.games-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 640px) {
  .games-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.game-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease;
}

.game-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-h);
}

.game-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 10px;
}

/* One tint per game mode */
.gi-tot  { background: #FCE8EF; color: #E8457A; }   /* This or That */
.gi-nam  { background: #DBEAFE; color: #1D4ED8; }   /* Name all members */
.gi-soon { background: #F3F1ED; color: #9E998F; }   /* Coming soon */

.game-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--txt1);
  margin-bottom: 3px;
}

.game-desc {
  font-size: 11px;
  color: var(--txt3);
  line-height: 1.5;
  margin-bottom: 10px;
}

.game-play {
  font-size: 12px;
  font-weight: 500;
  color: var(--brand);
}
```

```html
<div class="games-row">
  <a class="game-card" href="/games/this-or-that">
    <div class="game-icon gi-tot">
      <!-- Lucide ArrowLeftRight icon, 18px -->
    </div>
    <p class="game-name">This or That</p>
    <p class="game-desc">Pick your bias in head-to-head matchups. Two options, one winner.</p>
    <span class="game-play">Play →</span>
  </a>
  <a class="game-card" href="/games/name-all">
    <div class="game-icon gi-nam">
      <!-- Lucide Keyboard icon, 18px -->
    </div>
    <p class="game-name">Name all members</p>
    <p class="game-desc">Type every member before the timer runs out. Harder than you think.</p>
    <span class="game-play">Play →</span>
  </a>
  <div class="game-card" style="opacity: 0.6; cursor: default;">
    <div class="game-icon gi-soon">
      <!-- Lucide Lock icon, 18px -->
    </div>
    <p class="game-name">Coming soon</p>
    <p class="game-desc">More game modes are on the way. Stay tuned.</p>
    <span class="game-play" style="color: var(--txt3);">Soon</span>
  </div>
</div>
```

---

### 10h. Button system

```css
/* Primary — filled pink */
.btn-primary {
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}
.btn-primary:hover  { background: var(--brand-dark); }
.btn-primary:active { transform: scale(0.97); }

/* Outlined — transparent with pink border */
.btn-outline {
  background: transparent;
  color: var(--brand);
  border: 1.5px solid var(--brand);
  border-radius: 100px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease;
}
.btn-outline:hover { background: var(--brand-light); }

/* Ghost — text only */
.btn-ghost {
  background: none;
  border: none;
  color: var(--brand);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  padding: 2px 0;
}

/* Filter pill — used in sort/type bar */
.btn-filter {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--txt1);
  transition: all 120ms ease;
}
.btn-filter.active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}
.btn-filter:hover:not(.active) {
  border-color: var(--brand);
  color: var(--brand);
}
```

---

### 10i. Result screen — score count-up

The score animates from 0 to the real value over ~600ms. The beat percentage animates separately. Both use `setInterval`. The progress bar uses a CSS `transition: width 1s ease` triggered after a 100ms delay. This sequence must be preserved exactly.

```css
.result-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.result-score {
  font-size: 52px;
  font-weight: 700;
  color: var(--brand);
  line-height: 1;
}

.result-label {
  font-size: 14px;
  color: var(--txt2);
  margin-top: 6px;
  margin-bottom: 16px;
}

.result-bar-wrap {
  background: var(--surface-alt);
  border-radius: 100px;
  height: 6px;
  overflow: hidden;
  margin: 10px 0 16px;
}

.result-bar {
  height: 100%;
  background: var(--brand);
  border-radius: 100px;
  width: 0%;
  transition: width 1s ease;
}

.result-stat {
  font-size: 13px;
  color: var(--txt3);
  margin-bottom: 4px;
}

.result-context {
  font-size: 12px;
  color: var(--txt3);
  margin-top: 6px;
}
```

```html
<div class="result-card">
  <div class="result-score" id="score-num">0</div>
  <p class="result-label">out of {totalQuestions} questions</p>
  <div class="result-bar-wrap">
    <div class="result-bar" id="result-bar"></div>
  </div>
  <p class="result-stat">
    You beat <strong style="color: var(--brand)" id="beat-pct">0%</strong> of players
  </p>
  <p class="result-context">Average score: {avgScore}% · Pass rate: {passRate}%</p>
  <button class="btn-outline" style="margin-top: 16px; width: 100%;" onclick="retryQuiz()">
    Play again
  </button>
</div>
```

JS — call `animateResult(score, total, beatPercent)` when the result screen mounts:

```js
function animateResult(score, total, beatPercent) {
  const numEl = document.getElementById('score-num');
  const barEl = document.getElementById('result-bar');
  const beatEl = document.getElementById('beat-pct');

  // Reset
  numEl.textContent = '0';
  barEl.style.width = '0%';
  beatEl.textContent = '0%';

  // Score count-up: one tick per ~80ms
  let s = 0;
  const scoreInterval = setInterval(() => {
    s++;
    numEl.textContent = s;
    if (s >= score) clearInterval(scoreInterval);
  }, 80);

  // Progress bar: CSS transition does the work, just set width after 100ms
  setTimeout(() => {
    barEl.style.width = Math.round((score / total) * 100) + '%';
  }, 100);

  // Beat percentage count-up: 2% per tick, ~20ms interval
  let b = 0;
  const beatInterval = setInterval(() => {
    b += 2;
    beatEl.textContent = b + '%';
    if (b >= beatPercent) clearInterval(beatInterval);
  }, 20);
}
```

---

### 10j. Skeleton loading cards

Show exactly 6 of these while the quiz grid is loading. Replace with real cards once data resolves.

```css
@keyframes shimmer {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

.skeleton-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  gap: 12px;
}

.skel {
  background: var(--surface-alt);
  border-radius: 6px;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skel-cover {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  flex-shrink: 0;
}

.skel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.skel-line { height: 10px; }
.skel-line.w80 { width: 80%; }
.skel-line.w60 { width: 60%; }
.skel-line.w40 { width: 40%; }
```

```html
<!-- Repeat 6 times while loading -->
<div class="skeleton-card">
  <div class="skel skel-cover"></div>
  <div class="skel-body">
    <div class="skel skel-line w40" style="height: 8px;"></div>
    <div class="skel skel-line w80"></div>
    <div class="skel skel-line w60"></div>
  </div>
</div>
```

---

### 10k. Live quiz experience screen — EXACT CODE, DO NOT MODIFY

This is the most impactful single page on the entire site. Users spend 80% of their time here. The current quiz screen is a flat question+answers page. Replace it entirely with the component below.

**What this adds that the current screen lacks:**
- Circular countdown timer ring (SVG) that turns orange at 8s, pink at 5s
- Streak dot history bar (8 dots, green=correct, red=wrong)
- Answer state animations: correct=pop scale, wrong=horizontal shake
- Fun fact amber card that slides up after every answer
- Live score counter in the top bar
- Letters A B C D as styled chips that animate on selection

**CRITICAL rules:**
- The timer is 15 seconds per question. Do not change this.
- `animateResult()` from Section 10i must be called when the quiz ends.
- `@keyframes shake` and `@keyframes pop` must be preserved exactly — they are the physical feedback.
- The fun fact must always show after answer, whether correct or wrong, on a delay of 0ms (immediate after answer lock).
- On mobile: answers stack to 1 column below 480px. Timer ring stays centered. All touch targets ≥ 44px.

#### CSS

```css
/* Quiz screen variables — add to :root in globals.css */
:root {
  --correct:        #166534;
  --correct-bg:     #DCFCE7;
  --correct-border: #86EFAC;
  --wrong:          #9F1239;
  --wrong-bg:       #FFE4E6;
  --wrong-border:   #FDA4AF;
}

/* Layout */
.quiz-screen {
  background: var(--bg);
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

/* Top bar */
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.top-bar .group-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--brand);
  background: var(--brand-light);
  padding: 4px 10px;
  border-radius: 100px;
  white-space: nowrap;
}
.progress-wrap {
  flex: 1;
  background: var(--surface-alt);
  border-radius: 100px;
  height: 6px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--brand);
  border-radius: 100px;
  transition: width 600ms cubic-bezier(.4,0,.2,1);
}
.q-counter {
  font-size: 13px;
  font-weight: 500;
  color: var(--txt3);
  white-space: nowrap;
}
.score-pill {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 4px 12px 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--txt1);
  white-space: nowrap;
}
.score-pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
}

/* Streak bar */
.streak-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  min-height: 28px;
}
.streak-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--surface-alt);
  border: 1.5px solid var(--border);
  transition: all 200ms ease;
  flex-shrink: 0;
}
.streak-dot.correct {
  background: var(--brand);
  border-color: var(--brand);
  transform: scale(1.2);
}
.streak-dot.wrong {
  background: var(--wrong-bg);
  border-color: var(--wrong-border);
}
.streak-label {
  font-size: 12px;
  color: var(--txt3);
  margin-left: auto;
}
.streak-fire {
  font-size: 13px;
  color: #f97316;
  font-weight: 600;
  opacity: 0;
  transition: opacity 200ms;
}
.streak-fire.show { opacity: 1; }

/* Timer ring */
.timer-ring-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}
.timer-ring {
  position: relative;
  width: 64px;
  height: 64px;
}
.timer-ring svg { transform: rotate(-90deg); }
.timer-ring circle { fill: none; stroke-width: 5; }
.ring-bg { stroke: var(--surface-alt); }
.ring-fg {
  stroke: var(--brand);
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 400ms ease;
}
.ring-fg.warn   { stroke: #f97316; }
.ring-fg.danger { stroke: var(--brand); }
.timer-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--txt1);
}
.timer-num.warn   { color: #f97316; }
.timer-num.danger { color: var(--brand); }

/* Question text */
.q-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--txt1);
  line-height: 1.45;
  text-align: center;
  margin-bottom: 20px;
  min-height: 52px;
}

/* Answer grid */
.answers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
@media (max-width: 480px) {
  .answers { grid-template-columns: 1fr; }
}

.ans-btn {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--txt1);
  cursor: pointer;
  text-align: left;
  line-height: 1.4;
  transition: all 150ms ease;
  min-height: 44px;
  width: 100%;
}
.ans-btn:hover:not(.disabled) {
  background: var(--brand-light);
  border-color: var(--brand);
  color: var(--brand);
}
.ans-btn.selected {
  background: var(--brand-light);
  border-color: var(--brand);
  color: var(--brand);
}
.ans-btn.correct {
  background: var(--correct-bg);
  border-color: var(--correct-border);
  color: var(--correct);
  animation: pop 200ms ease;
}
.ans-btn.wrong {
  background: var(--wrong-bg);
  border-color: var(--wrong-border);
  color: var(--wrong);
  animation: shake 300ms ease;
}
.ans-btn.dimmed { opacity: 0.4; }
.ans-btn.disabled { cursor: default; }

.ans-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--surface-alt);
  font-size: 11px;
  font-weight: 700;
  color: var(--txt3);
  margin-right: 8px;
  flex-shrink: 0;
  vertical-align: middle;
  transition: background 150ms, color 150ms;
}
.ans-btn.correct .ans-letter { background: var(--correct); color: #fff; }
.ans-btn.wrong .ans-letter   { background: var(--wrong);   color: #fff; }
.ans-btn.selected .ans-letter { background: var(--brand);  color: #fff; }

/* Keyframe animations — DO NOT CHANGE TIMINGS */
@keyframes pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-5px); }
  75%     { transform: translateX(5px); }
}

/* Fun fact reveal */
.fact-reveal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: slideUp 250ms ease both;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms;
}
.fact-reveal.show {
  opacity: 1;
  pointer-events: auto;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fact-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #FEF3C7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.fact-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #92400E;
  margin-bottom: 3px;
}
.fact-text {
  font-size: 13px;
  color: var(--txt2);
  line-height: 1.5;
}

/* Next button */
.next-btn {
  width: 100%;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, transform 120ms, opacity 300ms;
  opacity: 0;
  pointer-events: none;
  min-height: 44px;
}
.next-btn.show {
  opacity: 1;
  pointer-events: auto;
}
.next-btn:hover   { background: var(--brand-dark); }
.next-btn:active  { transform: scale(0.98); }
```

#### HTML structure

```html
<div class="quiz-screen">

  <!-- Top bar -->
  <div class="top-bar">
    <span class="group-tag">{groupName}</span>
    <div class="progress-wrap">
      <div class="progress-bar" id="prog" style="width: {(currentQ/totalQ)*100}%"></div>
    </div>
    <span class="q-counter" id="qcount">{currentQ} / {totalQ}</span>
    <div class="score-pill">
      <span class="score-pip"></span>
      <span id="score-disp">{score}</span> correct
    </div>
  </div>

  <!-- Streak bar — render one .streak-dot per question, add .correct or .wrong after answer -->
  <div class="streak-bar">
    <div class="streak-dot" id="sd0"></div>
    <div class="streak-dot" id="sd1"></div>
    <div class="streak-dot" id="sd2"></div>
    <div class="streak-dot" id="sd3"></div>
    <div class="streak-dot" id="sd4"></div>
    <div class="streak-dot" id="sd5"></div>
    <div class="streak-dot" id="sd6"></div>
    <div class="streak-dot" id="sd7"></div>
    <span class="streak-label">streak</span>
    <span class="streak-fire" id="sfire"></span>
  </div>

  <!-- Timer ring — circumference = 2π × 27.5 = 172.8 -->
  <div class="timer-ring-wrap">
    <div class="timer-ring">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle class="ring-bg" cx="32" cy="32" r="27.5"/>
        <circle class="ring-fg" id="ring" cx="32" cy="32" r="27.5"
          stroke-dasharray="172.8" stroke-dashoffset="0"/>
      </svg>
      <div class="timer-num" id="tnum" aria-live="polite" aria-label="seconds remaining">15</div>
    </div>
  </div>

  <!-- Question -->
  <p class="q-text" id="qtext">{questionText}</p>

  <!-- Answers -->
  <div class="answers" id="answers">
    <button class="ans-btn" id="ans0"><span class="ans-letter">A</span>{option0}</button>
    <button class="ans-btn" id="ans1"><span class="ans-letter">B</span>{option1}</button>
    <button class="ans-btn" id="ans2"><span class="ans-letter">C</span>{option2}</button>
    <button class="ans-btn" id="ans3"><span class="ans-letter">D</span>{option3}</button>
  </div>

  <!-- Fun fact (hidden until answer locked) -->
  <div class="fact-reveal" id="fact">
    <div class="fact-icon">
      <!-- Lucide Lightbulb icon, 16px, color #92400E -->
    </div>
    <div class="fact-body">
      <p class="fact-label">Fun fact</p>
      <p class="fact-text" id="fact-text"></p>
    </div>
  </div>

  <!-- Next question -->
  <button class="next-btn" id="nextbtn">Next question →</button>

</div>
```

#### JavaScript — full controller

Wire this to your quiz data. The `QUESTIONS` array shape matches whatever you fetch from Supabase — adapt field names only, not the logic.

```js
const CIRCUMFERENCE = 172.8; // 2π × r where r = 27.5
const TIMER_SECONDS = 15;

let qIndex    = 0;
let score     = 0;
let streak    = 0;
let answered  = false;
let timerVal  = TIMER_SECONDS;
let timerInterval = null;
let history   = []; // array of booleans, one per answered question

function startTimer() {
  clearInterval(timerInterval);
  timerVal = TIMER_SECONDS;
  updateRing();
  timerInterval = setInterval(() => {
    timerVal--;
    updateRing();
    if (timerVal <= 0) {
      clearInterval(timerInterval);
      if (!answered) timeUp();
    }
  }, 1000);
}

function updateRing() {
  const ring = document.getElementById('ring');
  const tnum = document.getElementById('tnum');
  const frac = timerVal / TIMER_SECONDS;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
  const warn   = timerVal <= 8 && timerVal > 5;
  const danger = timerVal <= 5;
  ring.className = 'ring-fg' + (danger ? ' danger' : warn ? ' warn' : '');
  tnum.className = 'timer-num' + (danger ? ' danger' : warn ? ' warn' : '');
  tnum.textContent = timerVal;
}

function lockAnswers(selectedIdx, correctIdx) {
  answered = true;
  clearInterval(timerInterval);
  const btns = document.querySelectorAll('.ans-btn');
  btns.forEach((b, i) => {
    b.classList.add('disabled');
    if (i === correctIdx)                          b.classList.add('correct');
    else if (i === selectedIdx && i !== correctIdx) b.classList.add('wrong');
    else                                           b.classList.add('dimmed');
  });
}

function pick(idx) {
  if (answered) return;
  const correctIdx = QUESTIONS[qIndex].correct;
  lockAnswers(idx, correctIdx);
  const isCorrect = idx === correctIdx;
  if (isCorrect) { score++; streak++; }
  else           { streak = 0; }
  history.push(isCorrect);
  document.getElementById('score-disp').textContent = score;
  updateStreak();
  showFact();
}

function timeUp() {
  lockAnswers(-1, QUESTIONS[qIndex].correct);
  streak = 0;
  history.push(false);
  updateStreak();
  showFact();
}

function updateStreak() {
  history.forEach((v, i) => {
    const dot = document.getElementById('sd' + i);
    if (dot) dot.className = 'streak-dot ' + (v ? 'correct' : 'wrong');
  });
  const fireEl = document.getElementById('sfire');
  if (streak >= 2) {
    fireEl.textContent = streak + ' 🔥'; // replace 🔥 with Lucide Flame SVG
    fireEl.classList.add('show');
  } else {
    fireEl.classList.remove('show');
  }
}

function showFact() {
  const factEl   = document.getElementById('fact');
  const factText = document.getElementById('fact-text');
  factText.textContent = QUESTIONS[qIndex].funFact;
  factEl.classList.add('show');
  document.getElementById('nextbtn').classList.add('show');
}

function nextQ() {
  qIndex++;
  if (qIndex >= QUESTIONS.length) {
    // Quiz complete — call animateResult() from Section 10i
    showResultScreen(score, QUESTIONS.length, computeBeatPercent(score));
    return;
  }
  answered = false;
  const q = QUESTIONS[qIndex];
  document.getElementById('qtext').textContent = q.question;
  document.getElementById('qcount').textContent = (qIndex + 1) + ' / ' + QUESTIONS.length;
  document.getElementById('prog').style.width = ((qIndex + 1) / QUESTIONS.length * 100) + '%';

  const btns = document.querySelectorAll('.ans-btn');
  btns.forEach((b, i) => {
    b.className = 'ans-btn';
    b.querySelector('.ans-letter').textContent = ['A','B','C','D'][i];
    // replace text node safely:
    b.childNodes[1].textContent = q.options[i];
    b.onclick = () => pick(i);
  });

  document.getElementById('fact').classList.remove('show');
  document.getElementById('nextbtn').classList.remove('show');
  startTimer();
}

// Wire answer buttons on initial load
document.querySelectorAll('.ans-btn').forEach((b, i) => {
  b.addEventListener('click', () => pick(i));
});
document.getElementById('nextbtn').addEventListener('click', nextQ);

// Start
startTimer();
```

#### Mobile-specific overrides

Add these after the base styles. They are mandatory — not optional.

```css
@media (max-width: 480px) {
  .quiz-screen     { padding: 16px; }
  .q-text          { font-size: 15px; min-height: auto; }
  .answers         { grid-template-columns: 1fr; }
  .ans-btn         { padding: 16px; font-size: 15px; } /* larger touch target on mobile */
  .top-bar         { flex-wrap: wrap; gap: 8px; }
  .score-pill      { order: -1; } /* move score pill to top on very small screens */
  .timer-ring-wrap { margin-bottom: 14px; }
}
```

---

## 12. ADDITIONAL UI IMPROVEMENTS — From /ui-ux-pro-max + frontend-design skill analysis

These are the remaining high-impact improvements beyond what is already specified. Implement after Sections 0–10 are complete.

---

### 12a. Shared element transition — quiz card → quiz screen

**What:** When a user clicks a quiz card, the card animates into the quiz screen instead of doing a hard page cut. The cover image of the card expands to fill the quiz banner area.

**Why this is huge:** The `shared-element-transition` rule (ui-ux-pro-max §7) is one of the highest-impact animation patterns in consumer apps. It makes the site feel native — like an iOS app, not a website. No other K-pop quiz site does this.

**How:** Use the View Transitions API (available in all modern browsers, including Safari 18+):

```js
// On quiz card click
async function navigateToQuiz(quizId, cardEl) {
  const img = cardEl.querySelector('.quiz-cover img');
  img.style.viewTransitionName = 'quiz-hero';

  if (!document.startViewTransition) {
    // fallback for older browsers
    router.push(`/q/${quizId}`);
    return;
  }

  const transition = document.startViewTransition(() => {
    router.push(`/q/${quizId}`);
  });
  await transition.ready;
}
```

```css
/* On the quiz detail page — the banner image gets the matching name */
.quiz-detail-banner {
  view-transition-name: quiz-hero;
}

/* Customize the transition animation */
::view-transition-old(quiz-hero) {
  animation: 300ms ease both fade-out;
}
::view-transition-new(quiz-hero) {
  animation: 300ms ease both fade-in;
}

@keyframes fade-out { to   { opacity: 0; } }
@keyframes fade-in  { from { opacity: 0; } }
```

Provide a standard `router.push()` fallback for browsers without View Transitions. The feature degrades gracefully.

---

### 12b. Result share card — image-like shareable result

**What:** After completing a quiz, generate a visually branded result card the user can screenshot and share. This is the single biggest organic growth mechanism available.

**Why:** K-pop fans already screenshot and share scores obsessively. Every existing K-pop quiz result is a plain "You scored 7/8" text screen. A designed, brandable card is something worth sharing. The Reddit growth loop you planned relies on this — fans share the card, others click through.

**Design spec:**
- Full-width card, brand pink header with group name + quiz title
- Large score ("7 / 8") in display type
- Difficulty indicator ("You're an ARMY expert")
- "Play on kpopquiz.org" + URL as watermark at bottom
- Two action buttons: "Share result" (Web Share API) + "Play another quiz"

```css
.result-share-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  text-align: center;
}
.result-share-header {
  background: var(--brand);
  padding: 20px;
  color: #fff;
}
.result-share-group {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
  margin-bottom: 4px;
}
.result-share-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}
.result-share-body {
  padding: 24px 20px 16px;
}
.result-share-score {
  font-size: 56px;
  font-weight: 800;
  color: var(--brand);
  line-height: 1;
  margin-bottom: 4px;
}
.result-share-total {
  font-size: 14px;
  color: var(--txt3);
  margin-bottom: 12px;
}
.result-share-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--txt1);
  margin-bottom: 20px;
}
.result-share-url {
  font-size: 11px;
  color: var(--txt3);
  margin-bottom: 20px;
}
.result-share-actions {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
}
.result-share-actions .btn-primary { flex: 1; }
.result-share-actions .btn-outline  { flex: 1; }
```

```html
<div class="result-share-card">
  <div class="result-share-header">
    <p class="result-share-group">{groupName} quiz</p>
    <p class="result-share-title">{quizTitle}</p>
  </div>
  <div class="result-share-body">
    <p class="result-share-score" id="share-score">0</p>
    <p class="result-share-total">out of {totalQ} questions</p>
    <p class="result-share-label" id="share-label">...</p>
    <p class="result-share-url">kpopquiz.org</p>
  </div>
  <div class="result-share-actions">
    <button class="btn-primary" onclick="shareResult()">Share result</button>
    <button class="btn-outline" onclick="nextQuiz()">Play another</button>
  </div>
</div>
```

```js
// Score label based on percentage
function getScoreLabel(score, total) {
  const pct = score / total;
  if (pct === 1)   return "Perfect score! Certified fan 🏆";
  if (pct >= 0.75) return "You're an expert — impressive!";
  if (pct >= 0.5)  return "Solid effort — keep playing!";
  return "Room to grow — try again?";
}

// Web Share API
async function shareResult() {
  if (navigator.share) {
    await navigator.share({
      title: document.querySelector('.result-share-title').textContent,
      text: `I scored ${score}/${total} on this K-pop quiz!`,
      url: window.location.href + '?utm_source=share&utm_medium=native'
    });
  } else {
    // fallback: copy link to clipboard
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied!');
  }
}
```

---

### 12c. Swipe-to-next on mobile quiz screen

**What:** On mobile, after answering, the user can swipe left to advance to the next question instead of tapping the "Next" button.

**Why:** The ui-ux-pro-max `gesture-alternative` rule requires visible controls for critical actions (the Next button satisfies this). But adding swipe as a secondary gesture makes the mobile quiz feel like a native app. Duolingo uses this. It dramatically improves mobile flow speed.

**Implementation:**

```js
function initSwipeToNext(el) {
  let startX = null;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = startX - e.changedTouches[0].clientX;
    if (dx > 60 && answered) {
      // Swiped left by 60px+ after answering → next question
      nextQ();
    }
    startX = null;
  }, { passive: true });
}

initSwipeToNext(document.querySelector('.quiz-screen'));
```

A 60px threshold prevents accidental triggers. Only fires when `answered = true` — cannot be used to skip unanswered questions.

Add a subtle swipe hint after the first question: a small "swipe →" label that appears for 2 seconds then fades, next to the Next button, on mobile only.

```css
@media (max-width: 480px) {
  .swipe-hint {
    font-size: 11px;
    color: var(--txt3);
    text-align: center;
    margin-top: 6px;
    animation: fadeOut 2s ease 1.5s both;
  }
  @keyframes fadeOut { to { opacity: 0; } }
}
```

---

### 12d. Dark mode — full system

**What:** A complete dark mode implementation using `prefers-color-scheme` + a manual toggle.

**Why:** The frontend-design skill explicitly calls this out as non-negotiable for modern consumer apps. K-pop fans use their phones late at night. Dark mode is not optional — it is expected. Currently kpopquiz.org has none.

**Implementation — CSS only, no JS required for system preference:**

```css
@media (prefers-color-scheme: dark) {
  :root {
    --brand:        #F06292;   /* lighter pink — readable on dark bg */
    --brand-light:  #3D1A26;
    --brand-dark:   #E8457A;

    --bg:           #141210;   /* very dark warm black */
    --surface:      #1E1B18;
    --surface-alt:  #2A2622;

    --txt1:         #F5F0EB;
    --txt2:         #A89F96;
    --txt3:         #6E675F;

    --border:       rgba(245,240,235,0.08);
    --border-h:     rgba(245,240,235,0.16);

    --correct-bg:   #14532D;
    --correct-border: #166534;
    --wrong-bg:     #4C0519;
    --wrong-border: #9F1239;
  }
}
```

Manual toggle (stored in `localStorage`, applied via class on `<html>`):

```js
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const stored = localStorage.getItem('theme');
const isDark = stored === 'dark' || (!stored && prefersDark);
if (isDark) document.documentElement.classList.add('dark');

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
```

```css
/* Class-based dark mode (manual toggle) */
.dark {
  --brand:        #F06292;
  --brand-light:  #3D1A26;
  --bg:           #141210;
  --surface:      #1E1B18;
  --surface-alt:  #2A2622;
  --txt1:         #F5F0EB;
  --txt2:         #A89F96;
  --txt3:         #6E675F;
  --border:       rgba(245,240,235,0.08);
  --border-h:     rgba(245,240,235,0.16);
  --correct-bg:   #14532D;
  --correct-border: #166534;
  --wrong-bg:     #4C0519;
  --wrong-border: #9F1239;
}
```

Add a sun/moon toggle icon button in the navbar (right of Search, left of Create):

```html
<button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">
  <!-- Lucide Sun icon when dark, Lucide Moon icon when light -->
</button>
```

```css
.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--txt2);
  transition: background 120ms, border-color 120ms;
}
.theme-toggle:hover {
  background: var(--surface-alt);
  border-color: var(--border-h);
}
```

---

### 12e. Scroll-triggered section reveals on home page

**What:** Each home page section (Quiz of the day, Trending, Games, Browse by group) fades in as the user scrolls to it, with a slight upward slide. Replaces the current static render.

**Why:** The frontend-design skill's core principle is "one well-orchestrated page load creates more delight than scattered micro-interactions." The home page is that one orchestrated moment. Scroll-triggered reveals make the lobby feel alive rather than dumped onto the page.

**Implementation — IntersectionObserver, no library needed:**

```css
.reveal-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 500ms ease, transform 500ms ease;
}
.reveal-section.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children within a revealed section */
.reveal-section.visible .quiz-card:nth-child(1) { transition-delay: 0ms; }
.reveal-section.visible .quiz-card:nth-child(2) { transition-delay: 40ms; }
.reveal-section.visible .quiz-card:nth-child(3) { transition-delay: 80ms; }
.reveal-section.visible .quiz-card:nth-child(4) { transition-delay: 120ms; }
```

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // fire once only
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal-section').forEach(el => observer.observe(el));
```

Wrap each home page section in `<section class="reveal-section">`. The Quiz of the day section is excluded — it must be visible immediately above the fold.

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal-section {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

### 12f. Implementation order for Section 12

Add these after all of Section 10 is complete. Order:

1. **Dark mode** (12d) — purely CSS + 10 lines of JS, zero risk, huge perceived quality jump
2. **Scroll reveals** (12e) — CSS + IntersectionObserver, no dependencies
3. **Result share card** (12b) — replaces the current result screen, high growth impact
4. **Swipe-to-next** (12c) — mobile-only enhancement, 20 lines of JS
5. **Shared element transition** (12a) — last, requires View Transitions API browser support check

---

## 13. GAMES PAGE (`/games`) — Full redesign code

**IMPORTANT:** Use this code exactly. Same class names, same values, same animation timings. Do not simplify or reinterpret.

The current games page problems this fixes:
- No page identity — drops directly into a flat text list with no hero
- Mode cards are invisible — "This or That" and "Name all members" are just text headers
- No filter bar interactivity
- No visual hierarchy between the two game modes
- XP badges everywhere (deleted per Section 0)
- Name-all hint letters shown as raw cryptic string (`N?J?M?`) instead of styled chips

### 13a. CSS — add to globals.css

```css
/* Games page color tokens — add to :root */
:root {
  --tot-bg:   #FCE8EF;   /* This or That — pink tint */
  --tot-icon: #E8457A;
  --nam-bg:   #E6F1FB;   /* Name all members — blue tint */
  --nam-icon: #1D4ED8;
}

/* Page wrapper */
.games-page {
  background: var(--bg);
  padding: 28px 24px;
  max-width: 800px;
  margin: 0 auto;
}

/* Page hero */
.games-hero { margin-bottom: 32px; }
.games-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--txt3);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.games-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--txt1);
  line-height: 1.2;
  margin-bottom: 8px;
}
.games-title span { color: var(--brand); }
.games-sub {
  font-size: 14px;
  color: var(--txt2);
  line-height: 1.6;
  max-width: 480px;
}

/* Mode hero cards — 2-column grid */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 36px;
}
@media (max-width: 560px) {
  .mode-grid { grid-template-columns: 1fr; }
}

.mode-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  animation: fadeUp 350ms ease both;
}
.mode-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 32px rgba(232,69,122,.10), 0 2px 8px rgba(0,0,0,.05);
  border-color: var(--border-h);
}
.mode-card:active { transform: translateY(0); box-shadow: none; }

.mode-deco {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 16px;
}
.mode-card.tot .mode-deco { background: var(--tot-bg); color: var(--tot-icon); }
.mode-card.nam .mode-deco { background: var(--nam-bg); color: var(--nam-icon); }

.mode-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 100px;
}
.badge-hot { background: #FFF3EC; color: #C2410C; }
.badge-new { background: #DCFCE7; color: #166534; }

.mode-name {
  font-size: 17px;
  font-weight: 800;
  color: var(--txt1);
  margin-bottom: 5px;
}
.mode-desc {
  font-size: 13px;
  color: var(--txt2);
  line-height: 1.5;
  margin-bottom: 16px;
}
.mode-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.mode-stat {
  font-size: 12px;
  color: var(--txt3);
  display: flex;
  align-items: center;
  gap: 4px;
}
.mode-play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, transform 120ms;
  min-height: 44px;
}
.mode-play:hover  { background: var(--brand-dark); }
.mode-play:active { transform: scale(0.97); }
.mode-card.nam .mode-play       { background: #1D4ED8; }
.mode-card.nam .mode-play:hover { background: #1e40af; }

/* Filter bar */
.games-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.games-filter-row::-webkit-scrollbar { display: none; }
.filter-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--txt3);
  white-space: nowrap;
  margin-right: 4px;
  flex-shrink: 0;
}
.fpill {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--txt1);
  cursor: pointer;
  white-space: nowrap;
  transition: all 120ms ease;
  flex-shrink: 0;
}
.fpill:hover          { border-color: var(--brand); color: var(--brand); }
.fpill.active         { background: var(--brand); color: #fff; border-color: var(--brand); }

/* Section header */
.games-sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.games-sec-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--txt3);
  display: flex;
  align-items: center;
  gap: 5px;
}
.games-sec-see {
  font-size: 13px;
  font-weight: 500;
  color: var(--brand);
  text-decoration: none;
  cursor: pointer;
}
.games-sec-see:hover { text-decoration: underline; }

/* Game cards grid — 2 col desktop, 1 col mobile */
.game-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 32px;
}
@media (max-width: 480px) {
  .game-grid { grid-template-columns: 1fr; }
}

.game-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  animation: fadeUp 300ms ease both;
  min-height: 44px;
}
.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(232,69,122,.08), 0 1px 6px rgba(0,0,0,.05);
  border-color: var(--border-h);
}
.game-card:active { transform: translateY(0); box-shadow: none; }

.gc-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}
.gc-tot { background: var(--tot-bg); color: var(--tot-icon); }
.gc-nam { background: var(--nam-bg); color: var(--nam-icon); }

.gc-body { flex: 1; min-width: 0; }
.gc-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--txt1);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gc-sub {
  font-size: 11px;
  color: var(--txt3);
  margin-bottom: 7px;
  line-height: 1.4;
}
.gc-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gc-plays {
  font-size: 11px;
  color: var(--txt3);
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Name-all initial hint chips */
.nam-hints {
  display: flex;
  gap: 5px;
  margin-bottom: 7px;
  flex-wrap: wrap;
}
.hint-dot {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--txt3);
}

/* Difficulty + timer pills on name-all cards */
.diff-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 100px;
}
.d-easy { background: #DCFCE7; color: #166534; }
.d-med  { background: #FEF3C7; color: #92400E; }
.d-hard { background: #FFE4E6; color: #9F1239; }

.timer-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 100px;
  background: var(--surface-alt);
  color: var(--txt2);
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Section divider */
.games-divider {
  height: 0.5px;
  background: var(--border);
  margin: 8px 0 28px;
}
```

### 13b. HTML structure — full `/games` page body

```html
<main class="games-page">

  <!-- Hero -->
  <div class="games-hero">
    <p class="games-eyebrow">
      <!-- Lucide Gamepad2 icon, 13px -->
      Games
    </p>
    <h1 class="games-title">Pick. Type. <span>Win.</span></h1>
    <p class="games-sub">Two game modes, hundreds of challenges. How fast can you name all members? Who is your ultimate bias?</p>
  </div>

  <!-- Mode hero cards -->
  <div class="mode-grid">

    <div class="mode-card tot" style="animation-delay: 0ms">
      <span class="mode-badge badge-hot">Most played</span>
      <div class="mode-deco">
        <!-- Lucide ArrowLeftRight icon, 26px -->
      </div>
      <p class="mode-name">This or That</p>
      <p class="mode-desc">Two options. One winner. Pick your bias in infinite head-to-head matchups across idols, songs, and groups.</p>
      <div class="mode-meta">
        <span class="mode-stat"><!-- Lucide Users icon, 13px --> 20+ categories</span>
        <span class="mode-stat"><!-- Lucide Clock icon, 13px --> ~3 min</span>
      </div>
      <button class="mode-play" onclick="location.href='/games/this-or-that'">
        <!-- Lucide Play icon, 14px --> Play now
      </button>
    </div>

    <div class="mode-card nam" style="animation-delay: 60ms">
      <span class="mode-badge badge-new">24+ groups</span>
      <div class="mode-deco">
        <!-- Lucide Keyboard icon, 26px -->
      </div>
      <p class="mode-name">Name all members</p>
      <p class="mode-desc">Type every member's name before the timer runs out. Sounds easy. It never is.</p>
      <div class="mode-meta">
        <span class="mode-stat"><!-- Lucide Users icon, 13px --> 24+ challenges</span>
        <span class="mode-stat"><!-- Lucide Clock icon, 13px --> 0:30 – 5:00</span>
      </div>
      <button class="mode-play" onclick="location.href='/games/name-all'">
        <!-- Lucide Play icon, 14px --> Play now
      </button>
    </div>

  </div>

  <!-- Filter bar — filters both sections simultaneously -->
  <div class="games-filter-row" id="games-filter">
    <span class="filter-label">Filter</span>
    <button class="fpill active" data-group="all">All</button>
    <button class="fpill" data-group="bts">BTS</button>
    <button class="fpill" data-group="blackpink">BLACKPINK</button>
    <button class="fpill" data-group="straykids">Stray Kids</button>
    <button class="fpill" data-group="seventeen">SEVENTEEN</button>
    <button class="fpill" data-group="aespa">aespa</button>
    <button class="fpill" data-group="twice">TWICE</button>
    <button class="fpill" data-group="newjeans">NewJeans</button>
    <button class="fpill" data-group="ive">IVE</button>
    <button class="fpill" data-group="4thgen">4th gen</button>
    <button class="fpill" data-group="legends">Legends</button>
  </div>

  <!-- This or That section -->
  <div class="games-sec-head">
    <span class="games-sec-label">
      <!-- Lucide ArrowLeftRight icon, 12px --> This or That
    </span>
    <a class="games-sec-see" href="/games/this-or-that">See all 20+ →</a>
  </div>

  <div class="game-grid" id="tot-grid">
    <!-- Render from data. Each card: -->
    <!--
    <div class="game-card" style="animation-delay: {index * 40}ms" onclick="location.href='{url}'">
      <div class="gc-icon gc-tot">
        Lucide Users or Music icon depending on category type
      </div>
      <div class="gc-body">
        <p class="gc-name">{categoryName}</p>
        <p class="gc-sub">{count} {type} · {tagline}</p>
        <div class="gc-footer">
          <span class="gc-plays">Lucide User icon {plays} plays</span>
        </div>
      </div>
    </div>
    -->
  </div>

  <div class="games-divider"></div>

  <!-- Name all members section -->
  <div class="games-sec-head">
    <span class="games-sec-label">
      <!-- Lucide Keyboard icon, 12px --> Name all members
    </span>
    <a class="games-sec-see" href="/games/name-all">See all 24+ →</a>
  </div>

  <div class="game-grid" id="nam-grid">
    <!-- Render from data. Each card: -->
    <!--
    <div class="game-card" style="animation-delay: {index * 40}ms" onclick="location.href='{url}'">
      <div class="gc-icon gc-nam">
        Lucide Keyboard icon
      </div>
      <div class="gc-body">
        <div class="nam-hints">
          {members.map(m => `<div class="hint-dot">${m.name[0].toUpperCase()}</div>`).join('')}
        </div>
        <p class="gc-name">{challengeName}</p>
        <div class="gc-footer">
          <span class="diff-pill d-{difficulty}">{Difficulty}</span>
          <span class="timer-pill">Lucide Clock icon {timer}</span>
          <span class="gc-plays">Lucide User icon {plays}</span>
        </div>
      </div>
    </div>
    -->
  </div>

</main>
```

### 13c. JS — filter pill interaction

```js
document.querySelectorAll('#games-filter .fpill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#games-filter .fpill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const group = pill.dataset.group;
    filterGames(group);
  });
});

function filterGames(group) {
  // Filter both grids simultaneously
  const allCards = document.querySelectorAll('#tot-grid .game-card, #nam-grid .game-card');
  allCards.forEach(card => {
    const cardGroup = card.dataset.group || 'all';
    const visible = group === 'all' || cardGroup === group;
    card.style.display = visible ? 'flex' : 'none';
  });
}
```

Add `data-group="{groupSlug}"` attribute to each `.game-card` when rendering from data. Slug examples: `bts`, `blackpink`, `straykids`, `seventeen`, `twice`, `4thgen`, `legends`.

### 13d. Stagger animation — apply on render

When rendering cards from the database, set the animation delay inline based on index:

```js
cards.forEach((card, index) => {
  card.style.animationDelay = `${index * 40}ms`;
});
```

---

## 14. FINAL UI/UX AUDIT — frontend-design skill review

Full site audit applying both `/ui-ux-pro-max` and `frontend-design` skill principles. Every issue below is a specific, actionable fix — not a suggestion.

---

### 14a. IDENTITY — the one thing the site is missing

**Issue:** kpopquiz.org has no visual signature. Every page uses the same cream bg + pink accent, but there is no single moment that feels *unmistakably* kpopquiz. Sporcle has its dense table grid. Duolingo has its mascot and streak counter. NYT Games has its clean editorial grid. kpopquiz has nothing yet.

**Fix — the `VS` divider on This or That.**
The This or That game has a natural visual signature built in: two options facing each other with a `VS` in the middle. Make that `VS` the brand mark of the Games section. Render it as a large, confident pink circle with `VS` in bold white at 18px. Every This or That game card and the mode hero card should use this motif. It becomes the icon you associate with the site — shareable, memorable, instantly recognizable.

```css
.vs-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
```

Use on: This or That game cards between the two option previews, the mode hero card as the icon inside `.mode-deco`, and as the favicon alternative on the Games page tab.

---

### 14b. TYPOGRAPHY — one font is doing everything wrong

**Issue:** The site appears to use a single weight of a rounded sans throughout — headings, body, badges, meta text all look the same weight. This collapses visual hierarchy. The `frontend-design` skill calls this out explicitly: pair a distinctive display font with a refined body font, and vary weights dramatically.

**Fix:**

```css
/* Add to <head> */
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">

:root {
  --font-display: 'Syne', sans-serif;   /* hero titles, mode names, score numbers */
  --font-body:    'DM Sans', sans-serif; /* everything else */
}
```

Apply:
- `.hero-title`, `.games-title`, `.mode-name`, `.daily-title`, `.result-score` → `font-family: var(--font-display)`
- All body text, cards, badges, meta → `font-family: var(--font-body)`

Syne is geometric, bold, and has a playful edge that reads as fan-native without being childish. DM Sans is clean and highly legible at small sizes. This pairing alone will make the site look designed rather than default.

---

### 14c. HOME PAGE — hero section is passive

**Issue:** The current hero ("K-pop quizzes made by fans, played by thousands") is a description. It tells you what the site is. It does not make you want to play. The `frontend-design` skill's differentiation principle: what's the one thing someone will remember? Right now, nothing.

**Fix — rewrite the hero headline with a challenge hook:**

```
Are you a real fan?
```

Subline: "Prove it. Take a K-pop quiz and see where you rank."

This is a direct challenge to the ego of a K-pop fan, which is the most powerful hook available. Fans do not want to be told about a quiz site. They want to be dared. Replace the current headline and subline with this — no other changes to the hero layout needed.

The `Are you a real fan?` in italic or a slightly rotated display treatment becomes another visual signature.

---

### 14d. QUIZ CARDS — cover images are broken on mobile

**Issue:** The 72×72px cover image sits flush left inside the card. On mobile (single column, full width card), this creates a tiny image next to a lot of text — the proportion is wrong. On desktop at 2 columns it works. On mobile it doesn't.

**Fix:**

```css
@media (max-width: 480px) {
  .quiz-card {
    flex-direction: column;
  }
  .quiz-cover {
    width: 100%;
    height: 140px;
    border-radius: 10px 10px 0 0;
    margin: -14px -14px 12px -14px; /* bleed to card edges */
    width: calc(100% + 28px);
  }
}
```

On mobile, the cover image becomes a full-width banner at the top of the card instead of a small left-aligned thumbnail. This makes the card feel editorial rather than cramped.

---

### 14e. QUIZ DETAIL PAGE — no context before starting

**Issue:** A user arriving from Google on a quiz page sees: cover image, badges, title, author, play count, Start button. There is no answer to "why should I play this specific quiz?" — no difficulty preview, no sample question, no sense of what format they're about to experience.

**Fix — add a format preview strip:**

```html
<!-- Between author and Start button -->
<div class="format-strip">
  <div class="format-item">
    <span class="format-icon"><!-- Lucide icon --></span>
    <span class="format-val">{questionCount} questions</span>
  </div>
  <div class="format-item">
    <span class="format-icon"><!-- Lucide icon --></span>
    <span class="format-val">{estimatedTime} min</span>
  </div>
  <div class="format-item">
    <span class="format-icon"><!-- Lucide icon --></span>
    <span class="format-val">{quizType}</span>
  </div>
</div>
```

```css
.format-strip {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}
.format-item {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-right: 1px solid var(--border);
  background: var(--surface);
}
.format-item:last-child { border-right: none; }
.format-icon { font-size: 16px; color: var(--txt3); }
.format-val  { font-size: 12px; font-weight: 600; color: var(--txt1); }
```

Estimated time = `questionCount * 15` seconds, rounded to nearest half minute.

---

### 14f. LEADERBOARD PAGE — completely undefined

**Issue:** The leaderboard is linked in the nav and footer but has no specified design. Based on the current site, it likely shows a plain table. A plain table kills engagement — it reads as data, not competition.

**Fix — redesign to podium + ranked list:**

Top 3 users get a podium treatment (1st = larger card with brand pink accent, 2nd and 3rd flanking). Below that, positions 4–20 are a ranked list with avatar, username, score, and a sparkline of recent activity.

```css
.podium-row {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr; /* center (1st) is taller */
  gap: 10px;
  align-items: end;
  margin-bottom: 24px;
}
.podium-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  transition: transform 120ms ease;
}
.podium-card.first {
  border-color: var(--brand);
  border-width: 2px;
  padding-top: 24px;
}
.podium-rank {
  font-size: 22px;
  font-weight: 900;
  color: var(--brand);
  margin-bottom: 6px;
}
.podium-card.second .podium-rank,
.podium-card.third  .podium-rank {
  color: var(--txt3);
}
.podium-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-alt);
  margin: 0 auto 8px;
  overflow: hidden;
}
.podium-name  { font-size: 13px; font-weight: 700; color: var(--txt1); }
.podium-score { font-size: 11px; color: var(--txt3); margin-top: 2px; }
```

---

### 14g. MISSING PAGE — `/create` entry point needs a teaser

**Issue:** "Create a quiz" is the core growth mechanic but clicking the Create button drops users directly into a blank editor with no onboarding. First-time creators have no idea what types of quizzes they can make, how many questions are needed, or what happens after.

**Fix — add a pre-create modal or landing step:**

Before the editor opens, show a 3-step illustrated card:

```
[1] Choose a quiz type     →     [2] Write your questions     →     [3] Publish and share
Classic / True/False / Clues       8–20 questions recommended         Fans play and you get credit
```

```css
.create-onboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.create-step {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
}
.create-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}
.create-step-title { font-size: 13px; font-weight: 700; color: var(--txt1); margin-bottom: 4px; }
.create-step-desc  { font-size: 11px; color: var(--txt3); line-height: 1.5; }
```

Show this above the editor on the `/create` page — not as a blocking modal. Users can scroll past it immediately if they already know what to do.

---

### 14h. GLOBAL — no empty state on filtered views

**Issue:** When a user filters quizzes by group and there are no results, the page shows nothing. No message, no illustration, no CTA. The ui-ux-pro-max `empty-states` rule requires a helpful message and action.

**Fix:**

```html
<div class="empty-state" id="empty-state" style="display: none;">
  <div class="empty-icon">
    <!-- Lucide SearchX icon, 32px, color var(--txt3) -->
  </div>
  <p class="empty-title">No quizzes found</p>
  <p class="empty-desc">No {groupName} quizzes yet — be the first to create one.</p>
  <a href="/create" class="btn-primary" style="display: inline-flex; margin-top: 12px;">
    Create a quiz
  </a>
</div>
```

```css
.empty-state {
  text-align: center;
  padding: 48px 24px;
  animation: fadeUp 250ms ease;
}
.empty-icon  { margin-bottom: 12px; color: var(--txt3); }
.empty-title { font-size: 16px; font-weight: 700; color: var(--txt1); margin-bottom: 6px; }
.empty-desc  { font-size: 13px; color: var(--txt3); }
```

Show when filtered quiz count = 0. Hide when count > 0.

---

### 14i. Implementation order for Section 14

Apply after Sections 0–13 are complete. Order by impact:

1. **14b Typography** — Syne + DM Sans. One `<link>` tag and two CSS variables. 30 minutes. Biggest visual leap per line of code.
2. **14c Hero rewrite** — one sentence change. 5 minutes. Highest conversion impact.
3. **14a VS badge** — adds the site's visual signature. 1 hour.
4. **14d Mobile card fix** — CSS only, fixes broken layout on phones.
5. **14e Format strip** — adds context to quiz detail page, improves start rate.
6. **14h Empty state** — 20 lines of HTML + CSS, prevents blank page dead ends.
7. **14g Create onboarding** — improves UGC conversion, show above editor.
8. **14f Leaderboard podium** — full page redesign, do last.

---

## 16. BLINDTEST PAGE (`/blindtest`) — Full V1 specification and exact code

### 16a. Overview and backend migration

**The blindtest page is a full merge of `kpopblindtest.com` into `kpopquiz.org`.**

It lives at `/blindtest`, accessible from the navbar (between Games and Leaderboard) and teased on the home page (see Section 2d for the home page teaser card).

**CRITICAL — Backend migration from `https://kpop-quizz-v2-blindtest.vercel.app/`:**

This is a migration from a SEPARATE existing repo (the blindtest Vercel project) INTO the kpopquiz.org monorepo. Before writing any migration code, READ BOTH BACKENDS IN FULL and produce a written migration map (see below). A careless migration breaks audio playback, loses the 22,000-song database, or collides with existing kpopquiz.org schema.

**Read the SOURCE backend (blindtest Vercel repo) end to end and document:**
- Every Supabase table/column/type/constraint/index/FK for songs, playlists, sessions, play tracking — capture exact DDL.
- Every migration file in order (e.g. `024_songs_deezer.sql` and any others) — understand the full schema history.
- The song population scripts (e.g. `populate-songs.mjs`) — how songs are fetched, normalized, inserted; where Deezer preview URLs and album art come from.
- The Deezer integration — API calls, rate limits, keys, how previews and metadata are retrieved.
- The `/api/game/generate` endpoint — exact params, exact response shape, and specifically HOW `wrongAnswers` distractors are produced per song (required for the 4-choice mode).
- The `use-audio-player` hook — full YouTube IFrame integration AND the iOS Safari AudioContext unlock workaround (most fragile piece).
- The admin song-management panel — routes, auth, write operations.
- Any env vars / secrets the blindtest backend needs.

**Read the TARGET backend (kpopquiz.org) and document:** existing schema, migration numbering convention, naming conventions, API route conventions, auth/session model, and any naming collisions (a `songs` or `plays` table in both).

**Produce a written MIGRATION MAP before coding** — for every source object: target name, target location, rename if needed to avoid collision, transformation needed, and every risk flagged. Get this reviewed before writing a single migration.

**Then migrate and port (verify each step before the next):**

- The full song database (22,000+ songs, Deezer preview URLs, album art, metadata) — verify row counts match the source.
- The Deezer integration and admin panel (`/admin/songs`) for adding/managing songs — verify read + write work in the target.
- The `/api/game/generate` endpoint — verify it returns songs WITH the `wrongAnswers` array (the 4-choice mode depends on this exact field).
- The `use-audio-player` hook with iOS AudioContext unlock workaround — test on real iOS Safari, not just desktop.
- All Supabase tables related to songs, play tracking, and song counts — using the target's migration numbering, no collisions.
- The existing song population scripts (`populate-songs.mjs`, `024_songs_deezer.sql`).

**What NOT to migrate:**

- Party mode, ranked mode, daily challenge mode — V1 is solo only.
- XP/combo/powerup/mastery systems — deleted per Section 0.
- Streak calendar, rank progression, achievement system.
- The multiplayer room code system (kahoot-style host/player screens).
- The lightstick mascot component.
- The dark purple gradient theme — use kpopquiz.org design system throughout.
- The `use-game-state` hook's XP and mastery tracking logic.

---

### 16b. Answer mode — 4 choices, NOT free-text typing

**IMPORTANT CHANGE from the prototype in this conversation:**

The prototype above used free-text input. **V1 uses 4-choice multiple choice answers instead.** This is the correct answer mode for a blindtest embedded in kpopquiz.org — it matches the quiz UX, lowers the barrier to play, and works on mobile without keyboard covering the screen.

**How 4-choice answers work:**

The `/api/game/generate` endpoint already returns `wrongAnswers` for each song — use those. Each round shows:
- 1 correct answer (the actual song title)
- 3 wrong answers (other songs from the same playlist, different artist or era)

Shuffle the 4 options randomly before display. On tap: lock immediately (no submit button), show correct/wrong state, reveal album art, slide up reveal card, show "Next song →".

The fuzzy-match library is NOT needed in 4-choice mode. Remove the fuzzy-match import from this page only — it is still used on the quiz pages.

---

### 16c. Game flow — 4 screens

```
Screen 1: Setup  →  Screen 2: Playing  →  Screen 3: Reveal  →  Screen 4: Results
```

- Setup → Playing: tap "Start blindtest"
- Playing → Reveal: tap any answer option (immediate lock)
- Reveal → Playing: tap "Next song →" (or swipe left on mobile, Section 12c)
- Playing → Results: after last song, "Next song →" triggers results
- Results → Setup: "New game" button
- Results → Playing: "Play again" reshuffles same config

---

### 16d. CSS — add to globals.css alongside kpopquiz.org design system

These extend the existing root variables. Do not duplicate variables already defined.

```css
/* Blindtest-specific additions to :root */
:root {
  --bt-green:        #166534;
  --bt-green-bg:     #DCFCE7;
  --bt-green-border: #86EFAC;
  --bt-red:          #9F1239;
  --bt-red-bg:       #FFE4E6;
  --bt-red-border:   #FDA4AF;
  --bt-amber:        #92400E;
  --bt-amber-bg:     #FEF3C7;
  --bt-amber-border: #FCD34D;
}

/* Page wrapper */
.bt-page {
  background: var(--bg);
  font-family: var(--font-body, var(--font-sans));
  max-width: 520px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

/* Shared nav row used across all 4 screens */
.bt-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 0 16px;
  border-bottom: 0.5px solid var(--border);
  margin-bottom: 24px;
}
.bt-nav-back {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--txt2);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  min-height: 44px;
}
.bt-nav-back:hover { color: var(--txt1); }
.bt-score-pill {
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: 100px;
  padding: 4px 12px 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--txt1);
  margin-left: auto;
}
.bt-score-pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
}

/* ── SCREEN 1: SETUP ── */
.bt-group-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 20px;
}
.bt-gchip {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 8px 4px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--txt2);
  cursor: pointer;
  transition: all 120ms ease;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bt-gchip.on {
  border-color: var(--brand);
  background: var(--brand-light);
  color: var(--brand-dark);
}
.bt-gchip:hover:not(.on) { border-color: var(--border-h); color: var(--txt1); }

.bt-diff-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 20px;
}
.bt-diff-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 120ms ease;
  min-height: 44px;
}
.bt-diff-card.on {
  border-color: var(--brand);
  background: var(--brand-light);
}
.bt-diff-card:hover:not(.on) { border-color: var(--border-h); }
.bt-diff-icon { font-size: 18px; margin-bottom: 4px; color: var(--txt2); }
.bt-diff-name { font-size: 13px; font-weight: 700; color: var(--txt1); }
.bt-diff-desc { font-size: 11px; color: var(--txt3); margin-top: 2px; line-height: 1.4; }

.bt-rounds-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.bt-rounds-row label { font-size: 13px; color: var(--txt2); white-space: nowrap; }
.bt-rounds-row input[type="range"] { flex: 1; }
.bt-rounds-val { font-size: 14px; font-weight: 700; color: var(--txt1); min-width: 28px; text-align: right; }

/* ── SCREEN 2: PLAYING ── */
.bt-art-wrap {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 20px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface-alt);
  border: 0.5px solid var(--border);
}
.bt-art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 600ms ease, transform 600ms ease;
}
.bt-art-img.blurred {
  filter: blur(16px) brightness(0.9);
  transform: scale(1.06);
}
.bt-art-img.revealed {
  filter: blur(0px) brightness(1);
  transform: scale(1);
}
.bt-art-lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250, 248, 245, 0.3);
  transition: opacity 300ms;
}
.bt-art-lock.hide { opacity: 0; pointer-events: none; }

/* Waveform — 5 animated bars */
.bt-waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 36px;
  margin-bottom: 16px;
}
.bt-wbar {
  width: 4px;
  border-radius: 2px;
  background: var(--brand);
  transition: background 300ms;
}
.bt-wbar.stopped { background: var(--border-h); }

@keyframes bt-wave1 { 0%,100%{height:8px}  50%{height:28px} }
@keyframes bt-wave2 { 0%,100%{height:14px} 50%{height:20px} }
@keyframes bt-wave3 { 0%,100%{height:20px} 50%{height:10px} }
@keyframes bt-wave4 { 0%,100%{height:10px} 50%{height:26px} }
@keyframes bt-wave5 { 0%,100%{height:18px} 50%{height:8px}  }

.bt-wbar.playing:nth-child(1) { animation: bt-wave1 0.70s ease-in-out infinite; }
.bt-wbar.playing:nth-child(2) { animation: bt-wave2 0.90s ease-in-out infinite; }
.bt-wbar.playing:nth-child(3) { animation: bt-wave3 0.60s ease-in-out infinite; }
.bt-wbar.playing:nth-child(4) { animation: bt-wave4 0.80s ease-in-out infinite; }
.bt-wbar.playing:nth-child(5) { animation: bt-wave5 0.75s ease-in-out infinite; }

/* Ring timer — circumference = 2π × 23.5 = 147.7 */
.bt-timer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.bt-ring-wrap {
  position: relative;
  width: 56px;
  height: 56px;
}
.bt-ring-wrap svg { transform: rotate(-90deg); }
.bt-ring-wrap circle { fill: none; stroke-width: 5; }
.bt-ring-bg { stroke: var(--surface-alt); }
.bt-ring-fg {
  stroke: var(--brand);
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 400ms ease;
}
.bt-ring-fg.warn   { stroke: #F59E0B; }
.bt-ring-fg.danger { stroke: var(--brand); }
.bt-ring-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--txt1);
}
.bt-ring-num.warn   { color: #B45309; }
.bt-ring-num.danger { color: var(--brand); }

/* Hint pill — fades in at 50% timer */
.bt-hint-pill {
  background: var(--bt-amber-bg);
  border: 0.5px solid var(--bt-amber-border);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--bt-amber);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  opacity: 0;
  transition: opacity 300ms;
  margin: 0 auto 14px;
}
.bt-hint-pill.show { opacity: 1; }

/* 4-choice answer buttons */
.bt-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.bt-choice {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 14px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--txt1);
  cursor: pointer;
  text-align: left;
  line-height: 1.4;
  transition: all 150ms ease;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bt-choice:hover:not(.disabled) {
  background: var(--brand-light);
  border-color: var(--brand);
  color: var(--brand-dark);
}
.bt-choice.correct {
  background: var(--bt-green-bg);
  border-color: var(--bt-green-border);
  color: var(--bt-green);
  animation: bt-pop 200ms ease;
}
.bt-choice.wrong {
  background: var(--bt-red-bg);
  border-color: var(--bt-red-border);
  color: var(--bt-red);
  animation: bt-shake 300ms ease;
}
.bt-choice.dimmed { opacity: 0.35; }
.bt-choice.disabled { cursor: default; }
.bt-choice-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--surface-alt);
  font-size: 11px;
  font-weight: 700;
  color: var(--txt3);
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
}
.bt-choice.correct .bt-choice-letter { background: var(--bt-green); color: #fff; }
.bt-choice.wrong   .bt-choice-letter { background: var(--bt-red);   color: #fff; }

@keyframes bt-pop   { 0%{transform:scale(1)} 50%{transform:scale(1.025)} 100%{transform:scale(1)} }
@keyframes bt-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }

/* Points pop animation */
.bt-pts-pop {
  font-size: 15px;
  font-weight: 800;
  color: var(--brand);
  text-align: center;
  opacity: 0;
  pointer-events: none;
  min-height: 20px;
  transition: none;
}
.bt-pts-pop.fire { animation: bt-pts-up 700ms ease both; }
@keyframes bt-pts-up { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-24px)} }

/* ── SCREEN 3: REVEAL ── */
.bt-reveal-card {
  background: var(--bt-green-bg);
  border: 0.5px solid var(--bt-green-border);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  animation: bt-slide-up 250ms ease both;
  display: none;
}
.bt-reveal-card.show   { display: block; }
.bt-reveal-card.wrong  { background: var(--bt-red-bg); border-color: var(--bt-red-border); }
.bt-reveal-card.skip   { background: var(--surface-alt); border-color: var(--border); }
.bt-reveal-title  { font-size: 17px; font-weight: 800; color: var(--txt1); margin-bottom: 3px; }
.bt-reveal-artist { font-size: 13px; color: var(--txt2); margin-bottom: 8px; }
.bt-reveal-pts    { font-size: 13px; font-weight: 700; color: var(--bt-green); }
.bt-reveal-pts.wrong { color: var(--bt-red); }
.bt-reveal-pts.skip  { color: var(--txt3); }

@keyframes bt-slide-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.bt-next-btn {
  width: 100%;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 13px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, transform 120ms, opacity 300ms;
  opacity: 0;
  pointer-events: none;
  margin-bottom: 8px;
  min-height: 44px;
}
.bt-next-btn.show   { opacity: 1; pointer-events: auto; }
.bt-next-btn:hover  { background: var(--brand-dark); }
.bt-next-btn:active { transform: scale(0.98); }

.bt-skip-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--txt3);
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
  padding: 6px 12px;
  border-radius: 100px;
  transition: color 120ms, background 120ms;
  min-height: 44px;
}
.bt-skip-btn:hover { color: var(--txt2); background: var(--surface-alt); }

/* ── SCREEN 4: RESULTS ── */
.bt-results-header { text-align: center; margin-bottom: 24px; }
.bt-results-score  { font-size: 56px; font-weight: 800; color: var(--brand); line-height: 1; }
.bt-results-label  { font-size: 14px; color: var(--txt2); margin-top: 4px; }
.bt-results-sub    { font-size: 13px; color: var(--txt3); margin-top: 2px; margin-bottom: 16px; }
.bt-results-bar-wrap {
  background: var(--surface-alt);
  border-radius: 100px;
  height: 6px;
  overflow: hidden;
  margin: 10px 0 20px;
}
.bt-results-bar {
  height: 100%;
  background: var(--brand);
  border-radius: 100px;
  width: 0%;
  transition: width 1s ease;
}

.bt-answers-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.bt-ans-row {
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.bt-ans-num    { font-size: 11px; font-weight: 700; color: var(--txt3); width: 16px; flex-shrink: 0; }
.bt-ans-body   { flex: 1; min-width: 0; }
.bt-ans-song   { font-size: 13px; font-weight: 600; color: var(--txt1); }
.bt-ans-artist { font-size: 11px; color: var(--txt3); }
.bt-ans-result { font-size: 11px; font-weight: 600; flex-shrink: 0; }
.bt-ans-correct { color: var(--bt-green); }
.bt-ans-wrong   { color: var(--bt-red); }
.bt-ans-skip    { color: var(--txt3); }

.bt-results-actions { display: flex; gap: 10px; }
.bt-btn-outline {
  flex: 1;
  background: transparent;
  color: var(--brand);
  border: 1.5px solid var(--brand);
  border-radius: 100px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  min-height: 44px;
}
.bt-btn-outline:hover { background: var(--brand-light); }

/* Mobile overrides */
@media (max-width: 480px) {
  .bt-page { padding: 0 16px 40px; }
  .bt-art-wrap { width: 150px; height: 150px; }
  .bt-choices { grid-template-columns: 1fr; }
  .bt-choice  { padding: 16px 14px; font-size: 14px; }
}
```

---

### 16e. HTML structure — full `/blindtest` page

The page has 4 screens. Only one is visible at a time — toggled by adding/removing the `active` class. Screens share the kpopquiz.org site navbar at the top of the page (outside `.bt-page`).

```html
<!-- Shared site navbar goes here (Home / Quizzes / Games / Blindtest / Leaderboard) -->

<main class="bt-page">

  <!-- ── SCREEN 1: SETUP ── -->
  <div class="bt-screen active" id="bt-setup">
    <div class="bt-nav">
      <span style="font-size:15px;font-weight:800;color:var(--txt1)">
        Blindtest <span style="color:var(--brand)">·</span> Solo
      </span>
      <span style="font-size:12px;color:var(--txt3);margin-left:auto;background:var(--surface-alt);padding:3px 10px;border-radius:100px">
        22,000+ songs
      </span>
    </div>

    <p class="sec-label">Pick your groups</p>
    <div class="bt-group-grid" id="bt-group-grid">
      <div class="bt-gchip on" data-g="bts">BTS</div>
      <div class="bt-gchip on" data-g="blackpink">BLACKPINK</div>
      <div class="bt-gchip" data-g="twice">TWICE</div>
      <div class="bt-gchip" data-g="straykids">Stray Kids</div>
      <div class="bt-gchip" data-g="aespa">aespa</div>
      <div class="bt-gchip" data-g="seventeen">SEVENTEEN</div>
      <div class="bt-gchip" data-g="newjeans">NewJeans</div>
      <div class="bt-gchip" data-g="ive">IVE</div>
      <div class="bt-gchip" data-g="exo">EXO</div>
      <div class="bt-gchip" data-g="txt">TXT</div>
      <div class="bt-gchip" data-g="enhypen">ENHYPEN</div>
      <div class="bt-gchip" data-g="lesserafim">LE SSERAFIM</div>
    </div>

    <p class="sec-label">Difficulty</p>
    <div class="bt-diff-grid" id="bt-diff-grid">
      <div class="bt-diff-card on" data-d="easy" data-time="20">
        <div class="bt-diff-icon"><!-- Lucide Sun icon, 18px --></div>
        <div class="bt-diff-name">Easy</div>
        <div class="bt-diff-desc">Title tracks · 20s</div>
      </div>
      <div class="bt-diff-card" data-d="medium" data-time="15">
        <div class="bt-diff-icon"><!-- Lucide Flame icon, 18px --></div>
        <div class="bt-diff-name">Medium</div>
        <div class="bt-diff-desc">All songs · 15s</div>
      </div>
      <div class="bt-diff-card" data-d="hard" data-time="10">
        <div class="bt-diff-icon"><!-- Lucide Skull icon, 18px --></div>
        <div class="bt-diff-name">Hard</div>
        <div class="bt-diff-desc">Deep cuts · 10s</div>
      </div>
    </div>

    <p class="sec-label">Number of songs</p>
    <div class="bt-rounds-row">
      <label for="bt-rounds">Songs</label>
      <input type="range" id="bt-rounds" min="5" max="20" step="5" value="10"
        oninput="document.getElementById('bt-rounds-val').textContent = this.value">
      <span class="bt-rounds-val" id="bt-rounds-val">10</span>
    </div>

    <button class="btn-primary" id="bt-start-btn">
      <!-- Lucide Play icon, 16px --> Start blindtest
    </button>
  </div>


  <!-- ── SCREEN 2: PLAYING ── -->
  <div class="bt-screen" id="bt-play">
    <div class="bt-nav">
      <button class="bt-nav-back" id="bt-back-btn">
        <!-- Lucide ArrowLeft icon, 15px --> Setup
      </button>
      <span style="font-size:13px;color:var(--txt2);margin-left:auto;margin-right:auto">
        Song <span id="bt-song-num">1</span> / <span id="bt-song-total">10</span>
      </span>
      <div class="bt-score-pill">
        <span class="bt-score-pip"></span>
        <span id="bt-score-disp">0</span> pts
      </div>
    </div>

    <!-- Album art — blurred until answer locked -->
    <div class="bt-art-wrap">
      <img class="bt-art-img blurred" id="bt-art" src="" alt="Album art">
      <div class="bt-art-lock" id="bt-art-lock">
        <!-- Lucide Music icon, 28px, color var(--txt3) -->
      </div>
    </div>

    <!-- Animated waveform -->
    <div class="bt-waveform" id="bt-waveform">
      <div class="bt-wbar playing" style="height:8px"></div>
      <div class="bt-wbar playing" style="height:14px"></div>
      <div class="bt-wbar playing" style="height:20px"></div>
      <div class="bt-wbar playing" style="height:14px"></div>
      <div class="bt-wbar playing" style="height:8px"></div>
    </div>

    <!-- Ring timer -->
    <div class="bt-timer-row">
      <div class="bt-ring-wrap">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle class="bt-ring-bg" cx="28" cy="28" r="23.5"/>
          <circle class="bt-ring-fg" id="bt-ring" cx="28" cy="28" r="23.5"
            stroke-dasharray="147.7" stroke-dashoffset="0"/>
        </svg>
        <div class="bt-ring-num" id="bt-ring-num" aria-live="polite" aria-label="seconds remaining">20</div>
      </div>
    </div>

    <!-- Hint pill (appears at 50% of timer) -->
    <div style="text-align:center">
      <span class="bt-hint-pill" id="bt-hint-pill">
        <!-- Lucide Lightbulb icon, 13px -->
        First letter: <strong id="bt-hint-letter">D</strong>
      </span>
    </div>

    <!-- Points pop -->
    <div class="bt-pts-pop" id="bt-pts-pop">+100</div>

    <!-- 4-choice answers -->
    <div class="bt-choices" id="bt-choices">
      <button class="bt-choice" id="bt-c0"><span class="bt-choice-letter">A</span><span id="bt-ct0"></span></button>
      <button class="bt-choice" id="bt-c1"><span class="bt-choice-letter">B</span><span id="bt-ct1"></span></button>
      <button class="bt-choice" id="bt-c2"><span class="bt-choice-letter">C</span><span id="bt-ct2"></span></button>
      <button class="bt-choice" id="bt-c3"><span class="bt-choice-letter">D</span><span id="bt-ct3"></span></button>
    </div>

    <!-- Reveal card (hidden until answer) -->
    <div class="bt-reveal-card" id="bt-reveal">
      <div class="bt-reveal-title"  id="bt-reveal-title"></div>
      <div class="bt-reveal-artist" id="bt-reveal-artist"></div>
      <div class="bt-reveal-pts"    id="bt-reveal-pts"></div>
    </div>

    <button class="bt-next-btn" id="bt-next-btn">Next song →</button>

    <button class="bt-skip-btn" id="bt-skip-btn">
      <!-- Lucide SkipForward icon, 14px --> Skip · 0 pts
    </button>
  </div>


  <!-- ── SCREEN 4: RESULTS ── -->
  <div class="bt-screen" id="bt-results">
    <div class="bt-nav">
      <span style="font-size:15px;font-weight:800;color:var(--txt1)">
        Results
      </span>
      <span style="font-size:12px;color:var(--txt3);margin-left:auto;background:var(--surface-alt);padding:3px 10px;border-radius:100px"
        id="bt-res-badge">10 songs</span>
    </div>

    <div class="bt-results-header">
      <div class="bt-results-score" id="bt-res-score">0</div>
      <div class="bt-results-label" id="bt-res-label"></div>
      <div class="bt-results-sub"   id="bt-res-sub"></div>
      <div class="bt-results-bar-wrap">
        <div class="bt-results-bar" id="bt-res-bar"></div>
      </div>
    </div>

    <p class="sec-label">Song by song</p>
    <div class="bt-answers-list" id="bt-answers-list"></div>

    <div class="bt-results-actions">
      <button class="bt-btn-outline" id="bt-new-game-btn">
        <!-- Lucide Settings icon, 14px --> New game
      </button>
      <button class="btn-primary" style="flex:1" id="bt-replay-btn">
        <!-- Lucide Refresh icon, 14px --> Play again
      </button>
    </div>
  </div>

</main>
```

---

### 16f. JavaScript controller — full game logic

Wire this in a `<script>` tag at the bottom of the page, or as a client component if using Next.js.

**Note:** Replace the static `SONGS` array below with a real API call to `/api/game/generate` using the selected groups, difficulty, and round count. The `wrongAnswers` field on each song comes from the existing backend and provides the 3 distractor options.

```js
const BT_CIRC = 147.7; // 2π × 23.5 — SVG ring circumference
const DIFF_TIME = { easy: 20, medium: 15, hard: 10 };
const SCORE_LABELS = [
  'Keep listening!', 'Getting there!', 'Not bad!',
  'Good ear!', 'Sharp listener!', 'Blindtest master!'
];

// ── STATE ──
let btSongs   = [];
let btIdx     = 0;
let btScore   = 0;
let btTimer   = 20;
let btDiff    = 20;
let btTotal   = 10;
let btAnswered = false;
let btSkipped  = false;
let btHistory  = [];
let btInterval = null;

// ── SETUP INTERACTIONS ──
document.querySelectorAll('.bt-gchip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('on'));
});
document.querySelectorAll('.bt-diff-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.bt-diff-card').forEach(c => c.classList.remove('on'));
    card.classList.add('on');
  });
});

document.getElementById('bt-start-btn').addEventListener('click', btStartGame);
document.getElementById('bt-back-btn').addEventListener('click', () => { clearInterval(btInterval); btShowScreen('bt-setup'); });
document.getElementById('bt-next-btn').addEventListener('click', btNextSong);
document.getElementById('bt-skip-btn').addEventListener('click', btSkip);
document.getElementById('bt-new-game-btn').addEventListener('click', () => btShowScreen('bt-setup'));
document.getElementById('bt-replay-btn').addEventListener('click', btReplay);

// Wire choice buttons
[0,1,2,3].forEach(i => {
  document.getElementById('bt-c' + i).addEventListener('click', () => btPick(i));
});

// ── GAME START ──
async function btStartGame() {
  const diffCard = document.querySelector('.bt-diff-card.on');
  btDiff  = DIFF_TIME[diffCard?.dataset.d || 'easy'];
  btTotal = parseInt(document.getElementById('bt-rounds').value);

  const groups = [...document.querySelectorAll('.bt-gchip.on')].map(c => c.dataset.g);

  // REAL CALL: replace with your API
  // const res = await fetch(`/api/game/generate?groups=${groups.join(',')}&difficulty=${diffCard.dataset.d}&count=${btTotal}`);
  // btSongs = await res.json();

  // STATIC FALLBACK (remove when API is wired):
  btSongs = btMockSongs().slice(0, btTotal);

  btIdx = 0; btScore = 0; btHistory = [];
  btShowScreen('bt-play');
  btLoadSong();
}

// ── LOAD SONG ──
function btLoadSong() {
  const s = btSongs[btIdx];
  btAnswered = false; btSkipped = false;

  document.getElementById('bt-song-num').textContent   = btIdx + 1;
  document.getElementById('bt-song-total').textContent = btSongs.length;
  document.getElementById('bt-score-disp').textContent = btScore;
  document.getElementById('bt-hint-letter').textContent = s.hint;
  document.getElementById('bt-hint-pill').className    = 'bt-hint-pill';
  document.getElementById('bt-pts-pop').className      = 'bt-pts-pop';
  document.getElementById('bt-reveal').className       = 'bt-reveal-card';
  document.getElementById('bt-reveal-pts').className   = 'bt-reveal-pts';
  document.getElementById('bt-next-btn').className     = 'bt-next-btn';
  document.getElementById('bt-skip-btn').style.display = 'flex';
  document.getElementById('bt-art').className          = 'bt-art-img blurred';
  document.getElementById('bt-art').style.background   = s.color || 'var(--surface-alt)';
  document.getElementById('bt-art-lock').className     = 'bt-art-lock';

  document.querySelectorAll('.bt-wbar').forEach(b => b.className = 'bt-wbar playing');

  // Render shuffled choices
  const opts = btShuffle([s.title, ...s.wrongAnswers]);
  s._correctIdx = opts.indexOf(s.title);
  ['A','B','C','D'].forEach((letter, i) => {
    const btn = document.getElementById('bt-c' + i);
    btn.className = 'bt-choice';
    btn.querySelector('.bt-choice-letter').textContent = letter;
    document.getElementById('bt-ct' + i).textContent = opts[i];
    btn.dataset.optionTitle = opts[i];
  });

  // Start audio via YouTube IFrame API (wire to existing useAudioPlayer hook)
  // btAudioPlayer.load(s.previewUrl);

  btStartTimer();
}

// ── TIMER ──
function btStartTimer() {
  clearInterval(btInterval);
  btTimer = btDiff;
  btUpdateRing();
  btInterval = setInterval(() => {
    btTimer--;
    btUpdateRing();
    if (btTimer === Math.floor(btDiff / 2)) {
      document.getElementById('bt-hint-pill').classList.add('show');
    }
    if (btTimer <= 0) {
      clearInterval(btInterval);
      if (!btAnswered && !btSkipped) btTimeUp();
    }
  }, 1000);
}

function btUpdateRing() {
  const ring = document.getElementById('bt-ring');
  const num  = document.getElementById('bt-ring-num');
  const frac = btTimer / btDiff;
  ring.style.strokeDashoffset = BT_CIRC * (1 - frac);
  const warn   = btTimer <= Math.ceil(btDiff * 0.4) && btTimer > Math.ceil(btDiff * 0.2);
  const danger = btTimer <= Math.ceil(btDiff * 0.2);
  ring.className = 'bt-ring-fg' + (danger ? ' danger' : warn ? ' warn' : '');
  num.className  = 'bt-ring-num'  + (danger ? ' danger' : warn ? ' warn' : '');
  num.textContent = btTimer;
}

// ── ANSWER ──
function btPick(idx) {
  if (btAnswered || btSkipped) return;
  btAnswered = true;
  clearInterval(btInterval);

  const s = btSongs[btIdx];
  const isCorrect = idx === s._correctIdx;
  const timeBonus = Math.round((btTimer / btDiff) * 30);
  const pts = isCorrect ? s.pts + timeBonus : 0;

  if (isCorrect) btScore += pts;
  document.getElementById('bt-score-disp').textContent = btScore;

  // Style choices
  [0,1,2,3].forEach(i => {
    const btn = document.getElementById('bt-c' + i);
    btn.classList.add('disabled');
    if (i === s._correctIdx) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
    else btn.classList.add('dimmed');
  });

  // Points pop
  if (isCorrect) {
    const pop = document.getElementById('bt-pts-pop');
    pop.textContent = '+' + pts;
    pop.className = 'bt-pts-pop fire';
  }

  // Reveal album art
  document.getElementById('bt-art').className = 'bt-art-img revealed';
  document.getElementById('bt-art-lock').className = 'bt-art-lock hide';
  document.querySelectorAll('.bt-wbar').forEach(b => b.className = 'bt-wbar stopped');

  // Reveal card
  const rc = document.getElementById('bt-reveal');
  rc.className = 'bt-reveal-card show' + (isCorrect ? '' : ' wrong');
  document.getElementById('bt-reveal-title').textContent  = s.title;
  document.getElementById('bt-reveal-artist').textContent = s.artist;
  const ptsEl = document.getElementById('bt-reveal-pts');
  ptsEl.textContent  = isCorrect ? '+' + pts + ' pts — answered in ' + (btDiff - btTimer) + 's' : 'Wrong answer — 0 pts';
  ptsEl.className = 'bt-reveal-pts' + (isCorrect ? '' : ' wrong');

  document.getElementById('bt-skip-btn').style.display = 'none';
  document.getElementById('bt-next-btn').classList.add('show');

  btHistory.push({ song: s, result: isCorrect ? 'correct' : 'wrong', pts, time: btDiff - btTimer });
}

function btSkip() {
  if (btAnswered || btSkipped) return;
  btSkipped = true;
  clearInterval(btInterval);
  btRevealEnd('skip');
  btHistory.push({ song: btSongs[btIdx], result: 'skip', pts: 0, time: btDiff });
}

function btTimeUp() {
  btSkipped = true;
  btRevealEnd('timeout');
  btHistory.push({ song: btSongs[btIdx], result: 'timeout', pts: 0, time: btDiff });
}

function btRevealEnd(type) {
  const s = btSongs[btIdx];
  [0,1,2,3].forEach(i => {
    const btn = document.getElementById('bt-c' + i);
    btn.classList.add('disabled');
    if (i === s._correctIdx) btn.classList.add('correct');
    else btn.classList.add('dimmed');
  });
  document.getElementById('bt-art').className = 'bt-art-img revealed';
  document.getElementById('bt-art-lock').className = 'bt-art-lock hide';
  document.querySelectorAll('.bt-wbar').forEach(b => b.className = 'bt-wbar stopped');
  const rc = document.getElementById('bt-reveal');
  rc.className = 'bt-reveal-card show skip';
  document.getElementById('bt-reveal-title').textContent  = s.title;
  document.getElementById('bt-reveal-artist').textContent = s.artist;
  const ptsEl = document.getElementById('bt-reveal-pts');
  ptsEl.textContent = type === 'skip' ? 'Skipped — 0 pts' : "Time's up — 0 pts";
  ptsEl.className = 'bt-reveal-pts skip';
  document.getElementById('bt-skip-btn').style.display = 'none';
  document.getElementById('bt-next-btn').classList.add('show');
}

// ── NEXT SONG / RESULTS ──
function btNextSong() {
  btIdx++;
  if (btIdx >= btSongs.length) { btShowResults(); return; }
  document.getElementById('bt-reveal-pts').className = 'bt-reveal-pts';
  btLoadSong();
}

function btReplay() {
  btIdx = 0; btScore = 0; btHistory = [];
  btSongs = btShuffle(btSongs);
  btShowScreen('bt-play');
  btLoadSong();
}

function btShowResults() {
  btShowScreen('bt-results');
  const total   = btSongs.length;
  const correct = btHistory.filter(h => h.result === 'correct').length;
  const pct     = Math.round((correct / total) * 100);
  const labelIdx = Math.min(Math.floor(pct / 20), 5);

  document.getElementById('bt-res-badge').textContent = total + ' songs';
  document.getElementById('bt-res-label').textContent = correct + ' of ' + total + ' correct';
  document.getElementById('bt-res-sub').textContent   = SCORE_LABELS[labelIdx];

  const scoreEl = document.getElementById('bt-res-score');
  const barEl   = document.getElementById('bt-res-bar');
  scoreEl.textContent = '0'; barEl.style.width = '0%';
  let s = 0;
  const si = setInterval(() => {
    s += Math.ceil(btScore / 40);
    if (s >= btScore) { s = btScore; clearInterval(si); }
    scoreEl.textContent = s;
  }, 30);
  setTimeout(() => { barEl.style.width = pct + '%'; }, 100);

  const list = document.getElementById('bt-answers-list');
  list.innerHTML = '';
  btHistory.forEach((h, i) => {
    const d = document.createElement('div');
    d.className = 'bt-ans-row';
    const res = h.result === 'correct'
      ? `<span class="bt-ans-result bt-ans-correct">+${h.pts} pts</span>`
      : h.result === 'skip'
      ? `<span class="bt-ans-result bt-ans-skip">Skipped</span>`
      : `<span class="bt-ans-result bt-ans-wrong">Wrong</span>`;
    d.innerHTML = `<span class="bt-ans-num">${i+1}</span>
      <div class="bt-ans-body">
        <div class="bt-ans-song">${h.song.title}</div>
        <div class="bt-ans-artist">${h.song.artist}</div>
      </div>${res}`;
    list.appendChild(d);
  });
}

// ── SCREEN TOGGLE ──
function btShowScreen(id) {
  document.querySelectorAll('.bt-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── HELPERS ──
function btShuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }

// Static mock data — REMOVE when API is wired
function btMockSongs() {
  return [
    { title:'Dynamite',       artist:'BTS',         hint:'D', pts:100, color:'#1c1c2e', wrongAnswers:['Butter','Permission to Dance','Boy With Luv'] },
    { title:'Pink Venom',     artist:'BLACKPINK',   hint:'P', pts:100, color:'#111',    wrongAnswers:['How You Like That','Lovesick Girls','Shut Down'] },
    { title:'Next Level',     artist:'aespa',       hint:'N', pts:100, color:'#2a1a3e', wrongAnswers:['Black Mamba','Savage','Spicy'] },
    { title:'Fearless',       artist:'LE SSERAFIM', hint:'F', pts:100, color:'#1a2744', wrongAnswers:['Antifragile','UNFORGIVEN','Easy'] },
    { title:'Hype Boy',       artist:'NewJeans',    hint:'H', pts:80,  color:'#1e3a2a', wrongAnswers:['Attention','Ditto','OMG'] },
    { title:'MIROH',          artist:'Stray Kids',  hint:'M', pts:120, color:'#1a1a2a', wrongAnswers:['Side Effects','Back Door','God\'s Menu'] },
    { title:'Maestro',        artist:'EXO',         hint:'M', pts:150, color:'#1a2020', wrongAnswers:['Growl','Ko Ko Bop','Power'] },
    { title:'HOT',            artist:'SEVENTEEN',   hint:'H', pts:100, color:'#1a2030', wrongAnswers:['Left & Right','Rock with you','Snap Shoot'] },
    { title:'After LIKE',     artist:'IVE',         hint:'A', pts:100, color:'#201820', wrongAnswers:['ELEVEN','Kitsch','I AM'] },
    { title:'Sweet Venom',    artist:'ENHYPEN',     hint:'S', pts:120, color:'#1a1a30', wrongAnswers:['Blessed-Cursed','Given-Taken','Future Perfect'] },
  ];
}
```

---

### 16g. Home page teaser — add to Section 2d

Add a "Blindtest" card to the games teaser section (Section 2d) on the home page. It sits alongside the This or That and Name all members cards:

```html
<a class="game-card" href="/blindtest" style="animation-delay: 80ms;">
  <div class="game-icon" style="background:#E6F1FB;color:#1D4ED8;">
    <!-- Lucide AudioLines icon, 18px -->
  </div>
  <p class="game-name">Blindtest</p>
  <p class="game-desc">Can you name that song from a 15-second clip? 22,000+ tracks.</p>
  <span class="game-play">Try it →</span>
</a>
```

---

### 16h. Navbar update

Add "Blindtest" to the shared site navbar between Games and Leaderboard:

```
Home   Quizzes   Games   Blindtest   Leaderboard   [Search]   [+ Create]   [Sign in]
```

On mobile bottom nav (5 items max), replace Leaderboard with Blindtest, and move Leaderboard to the footer only:

```
Home | Quizzes | Games | Blindtest | + Create
```

---

### 16i. Implementation order for Section 16

1. Run the existing blindtest Supabase migrations into the kpopquiz.org database.
2. Move the song population scripts and Deezer admin panel to the kpopquiz.org repo under `/admin/songs`.
3. Port `/api/game/generate` — verify it returns `wrongAnswers` array per song.
4. Wire the YouTube IFrame audio player (existing `use-audio-player` hook) to `btLoadSong()`.
5. Replace the static `btMockSongs()` with the real API call.
6. Apply all CSS from Section 16d to globals.css.
7. Build the 4 HTML screens from Section 16e.
8. Wire JS controller from Section 16f.
9. Add navbar entry (Section 16h) and home page teaser card (Section 16g).
10. Test on iOS Safari — the AudioContext unlock workaround in `use-audio-player` is critical.

---

## 18. NAME ALL MEMBERS — Game redesign with exact code

**IMPORTANT:** Use this code exactly. Same class names, same values, same timings.

Current problems this fixes:
- First-letter hints (`Nayeon?Jeongyeon?Momo?`) shown upfront — cluttered and gives away answers.
- Flat horizontal timer bar — no urgency.
- XP badges (deleted per Section 0).
- No satisfying per-answer feedback.
- Spelling rejections frustrate players (the #1 rage-quit cause in name-all games).

New design:
- Hidden slots showing `• • • •` that flip to green + checkmark with a reveal animation when named.
- Ring timer (consistent with quiz screen 10k and blindtest 16d) + live "N/total found" counter.
- Levenshtein-tolerant matching + per-member nickname/alt-spelling support.
- Three input feedback states: green pop (correct), amber flash (duplicate), nothing (wrong — no punishment).
- Progress bar + end screen revealing missed members dimmed.

### 18a. CSS

```css
:root {
  --na-green: #166534;
  --na-green-bg: #DCFCE7;
  --na-green-border: #86EFAC;
}

.na { background: var(--bg); font-family: var(--font-body, var(--font-sans)); max-width: 540px; margin: 0 auto; padding: 20px; }

.na-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: .5px solid var(--border); }
.na-back { background: none; border: none; cursor: pointer; color: var(--txt2); font-size: 13px; display: flex; align-items: center; gap: 4px; padding: 0; min-height: 44px; }
.na-back:hover { color: var(--txt1); }
.na-group-pill { font-size: 12px; font-weight: 700; color: var(--brand); background: var(--brand-light); padding: 4px 12px; border-radius: 100px; margin-left: auto; }

.na-head { text-align: center; margin-bottom: 16px; }
.na-title { font-size: 20px; font-weight: 800; color: var(--txt1); }

.na-stats { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 16px; }
.na-counter { display: flex; align-items: baseline; gap: 3px; }
.na-counter-found { font-size: 30px; font-weight: 800; color: var(--brand); line-height: 1; font-variant-numeric: tabular-nums; }
.na-counter-total { font-size: 16px; font-weight: 600; color: var(--txt3); }
.na-counter-label { font-size: 11px; color: var(--txt3); margin-left: 2px; }

.na-ring-wrap { position: relative; width: 48px; height: 48px; }
.na-ring-wrap svg { transform: rotate(-90deg); }
.na-ring-wrap circle { fill: none; stroke-width: 4; }
.na-ring-bg { stroke: var(--surface-alt); }
.na-ring-fg { stroke: var(--brand); stroke-linecap: round; transition: stroke-dashoffset 1s linear, stroke 400ms; }
.na-ring-fg.warn { stroke: #F59E0B; }
.na-ring-fg.danger { stroke: var(--brand); }
.na-ring-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--txt1); font-variant-numeric: tabular-nums; }

.na-progress-track { height: 6px; background: var(--surface-alt); border-radius: 100px; overflow: hidden; margin-bottom: 18px; }
.na-progress-fill { height: 100%; background: var(--brand); border-radius: 100px; width: 0; transition: width 400ms ease; }

.na-input-wrap { position: relative; margin-bottom: 18px; }
.na-input { width: 100%; background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 14px 16px; font-size: 16px; color: var(--txt1); outline: none; transition: border-color 150ms, box-shadow 150ms; }
.na-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(232,69,122,.12); }
.na-input.flash-ok { border-color: var(--na-green-border); background: var(--na-green-bg); animation: naPop 220ms ease; }
.na-input.flash-dupe { border-color: #F59E0B; background: #FEF3C7; }
@keyframes naPop { 0%{transform:scale(1)} 50%{transform:scale(1.01)} 100%{transform:scale(1)} }
.na-input-hint { font-size: 11px; color: var(--txt3); text-align: center; margin-top: 8px; }

.na-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
@media (max-width: 480px) { .na-grid { grid-template-columns: 1fr; } }
.na-slot { background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; min-height: 48px; transition: all 200ms ease; }
.na-slot.found { border-color: var(--na-green-border); background: var(--na-green-bg); animation: naReveal 300ms ease; }
@keyframes naReveal { 0%{transform:translateY(4px);opacity:.4} 100%{transform:translateY(0);opacity:1} }
.na-slot-num { width: 20px; height: 20px; border-radius: 6px; background: var(--surface-alt); font-size: 10px; font-weight: 800; color: var(--txt3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.na-slot.found .na-slot-num { background: var(--na-green); color: #fff; }
.na-slot-text { font-size: 13px; font-weight: 600; color: var(--txt3); font-variant-numeric: tabular-nums; }
.na-slot.found .na-slot-text { color: var(--na-green); }
.na-slot-check { margin-left: auto; color: var(--na-green); font-size: 15px; opacity: 0; transition: opacity 200ms; }
.na-slot.found .na-slot-check { opacity: 1; }

.na-actions { display: flex; gap: 8px; justify-content: center; align-items: center; margin-bottom: 8px; }
.na-giveup { background: none; border: none; color: var(--txt3); font-size: 12px; cursor: pointer; padding: 8px 14px; border-radius: 100px; transition: color 120ms, background 120ms; min-height: 44px; }
.na-giveup:hover { color: var(--txt2); background: var(--surface-alt); }

.na-done { background: var(--na-green-bg); border: .5px solid var(--na-green-border); border-radius: 16px; padding: 20px; text-align: center; margin-top: 16px; display: none; }
.na-done.show { display: block; animation: naReveal 300ms ease; }
.na-done-score { font-size: 36px; font-weight: 800; color: var(--na-green); line-height: 1; }
.na-done-label { font-size: 14px; color: var(--txt2); margin-top: 4px; margin-bottom: 14px; }
.na-done-actions { display: flex; gap: 10px; }
.na-btn-primary { flex: 1; background: var(--brand); color: #fff; border: none; border-radius: 100px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 120ms; min-height: 44px; }
.na-btn-primary:hover { background: var(--brand-dark); }
.na-btn-outline { flex: 1; background: transparent; color: var(--brand); border: 1.5px solid var(--brand); border-radius: 100px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 120ms; min-height: 44px; }
.na-btn-outline:hover { background: var(--brand-light); }
```

### 18b. HTML

```html
<main class="na">
  <div class="na-nav">
    <button class="na-back" id="na-back"><!-- Lucide ArrowLeft 15px --> Games</button>
    <span class="na-group-pill">{groupName}</span>
  </div>

  <div class="na-head">
    <p class="na-title">{challengeTitle}</p>
  </div>

  <div class="na-stats">
    <div class="na-counter">
      <span class="na-counter-found" id="found-count">0</span>
      <span class="na-counter-total">/ {total}</span>
      <span class="na-counter-label">found</span>
    </div>
    <div class="na-ring-wrap">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle class="na-ring-bg" cx="24" cy="24" r="20"/>
        <circle class="na-ring-fg" id="ring" cx="24" cy="24" r="20" stroke-dasharray="125.6" stroke-dashoffset="0"/>
      </svg>
      <div class="na-ring-num" id="ring-num" aria-live="polite">2:00</div>
    </div>
  </div>

  <div class="na-progress-track"><div class="na-progress-fill" id="progress"></div></div>

  <div class="na-input-wrap">
    <input class="na-input" id="na-input" type="text" placeholder="Type a member's name..." autocomplete="off" autocorrect="off" spellcheck="false">
    <p class="na-input-hint">type and press enter · spelling-tolerant · nicknames work</p>
  </div>

  <div class="na-grid" id="grid"></div>

  <div class="na-actions">
    <button class="na-giveup" id="na-giveup"><!-- Lucide Flag 13px --> Give up</button>
  </div>

  <div class="na-done" id="done">
    <div class="na-done-score" id="done-score"></div>
    <div class="na-done-label" id="done-label"></div>
    <div class="na-done-actions">
      <button class="na-btn-outline" id="na-retry">Try again</button>
      <button class="na-btn-primary" id="na-next">Next challenge</button>
    </div>
  </div>
</main>
```

### 18c. JS controller

The `MEMBERS` array shape: each entry has a `name` (display) and `alts` (array of accepted normalized spellings/nicknames). Pull from your backend — the alts are critical and should be curated per member (e.g. Jeongyeon accepts "jungyeon"; Chaeyoung accepts "chae"). The ring circumference for r=20 is `2π × 20 = 125.6`.

```js
const TIME = 120; // seconds — pull from challenge difficulty
let MEMBERS = []; // load from API: [{ name, alts: ['...'] }, ...]
let TOTAL = 0;
let found = [];
let foundCount = 0, timeLeft = TIME, timer = null, over = false;
const CIRC = 125.6;

function buildGrid() {
  const g = document.getElementById('grid');
  g.innerHTML = '';
  MEMBERS.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'na-slot' + (found[i] ? ' found' : '');
    d.id = 'slot-' + i;
    const label = found[i] ? m.name : '• • • •';
    d.innerHTML = `<span class="na-slot-num">${i+1}</span><span class="na-slot-text">${label}</span><span class="na-slot-check"><i class="ti ti-check" aria-hidden="true"></i></span>`;
    g.appendChild(d);
  });
}

function norm(s) { return s.toLowerCase().replace(/[^a-z]/g, '').trim(); }

function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function submit(val) {
  if (over) return;
  const n = norm(val);
  if (n.length < 2) return;
  const inp = document.getElementById('na-input');
  let matchIdx = -1;
  MEMBERS.forEach((m, i) => {
    if (matchIdx >= 0) return;
    const hit = m.alts.some(a => norm(a) === n || lev(norm(a), n) <= 1);
    if (hit) matchIdx = i;
  });
  if (matchIdx >= 0) {
    if (found[matchIdx]) {
      inp.className = 'na-input flash-dupe';
      setTimeout(() => inp.className = 'na-input', 400);
    } else {
      found[matchIdx] = true; foundCount++;
      const slot = document.getElementById('slot-' + matchIdx);
      slot.className = 'na-slot found';
      slot.querySelector('.na-slot-text').textContent = MEMBERS[matchIdx].name;
      document.getElementById('found-count').textContent = foundCount;
      document.getElementById('progress').style.width = (foundCount / TOTAL * 100) + '%';
      inp.className = 'na-input flash-ok';
      setTimeout(() => inp.className = 'na-input', 300);
      if (foundCount === TOTAL) finish(true);
    }
    inp.value = '';
  }
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    updateRing();
    if (timeLeft <= 0) { clearInterval(timer); finish(false); }
  }, 1000);
}

function updateRing() {
  const ring = document.getElementById('ring');
  const num = document.getElementById('ring-num');
  ring.style.strokeDashoffset = CIRC * (1 - timeLeft / TIME);
  const mm = Math.floor(timeLeft / 60), ss = timeLeft % 60;
  num.textContent = mm + ':' + String(ss).padStart(2, '0');
  const warn = timeLeft <= 30 && timeLeft > 10, danger = timeLeft <= 10;
  ring.className = 'na-ring-fg' + (danger ? ' danger' : warn ? ' warn' : '');
}

function finish(won) {
  over = true; clearInterval(timer);
  document.getElementById('na-input').disabled = true;
  MEMBERS.forEach((m, i) => {
    if (!found[i]) {
      const slot = document.getElementById('slot-' + i);
      slot.querySelector('.na-slot-text').textContent = m.name;
      slot.style.opacity = '.6';
    }
  });
  const done = document.getElementById('done');
  done.className = 'na-done show';
  document.getElementById('done-score').textContent = foundCount + '/' + TOTAL;
  const label = won ? 'Perfect! You named them all.'
    : foundCount >= TOTAL * 0.7 ? 'So close! Try again?'
    : foundCount >= TOTAL * 0.4 ? 'Good effort — go again.'
    : 'Tough one. Give it another shot.';
  document.getElementById('done-label').textContent = label;
}

function resetGame() {
  found = new Array(TOTAL).fill(false); foundCount = 0; timeLeft = TIME; over = false;
  const inp = document.getElementById('na-input');
  inp.disabled = false; inp.value = '';
  document.getElementById('found-count').textContent = '0';
  document.getElementById('progress').style.width = '0';
  document.getElementById('done').className = 'na-done';
  buildGrid(); updateRing(); startTimer(); inp.focus();
}

document.getElementById('na-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submit(e.target.value);
});
document.getElementById('na-giveup').addEventListener('click', () => { if (!over) finish(false); });
document.getElementById('na-retry').addEventListener('click', resetGame);

// Init after loading MEMBERS from API:
// TOTAL = MEMBERS.length; found = new Array(TOTAL).fill(false);
// buildGrid(); updateRing(); startTimer();
```

### 18d. Mobile + notes
- Grid collapses to 1 column below 480px.
- Input font-size stays 16px (prevents iOS zoom-on-focus).
- The `alts` array per member is the single most important data quality factor. Curate nicknames and romanization variants (e.g. "tzuyu"/"chou tzuyu", "jeongyeon"/"jungyeon"). A `lev <= 1` tolerance catches single-character typos; do not raise it higher or false matches creep in.
- For song-naming challenges (Name top 10 TWICE songs, etc.), same component — `MEMBERS` becomes the song list, `alts` becomes accepted title variants.

---

## 17. DO NOT CHANGE
- Supabase schema for quizzes, users, plays — only remove card/byeol/xp columns.
- Reddit UTM parameters on share links — keep as-is.
- The `r/Kpop_Verse` subreddit link.
- `/about`, `/contact`, `/terms`, `/privacy` pages.
- The quiz creation flow (`/create`) — no changes to the editor.
- Auth provider configuration.
