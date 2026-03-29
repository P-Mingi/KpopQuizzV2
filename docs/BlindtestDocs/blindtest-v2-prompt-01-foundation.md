# Prompt 1: Foundation — Monorepo, Design System, Layout, Auth

## Overview

Create a new Next.js app for the K-pop Blind Test game inside the existing kpopquiz monorepo. This app has its own visual identity (dark mode, pink accents) but shares the same Supabase project and auth system.

---

## Step 1: Monorepo Structure

Convert the existing kpopquiz project into a monorepo using Turborepo (or simple npm workspaces if Turborepo adds too much complexity):

```
kpopquiz/
├── apps/
│   ├── quiz/                    ← existing kpopquiz.org (move everything here)
│   │   ├── src/
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── blindtest/               ← NEW: the blind test game app
│       ├── src/
│       ├── public/
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── package.json
├── packages/
│   └── shared/                  ← shared code (Supabase client, types, utils)
│       ├── src/
│       │   ├── supabase.ts      ← Supabase client (shared)
│       │   ├── types.ts         ← shared TypeScript types
│       │   └── index.ts
│       └── package.json
├── package.json                 ← root workspace config
├── turbo.json                   ← (optional) Turborepo config
└── .env                         ← shared env vars (Supabase URL, anon key)
```

### Moving existing code

1. Create `apps/quiz/` directory
2. Move ALL existing source code (src/, public/, next.config.js, tailwind.config.js, package.json, etc.) into `apps/quiz/`
3. Extract shared Supabase client and types into `packages/shared/`
4. Update imports in the quiz app to use `@shared/supabase` etc.
5. Verify the quiz app still builds and deploys correctly

### Root package.json

```json
{
  "name": "kpopquiz-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:quiz": "cd apps/quiz && npm run dev",
    "dev:blindtest": "cd apps/blindtest && npm run dev",
    "build:quiz": "cd apps/quiz && npm run build",
    "build:blindtest": "cd apps/blindtest && npm run build"
  }
}
```

### Shared package

```json
{
  "name": "@shared/lib",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

Contents:
- `supabase.ts` — createBrowserClient, createServerClient (using shared env vars)
- `types.ts` — shared types (BlindTestSong, Group, etc.)
- Auth helpers used by both apps

---

## Step 2: New Next.js App — apps/blindtest

### Initialize

```bash
cd apps
npx create-next-app@latest blindtest --typescript --tailwind --app --src-dir --import-alias "@/*"
```

### package.json dependencies

```json
{
  "name": "kpop-blindtest",
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.1.0",
    "@shared/lib": "workspace:*"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
};

module.exports = nextConfig;
```

### Environment variables

The blindtest app uses the SAME Supabase project. The `.env` file at the repo root contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

For local dev, the quiz app runs on port 3000 and the blindtest app runs on port 3001.

---

## Step 3: Design System — Dark Mode with Pink Accents

### Color Palette

The entire app uses a dark color scheme. These are the ONLY colors used across the app. No other hex values.

```css
:root {
  /* ── Backgrounds ── */
  --bg-primary: #0D0D0F;        /* Main background — near black */
  --bg-secondary: #16161A;      /* Cards, elevated surfaces */
  --bg-tertiary: #1E1E24;       /* Hover states, subtle elevation */
  --bg-input: #16161A;          /* Input fields, buttons */

  /* ── Borders ── */
  --border-default: #1E1E24;    /* Default border — barely visible */
  --border-hover: #2A2A30;      /* Hover state */
  --border-active: #3A3A42;     /* Active/focus state */

  /* ── Text ── */
  --text-primary: #E8E6E0;      /* Primary text — warm white */
  --text-secondary: #7A786E;    /* Secondary text — muted */
  --text-tertiary: #5A584E;     /* Tertiary text — very muted */
  --text-ghost: #3A3A42;        /* Ghost text — barely visible (locked badges etc) */

  /* ── Accent: Pink (primary accent for EVERYTHING) ── */
  --pink-50: rgba(237,147,177,0.08);
  --pink-100: rgba(237,147,177,0.15);
  --pink-200: #F4C0D1;          /* Light pink — mastery bars, secondary elements */
  --pink-400: #ED93B1;          /* Main pink — buttons, active states, scores, highlights */
  --pink-600: #D4537E;          /* Dark pink — hover on pink buttons */
  --pink-900: #4B1528;          /* Very dark pink — backgrounds behind pink text */

  /* ── Semantic ── */
  --correct: #97C459;           /* Correct answer — green */
  --correct-bg: rgba(151,196,89,0.12);
  --correct-border: rgba(151,196,89,0.4);

  --wrong: #E24B4A;             /* Wrong answer — red */
  --wrong-bg: rgba(226,75,74,0.12);
  --wrong-border: rgba(226,75,74,0.4);

  --streak: #EF9F27;            /* Streak/fire — amber */
  --streak-bg: rgba(239,159,39,0.12);

  /* ── Combo ── */
  --combo-bg: rgba(237,147,177,0.15);
  --combo-text: #ED93B1;

  /* ── Speed labels (visual feedback only, no scoring impact) ── */
  --speed-lightning: #ED93B1;   /* 0-2s — pink */
  --speed-fast: #F4C0D1;       /* 2-4s — light pink */
  --speed-normal: #7A786E;     /* 4-6s — gray */
  --speed-slow: #5A584E;       /* 6-8s — dark gray */

  /* ── Border radius ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text-primary);
  background: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
}
```

| Use | Size | Weight | Color |
|-----|------|--------|-------|
| Page title | 20px | 600 | --text-primary |
| Card title / song title | 15-16px | 500-600 | --text-primary |
| Body / button text | 14-15px | 500 | --text-primary |
| Answer choices | 15px | 500 | --text-primary |
| Secondary info | 13px | 400-500 | --text-secondary |
| Meta / labels | 11-12px | 500 | --text-tertiary |
| Section labels | 10px | 600 | --text-tertiary, uppercase, tracking 0.08em |
| Badge text | 9-11px | 500-600 | contextual |
| Minimum size | 10px | — | Never smaller than 10px |

### Tailwind Config

```javascript
// apps/blindtest/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D0D0F',
          secondary: '#16161A',
          tertiary: '#1E1E24',
          input: '#16161A',
        },
        border: {
          default: '#1E1E24',
          hover: '#2A2A30',
          active: '#3A3A42',
        },
        text: {
          primary: '#E8E6E0',
          secondary: '#7A786E',
          tertiary: '#5A584E',
          ghost: '#3A3A42',
        },
        pink: {
          50: 'rgba(237,147,177,0.08)',
          100: 'rgba(237,147,177,0.15)',
          200: '#F4C0D1',
          400: '#ED93B1',
          600: '#D4537E',
          900: '#4B1528',
        },
        correct: '#97C459',
        wrong: '#E24B4A',
        streak: '#EF9F27',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
```

### globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }

body {
  background: #0D0D0F;
  color: #E8E6E0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar hide utility */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Animations */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pointsFloat {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.animate-fadeSlideUp { animation: fadeSlideUp 0.3s ease; }
.animate-pointsFloat { animation: pointsFloat 0.8s ease forwards; }
.animate-shake { animation: shake 0.15s ease infinite; }
.animate-pulse { animation: pulse 1.5s ease infinite; }
```

---

## Step 4: Layout Shell

### Root Layout — `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'K-pop Blind Test — How Well Do You REALLY Know K-pop?',
  description: 'The ultimate K-pop song guessing game. 600+ songs, 45+ groups, daily challenges, leaderboards. Free forever.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-[430px] mx-auto min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  );
}
```

**Important**: `max-w-[430px]` — the app is mobile-first and phone-shaped even on desktop. Content is centered in a 430px column (standard mobile viewport). This is a GAME, not a website — the phone-shaped layout IS the brand.

### Top Nav Component — `src/components/layout/top-nav.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TopNav({ user }: { user?: { username: string; streak: number } }) {
  return (
    <nav className="flex justify-between items-center px-5 py-3.5 border-b border-border-default">
      <Link href="/" className="text-base font-semibold">
        kpop<span className="text-pink-400">blind</span>test
      </Link>
      <div className="flex items-center gap-3.5">
        {user?.streak > 0 && (
          <span className="text-xs text-streak font-medium">{user.streak}d</span>
        )}
        {user ? (
          <Link href="/profile" className="w-7 h-7 rounded-full bg-pink-400 flex items-center justify-center text-[11px] font-semibold text-bg-primary">
            {user.username.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link href="/login" className="text-xs text-text-secondary font-medium">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
```

### Bottom Nav Component — `src/components/layout/bottom-nav.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/daily', label: 'Daily', icon: 'clock' },
  { href: '/leaderboard', label: 'Ranks', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t border-border-default bg-bg-primary/95 backdrop-blur-sm z-50">
      <div className="flex py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(tab => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-1 text-[10px] font-medium ${
                isActive ? 'text-pink-400' : 'text-text-tertiary'
              }`}>
              <NavIcon name={tab.icon} active={isActive} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#ED93B1' : '#5A584E';
  const size = 20;

  switch (name) {
    case 'home':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M3 10L10 3L17 10V17H12V13H8V17H3V10Z" fill={color} />
        </svg>
      );
    case 'clock':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" />
          <path d="M10 6V10L13 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M5 15V8M10 15V5M15 15V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'user':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.5" stroke={color} strokeWidth="1.5" />
          <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
```

**Important**: The bottom nav uses `fixed` positioning with `max-w-[430px]` and `left-1/2 -translate-x-1/2` to stay within the phone-shaped column. Safe area inset handles iPhone notch.

### Pages that show the nav vs pages that don't

- **Show TopNav + BottomNav**: Home, Daily, Leaderboard, Profile, Mode selection
- **Show TopNav only (no BottomNav)**: Login, Signup
- **Show NEITHER (fullscreen)**: Gameplay (the actual blind test player) — this is a fullscreen game experience, no nav distractions

To handle this, use route groups:

```
src/app/
├── (main)/                 ← layout with TopNav + BottomNav
│   ├── layout.tsx
│   ├── page.tsx            ← Home
│   ├── daily/page.tsx
│   ├── leaderboard/page.tsx
│   ├── profile/page.tsx
│   └── modes/page.tsx
├── (auth)/                 ← layout with TopNav only
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (game)/                 ← NO nav, fullscreen
│   ├── layout.tsx          ← empty layout, just {children}
│   └── play/[mode]/page.tsx
└── layout.tsx              ← root layout (html, body, max-w-430px wrapper)
```

### (main) layout

```tsx
// src/app/(main)/layout.tsx
import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { getSession } from '@/lib/auth';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? await getPlayerProfile(session.user.id) : null;

  return (
    <>
      <TopNav user={user ? { username: user.username, streak: user.current_streak } : undefined} />
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
```

### (game) layout — fullscreen, no nav

```tsx
// src/app/(game)/layout.tsx
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

## Step 5: Auth

### Supabase Auth Setup

Use the SAME Supabase auth as kpopquiz.org. Both apps share `auth.users`.

Auth methods:
- Google OAuth (primary — most K-pop fans have Google)
- Email + password (fallback)

### Login Page — `src/app/(auth)/login/page.tsx`

```
┌──────────────────────────────────────────┐
│                                          │
│  kpopblindtest                           │
│                                          │
│  How well do you REALLY know K-pop?      │
│  600+ songs · 45+ groups · free forever  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  Continue with Google            │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── or ──                                │
│                                          │
│  Email: [                          ]     │
│  Password: [                       ]     │
│  [ Sign in ]                             │
│                                          │
│  Don't have an account? Sign up          │
│                                          │
│  ── or ──                                │
│                                          │
│  [ Continue without account ]            │
│  (progress won't be saved)               │
│                                          │
└──────────────────────────────────────────┘
```

The "Continue without account" button skips login and goes straight to the home page. Anonymous users can play but see a signup prompt after 3 games.

### Auth Helpers — `src/lib/auth.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function getSession() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getPlayerProfile(userId: string) {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}
```

### Anonymous Play Tracking

Store a play counter in localStorage:

```typescript
// src/lib/anonymous-play.ts
const PLAY_COUNT_KEY = 'bt_anon_plays';
const SIGNUP_PROMPT_THRESHOLD = 3;

export function getAnonPlayCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(PLAY_COUNT_KEY) || '0', 10);
}

export function incrementAnonPlayCount(): number {
  const count = getAnonPlayCount() + 1;
  localStorage.setItem(PLAY_COUNT_KEY, count.toString());
  return count;
}

export function shouldPromptSignup(): boolean {
  return getAnonPlayCount() >= SIGNUP_PROMPT_THRESHOLD;
}
```

After 3 anonymous games, show a modal:

```
┌──────────────────────────────────────────┐
│                                          │
│  You're on a roll!                       │
│                                          │
│  Sign up to save your progress:          │
│  · Keep your scores and streak           │
│  · Track group mastery levels            │
│  · Earn badges and climb leaderboards    │
│  · Play the daily challenge              │
│                                          │
│  [ Sign up — it's free ]                 │
│                                          │
│  Maybe later                             │
│                                          │
└──────────────────────────────────────────┘
```

"Maybe later" dismisses the modal. It shows again after 3 more games.

---

## Step 6: Vercel Deployment

### Separate deployment for the blindtest app

In Vercel, create a new project pointing to the same GitHub repo but with:
- **Root directory**: `apps/blindtest`
- **Build command**: `npm run build`
- **Output directory**: `.next`

The quiz app's Vercel project stays unchanged with root directory `apps/quiz`.

Both deploy from the same repo but as separate Vercel projects with separate domains.

### Domain

For now, use the Vercel-provided `.vercel.app` domain. A custom domain will be added later.

---

## Step 7: Verify Everything Works

After this prompt:
1. The monorepo structure is set up with apps/quiz and apps/blindtest
2. The quiz app still builds and deploys correctly (nothing broken)
3. The blindtest app has the dark theme, layout shell, nav components
4. Auth works (login, signup, anonymous play)
5. Both apps share the same Supabase project
6. The blindtest app is deployed to Vercel

Run `npm run dev:blindtest` and verify:
- Dark background (#0D0D0F) renders
- TopNav shows "kpopblindtest" logo with pink accent
- BottomNav shows 4 tabs (Home, Daily, Ranks, Profile)
- Login page works (Google OAuth + email)
- Anonymous access works (skip login)
- Home page shows placeholder content

---

## What NOT To Do

- Do NOT break the existing quiz app — test it after the monorepo migration
- Do NOT use any purple colors — the accent is PINK (#ED93B1) everywhere
- Do NOT use light mode — the app is dark mode ONLY (no toggle, no light theme)
- Do NOT make the app wider than 430px — it's a phone-shaped game, always centered
- Do NOT add any gameplay logic yet — this prompt is ONLY the shell
- Do NOT create the database tables yet — that's Prompt 2
- Do NOT add the blind test player yet — that's Prompt 3
- Do NOT install unnecessary dependencies — keep it minimal
- Do NOT use Tailwind's default colors — use ONLY the custom colors defined above
- Do NOT forget safe-area-inset for iPhone notch on the bottom nav
- Do NOT show BottomNav during gameplay — the game screen is fullscreen
