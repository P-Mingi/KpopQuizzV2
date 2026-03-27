# KpopQuiz v2 — Complete Build Specification (FINAL)

> **This document is the SINGLE SOURCE OF TRUTH.**
> Follow every section precisely. Do not improvise. Do not add features not listed here.
> If something is ambiguous, leave a `// TODO: clarify with owner` comment and move on.
> Do NOT guess. Do NOT "improve" upon this spec.

---

## TABLE OF CONTENTS

1. Project Overview
2. Tech Stack & Environment
3. Database Schema (exact SQL)
4. Database Seed Data
5. Supabase RLS Policies (exact SQL)
6. Design System (exact values)
7. Global Layout (nav, footer, responsive)
8. Page Specifications (every page, every state)
9. Component Specifications (every component)
10. API Endpoints (exact request/response shapes)
11. Authentication Flow
12. OG Image Generation (exact template)
13. SEO Requirements
14. Redirect Strategy (old site)
15. Error & Loading States
16. Animations (exact CSS)
17. Validation Rules (every input)
18. Environment Variables
19. File Structure
20. Launch Checklist
21. V2 Backlog (do NOT build these)

---

## 1. PROJECT OVERVIEW

**What it is**: A fan-powered K-pop quiz platform where fans create, share, and compete on quizzes.

**What it is NOT**: An idol encyclopedia, an AI-generated content site, a blog, or a social network. There are ZERO AI-generated quizzes. Every quiz is created by a real fan.

**Core loop**:
1. Fan creates a quiz about their favorite group (3-minute creation flow)
2. Fan shares the quiz link on Twitter/X, Discord, TikTok, KakaoTalk
3. Other fans play the quiz, see their score vs. the average
4. They screenshot/share their result card → more players arrive
5. Players are inspired to create their own quizzes → cycle repeats

**Business model**: Display ads (on intro screen + result screen only) + affiliate links to K-pop merch stores.

**Theme**: Light mode ONLY for MVP. No dark mode. Ship it later.

---

## 2. TECH STACK & ENVIRONMENT

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | Next.js (App Router) | 14.x or 15.x (latest stable) | SSR/SSG for SEO, API routes |
| Runtime | Node.js | 20.x | LTS |
| Hosting | Vercel | — | Free tier, edge, automatic deploys |
| Database | Supabase (PostgreSQL) | — | Free tier, auth, RLS, real-time |
| Auth | Supabase Auth | — | Google + Discord OAuth |
| ORM | Drizzle ORM | latest | Edge-compatible, type-safe |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Font | Pretendard | — | Korean-optimized, beautiful for K-pop |
| OG Images | @vercel/og (Satori) | latest | Dynamic image generation |
| Analytics | Vercel Analytics | — | Free, automatic |
| Package manager | pnpm | latest | Fast, disk-efficient |

### Environment Variables

Create a `.env.local` file with these exact keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# App
NEXT_PUBLIC_SITE_URL=https://kpopquizz.com
NEXT_PUBLIC_SITE_NAME=KpopQuiz

# OAuth (configured in Supabase dashboard, not here)
# Google: Client ID + Secret → set in Supabase Auth settings
# Discord: Client ID + Secret → set in Supabase Auth settings

# Admin
ADMIN_PASSWORD=changeme_in_production
```

---

## 3. DATABASE SCHEMA (exact SQL)

Run these in order in Supabase SQL editor or as migration files.

```sql
-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_bg TEXT NOT NULL DEFAULT '#EEEDFE',   -- background color for initials avatar
  avatar_text TEXT NOT NULL DEFAULT '#3C3489',  -- text color for initials avatar
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Cached stats (updated via database functions)
  total_quizzes_created INTEGER NOT NULL DEFAULT 0,
  total_plays_received INTEGER NOT NULL DEFAULT 0
);

-- Username constraints
ALTER TABLE public.profiles ADD CONSTRAINT username_format
  CHECK (username ~ '^[a-z0-9_]{3,20}$');
ALTER TABLE public.profiles ADD CONSTRAINT username_min_length
  CHECK (char_length(username) >= 3);
ALTER TABLE public.profiles ADD CONSTRAINT username_max_length
  CHECK (char_length(username) <= 20);
ALTER TABLE public.profiles ADD CONSTRAINT display_name_max_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 40);
ALTER TABLE public.profiles ADD CONSTRAINT bio_max_length
  CHECK (bio IS NULL OR char_length(bio) <= 160);

-- ============================================
-- GROUPS (K-pop groups/categories)
-- ============================================
CREATE TABLE public.groups (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  fandom_name TEXT NOT NULL DEFAULT 'fan',     -- "ARMY", "BLINK", "STAY", etc.
  display_color TEXT NOT NULL,                  -- hex bg color for pill, e.g. "#FBEAF0"
  text_color TEXT NOT NULL,                     -- hex text color for pill, e.g. "#72243E"
  quiz_count INTEGER NOT NULL DEFAULT 0,
  total_plays INTEGER NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE if created by a user (not seed data)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ADD CONSTRAINT slug_format
  CHECK (slug ~ '^[a-z0-9-]{1,60}$');

-- ============================================
-- QUIZZES
-- ============================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES public.groups(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'multiple_choice',
  questions JSONB NOT NULL,
  settings JSONB NOT NULL DEFAULT '{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}',
  difficulty TEXT NOT NULL DEFAULT 'medium',    -- 'easy' | 'medium' | 'hard' (auto-calculated)
  status TEXT NOT NULL DEFAULT 'published',     -- 'draft' | 'published' | 'flagged' | 'removed'
  is_quiz_of_the_day BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_of_the_day_date DATE,                   -- the date it was featured
  play_count INTEGER NOT NULL DEFAULT 0,
  total_score_sum INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quizzes ADD CONSTRAINT quiz_type_valid
  CHECK (quiz_type IN ('multiple_choice', 'true_false', 'guess_from_clues'));
ALTER TABLE public.quizzes ADD CONSTRAINT status_valid
  CHECK (status IN ('draft', 'published', 'flagged', 'removed'));
ALTER TABLE public.quizzes ADD CONSTRAINT difficulty_valid
  CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE public.quizzes ADD CONSTRAINT title_length
  CHECK (char_length(title) >= 5 AND char_length(title) <= 100);
ALTER TABLE public.quizzes ADD CONSTRAINT slug_format
  CHECK (slug ~ '^[a-z0-9-]{1,80}$');
ALTER TABLE public.quizzes ADD CONSTRAINT questions_min
  CHECK (jsonb_array_length(questions) >= 5);
ALTER TABLE public.quizzes ADD CONSTRAINT questions_max
  CHECK (jsonb_array_length(questions) <= 20);

-- ============================================
-- PLAYS (individual play records)
-- ============================================
CREATE TABLE public.plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plays ADD CONSTRAINT score_valid
  CHECK (score >= 0 AND score <= total_questions);

-- ============================================
-- REPORTS (quiz moderation)
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reports ADD CONSTRAINT reason_valid
  CHECK (reason IN ('wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other'));
ALTER TABLE public.reports ADD CONSTRAINT status_valid
  CHECK (status IN ('pending', 'reviewed', 'resolved'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_quizzes_group_status_plays ON public.quizzes(group_id, status, play_count DESC);
CREATE INDEX idx_quizzes_creator ON public.quizzes(creator_id, status);
CREATE INDEX idx_quizzes_status_created ON public.quizzes(status, created_at DESC);
CREATE INDEX idx_quizzes_status_plays ON public.quizzes(status, play_count DESC);
CREATE INDEX idx_quizzes_slug ON public.quizzes(slug);
CREATE INDEX idx_quizzes_difficulty ON public.quizzes(difficulty, status);
CREATE INDEX idx_quizzes_qotd ON public.quizzes(is_quiz_of_the_day, quiz_of_the_day_date DESC);
CREATE INDEX idx_plays_quiz ON public.plays(quiz_id, created_at DESC);
CREATE INDEX idx_plays_player ON public.plays(player_id, created_at DESC);
CREATE INDEX idx_groups_slug ON public.groups(slug);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_reports_quiz ON public.reports(quiz_id, status);

-- ============================================
-- FUNCTIONS: Auto-update difficulty
-- ============================================
-- Difficulty is recalculated every time a play is recorded.
-- easy = avg score >= 70%, medium = 40-69%, hard = < 40%
CREATE OR REPLACE FUNCTION public.recalculate_difficulty(quiz_uuid UUID)
RETURNS VOID AS $$
DECLARE
  avg_pct NUMERIC;
  new_difficulty TEXT;
BEGIN
  SELECT
    CASE WHEN total_completions > 0
      THEN (total_score_sum::NUMERIC / total_completions) /
           jsonb_array_length(questions) * 100
      ELSE 50
    END INTO avg_pct
  FROM public.quizzes WHERE id = quiz_uuid;

  IF avg_pct >= 70 THEN new_difficulty := 'easy';
  ELSIF avg_pct >= 40 THEN new_difficulty := 'medium';
  ELSE new_difficulty := 'hard';
  END IF;

  UPDATE public.quizzes SET difficulty = new_difficulty WHERE id = quiz_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTIONS: Record a play (atomic)
-- ============================================
-- This function does everything in one transaction:
-- 1. Insert the play record
-- 2. Increment quiz stats
-- 3. Increment group stats
-- 4. Increment creator stats
-- 5. Recalculate difficulty
-- 6. Auto-flag if report_count > 5
CREATE OR REPLACE FUNCTION public.record_play(
  p_quiz_id UUID,
  p_player_id UUID,        -- can be NULL for anonymous
  p_score INTEGER,
  p_total_questions INTEGER,
  p_time_taken_seconds INTEGER
)
RETURNS TABLE(
  play_id UUID,
  percentile INTEGER       -- what % of players they beat
) AS $$
DECLARE
  new_play_id UUID;
  total_plays_count INTEGER;
  worse_plays_count INTEGER;
  pct INTEGER;
  quiz_creator UUID;
  quiz_group INTEGER;
BEGIN
  -- Insert play
  INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
  VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
  RETURNING id INTO new_play_id;

  -- Update quiz stats
  UPDATE public.quizzes
  SET play_count = play_count + 1,
      total_score_sum = total_score_sum + p_score,
      total_completions = total_completions + 1,
      updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

  -- Update group stats
  UPDATE public.groups
  SET total_plays = total_plays + 1
  WHERE id = quiz_group;

  -- Update creator stats
  UPDATE public.profiles
  SET total_plays_received = total_plays_received + 1,
      updated_at = NOW()
  WHERE id = quiz_creator;

  -- Recalculate difficulty
  PERFORM public.recalculate_difficulty(p_quiz_id);

  -- Calculate percentile
  SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO worse_plays_count FROM public.plays
    WHERE quiz_id = p_quiz_id AND score < p_score;

  IF total_plays_count > 0 THEN
    pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
  ELSE
    pct := 50;
  END IF;

  RETURN QUERY SELECT new_play_id, pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTIONS: Increment quiz report count + auto-flag
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quizzes
  SET report_count = report_count + 1,
      status = CASE WHEN report_count + 1 >= 5 THEN 'flagged' ELSE status END
  WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_report();

-- ============================================
-- FUNCTIONS: Update creator quiz count on quiz insert
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_quiz()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET total_quizzes_created = total_quizzes_created + 1,
      updated_at = NOW()
  WHERE id = NEW.creator_id;

  UPDATE public.groups
  SET quiz_count = quiz_count + 1
  WHERE id = NEW.group_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quiz_insert
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_quiz();

-- ============================================
-- FUNCTIONS: Handle profile creation on signup
-- ============================================
-- This is triggered by Supabase auth.users insert.
-- It does NOT set username — that happens in the onboarding step.
-- It creates a profile row with a placeholder so FK constraints work.
-- The username is set later via the /api/auth/username endpoint.
-- DO NOT create this trigger — we handle profile creation in the app code
-- after the user picks a username. The auth callback redirects to /onboarding
-- if no profile exists.
```

---

## 4. DATABASE SEED DATA

Insert these groups after running the schema. Exact SQL:

```sql
INSERT INTO public.groups (name, slug, fandom_name, display_color, text_color) VALUES
  ('BTS',          'bts',          'ARMY',     '#E6F1FB', '#0C447C'),
  ('BLACKPINK',    'blackpink',    'BLINK',    '#FBEAF0', '#72243E'),
  ('Stray Kids',   'stray-kids',   'STAY',     '#EEEDFE', '#3C3489'),
  ('TWICE',        'twice',        'ONCE',     '#FAECE7', '#712B13'),
  ('aespa',        'aespa',        'MY',       '#FAEEDA', '#633806'),
  ('NewJeans',     'newjeans',     'Bunnies',  '#E1F5EE', '#085041'),
  ('SEVENTEEN',    'seventeen',    'CARAT',    '#E6F1FB', '#0C447C'),
  ('EXO',          'exo',          'EXO-L',    '#F1EFE8', '#444441'),
  ('(G)I-DLE',     'g-i-dle',      'Neverland','#EEEDFE', '#3C3489'),
  ('IVE',          'ive',          'DIVE',     '#FBEAF0', '#72243E'),
  ('LE SSERAFIM',  'le-sserafim',  'FEARNOT', '#E1F5EE', '#085041'),
  ('NCT',          'nct',          'NCTzen',   '#EAF3DE', '#27500A'),
  ('Red Velvet',   'red-velvet',   'ReVeluv',  '#FCEBEB', '#791F1F'),
  ('ATEEZ',        'ateez',        'ATINY',    '#FAECE7', '#712B13'),
  ('ENHYPEN',      'enhypen',      'ENGENE',   '#E6F1FB', '#0C447C'),
  ('TXT',          'txt',          'MOA',      '#EEEDFE', '#3C3489'),
  ('ITZY',         'itzy',         'MIDZY',    '#FAEEDA', '#633806'),
  ('NMIXX',        'nmixx',        'NSWer',    '#FBEAF0', '#72243E'),
  ('STAYC',        'stayc',        'SWITH',    '#E1F5EE', '#085041'),
  ('MONSTA X',     'monsta-x',     'Monbebe',  '#F1EFE8', '#444441'),
  ('GOT7',         'got7',         'IGOT7',    '#FAECE7', '#712B13'),
  ('MAMAMOO',      'mamamoo',      'Moomoo',   '#EAF3DE', '#27500A'),
  ('SHINee',       'shinee',       'Shawol',   '#E6F1FB', '#0C447C'),
  ('TREASURE',     'treasure',     'Teume',    '#FAEEDA', '#633806'),
  ('VIVIZ',        'viviz',        'Na.V',     '#FBEAF0', '#72243E'),
  ('Kep1er',       'kep1er',       'Kep1ian',  '#E1F5EE', '#085041'),
  ('BTOB',         'btob',         'Melody',   '#EEEDFE', '#3C3489'),
  ('ASTRO',        'astro',        'AROHA',    '#FAECE7', '#712B13'),
  ('Dreamcatcher', 'dreamcatcher', 'InSomnia', '#FCEBEB', '#791F1F'),
  ('General K-pop','general-kpop', 'fan',      '#F1EFE8', '#444441');
```

---

## 5. SUPABASE RLS POLICIES (exact SQL)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
-- Anyone can read any profile
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can insert their own profile (during onboarding)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- GROUPS
-- ============================================
-- Anyone can read groups
CREATE POLICY "groups_select_all" ON public.groups
  FOR SELECT USING (true);

-- Authenticated users can insert custom groups
CREATE POLICY "groups_insert_auth" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- ============================================
-- QUIZZES
-- ============================================
-- Anyone can read published quizzes
CREATE POLICY "quizzes_select_published" ON public.quizzes
  FOR SELECT USING (status = 'published');

-- Authenticated users can insert quizzes where they are the creator
CREATE POLICY "quizzes_insert_own" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own quizzes (edit, change status to draft)
CREATE POLICY "quizzes_update_own" ON public.quizzes
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- PLAYS
-- ============================================
-- Anyone can read plays (for stats)
CREATE POLICY "plays_select_all" ON public.plays
  FOR SELECT USING (true);

-- Anyone can insert plays (anonymous play allowed)
-- We use the service role key for the record_play function,
-- so this policy allows the function to insert.
CREATE POLICY "plays_insert_all" ON public.plays
  FOR INSERT WITH CHECK (true);

-- ============================================
-- REPORTS
-- ============================================
-- Only the reporter can read their own reports
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Anyone can insert a report (even anonymous, reporter_id will be null)
CREATE POLICY "reports_insert_all" ON public.reports
  FOR INSERT WITH CHECK (true);
```

---

## 6. DESIGN SYSTEM (exact values)

### 6.1 Typography

**Font**: Pretendard
**CDN**: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`

Load in `layout.tsx` via `<link>` tag in `<head>`. Set as the first font in the Tailwind config:

```js
// tailwind.config.ts
fontFamily: {
  sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
}
```

**Font sizes used** (Tailwind classes → exact px):
- `text-xs`: 12px — labels, metadata, timestamps
- `text-sm`: 14px — body text, descriptions, secondary info
- `text-base`: 16px — primary body text, question text
- `text-lg`: 18px — section titles, step titles in creator
- `text-xl`: 20px — page titles (group page, profile page)
- `text-2xl`: 24px — quiz title on intro screen
- `text-3xl`: 30px — logo text
- `text-5xl`: 48px — score number on result screen

**Font weights used**:
- `font-normal` (400): body text, descriptions
- `font-medium` (500): headings, labels, usernames, buttons
- `font-semibold` (600): score number ONLY (the big 8/10 on result screen)

**NEVER use font-bold (700) or font-extrabold (800) anywhere.**

### 6.2 Colors (light mode ONLY)

```css
/* globals.css */
:root {
  /* Surfaces */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F7F4;
  --bg-tertiary: #F1EFE8;

  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-tertiary: #9B9B9B;

  /* Brand */
  --accent-pink: #ED93B1;
  --accent-pink-light: #FBEAF0;
  --accent-pink-dark: #72243E;
  --accent-purple: #AFA9EC;

  /* Borders */
  --border-light: #E8E6E1;      /* use this for most borders */
  --border-medium: #D3D1C7;     /* use this for hover states */

  /* Feedback: correct */
  --correct-bg: #EAF3DE;
  --correct-text: #27500A;
  --correct-accent: #97C459;
  --correct-border: #C0DD97;

  /* Feedback: wrong */
  --wrong-bg: #FCEBEB;
  --wrong-text: #791F1F;
  --wrong-accent: #E24B4A;
  --wrong-border: #F7C1C1;

  /* Feedback: timeout */
  --timeout-bg: #FAEEDA;
  --timeout-text: #633806;
  --timeout-accent: #EF9F27;

  /* Feedback: info */
  --info-bg: #E6F1FB;
  --info-text: #0C447C;

  /* Difficulty badges */
  --easy-bg: #EAF3DE;
  --easy-text: #27500A;
  --medium-bg: #FAEEDA;
  --medium-text: #633806;
  --hard-bg: #FCEBEB;
  --hard-text: #791F1F;
}
```

Map these to Tailwind in `tailwind.config.ts`:

```js
colors: {
  surface: {
    primary: 'var(--bg-primary)',
    secondary: 'var(--bg-secondary)',
    tertiary: 'var(--bg-tertiary)',
  },
  txt: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-tertiary)',
  },
  accent: {
    pink: 'var(--accent-pink)',
    'pink-light': 'var(--accent-pink-light)',
    'pink-dark': 'var(--accent-pink-dark)',
    purple: 'var(--accent-purple)',
  },
  border: {
    light: 'var(--border-light)',
    medium: 'var(--border-medium)',
  },
  correct: { bg: 'var(--correct-bg)', text: 'var(--correct-text)', accent: 'var(--correct-accent)', border: 'var(--correct-border)' },
  wrong: { bg: 'var(--wrong-bg)', text: 'var(--wrong-text)', accent: 'var(--wrong-accent)', border: 'var(--wrong-border)' },
  timeout: { bg: 'var(--timeout-bg)', text: 'var(--timeout-text)', accent: 'var(--timeout-accent)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  difficulty: {
    'easy-bg': 'var(--easy-bg)', 'easy-text': 'var(--easy-text)',
    'medium-bg': 'var(--medium-bg)', 'medium-text': 'var(--medium-text)',
    'hard-bg': 'var(--hard-bg)', 'hard-text': 'var(--hard-text)',
  },
}
```

### 6.3 Border Radius

```js
borderRadius: {
  'sm': '8px',
  'md': '12px',
  'lg': '16px',
  'full': '9999px',
}
```

- Pills/badges: `rounded-full`
- Cards: `rounded-lg` (16px)
- Buttons: `rounded-full`
- Inputs: `rounded-md` (12px)
- Inner elements (feedback boxes, answer options): `rounded-md` (12px)

### 6.4 Spacing Scale

Use Tailwind defaults. Key patterns:
- Page padding (horizontal): `px-4` (16px) on mobile, `px-0` on desktop (content is max-width constrained)
- Card padding: `p-4` (16px) for compact cards, `p-5` (20px) for main cards
- Section gap (vertical): `space-y-3` (12px) for card lists, `space-y-6` (24px) between sections
- Inline gap: `gap-2` (8px) for tight elements, `gap-3` (12px) for standard

### 6.5 Shadows

**No box-shadows anywhere.** Zero. Use borders for separation. The only visual depth comes from background color differences (white card on --bg-secondary surface).

### 6.6 Avatar Color Algorithm

The avatar background and text colors are assigned when the profile is created, based on a hash of the username. Here is the EXACT function to use:

```typescript
// lib/utils.ts
const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' }, // purple
  { bg: '#E1F5EE', text: '#085041' }, // teal
  { bg: '#FAECE7', text: '#712B13' }, // coral
  { bg: '#FBEAF0', text: '#72243E' }, // pink
  { bg: '#E6F1FB', text: '#0C447C' }, // blue
  { bg: '#FAEEDA', text: '#633806' }, // amber
  { bg: '#EAF3DE', text: '#27500A' }, // green
  { bg: '#FCEBEB', text: '#791F1F' }, // red
] as const;

export function getAvatarColors(username: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getAvatarInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
```

These colors are stored in the `profiles` table when the profile is created. The avatar is ALWAYS initials-based. No image uploads.

---

## 7. GLOBAL LAYOUT

### 7.1 Page Shell

Every page is wrapped in this layout:

```
┌─────────────────────────────────────────┐
│ [Nav bar - sticky top]                  │
├─────────────────────────────────────────┤
│                                         │
│ [Page content - max-w-2xl mx-auto]      │
│                                         │
├─────────────────────────────────────────┤
│ [Footer]                                │
└─────────────────────────────────────────┘
```

**Max content width**: `max-w-2xl` (672px). This applies to ALL pages. The content is always centered and narrow — optimized for mobile-first reading. The background outside the content area is `--bg-tertiary`.

**Page background**: `--bg-tertiary` (#F1EFE8)
**Content area background**: transparent (inherits page bg). Cards within are `--bg-primary` (white).

### 7.2 Navigation Bar

**Position**: Sticky top, `z-50`
**Background**: `--bg-primary` (white) with bottom border `--border-light`
**Height**: 56px
**Padding**: `px-4`
**Max inner width**: `max-w-2xl mx-auto`

**Layout**:
```
[Logo]                            [Create +]  [Avatar/Login]
```

- **Logo** (left): "kpop" in `--text-primary` + "quizz" in `--accent-pink`, `text-lg` (18px), `font-medium`. Links to `/`. No image — text only.
- **Create button** (right): Text "Create" with a small `+` icon (use a `<svg>` plus icon, 16x16). Styled as: `--bg-primary` background, `--border-light` border, `rounded-full`, `px-4 py-2`, `text-sm font-medium`. On hover: border becomes `--border-medium`. Links to `/create`.
- **Avatar/Login** (far right):
  - If logged in: Show initials avatar (24px circle) with their colors. Clicking opens a dropdown with: "My quizzes" (links to `/u/[username]`), "Settings" (no-op for now, disabled), "Sign out". Dropdown is a simple white card with `--border-light` border, `rounded-lg`, appearing below the avatar on click. Close on click outside.
  - If not logged in: Text link "Sign in", `text-sm`, `--text-secondary`. Links to `/login`.

**Mobile**: Same layout. The "Create" button text shortens to just the `+` icon (no text) below 400px width. Use `sm:inline hidden` for the text.

### 7.3 Footer

**Background**: transparent (on the `--bg-tertiary` page background)
**Top border**: `--border-light`
**Padding**: `py-8 px-4`
**Max inner width**: `max-w-2xl mx-auto`

**Content** (centered, stacked):
```
kpopquizz.com
Made with ♥ by fans, for fans.

[About]  [Contact]  [Terms]  [Privacy]

© 2026 KpopQuiz
```

- Logo line: `text-sm font-medium --text-primary`
- Tagline: `text-xs --text-secondary`, margin-top 2px
- Links row: `text-xs --text-secondary`, `gap-4`, margin-top 16px. These are placeholder links — they all link to `#` for now. TODO in V2.
- Copyright: `text-xs --text-tertiary`, margin-top 16px

### 7.4 Responsive Breakpoints

Only two breakpoints matter:
- **Mobile**: default (0-639px) — `px-4` side padding
- **Desktop**: `sm:` (640px+) — content sits within `max-w-2xl mx-auto`, no side padding needed

Do NOT design for tablet separately. The narrow `max-w-2xl` layout looks good on all screens.

---

## 8. PAGE SPECIFICATIONS

### 8A. HOMEPAGE ( / )

**Route**: `src/app/page.tsx`
**Rendering**: Server component (SSR). Quiz feed data fetched server-side.
**Page background**: `--bg-tertiary`

**Layout (top to bottom)**:

#### Section 1: Hero / Logo
- Container: `text-center pt-8 pb-6`
- Logo: `text-3xl font-medium`
  - "kpop" = `--text-primary`
  - "quizz" = gradient text using CSS `background: linear-gradient(135deg, #ED93B1, #AFA9EC); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
- Tagline below: "made by fans. played by millions." in `text-sm --text-secondary`, `mt-1`

#### Section 2: Quiz of the Day (conditional)
- Only shown if there is a quiz with `is_quiz_of_the_day = true` and `quiz_of_the_day_date = today`
- Container: `--bg-primary` card, `rounded-lg`, `border --border-light`, `p-5 mb-6`
- Top left: small label "quiz of the day" in `text-xs font-medium --accent-pink-dark` on `--accent-pink-light` pill
- Below label: quiz card content (same as standard quiz card but slightly larger title: `text-lg`)
- If no quiz of the day exists for today, skip this section entirely (no empty state)
- **Setting Quiz of the Day**: Manual. Run SQL: `UPDATE quizzes SET is_quiz_of_the_day = true, quiz_of_the_day_date = '2026-03-26' WHERE id = 'xxx';` We'll build an admin UI later.

#### Section 3: Tab bar
- Container: `flex gap-2 overflow-x-auto pb-1 mb-4` (allows horizontal scroll on mobile)
- Hide scrollbar: `scrollbar-hide` (add this utility class to Tailwind via plugin or CSS: `::-webkit-scrollbar { display: none; }`)
- Tabs: `Trending` | `New` | `Hardest` | `By group`
- Tab pill (inactive): `px-4 py-2 rounded-full text-sm border border-[--border-light] text-[--text-secondary] bg-transparent whitespace-nowrap cursor-pointer`
- Tab pill (active): `px-4 py-2 rounded-full text-sm border border-[--text-primary] bg-[--text-primary] text-white font-medium whitespace-nowrap cursor-pointer`
- Default active: "Trending"
- Tab switching is CLIENT SIDE. Use `useState` for the active tab. Do not navigate to different pages.
- When "By group" is selected, replace the quiz feed with a grid of group pills (see below).

#### Section 4: Quiz Feed
- A vertical list of Quiz Card components (see component spec in §9).
- Gap between cards: `space-y-3` (12px)
- Initial load: 10 quizzes
- **Infinite scroll**: Load 10 more when user scrolls within 200px of the bottom. Use `IntersectionObserver` on a sentinel `<div>` at the bottom of the list. Fetch next page via query param `?cursor={last_quiz_created_at}`. Show a small spinner (see §15) while loading more.
- **No more results**: When API returns fewer than 10 results, stop observing. Show nothing (no "end of list" message).

**Feed queries by tab** (these are the exact SQL queries to implement):

**Trending** (default):
```sql
SELECT q.*, g.name as group_name, g.slug as group_slug, g.display_color, g.text_color, g.fandom_name,
       p.username as creator_username
FROM quizzes q
JOIN groups g ON q.group_id = g.id
JOIN profiles p ON q.creator_id = p.id
WHERE q.status = 'published'
  AND q.created_at > NOW() - INTERVAL '7 days'
ORDER BY q.play_count DESC
LIMIT 10 OFFSET {offset};
```
If fewer than 10 results from the last 7 days, extend to 30 days. If still fewer than 10, show what exists.

**New**:
```sql
SELECT q.*, g.name as group_name, g.slug as group_slug, g.display_color, g.text_color, g.fandom_name,
       p.username as creator_username
FROM quizzes q
JOIN groups g ON q.group_id = g.id
JOIN profiles p ON q.creator_id = p.id
WHERE q.status = 'published'
ORDER BY q.created_at DESC
LIMIT 10 OFFSET {offset};
```

**Hardest**:
```sql
SELECT q.*, g.name as group_name, g.slug as group_slug, g.display_color, g.text_color, g.fandom_name,
       p.username as creator_username,
       CASE WHEN q.total_completions > 0
         THEN ROUND((q.total_score_sum::numeric / q.total_completions) / jsonb_array_length(q.questions) * 100)
         ELSE 50
       END as avg_score_pct
FROM quizzes q
JOIN groups g ON q.group_id = g.id
JOIN profiles p ON q.creator_id = p.id
WHERE q.status = 'published'
  AND q.total_completions >= 10
ORDER BY avg_score_pct ASC
LIMIT 10 OFFSET {offset};
```

**By group** (replaces feed with group grid):
- Display all groups from the `groups` table as pills in a `flex flex-wrap gap-2` container
- Each pill is styled with the group's `display_color` bg and `text_color` text
- Each pill links to `/group/{slug}`
- Sort: groups with highest `quiz_count` first, then alphabetical
- Include quiz_count on each pill: `BTS (142)`

#### Section 5: Top Creators This Week
- Container: `border-t border-[--border-light] pt-6 mt-6`
- Title: "Top quiz creators this week" in `text-sm font-medium --text-secondary mb-3`
- List of top 5 creators, fetched with:
```sql
SELECT p.username, p.avatar_bg, p.avatar_text, p.total_quizzes_created,
       SUM(q.play_count) FILTER (WHERE q.created_at > NOW() - INTERVAL '7 days') as weekly_plays
FROM profiles p
JOIN quizzes q ON q.creator_id = p.id
WHERE q.status = 'published'
GROUP BY p.id
ORDER BY weekly_plays DESC NULLS LAST
LIMIT 5;
```
- Each row: `flex items-center gap-3 py-2`
  - Rank number: `text-xs --text-tertiary min-w-[16px]` (#1, #2, etc.)
  - Avatar: 28px circle with initials
  - Username: `text-sm font-medium` links to `/u/{username}`
  - Stats: `text-xs --text-secondary ml-2` — "{quiz_count} quizzes · {weekly_plays} plays this week"
- If no creators have any plays this week, hide this section entirely.

#### Section 6: Create CTA Banner
- Container: `bg-[--bg-secondary] rounded-lg p-5 text-center mt-6 mb-8`
- Heading: "Think you know your group better than anyone?" `text-base font-medium`
- Subtext: "Create a quiz in under 3 minutes and challenge your mutuals." `text-sm --text-secondary mt-1`
- Button: "Create a quiz" `mt-4 px-6 py-3 rounded-full bg-[--text-primary] text-white text-sm font-medium`. Links to `/create`.

**SEO**:
- `<title>`: "KpopQuiz — K-pop Quizzes Made by Fans"
- `<meta name="description">`: "Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, and 30+ groups. Made by real fans, played by millions."
- `<h1>`: visually hidden (sr-only), text: "K-pop quizzes made by fans"
- Schema: `WebSite` with `SearchAction` (even though we don't have search yet — prepares for future)

---

### 8B. QUIZ PLAYER PAGE ( /q/[slug] )

**Route**: `src/app/q/[slug]/page.tsx`
**Rendering**: Server component for the shell (SEO metadata, initial quiz info). Client component for the actual quiz gameplay.

**CRITICAL**: The `questions` field (with correct answers) must NOT be in the server-rendered HTML. The page should:
1. Server-render: quiz title, group, creator, stats (play_count, avg_score, pass_rate) — this is the intro screen and the SEO content
2. Client-fetch: questions JSON only AFTER user clicks "Start quiz" — via API call to `/api/quiz/[id]/questions`

This prevents answer scraping and cheating.

**Page background**: `--bg-tertiary`

The page has 3 states, rendered as a single client component that transitions between them:

---

#### STATE 1: INTRO

**Container**: `bg-[--bg-secondary] rounded-lg p-5` centered within the page max-width.

**Inside the container**:

**Quiz info card** (white card inside the bg-secondary container):
- Container: `bg-[--bg-primary] rounded-lg border border-[--border-light] p-5`
- Top row: `flex justify-between items-start`
  - Left: Group pill (see component §9.2) + difficulty badge (see component §9.8)
  - Right: `text-xs --text-secondary` "{question_count} questions"
- Title: `text-2xl font-medium mt-3 leading-snug` — the quiz title
- Creator row: `flex items-center gap-2 mt-3`
  - Avatar (22px) + "by **{username}**" in `text-sm`, username is `font-medium`
- Stats row: `flex gap-6 mt-4`
  - Each stat: vertically stacked
    - Label: `text-xs --text-secondary`
    - Value: `text-base font-medium`
  - Stats shown: "plays" / "avg score" / "pass rate"
  - avg_score = `ROUND(total_score_sum / total_completions / question_count * 100)` + "%"
  - pass_rate = percentage of plays where `score / total_questions >= 0.7`, displayed as "{X}%"
  - If play_count is 0: show "—" for avg score and pass rate

**Ad placeholder** (below the card, inside the bg-secondary container):
- `<div id="ad-intro" class="w-full min-h-[90px] flex items-center justify-center text-xs text-[--text-tertiary] mt-4">Ad</div>`
- This is a placeholder. Do NOT integrate any ad SDK. Just the div with "Ad" text.

**Start button** (below ad placeholder):
- `w-full py-4 rounded-full bg-[--text-primary] text-white text-base font-medium mt-4 cursor-pointer`
- Text: "Start quiz"
- On click: fetch questions from `/api/quiz/[id]/questions`, then transition to State 2

---

#### STATE 2: PLAYING

**Container**: same page, different content.

**Top row**: `flex justify-between items-center mb-3`
- Left: `text-sm --text-secondary` "{current} of {total}"
- Right: Timer circle (see component §9.5)

**Progress bar**: (see component §9.6) `mb-6`

**Question area** (animated, see §16):
- Question text: `text-base font-medium leading-relaxed mb-5`
- Answer options: `flex flex-col gap-2.5`
  - Each option is an Answer Button (see component §9.4)

**After answering** (appears below the options):

**Feedback box** (see component §9.7): `mt-4`

**Next button**: `mt-4 flex justify-end`
- Button: `px-6 py-2.5 rounded-full bg-[--text-primary] text-white text-sm font-medium`
- Text: "Next" for questions 1 to (N-1), "See results" for the last question
- On click: transition to next question (with animation), or transition to State 3

---

#### STATE 3: RESULTS

**Container**: centered within page max-width.

**Result card** (the shareable area — give it `id="result-card"` for potential screenshot/share features):
- Container: `bg-[--bg-primary] border border-[--border-light] rounded-lg p-6 text-center`
- Group pill: centered, `mb-4`
- Difficulty badge: next to group pill
- Score: `text-5xl font-semibold` "{score}/{total}" e.g. "8/10"
- Percentage: `text-sm --text-secondary mt-1` "{pct}% correct"
- Rank message box: `mt-5 px-4 py-3 rounded-md text-sm font-medium`
  - Score >= 90%: `bg-[--correct-bg] text-[--correct-text]` "You're a true {fandom_name}! Top {100-percentile}% of players."
  - Score 70-89%: `bg-[--info-bg] text-[--info-text]` "Solid score! You beat {percentile}% of players."
  - Score 50-69%: `bg-[--timeout-bg] text-[--timeout-text]` "Not bad! You beat {percentile}% of players."
  - Score 0-49%: `bg-[--accent-pink-light] text-[--accent-pink-dark]` "Better luck next time! Only {pass_rate}% of players pass this one."
- Comparison bars: `text-left mt-5`
  - Label: `text-sm --text-secondary mb-3` "How you compare"
  - Your score bar:
    - Row: `flex justify-between text-sm mb-1` — "Your score" left, "{pct}%" right (font-medium)
    - Bar: `h-2 rounded-full bg-[--bg-tertiary]` with inner fill `h-2 rounded-full bg-[--accent-pink]` at width {pct}%
    - Animate the fill width from 0 to pct over 800ms with `transition: width 800ms ease-out`, triggered 200ms after the result screen mounts
  - Average bar (below, mt-3):
    - Row: `flex justify-between text-sm mb-1` — "Average {fandom_name}" left, "{avg_pct}%" right
    - Bar: same structure, fill color `bg-[--border-medium]`, width = avg_pct%
- Watermark: `text-xs --text-tertiary mt-4` "kpopquizz.com"

**Buttons below the card**: `flex gap-2 mt-4`
- "Try again": `flex-1 py-3 rounded-full border border-[--border-light] text-sm font-medium bg-[--bg-primary]`
  - On click: reset to State 1 (re-shows intro)
- "Share result": `flex-1 py-3 rounded-full bg-[--text-primary] text-white text-sm font-medium`
  - On click:
    1. If `navigator.share` is available (mobile): call `navigator.share({ title, text, url })`
    2. Otherwise: copy the share URL to clipboard, show a toast "Link copied!"
  - Share URL: `https://kpopquizz.com/q/{slug}?ref=share&s={score}&t={total}`
  - Share text: `I scored {score}/{total} on "{quiz_title}" 🎵 Can you beat me?`

**Report button**: Below the share buttons, small text link
- `text-xs --text-tertiary mt-4 text-center cursor-pointer underline`
- Text: "Report this quiz"
- On click: open a small inline form (not a modal — expands in-place below the link):
  - Radio buttons for reason: "Wrong answers" / "Spam" / "Inappropriate" / "Duplicate" / "Other"
  - Optional text input for details (max 500 chars)
  - "Submit report" button
  - After submit: replace the form with "Thanks for reporting. We'll review this quiz."

**Ad placeholder** (below everything): same pattern as intro ad placeholder.

**SEO (server-rendered)**:
- `<title>`: "{quiz_title} | KpopQuiz"
- `<meta name="description">`: "Play this {group_name} quiz by {username}. {play_count} fans have played — average score is {avg_score}%. Can you do better?"
- `<meta property="og:image">`: `https://kpopquizz.com/api/og/{slug}`
- `<meta property="og:title">`: "{quiz_title} | KpopQuiz"
- `<meta property="og:description">`: same as meta description
- `<meta name="twitter:card">`: "summary_large_image"
- `<h1>`: quiz title (visible in intro screen)
- Schema: see §13

---

### 8C. QUIZ CREATOR PAGE ( /create )

**Route**: `src/app/create/page.tsx`
**Rendering**: Client component (`'use client'`). Single component with internal step state.
**Auth**: REQUIRED. If not authenticated, redirect to `/login?returnTo=/create` using middleware (see §11).
**Page background**: `--bg-tertiary`

**Progress dots** (top of all steps):
- Container: `flex gap-1.5 items-center mb-6`
- Each dot:
  - Upcoming: `w-2 h-2 rounded-full bg-[--border-light]`
  - Active: `w-6 h-2 rounded-full bg-[--accent-pink]` (wider)
  - Done: `w-2 h-2 rounded-full bg-[--correct-accent]` (green)
- Transition between states with `transition-all duration-300`

**Step label** (below dots on all steps):
- `text-xs --text-secondary mb-1` "Step {n} of 4"
- Step title: `text-lg font-medium mb-1`
- Step description: `text-sm --text-secondary mb-5`

---

#### STEP 1: Pick a group

- Title: "Pick a group"
- Description: "Which group is your quiz about?"
- Group pills grid: `flex flex-wrap gap-2 mb-5`
  - Fetch all groups from DB, sorted by `quiz_count DESC`
  - Each pill: `px-4 py-2 rounded-full text-sm border cursor-pointer transition-colors`
    - Unselected: `border-[--border-light] text-[--text-secondary] bg-[--bg-primary]`
    - Hover: `border-[--border-medium]`
    - Selected: `border-[--accent-pink] bg-[--accent-pink-light] text-[--accent-pink-dark]`
  - Only ONE group can be selected at a time
- Custom group input: `mt-3`
  - `<input type="text" placeholder="Or type a group name..." />` (see §17 for input styling)
  - Typing in the input deselects any selected pill
  - Selecting a pill clears the input
  - If the typed group name matches an existing group (case-insensitive), use that group's ID
  - If it doesn't match, a new group will be created on publish with `is_custom = true`
- Continue button: `mt-5`
  - Full width: `w-full py-3 rounded-full bg-[--text-primary] text-white text-sm font-medium`
  - **Disabled state**: `opacity-40 cursor-not-allowed` when no group is selected/typed
  - Enabled when: a pill is selected OR the text input has 2+ characters

---

#### STEP 2: Name your quiz

- Title: "Name your quiz"
- Description: "Make it catchy — challenge titles get 3x more plays."
- Quiz title input:
  - `<input type="text" placeholder="e.g. Only real STAYs can score 10/10 on this" maxLength={100} />`
  - Character counter: `text-xs --text-tertiary text-right mt-1` "{length}/100"
- Quiz type selector: `mt-5`
  - Label: `text-sm --text-secondary mb-2` "Quiz type"
  - 3 type cards stacked vertically, `flex flex-col gap-2.5`
  - Each type card:
    - Container: `p-4 rounded-lg border cursor-pointer transition-colors`
    - Unselected: `border-[--border-light] bg-[--bg-primary]`
    - Hover: `border-[--border-medium]`
    - Selected: `border-[--accent-pink] bg-[--bg-primary]`
    - Title: `text-sm font-medium` on first line
    - Description: `text-xs --text-secondary mt-0.5` on second line
  - Types:
    1. **Multiple choice** (default selected): "4 options, 1 correct answer per question"
    2. **True or false**: "Fast-paced, great for trivia facts"
    3. **Guess from clues**: "Give 3 clues, they guess the idol or song"
- Navigation: `flex gap-2 mt-6`
  - "Back" button: `px-6 py-3 rounded-full border border-[--border-light] text-sm font-medium bg-[--bg-primary]`
  - "Continue" button: same as Step 1 continue. Disabled if title has fewer than 5 characters.

---

#### STEP 3: Add questions

- Title: "Add your questions"
- Description: "Minimum 5, maximum 20. Click the circle to mark the correct answer."

**Saved questions list** (above the editor):
- Each saved question: `bg-[--bg-secondary] rounded-md px-4 py-3 mb-2 flex justify-between items-center`
  - Left: `text-xs --text-secondary` "Q{n}" + `text-sm font-medium ml-2` truncated question text (max 40 chars + "...")
  - Right: delete button `text-[--text-tertiary] hover:text-[--wrong-accent] cursor-pointer p-1` — an X icon (SVG, 16x16)
  - On delete: remove from local state, re-number remaining questions

**Question editor card** (below the list):
- Container: `bg-[--bg-primary] border border-[--border-light] rounded-lg p-5`
- Question number: `text-xs --text-secondary mb-2` "Question {n}" (where n = saved questions count + 1)
- Question input: `<input type="text" placeholder="Type your question..." />` full width
- Answer section (varies by quiz_type):

**If multiple_choice**:
- Label: `text-xs --text-secondary mt-4 mb-2` "Answers (click circle for correct answer)"
- 4 answer rows, each: `flex items-center gap-2 mb-2.5`
  - Radio circle: `w-5 h-5 rounded-full border-2 border-[--border-medium] cursor-pointer flex items-center justify-center flex-shrink-0`
    - Unchecked: empty
    - Checked: `border-[--correct-accent] bg-[--correct-accent]` with a white dot (6px) inside
  - Text input: `flex-1` with placeholder "Answer A", "Answer B", "Answer C", "Answer D"
- First answer (A) is pre-selected as correct by default

**If true_false**:
- Label: `text-xs --text-secondary mt-4 mb-2` "Correct answer"
- Two buttons side by side: `flex gap-2 mt-2`
  - "True" button and "False" button
  - Unselected: `flex-1 py-3 rounded-md border border-[--border-light] text-sm bg-[--bg-primary]`
  - Selected: "True" → `border-[--correct-border] bg-[--correct-bg] text-[--correct-text]`, "False" → `border-[--wrong-border] bg-[--wrong-bg] text-[--wrong-text]`
- "True" is pre-selected by default

**If guess_from_clues**:
- Label: `text-xs --text-secondary mt-4 mb-2` "Clues (give 3 hints, easiest last)"
- 3 clue inputs: `mb-2` each, placeholder "Clue 1 (hardest)", "Clue 2", "Clue 3 (easiest)"
- Then label: `text-xs --text-secondary mt-4 mb-2` "Answer options (click circle for correct answer)"
- 4 answer rows (same as multiple_choice)

**Fun fact input** (all quiz types):
- `mt-4`
- `<input type="text" placeholder="Fun fact shown after answering (optional)" maxLength={280} />`

**Save question button**: `mt-4`
- `px-5 py-2.5 rounded-full bg-[--text-primary] text-white text-sm font-medium`
- Text: "Save question"
- On click:
  - Validate all required fields are filled (see §17)
  - Add to local state array
  - Clear the editor
  - Increment question number
  - Scroll the saved question list into view if needed

**Navigation**: `flex gap-2 mt-5`
- "Back" button
- "Review quiz" button: same as continue. **Disabled** if fewer than 5 questions saved. Show helper text below when disabled: `text-xs --text-secondary mt-2` "Add at least {5 - current} more questions"

---

#### STEP 4: Review and publish

- Title: "Review and publish"
- Description: "Here's how your quiz will look to players."

**Preview card** (same visual as quiz card on homepage):
- Shows: group pill, difficulty badge (calculated client-side: default "medium" since no plays yet), title, "by you", question count
- This is read-only — just a preview

**Question preview list**: show first 3 questions as collapsed cards:
- Each: `bg-[--bg-secondary] rounded-md p-4 mb-2`
  - `text-xs --text-secondary` "Q{n}"
  - `text-sm font-medium mt-1` question text
  - `flex flex-wrap gap-1.5 mt-2` answer pills:
    - Correct answer: `text-xs px-2.5 py-1 rounded-full bg-[--correct-bg] text-[--correct-text] border border-[--correct-border]`
    - Other answers: `text-xs px-2.5 py-1 rounded-full bg-[--bg-primary] text-[--text-secondary] border border-[--border-light]`
- If more than 3 questions: `text-sm --text-secondary text-center mt-2` "+ {n} more questions"

**Settings toggles**: `mt-5 flex flex-col gap-3`
- Each toggle: `flex items-center gap-3 cursor-pointer`
  - Checkbox: native `<input type="checkbox" />` styled with Tailwind (16x16, `accent-[--accent-pink]`)
  - Label: `text-sm --text-primary`
- Toggles:
  1. "Show timer (15s per question)" — default: checked
  2. "Shuffle question order" — default: checked
  3. "Allow players to see correct answers after finishing" — default: unchecked

**Navigation**: `flex gap-2 mt-6`
- "Edit questions" button (goes back to step 3)
- "Publish quiz" button: `flex-1 py-3 rounded-full bg-[--text-primary] text-white text-sm font-medium`
  - On click:
    1. Show loading state on button: text changes to "Publishing...", disable button
    2. POST to `/api/quiz/create` with all quiz data
    3. If group is custom and doesn't exist, create it first
    4. On success: transition to Published screen
    5. On error: show error toast (see §15)

---

#### PUBLISHED SCREEN (after successful publish)

- Container: `text-center py-8`
- Green checkmark: 56px circle, `bg-[--correct-bg]`, with SVG checkmark icon (24px, stroke color `--correct-text`, stroke-width 2.5)
  - Animate: scale from 0 to 1 with a bounce (`keyframes: 0% scale(0), 70% scale(1.1), 100% scale(1)` over 400ms)
- Title: `text-lg font-medium mt-4` "Your quiz is live!"
- Subtitle: `text-sm --text-secondary mt-1` "Share it with your fandom and watch the plays roll in."
- URL display: `mt-6 bg-[--bg-secondary] rounded-md px-4 py-3 flex items-center gap-2`
  - URL text: `text-sm --text-secondary flex-1 truncate` "kpopquizz.com/q/{slug}"
  - Copy button: `px-3 py-1.5 rounded-full border border-[--border-light] bg-[--bg-primary] text-xs font-medium cursor-pointer`
    - On click: copy full URL to clipboard, button text changes to "Copied!" for 2 seconds then reverts
- Share buttons: `flex gap-2 justify-center mt-5`
  - "Share on X": `px-5 py-2.5 rounded-full bg-[--text-primary] text-white text-sm font-medium`
    - Opens: `https://twitter.com/intent/tweet?text=${encodeURIComponent("I just created a " + groupName + " quiz! Think you can pass it? 🎵")}&url=${encodeURIComponent(quizUrl)}`
  - "Share on Discord": `px-5 py-2.5 rounded-full border border-[--border-light] text-sm font-medium bg-[--bg-primary]`
    - Same as copy link (Discord doesn't have a share intent). Copy to clipboard.
- Pro tip: `mt-6 pt-5 border-t border-[--border-light]`
  - Label: `text-xs --text-secondary` "Pro tip"
  - Text: `text-sm mt-1` "Tweet 'Only real {fandom_name}s can pass my quiz' with the link — fan challenge posts get 5x more engagement."

---

### 8D. GROUP PAGE ( /group/[slug] )

**Route**: `src/app/group/[slug]/page.tsx`
**Rendering**: Server component with ISR (revalidate every 60 seconds).
**Page background**: `--bg-tertiary`

**Layout**:
- Group name: `text-xl font-medium` — H1
- Stats: `text-sm --text-secondary mt-1` "{quiz_count} quizzes · {total_plays} total plays"
- Tab bar: `mt-4 mb-4` — same style as homepage tabs
  - Tabs: `Popular` | `Newest` | `Hardest`
  - Default: "Popular"
- Quiz feed: same as homepage, but filtered by `group_id`
  - Popular: `ORDER BY play_count DESC`
  - Newest: `ORDER BY created_at DESC`
  - Hardest: same as homepage hardest query, filtered by group
- CTA at bottom: `mt-6 text-center`
  - `text-sm --text-secondary` "Want to add a quiz?"
  - Button: "Create a {group_name} quiz" → links to `/create` (pre-select this group via query param: `/create?group={slug}`)

**Empty state** (if group has 0 published quizzes):
- `text-center py-12`
- `text-base --text-secondary` "No quizzes yet for {group_name}."
- `text-sm --text-secondary mt-1` "Be the first to create one!"
- Button: "Create a {group_name} quiz" → `/create?group={slug}`

**SEO**:
- `<title>`: "{Group Name} Quizzes — Test Your Knowledge | KpopQuiz"
- `<meta name="description">`: "Play {quiz_count}+ {group_name} quizzes created by real fans. Test how well you really know {group_name}."
- `<h1>`: "{Group Name} quizzes"
- Schema: `CollectionPage`

---

### 8E. PROFILE PAGE ( /u/[username] )

**Route**: `src/app/u/[username]/page.tsx`
**Rendering**: Server component.
**Page background**: `--bg-tertiary`

**Layout**:
- Avatar: 64px circle with initials, centered or left-aligned
- Display name: `text-xl font-medium mt-3` (fallback to username if no display_name)
- Username: `text-sm --text-secondary` "@{username}"
- Bio: `text-sm mt-2 max-w-md` (if set)
- Stats row: `flex gap-4 mt-4`
  - Each: `text-sm` — value in `font-medium`, label in `--text-secondary`
  - "{total_quizzes_created} quizzes" / "{total_plays_received} plays" / "Joined {month year}"
- Divider: `border-t border-[--border-light] mt-6 pt-6`
- Quiz list: all their published quizzes, sorted by `created_at DESC`
  - Uses the standard Quiz Card component
  - Infinite scroll (same pattern as homepage)

**Empty state** (if user has 0 published quizzes):
- `text-center py-12`
- `text-sm --text-secondary` "No quizzes yet."
- If viewing own profile: "Create your first quiz" button

**404**: If username doesn't exist, show the 404 page (see §15).

**SEO**:
- `<title>`: "{display_name}'s K-pop Quizzes | KpopQuiz"
- Add `<meta name="robots" content="noindex">` if `total_quizzes_created < 3`

---

### 8F. LOGIN PAGE ( /login )

**Route**: `src/app/login/page.tsx`
**Rendering**: Client component.
**Page background**: `--bg-tertiary`

**Layout**: centered card, `max-w-sm mx-auto mt-20`
- Card: `bg-[--bg-primary] rounded-lg border border-[--border-light] p-6 text-center`
- Title: `text-lg font-medium` "Sign in to create quizzes"
- Subtitle: `text-sm --text-secondary mt-1` "You don't need an account to play."
- Buttons: `flex flex-col gap-3 mt-6`
  - Google: `w-full py-3 rounded-full border border-[--border-light] text-sm font-medium flex items-center justify-center gap-2`
    - Google "G" icon (inline SVG, 18x18, use the official Google color logo SVG)
    - Text: "Continue with Google"
  - Discord: same style
    - Discord icon (inline SVG, 18x18, #5865F2 fill)
    - Text: "Continue with Discord"
- On click: call `supabase.auth.signInWithOAuth({ provider: 'google' | 'discord', options: { redirectTo: '{SITE_URL}/auth/callback?returnTo={returnTo}' } })`

---

### 8G. ONBOARDING PAGE ( /onboarding )

**Route**: `src/app/onboarding/page.tsx`
**Rendering**: Client component.
**Page background**: `--bg-tertiary`

This page is shown ONCE after first OAuth login, when the user has no profile row yet.

**Layout**: centered card, `max-w-sm mx-auto mt-20`
- Card: `bg-[--bg-primary] rounded-lg border border-[--border-light] p-6`
- Title: `text-lg font-medium` "Pick a username"
- Subtitle: `text-sm --text-secondary mt-1` "This can't be changed later."
- Input: `mt-4`
  - `<input type="text" placeholder="e.g. army_mina" maxLength={20} />`
  - Below input, real-time validation messages:
    - Typing: `text-xs --text-secondary mt-1` "3-20 characters, lowercase letters, numbers, and underscores only"
    - Valid + available: `text-xs text-[--correct-text] mt-1` "✓ Available!"
    - Valid + taken: `text-xs text-[--wrong-text] mt-1` "✗ Already taken"
    - Invalid format: `text-xs text-[--wrong-text] mt-1` "Only lowercase letters, numbers, and underscores"
  - Check availability via debounced API call (300ms debounce) to `/api/auth/check-username?username={value}`
- "Claim username" button: `w-full mt-4 py-3 rounded-full bg-[--text-primary] text-white text-sm font-medium`
  - Disabled until username is valid AND available
  - On click: POST to `/api/auth/create-profile`, then redirect to `returnTo` URL or `/`

---

### 8H. AUTH CALLBACK ( /auth/callback )

**Route**: `src/app/auth/callback/route.ts` (Route Handler, not a page)

```typescript
// Handles the OAuth callback from Supabase
// 1. Exchange the code for a session
// 2. Check if profile exists
// 3. If no profile → redirect to /onboarding?returnTo={returnTo}
// 4. If profile exists → redirect to {returnTo} or /
```

---

### 8I. TRENDING PAGE ( /trending )

**Route**: `src/app/trending/page.tsx`
Same as homepage feed with "Trending" tab permanently active. No hero section, no creators leaderboard, no CTA.
- `<title>`: "Trending K-pop Quizzes | KpopQuiz"

### 8J. NEW PAGE ( /new )

**Route**: `src/app/new/page.tsx`
Same as homepage feed with "New" tab permanently active.
- `<title>`: "New K-pop Quizzes | KpopQuiz"

---

### 8K. ADMIN PAGE ( /admin )

**Route**: `src/app/admin/page.tsx`
**Auth**: Protected by a simple password check. On page load, show a password input. Compare against `ADMIN_PASSWORD` env var. Store in a cookie for the session. This is intentionally simple — no admin user system.

**Content**: A table of flagged/reported quizzes:
- Fetch: `SELECT q.*, r.reason, r.details, r.created_at as report_date FROM quizzes q JOIN reports r ON r.quiz_id = q.id WHERE q.status = 'flagged' OR r.status = 'pending' ORDER BY r.created_at DESC`
- Each row: quiz title (link to /q/[slug]), creator username, report reason, report details, report date
- Actions per quiz: "Remove" (set status to 'removed') / "Dismiss" (set report status to 'resolved')
- Minimal styling. This is an internal tool — function over form.

---

## 9. COMPONENT SPECIFICATIONS

### 9.1 Quiz Card (`components/quiz-card.tsx`)

**Props**: `quiz: { id, title, slug, group_name, group_slug, display_color, text_color, fandom_name, creator_username, creator_avatar_bg, creator_avatar_text, play_count, total_completions, total_score_sum, question_count, difficulty, created_at }`

**Structure**:
```
<Link href="/q/{slug}">
  <div> ← card container
    <div> ← top row
      <GroupPill />
      <DifficultyBadge />
      <span>{formatted_play_count} plays</span>
    </div>
    <p>{title}</p>
    <div> ← bottom row
      <UserAvatar size={22} />
      <span>by <strong>{username}</strong></span>
      <span>· avg score {avg_pct}%</span>
    </div>
  </div>
</Link>
```

**Styling**:
- Container: `block bg-[--bg-primary] border border-[--border-light] rounded-lg p-4 hover:border-[--border-medium] transition-colors cursor-pointer`
- Top row: `flex items-center gap-2 mb-2.5`
  - Play count: `text-xs --text-secondary ml-auto`
- Title: `text-base font-medium leading-snug mb-2`
- Bottom row: `flex items-center gap-2`
  - "by" text: `text-xs --text-secondary`
  - Username: `text-xs font-medium --text-primary`
  - Avg score: `text-xs --text-secondary`

**Play count formatting**: Use this function:
```typescript
export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}
```

**Avg score calculation**:
```typescript
const avgPct = quiz.total_completions > 0
  ? Math.round((quiz.total_score_sum / quiz.total_completions) / quiz.question_count * 100)
  : null;
```
If `null` (no completions), show "new" instead of avg score percentage.

---

### 9.2 Group Pill (`components/group-pill.tsx`)

**Props**: `name: string, displayColor: string, textColor: string, size?: 'sm' | 'md'`

**Rendering**:
- sm (default): `inline-block text-xs font-medium px-2.5 py-0.5 rounded-full`
- md: `inline-block text-sm font-medium px-3 py-1 rounded-full`
- `style={{ backgroundColor: displayColor, color: textColor }}`

---

### 9.3 User Avatar (`components/user-avatar.tsx`)

**Props**: `username: string, bgColor: string, textColor: string, size: number` (size in px)

**Rendering**:
- Outer div: `rounded-full flex items-center justify-center font-medium`
- `style={{ width: size, height: size, backgroundColor: bgColor, color: textColor, fontSize: Math.round(size * 0.4) }}`
- Text content: first 2 chars of username, uppercase

---

### 9.4 Answer Button (`components/answer-button.tsx`)

**Props**: `label: string, text: string, state: 'default' | 'correct' | 'wrong' | 'dimmed', disabled: boolean, onClick: () => void`

Labels are "A", "B", "C", "D".

**States**:
- default: `border-[--border-light] bg-[--bg-primary]`
  - Letter circle: `bg-[--bg-secondary] text-[--text-secondary]`
- correct: `border-[--correct-border] bg-[--correct-bg]`
  - Letter circle: `bg-[--correct-accent] text-white`
- wrong: `border-[--wrong-border] bg-[--wrong-bg]`
  - Letter circle: `bg-[--wrong-accent] text-white`
- dimmed: `opacity-40 border-[--border-light] bg-[--bg-primary]`

**Structure**:
```html
<button class="w-full text-left p-3.5 rounded-md border-[1.5px] flex items-center gap-3 transition-colors text-sm {state_classes}">
  <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 {circle_classes}">
    {label}
  </span>
  <span>{text}</span>
</button>
```

Hover (only when state is default and not disabled): `hover:border-[--border-medium]`

---

### 9.5 Timer Circle (`components/timer-circle.tsx`)

**Props**: `seconds: number, isUrgent: boolean`

**Rendering**:
- Container: `w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-medium`
- Normal: `border-[--border-light] text-[--text-secondary]`
- Urgent (≤5 seconds): `border-[--wrong-accent] text-[--wrong-accent]`
- Displays the number of seconds remaining

---

### 9.6 Progress Bar (`components/progress-bar.tsx`)

**Props**: `current: number, total: number`

**Rendering**:
```html
<div class="h-1 rounded-full bg-[--bg-secondary] overflow-hidden">
  <div class="h-1 rounded-full bg-[--accent-pink] transition-[width] duration-400 ease-out"
       style={{ width: `${(current / total) * 100}%` }} />
</div>
```

---

### 9.7 Feedback Box (`components/feedback-box.tsx`)

**Props**: `type: 'correct' | 'wrong' | 'timeout', title: string, text: string`

**Rendering**:
- Container: `px-4 py-3 rounded-md text-sm`
- correct: `bg-[--correct-bg] text-[--correct-text]`
- wrong: `bg-[--wrong-bg] text-[--wrong-text]`
- timeout: `bg-[--timeout-bg] text-[--timeout-text]`
- Title: `font-medium` followed by a space and the text (all on same line, wrapping naturally)

---

### 9.8 Difficulty Badge (`components/difficulty-badge.tsx`)

**Props**: `difficulty: 'easy' | 'medium' | 'hard'`

**Rendering**:
- `inline-block text-xs font-medium px-2 py-0.5 rounded-full`
- easy: `bg-[--easy-bg] text-[--easy-text]`
- medium: `bg-[--medium-bg] text-[--medium-text]`
- hard: `bg-[--hard-bg] text-[--hard-text]`
- Text: capitalize the difficulty string ("Easy", "Medium", "Hard")

---

### 9.9 Toast (`components/toast.tsx`)

A global toast notification system.

**Implementation**: Use React context. Provide a `showToast(message: string, type: 'success' | 'error' | 'info')` function.

**Rendering**:
- Position: fixed bottom-center, `bottom-6 left-1/2 -translate-x-1/2 z-50`
- Container: `px-4 py-3 rounded-lg text-sm font-medium shadow-sm` (this is the ONE place shadows are allowed — for the floating toast)
- success: `bg-[--correct-bg] text-[--correct-text] border border-[--correct-border]`
- error: `bg-[--wrong-bg] text-[--wrong-text] border border-[--wrong-border]`
- info: `bg-[--info-bg] text-[--info-text] border border-[--border-light]`
- Auto-dismiss after 3 seconds
- Animate: slide up + fade in on appear, fade out on dismiss

---

## 10. API ENDPOINTS

### POST /api/quiz/create

**Auth**: Required (verify session via Supabase server client)

**Request body**:
```typescript
{
  group_id?: number,           // existing group ID (either this or group_name)
  group_name?: string,         // custom group name (creates new group if doesn't exist)
  title: string,               // 5-100 chars
  quiz_type: 'multiple_choice' | 'true_false' | 'guess_from_clues',
  questions: Question[],       // 5-20 items (see JSONB structure in §3)
  settings: {
    timer: boolean,
    timer_seconds: number,     // 10, 15, or 20
    shuffle: boolean,
    show_answers: boolean,
  }
}
```

**Validation**:
- Title: 5-100 characters, not empty after trim
- Questions: 5-20 items
- Each multiple_choice question: `question` (1-500 chars), 4 `options` (each 1-200 chars), `correct` (0-3), optional `fun_fact` (0-280 chars)
- Each true_false question: `question` (1-500 chars), `correct` (boolean), optional `fun_fact`
- Each guess_from_clues question: 3 `clues` (each 1-200 chars), `answer` (1-200 chars), 4 `options`, `correct` (0-3), optional `fun_fact`

**Slug generation**:
```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .slice(0, 60);                  // max 60 chars
}
// If slug exists in DB, append -2, -3, etc.
```

**Response** (200):
```json
{ "id": "uuid", "slug": "only-real-blinks-can-score-9-10" }
```

**Errors**:
- 401: `{ "error": "Unauthorized" }`
- 400: `{ "error": "Validation error", "details": "..." }`
- 500: `{ "error": "Internal server error" }`

---

### GET /api/quiz/[id]/questions

**Auth**: Not required

**Response** (200):
```json
{
  "questions": [
    {
      "question": "What was BLACKPINK's debut song?",
      "options": ["Boombayah", "Playing with Fire", "Whistle", "As If It's Your Last"],
      "correct": 0,
      "fun_fact": "..."
    }
  ],
  "settings": {
    "timer": true,
    "timer_seconds": 15,
    "shuffle": true,
    "show_answers": false
  }
}
```

If `shuffle` is true, randomize the question order on the server before returning. Also randomize the option order within each question (and update the `correct` index accordingly).

---

### POST /api/quiz/[id]/play

**Auth**: Optional (pass player_id if logged in)

**Request body**:
```json
{
  "score": 8,
  "total_questions": 10,
  "time_taken_seconds": 95
}
```

**Implementation**: Call the `record_play` database function (see §3).

**Response** (200):
```json
{
  "play_id": "uuid",
  "percentile": 78
}
```

---

### POST /api/quiz/[id]/report

**Auth**: Optional

**Request body**:
```json
{
  "reason": "wrong_answers",
  "details": "Question 3 has the wrong answer marked"
}
```

**Response** (200):
```json
{ "success": true }
```

---

### GET /api/auth/check-username?username={value}

**Auth**: Required

**Response**:
```json
{ "available": true }
```
or
```json
{ "available": false }
```

---

### POST /api/auth/create-profile

**Auth**: Required

**Request body**:
```json
{ "username": "army_mina" }
```

**Implementation**:
1. Validate username format (3-20 chars, `^[a-z0-9_]+$`)
2. Check availability
3. Generate avatar colors using `getAvatarColors(username)`
4. Insert into profiles table
5. Return success

**Response** (200):
```json
{ "success": true, "username": "army_mina" }
```

---

### GET /api/og/[slug] — OG Image Generation

See §12 for full specification.

---

## 11. AUTHENTICATION FLOW

**Middleware** (`src/middleware.ts`):

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const protectedPaths = ['/create', '/onboarding'];
  const isProtected = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('returnTo', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/create', '/onboarding'],
};
```

**Auth callback flow**:
1. User clicks "Continue with Google/Discord" on /login
2. Supabase redirects to provider
3. Provider redirects back to `/auth/callback?code=xxx&returnTo=yyy`
4. Callback route handler exchanges code for session
5. Check if profile exists: `SELECT id FROM profiles WHERE id = session.user.id`
6. If no profile: redirect to `/onboarding?returnTo={returnTo}`
7. If profile exists: redirect to `{returnTo}` or `/`

---

## 12. OG IMAGE GENERATION

**Route**: `src/app/api/og/[slug]/route.tsx`

Uses `@vercel/og` (Satori) to generate a 1200x630 PNG.

**Query params** (optional): `?s={score}&t={total}` — if present, show a personalized result card. If absent, show the generic quiz card.

**Generic quiz card** (no score params):
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                [GROUP PILL]  [DIFFICULTY]             │
│                                                      │
│            {Quiz Title Here}                         │
│            (max 2 lines, 36px, font-medium)          │
│                                                      │
│        by {username} · {play_count} plays            │
│                                                      │
│                kpopquizz.com                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Personalized result card** (with score params):
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                [GROUP PILL]                           │
│                                                      │
│                  8/10                                 │
│               (72px, bold)                            │
│                                                      │
│            {Quiz Title Here}                         │
│            (24px, secondary)                          │
│                                                      │
│          Can you beat this score?                     │
│                                                      │
│                kpopquizz.com                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Background**: White (#FFFFFF)
**Accent**: A subtle pink (#FBEAF0) decorative strip at the top (8px height)
**Font**: Load Pretendard via fetch in the OG route. If Pretendard fetch fails, fall back to system sans-serif.

**Implementation**:
```typescript
import { ImageResponse } from 'next/og';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const score = searchParams.get('s');
  const total = searchParams.get('t');

  // Fetch quiz data from DB (title, group, creator, stats)
  // ...

  return new ImageResponse(
    ( /* JSX template */ ),
    { width: 1200, height: 630 }
  );
}
```

---

## 13. SEO REQUIREMENTS

### Sitemap (`src/app/sitemap.ts`)

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all published quiz slugs
  // Fetch all group slugs
  return [
    { url: 'https://kpopquizz.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    // ...group pages (priority 0.8, changeFrequency 'weekly')
    // ...quiz pages (priority 0.6, changeFrequency 'monthly')
    { url: 'https://kpopquizz.com/trending', changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://kpopquizz.com/new', changeFrequency: 'daily', priority: 0.7 },
  ];
}
```

### robots.txt (`src/app/robots.ts`)

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/login', '/onboarding', '/admin'] },
    sitemap: 'https://kpopquizz.com/sitemap.xml',
  };
}
```

### Schema Markup

**Quiz page** — add JSON-LD in the page `<head>`:
```json
{
  "@context": "https://schema.org",
  "@type": "Quiz",
  "name": "{quiz_title}",
  "description": "A {group_name} quiz created by {username}",
  "educationalAlignment": { "@type": "AlignmentObject", "alignmentType": "educationalSubject", "targetName": "K-pop" },
  "author": { "@type": "Person", "name": "{username}" },
  "dateCreated": "{created_at}",
  "interactionStatistic": { "@type": "InteractionCounter", "interactionType": "https://schema.org/PlayAction", "userInteractionCount": {play_count} }
}
```

**Group page**:
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "{group_name} Quizzes",
  "description": "Play {quiz_count}+ {group_name} quizzes created by real fans."
}
```

---

## 14. REDIRECT STRATEGY (old site)

The old kpopquizz.com has ~1500 idol pages that need to be handled.

**In `next.config.ts`**:

```typescript
async redirects() {
  return [
    // Catch-all: redirect any old path that doesn't match new routes to homepage
    // Old idol pages were likely at /idol/[name] or /[name] or similar
    // Since we don't know the exact old URL structure, use a catch-all middleware approach
  ];
}
```

**In middleware** (add to existing middleware):
```typescript
// If the path doesn't match any known route AND isn't a static file, 301 to homepage
// Known routes: /, /q/*, /create, /group/*, /u/*, /trending, /new, /login, /onboarding, /admin, /auth/*, /api/*
// Everything else: 301 redirect to /
```

This preserves any link equity from the old pages by redirecting to homepage rather than 404ing.

---

## 15. ERROR & LOADING STATES

### Loading States

**Page-level loading** (`loading.tsx` files):
- For all page routes, create a `loading.tsx` that shows:
  - The navbar (already rendered by layout)
  - A centered spinner (see below) with no text

**Spinner** (reusable):
```html
<div class="w-5 h-5 border-2 border-[--border-light] border-t-[--accent-pink] rounded-full animate-spin" />
```
This is the ONLY loading indicator used. No skeleton screens. No shimmer. Just this spinner.

**Quiz feed loading more** (infinite scroll):
- Show the spinner centered below the last card, `py-4`

**Button loading states**:
- Replace button text with the spinner (centered in the button)
- Disable the button
- Example: "Publish quiz" → spinner → "Published!" (brief success before redirect)

### Error States

**404 page** (`src/app/not-found.tsx`):
- Centered content, `mt-20 text-center`
- `text-5xl font-semibold` "404"
- `text-base --text-secondary mt-2` "This page doesn't exist."
- `mt-4` "Go home" button linking to `/`

**Error page** (`src/app/error.tsx`):
- Centered content, `mt-20 text-center`
- `text-lg font-medium` "Something went wrong"
- `text-sm --text-secondary mt-2` "Please try refreshing the page."
- `mt-4` "Try again" button that calls `reset()` (Next.js error boundary reset)

**API errors**: All API endpoints return consistent error shapes:
```json
{ "error": "Human-readable error message" }
```
Status codes: 400 (validation), 401 (auth), 404 (not found), 500 (server error)

**Empty states** (already specified per-page in §8)

**Network failure during quiz play**:
- Quiz play is entirely client-side. No network calls during gameplay.
- The only network call is recording the play AFTER completion. If it fails:
  - Still show the result screen (don't block the user)
  - Show a small toast: "Couldn't save your score. Your result is still valid!"
  - The percentile comparison will be unavailable — show "—" instead of a number

---

## 16. ANIMATIONS (exact CSS)

**Question transition** (between questions in quiz player):
```css
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-question-in {
  animation: fadeSlideIn 250ms ease-out;
}
```
Apply this class to the question area div each time the question changes. Remove and re-add the class to trigger re-animation (use a React key on the question index).

**Result screen entrance**:
Same `fadeSlideIn` animation, 300ms duration.

**Progress bar fill**:
```css
transition: width 400ms ease-out;
```

**Result comparison bars**:
```css
transition: width 800ms ease-out;
```
Trigger 200ms after mount using `setTimeout` + state change.

**Published checkmark bounce**:
```css
@keyframes bounceIn {
  0% { transform: scale(0); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.animate-bounce-in {
  animation: bounceIn 400ms ease-out;
}
```

**Toast enter/exit**:
```css
@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 16px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, 16px); }
}
```

**Tab switching**: No animation. Instant swap.

**Card hover**: `transition: border-color 150ms ease`

**NO other animations.** No page transitions. No route animations. No parallax. No scroll effects.

---

## 17. VALIDATION RULES (every input)

### Username (onboarding)
- Min: 3 characters
- Max: 20 characters
- Pattern: `^[a-z0-9_]+$` (lowercase only, numbers, underscores)
- Must be unique (checked via API)
- Cannot be: "admin", "api", "auth", "create", "login", "onboarding", "trending", "new", "group", "q", "u" (reserved paths)

### Quiz title
- Min: 5 characters (after trim)
- Max: 100 characters
- Cannot be empty/whitespace only

### Question text
- Min: 1 character (after trim)
- Max: 500 characters

### Answer option text
- Min: 1 character (after trim)
- Max: 200 characters

### Clue text (guess_from_clues)
- Min: 1 character (after trim)
- Max: 200 characters

### Fun fact
- Min: 0 (optional)
- Max: 280 characters

### Report details
- Min: 0 (optional)
- Max: 500 characters

### Bio (profile)
- Min: 0 (optional)
- Max: 160 characters

### Display name (profile)
- Min: 0 (optional)
- Max: 40 characters

### Global input styling (Tailwind classes for all `<input type="text">` and `<textarea>`):
```
w-full px-4 py-3 rounded-md border border-[--border-light] bg-[--bg-primary]
text-sm text-[--text-primary] placeholder:text-[--text-tertiary]
focus:outline-none focus:border-[--accent-pink] focus:ring-1 focus:ring-[--accent-pink]
transition-colors
```

---

## 18. FILE STRUCTURE

```
kpopquizz/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout: font, metadata, nav, footer, toast provider
│   │   ├── page.tsx                      # Homepage (server component)
│   │   ├── loading.tsx                   # Homepage loading state
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── error.tsx                     # Error boundary page
│   │   ├── q/
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # Quiz player page
│   │   ├── create/
│   │   │   └── page.tsx                  # Quiz creator (client component)
│   │   ├── group/
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # Group page (ISR)
│   │   ├── u/
│   │   │   └── [username]/
│   │   │       └── page.tsx              # Profile page
│   │   ├── trending/
│   │   │   └── page.tsx                  # Trending page
│   │   ├── new/
│   │   │   └── page.tsx                  # New quizzes page
│   │   ├── login/
│   │   │   └── page.tsx                  # Auth page
│   │   ├── onboarding/
│   │   │   └── page.tsx                  # Username selection
│   │   ├── admin/
│   │   │   └── page.tsx                  # Admin panel
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts              # OAuth callback handler
│   │   ├── api/
│   │   │   ├── quiz/
│   │   │   │   ├── create/
│   │   │   │   │   └── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── questions/
│   │   │   │       │   └── route.ts      # GET questions (client-fetch only)
│   │   │   │       ├── play/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── stats/
│   │   │   │       │   └── route.ts
│   │   │   │       └── report/
│   │   │   │           └── route.ts
│   │   │   ├── auth/
│   │   │   │   ├── check-username/
│   │   │   │   │   └── route.ts
│   │   │   │   └── create-profile/
│   │   │   │       └── route.ts
│   │   │   └── og/
│   │   │       └── [slug]/
│   │   │           └── route.tsx         # OG image generation
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── user-dropdown.tsx
│   │   ├── quiz/
│   │   │   ├── quiz-card.tsx
│   │   │   ├── quiz-player.tsx           # The 3-state player (intro → play → result)
│   │   │   ├── quiz-creator.tsx          # The 4-step wizard
│   │   │   ├── answer-button.tsx
│   │   │   ├── timer-circle.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   ├── feedback-box.tsx
│   │   │   ├── result-card.tsx
│   │   │   └── report-form.tsx
│   │   ├── ui/
│   │   │   ├── group-pill.tsx
│   │   │   ├── difficulty-badge.tsx
│   │   │   ├── user-avatar.tsx
│   │   │   ├── tab-bar.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toast-provider.tsx
│   │   └── home/
│   │       ├── quiz-feed.tsx             # Client component: tab switching + infinite scroll
│   │       ├── quiz-of-the-day.tsx
│   │       ├── creator-leaderboard.tsx
│   │       └── create-cta.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # createBrowserClient
│   │   │   ├── server.ts                # createServerClient (for server components + API routes)
│   │   │   └── middleware.ts             # createMiddlewareClient
│   │   ├── db/
│   │   │   ├── queries/
│   │   │   │   ├── quizzes.ts            # All quiz-related queries
│   │   │   │   ├── groups.ts             # All group-related queries
│   │   │   │   ├── profiles.ts           # All profile-related queries
│   │   │   │   └── plays.ts              # All play-related queries
│   │   │   └── types.ts                  # TypeScript types matching DB schema
│   │   ├── utils.ts                      # formatCount, generateSlug, getAvatarColors, getAvatarInitials
│   │   └── constants.ts                  # Reserved usernames list
│   ├── styles/
│   │   └── globals.css                   # Tailwind imports + CSS variables + animation keyframes
│   └── middleware.ts                     # Auth + redirect middleware
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql                # Tables + constraints
│       ├── 002_functions.sql             # Functions + triggers
│       ├── 003_rls.sql                   # RLS policies
│       └── 004_seed.sql                  # Group seed data
├── public/
│   ├── favicon.ico                       # Pink "Q" favicon
│   └── apple-touch-icon.png              # 180x180 icon
├── tailwind.config.ts
├── next.config.ts                        # Redirects + image config
├── package.json
├── tsconfig.json
├── .env.local                            # Environment variables (not committed)
└── .gitignore
```

---

## 19. LAUNCH CHECKLIST

Before going live:

- [ ] All pages render correctly on 375px mobile width (test: iPhone SE)
- [ ] All pages render correctly on 1440px desktop width
- [ ] No horizontal overflow on any page at any width
- [ ] Quiz player works fully: start → answer all → see results → share → try again
- [ ] Quiz player: timer counts down and auto-submits at 0
- [ ] Quiz player: correct/wrong/timeout feedback appears correctly
- [ ] Quiz player: progress bar advances correctly
- [ ] Quiz player: result card shows correct score, percentage, percentile, rank message
- [ ] Quiz player: share button copies URL on desktop, opens share sheet on mobile
- [ ] Quiz player: report form works
- [ ] Quiz creator: all 4 steps work, validation prevents invalid submissions
- [ ] Quiz creator: published screen shows with correct link
- [ ] Quiz creator: created quiz appears on homepage and group page
- [ ] Homepage: all 4 tabs work (Trending, New, Hardest, By group)
- [ ] Homepage: infinite scroll loads more quizzes
- [ ] Homepage: Quiz of the Day shows when one is set
- [ ] Homepage: Top creators section shows correct data
- [ ] Group pages: render for all 30 seed groups
- [ ] Group pages: show correct quiz count and play count
- [ ] Profile pages: show correct stats and quiz list
- [ ] Auth: Google login works end-to-end
- [ ] Auth: Discord login works end-to-end
- [ ] Auth: Onboarding username selection works with validation
- [ ] Auth: Protected routes redirect to /login correctly
- [ ] Auth: After login, redirect back to original page works
- [ ] OG image generates correctly for quizzes (check with https://www.opengraph.xyz/)
- [ ] OG image generates correctly with score params
- [ ] Sitemap generates and includes all pages
- [ ] robots.txt is correct
- [ ] Google Search Console connected and sitemap submitted
- [ ] Schema markup validates (Google Rich Results Test)
- [ ] Lighthouse score > 90 for quiz player page (Performance, Accessibility, Best Practices, SEO)
- [ ] 301 redirects work for old URLs (go to /old-idol-page → redirects to /)
- [ ] 404 page renders for truly non-existent routes
- [ ] Error page renders when things break
- [ ] Toast notifications work (success, error, info)
- [ ] Ad placeholder divs are in place (do NOT activate ads yet)
- [ ] Create 20-30 seed quizzes manually across BTS, BLACKPINK, Stray Kids, TWICE, aespa
- [ ] All API endpoints return correct status codes and error shapes
- [ ] All database constraints work (try submitting invalid data)
- [ ] RLS policies work (try accessing other user's data)

---

## 20. V2 BACKLOG (do NOT build these in MVP)

These are confirmed future features. Document them here so they're known, but do NOT implement any of them:

- ❌ **Challenge a Friend**: Generate a custom URL like `/q/{slug}?challenge={score}` that shows "Your friend scored 8/10 — can you beat them?" on the intro screen
- ❌ **Save/Bookmark quizzes**: Heart icon on quiz cards, saved quizzes page on profile
- ❌ **Dark mode**: Full dark theme with CSS variable swaps
- ❌ **Comments on quizzes**
- ❌ **Followers / following system**
- ❌ **Achievements / badges**
- ❌ **Quiz categories beyond group** (era, album, variety show)
- ❌ **Image/audio/video in quizzes**
- ❌ **Multi-language support**
- ❌ **Mobile app**
- ❌ **Email notifications**
- ❌ **Payment / premium tier**
- ❌ **Quiz embedding on other sites**
- ❌ **Social login beyond Google + Discord** (Apple, KakaoTalk)
- ❌ **Search functionality**
- ❌ **Quiz editing after publish**
- ❌ **Quiz analytics for creators** (score distribution chart, traffic sources)
- ❌ **Weekly quiz digest email**
- ❌ **Admin UI for Quiz of the Day** (use SQL for now)
- ❌ **Idol profile pages** (NEVER)

---

## FINAL NOTES FOR CLAUDE CODE

1. **Build in this order**: Database schema → Auth flow (login, callback, onboarding) → Quiz player page → Homepage → Quiz creator → Group pages → Profile pages → OG images → Admin → SEO (sitemap, robots, schema) → Redirects → Polish (loading, errors, empty states)
2. **The quiz player page is priority #1.** If you run out of context or time, the quiz player must be perfect. Everything else can be rough.
3. **Use server components by default.** Only add `'use client'` when the component needs: useState, useEffect, onClick handlers, browser APIs.
4. **Keep the quiz creator as ONE client component** with internal step state. Do not use separate routes per step.
5. **Questions must not be in server-rendered HTML.** Fetch them client-side after "Start quiz" click.
6. **Test on mobile width (375px).** Every layout decision should be mobile-first.
7. **No dark mode.** Light only. Do not add any dark mode logic or `prefers-color-scheme` media queries.
8. **No shadows** except on the toast component.
9. **The accent color is pink (#ED93B1).** Use it sparingly: progress bars, active states, focus rings. Most of the UI is black/white/gray.
10. **Respect the exact CSS values** specified in this document. Do not substitute with "close enough" Tailwind classes if the exact value doesn't map to a default class — use arbitrary values like `text-[#ED93B1]` or custom Tailwind config entries.
