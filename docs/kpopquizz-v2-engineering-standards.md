# KpopQuizz v2 — Engineering Standards & Build Instructions

> **Read this BEFORE reading the spec. This document defines HOW you build.**
> **The spec (kpopquizz-v2-spec-FINAL.md) defines WHAT you build.**
> **Both documents together are your complete instructions. Follow both at all times.**

---

## YOUR ROLE

You are acting as a **Staff-level Full-Stack Engineer** with 12+ years of experience shipping production web applications at scale. You have deep expertise in Next.js, React, PostgreSQL, and modern web performance. You think like a Google L6/L7 engineer: you consider edge cases before writing code, you optimize for maintainability over cleverness, and you never ship code you wouldn't be proud to show in a code review.

You are NOT a junior developer experimenting. You are NOT a tutorial writer adding comments everywhere. You are a senior IC who writes clean, production-grade code on the first pass.

---

## CORE ENGINEERING PRINCIPLES

### 1. YAGNI (You Aren't Gonna Need It)
- Do NOT build abstractions until the third time you need them
- Do NOT add configuration for things that have one value
- Do NOT create utility functions for one-line operations
- Do NOT add feature flags, A/B testing, or analytics hooks unless the spec explicitly calls for them
- If the spec says "do NOT build this" — pretend it doesn't exist. No stubs, no placeholders, no "ready for future" code.

### 2. Boring Technology Wins
- Use the simplest solution that works correctly
- Prefer native browser APIs over libraries (e.g., `IntersectionObserver` over `react-intersection-observer`)
- Prefer CSS over JavaScript for visual effects
- Prefer server components over client components
- Prefer static generation over server rendering over client rendering
- Do NOT install packages for things you can write in 20 lines of code

### 3. Fail Loudly, Recover Gracefully
- Every async operation must have error handling
- Every database query must handle the "no rows returned" case
- Every API endpoint must validate input before processing
- Every user-facing error must show a helpful message (via toast or inline)
- Never swallow errors silently. Log them server-side, show them client-side.

### 4. Performance Is Not Optional
- Every page must score 90+ on Lighthouse (Performance, Accessibility, Best Practices, SEO)
- Every database query must use an index (check the schema for existing indexes before writing queries)
- Every image must use `next/image` with explicit width/height
- Every client component must be lazy-loaded if it's below the fold
- Bundle size budget: initial JS < 150KB. Check with `next build` output.

### 5. Security Is Not Optional
- Never trust client input. Validate everything server-side, even if you validated client-side
- Never expose secrets, database credentials, or service role keys to the client
- Never use `dangerouslySetInnerHTML` unless the content is sanitized
- Never construct SQL queries with string concatenation — always use parameterized queries
- Always check auth session server-side in API routes, never trust a client-sent user ID
- RLS is your last line of defense, not your only line

---

## CODE QUALITY STANDARDS

### TypeScript Rules

```jsonc
// tsconfig.json — these MUST be enabled
{
  "compilerOptions": {
    "strict": true,                    // enables all strict checks
    "noUncheckedIndexedAccess": true,  // array[0] returns T | undefined
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Type rules:**
- NEVER use `any`. If you're tempted, use `unknown` and narrow with type guards.
- NEVER use `as` type assertions except when interfacing with untyped third-party libs. Prefer type guards.
- NEVER use `!` non-null assertions. Handle the null/undefined case explicitly.
- ALWAYS define return types on exported functions. Internal helpers can rely on inference.
- ALWAYS define prop types as interfaces (not inline types) for React components.
- ALWAYS export types from a central `types.ts` when shared across 2+ files.
- Prefer `interface` over `type` for object shapes. Use `type` for unions and computed types.
- Prefer `const` assertions for literal arrays and objects that shouldn't be mutated.

**Example — the right way:**
```typescript
// ✅ Good: explicit types, no assertions, handles null
interface QuizCardProps {
  quiz: QuizWithGroup;
}

export function QuizCard({ quiz }: QuizCardProps): React.ReactElement {
  const avgScore = quiz.total_completions > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / quiz.question_count * 100)
    : null;

  return (
    <div>{avgScore !== null ? `${avgScore}%` : 'New'}</div>
  );
}
```

**Example — the wrong way:**
```typescript
// ❌ Bad: any types, assertions, no null handling
export function QuizCard({ quiz }: any) {
  const avgScore = Math.round((quiz.total_score_sum / quiz.total_completions) / quiz.question_count * 100);
  return <div>{avgScore}%</div>; // crashes when total_completions is 0
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | kebab-case | `quiz-card.tsx` |
| Files (utils/lib) | kebab-case | `format-count.ts` |
| Files (types) | kebab-case | `types.ts` |
| React components | PascalCase | `QuizCard` |
| Functions | camelCase | `formatCount` |
| Variables | camelCase | `quizData` |
| Constants | SCREAMING_SNAKE_CASE | `AVATAR_COLORS` |
| CSS variables | kebab-case with -- prefix | `--bg-primary` |
| Database tables | snake_case | `quiz_plays` |
| Database columns | snake_case | `play_count` |
| API routes | kebab-case | `/api/quiz/create` |
| URL slugs | kebab-case | `only-real-blinks-can-pass` |
| Env variables | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |
| TypeScript interfaces | PascalCase, no "I" prefix | `QuizWithGroup` (not `IQuizWithGroup`) |
| TypeScript enums | DO NOT USE | Use `as const` objects or union types instead |

### File Organization Rules

- One component per file. No exceptions.
- Co-locate related files. If `quiz-player.tsx` needs a helper, put it in the same directory, not in a global utils folder.
- Keep files under 300 lines. If a component exceeds 300 lines, extract sub-components.
- Index files (`index.ts`) are allowed ONLY for re-exporting from a directory. Never put logic in index files.
- Test files go next to the file they test: `quiz-card.tsx` → `quiz-card.test.tsx` (but don't write tests unless asked — they're not in scope for MVP).

### Import Order

Enforce this order (separate groups with a blank line):

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// 2. Third-party libraries
import { createBrowserClient } from '@supabase/ssr';

// 3. Internal libs/utils
import { formatCount } from '@/lib/utils';
import { getQuizzes } from '@/lib/db/queries/quizzes';

// 4. Internal components
import { QuizCard } from '@/components/quiz/quiz-card';
import { Spinner } from '@/components/ui/spinner';

// 5. Types (type-only imports)
import type { QuizWithGroup } from '@/lib/db/types';

// 6. Styles (rare — only if importing CSS modules)
import styles from './styles.module.css';
```

Use the `@/` path alias for all internal imports. Configure in `tsconfig.json`:
```json
{ "paths": { "@/*": ["./src/*"] } }
```

---

## REACT & NEXT.JS PATTERNS

### Server vs Client Components

**Default to Server Components.** Only add `'use client'` when the component NEEDS:
- `useState`, `useReducer`, `useEffect`, `useRef` with DOM manipulation
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `navigator`, `localStorage`)
- Third-party client-only libraries

**Pattern: Server parent, client child.** Keep the server component as the data-fetching shell:

```typescript
// ✅ Good: server component fetches data, passes to client child
// app/q/[slug]/page.tsx (SERVER)
import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { QuizPlayer } from '@/components/quiz/quiz-player';

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const quiz = await getQuizBySlug(params.slug);
  if (!quiz) return notFound();

  return <QuizPlayer quiz={quiz} />;
}

// components/quiz/quiz-player.tsx (CLIENT)
'use client';
// ... interactive quiz logic
```

```typescript
// ❌ Bad: entire page is a client component, fetches its own data
'use client';
export default function QuizPage() {
  const [quiz, setQuiz] = useState(null);
  useEffect(() => { fetch('/api/quiz/...').then(...) }, []);
  // ...
}
```

### State Management

- Use `useState` for local component state
- Use `useReducer` for complex state with multiple related values (e.g., the quiz player state machine)
- Do NOT install Redux, Zustand, Jotai, or any state management library
- For state shared between components: lift state up to the nearest common parent, pass via props
- The only context provider allowed is the Toast context (specified in the spec)

**Quiz player state machine** — use a reducer, not multiple useState calls:

```typescript
type QuizState =
  | { phase: 'intro' }
  | { phase: 'playing'; questionIndex: number; score: number; answers: number[]; timeRemaining: number }
  | { phase: 'answered'; questionIndex: number; score: number; answers: number[]; selectedAnswer: number; isCorrect: boolean }
  | { phase: 'result'; score: number; totalQuestions: number; percentile: number | null };

type QuizAction =
  | { type: 'START'; questions: Question[] }
  | { type: 'ANSWER'; selectedAnswer: number }
  | { type: 'NEXT_QUESTION' }
  | { type: 'TIMEOUT' }
  | { type: 'SHOW_RESULT'; percentile: number | null }
  | { type: 'TICK' }
  | { type: 'RESET' };
```

This pattern makes the quiz flow predictable and debuggable. Every state transition is explicit.

### Data Fetching Patterns

**Server components** — fetch directly in the component:
```typescript
// ✅ Direct database query in server component
export default async function GroupPage({ params }: Props) {
  const group = await getGroupBySlug(params.slug);
  const quizzes = await getQuizzesByGroup(group.id, { limit: 10, offset: 0 });
  return <GroupPageContent group={group} initialQuizzes={quizzes} />;
}
```

**Client components** — fetch via API routes:
```typescript
// ✅ Client fetches from API route
const loadMoreQuizzes = async () => {
  setLoading(true);
  try {
    const res = await fetch(`/api/quizzes?tab=${tab}&cursor=${cursor}`);
    if (!res.ok) throw new Error('Failed to load quizzes');
    const data = await res.json();
    setQuizzes(prev => [...prev, ...data.quizzes]);
    setCursor(data.nextCursor);
  } catch (err) {
    showToast('Failed to load quizzes', 'error');
  } finally {
    setLoading(false);
  }
};
```

**NEVER do this:**
```typescript
// ❌ Never call Supabase directly from client components
'use client';
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(...);
const { data } = await supabase.from('quizzes').select('*'); // WRONG — bypasses API validation
```

The only Supabase client-side calls allowed are for **auth operations** (signIn, signOut, getSession, onAuthStateChange).

### Error Handling in Components

```typescript
// ✅ Good: handle loading, error, and empty states explicitly
export function QuizFeed({ initialQuizzes }: Props) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (error) return <ErrorMessage message={error} />;
  if (quizzes.length === 0 && !loading) return <EmptyState />;

  return (
    <>
      {quizzes.map(q => <QuizCard key={q.id} quiz={q} />)}
      {loading && <Spinner />}
    </>
  );
}
```

### Avoid These Anti-patterns

```typescript
// ❌ useEffect for data fetching in components that could be server components
useEffect(() => { fetchData() }, []);

// ❌ Prop drilling through 4+ levels — restructure instead
<A data={x}><B data={x}><C data={x}><D data={x} /></C></B></A>

// ❌ Inline functions in JSX that are complex (extract them)
<button onClick={() => { setX(1); doY(); if (z) doW(); }}>Click</button>

// ❌ State for derived values — compute from existing state instead
const [percentage, setPercentage] = useState(0); // DON'T
const percentage = total > 0 ? Math.round(score / total * 100) : 0; // DO

// ❌ Index as key in lists that can be reordered or filtered
{quizzes.map((q, i) => <QuizCard key={i} quiz={q} />)} // DON'T
{quizzes.map(q => <QuizCard key={q.id} quiz={q} />)} // DO

// ❌ Conditional hooks (React rules violation)
if (isLoggedIn) { const [x, setX] = useState(0); } // ILLEGAL

// ❌ Multiple re-renders — batch state updates
setLoading(true);
setError(null);
setData(newData);
// In React 18+ these batch automatically in event handlers,
// but in async callbacks use: React.startTransition or combine into one setState
```

---

## DATABASE & API PATTERNS

### Query Function Structure

All database queries go in `src/lib/db/queries/*.ts`. Each function:
1. Accepts typed parameters
2. Returns a typed result
3. Handles errors
4. Uses the Supabase server client (passed as param or created internally)

```typescript
// ✅ Good query function pattern
import { createServerClient } from '@/lib/supabase/server';
import type { QuizWithGroup } from '@/lib/db/types';

export async function getQuizBySlug(slug: string): Promise<QuizWithGroup | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      groups!inner (name, slug, display_color, text_color, fandom_name),
      profiles!inner (username, avatar_bg, avatar_text)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Failed to fetch quiz: ${error.message}`);
  }

  return data as QuizWithGroup;
}
```

### API Route Structure

Every API route follows this exact pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. AUTH CHECK (if required)
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. PARSE & VALIDATE INPUT
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateCreateQuizInput(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation error', details: validation.errors },
      { status: 400 }
    );
  }

  // 3. BUSINESS LOGIC
  try {
    const result = await createQuiz(validation.data, session.user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('Failed to create quiz:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Rules:**
- ALWAYS parse body in a try/catch (malformed JSON crashes the server)
- ALWAYS validate before processing
- ALWAYS return proper status codes (200, 201, 400, 401, 404, 500)
- ALWAYS log errors server-side with `console.error`
- NEVER return stack traces or internal error details to the client
- NEVER return 200 with an error message in the body — use proper status codes

### Validation

Write validation functions manually. Do NOT install Zod, Yup, or Joi for this project — it adds unnecessary bundle size for the few endpoints we have.

```typescript
// ✅ Simple validation pattern
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

function validateCreateQuizInput(input: unknown): ValidationResult<CreateQuizInput> {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { success: false, errors: ['Invalid input'] };
  }

  const obj = input as Record<string, unknown>;

  // Title
  if (typeof obj.title !== 'string' || obj.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }
  if (typeof obj.title === 'string' && obj.title.length > 100) {
    errors.push('Title must be at most 100 characters');
  }

  // Questions
  if (!Array.isArray(obj.questions)) {
    errors.push('Questions must be an array');
  } else {
    if (obj.questions.length < 5) errors.push('Minimum 5 questions required');
    if (obj.questions.length > 20) errors.push('Maximum 20 questions allowed');
    // ... validate each question
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: obj as CreateQuizInput };
}
```

---

## CSS & STYLING RULES

### Tailwind Discipline

- ALWAYS use Tailwind utility classes. Do NOT write custom CSS except for:
  - CSS variables (in `globals.css`)
  - Keyframe animations (in `globals.css`)
  - The scrollbar-hide utility
- NEVER use `@apply` — it defeats the purpose of utility-first CSS
- NEVER use inline `style={{}}` except for dynamic values that can't be Tailwind classes (e.g., `style={{ backgroundColor: group.display_color }}`)
- NEVER add Tailwind classes that do nothing (e.g., `flex` on a `div` with only one child)
- Use consistent ordering: layout → sizing → spacing → typography → colors → borders → effects → transitions
  - Example: `flex items-center gap-2 w-full px-4 py-2 text-sm text-txt-secondary bg-surface-primary border border-border-light rounded-md hover:border-border-medium transition-colors`

### Responsive Design Rules

- Mobile-first: write base styles for 375px width. Add `sm:` prefix for 640px+ adjustments.
- Only TWO breakpoints matter: default (mobile) and `sm:` (desktop). Do NOT use `md:`, `lg:`, `xl:` unless absolutely necessary.
- Test every component at 375px, 640px, and 1440px widths.
- Never use fixed widths on content elements (except max-width on the page container).
- Never use horizontal scroll on page-level content (tab bars are the one exception).
- Images and cards must fill available width on mobile.

### Accessibility Minimums

- Every `<img>` must have `alt` text (or `alt=""` if decorative)
- Every `<button>` must have visible text or `aria-label`
- Every `<input>` must have an associated `<label>` (can be visually hidden with `sr-only`)
- Color contrast must be at least 4.5:1 for normal text, 3:1 for large text (our color system already ensures this — don't override it)
- Focus states must be visible on all interactive elements (Tailwind's default `focus:ring` is fine)
- Tab order must be logical (follows visual order — don't use `tabindex` except `tabindex="-1"` for programmatic focus)
- The quiz player must be fully usable with keyboard only (arrow keys not needed, but Tab + Enter must work)

---

## GIT & WORKFLOW

### Commit Convention

Use Conventional Commits:

```
feat: add quiz player component
fix: handle zero completions in avg score calculation
refactor: extract answer button into separate component
style: fix quiz card padding on mobile
chore: add supabase migration for groups seed data
```

Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `perf`

- One logical change per commit
- Commits should be atomic — the app should build and run after every commit
- Never commit `.env.local`, `node_modules`, or `.next`

### Build Order (follow strictly)

Build the project in this exact sequence. Complete each phase before moving to the next. Each phase should result in a working, deployable state.

**Phase 1: Foundation**
1. Initialize Next.js project with TypeScript, Tailwind, pnpm
2. Configure `tsconfig.json` with strict settings
3. Configure `tailwind.config.ts` with custom theme (fonts, colors, border radius)
4. Create `globals.css` with CSS variables and animation keyframes
5. Set up Supabase client utilities (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
6. Create the root layout (`layout.tsx`) with font loading, metadata, nav, footer
7. Run `pnpm build` — must succeed with zero errors

**Phase 2: Database**
8. Write and run all migration SQL files (schema, functions, triggers, RLS, seed)
9. Create TypeScript types matching the DB schema (`lib/db/types.ts`)
10. Create utility functions (`lib/utils.ts`)
11. Create query functions (`lib/db/queries/*.ts`)
12. Verify: queries compile, types are correct

**Phase 3: Auth**
13. Build the login page
14. Build the OAuth callback route handler
15. Build the onboarding page (username selection)
16. Build the middleware (auth redirects)
17. Build the `check-username` and `create-profile` API routes
18. Build the navbar with auth state (avatar dropdown, sign in link)
19. **Test end-to-end**: Sign in with Google → onboarding → see avatar in nav → sign out

**Phase 4: Quiz Player (MOST IMPORTANT)**
20. Build all quiz sub-components: answer-button, timer-circle, progress-bar, feedback-box, difficulty-badge
21. Build the quiz player component (3-state machine: intro → playing → result)
22. Build the `/api/quiz/[id]/questions` endpoint
23. Build the `/api/quiz/[id]/play` endpoint
24. Build the quiz player page (`/q/[slug]`)
25. Build the report form component
26. Build the `/api/quiz/[id]/report` endpoint
27. **Test end-to-end**: Navigate to a quiz → start → answer all questions → see results → share → report → try again

**Phase 5: Quiz Creator**
28. Build the quiz creator component (4-step wizard)
29. Build the `/api/quiz/create` endpoint
30. Build the creator page (`/create`)
31. **Test end-to-end**: Log in → create → fill all steps → publish → see confirmation → quiz appears on site

**Phase 6: Homepage**
32. Build the quiz card component
33. Build the group pill component
34. Build the user avatar component
35. Build the tab bar component
36. Build the quiz feed (client component with tab switching + infinite scroll)
37. Build the Quiz of the Day component
38. Build the creator leaderboard component
39. Build the create CTA component
40. Assemble the homepage
41. **Test**: All tabs work, infinite scroll works, QOTD shows when set

**Phase 7: Secondary Pages**
42. Build group pages (`/group/[slug]`)
43. Build profile pages (`/u/[username]`)
44. Build trending page (`/trending`)
45. Build new page (`/new`)
46. Build admin page (`/admin`)

**Phase 8: SEO & Polish**
47. Build OG image generation (`/api/og/[slug]`)
48. Add sitemap.ts
49. Add robots.ts
50. Add JSON-LD schema markup to quiz pages, group pages
51. Add proper `<title>` and `<meta>` tags to every page
52. Build 404 page
53. Build error page
54. Build toast notification system
55. Add loading states to all pages
56. Set up redirect middleware for old URLs
57. **Run Lighthouse on every page — fix until all scores are 90+**

**Phase 9: Final QA**
58. Test every item on the Launch Checklist (section 19 of the spec)
59. `pnpm build` must succeed with zero warnings
60. Deploy to Vercel, test production build

---

## SELF-REVIEW CHECKLIST

Before considering ANY component or page complete, run through this checklist mentally:

### Functionality
- [ ] Does it handle the happy path correctly?
- [ ] Does it handle empty data? (zero quizzes, zero plays, new user with no content)
- [ ] Does it handle error responses? (network failure, 500, 404)
- [ ] Does it handle loading states? (show spinner while data loads)
- [ ] Does it handle edge cases? (very long text, very short text, special characters in names, zero-division)
- [ ] Are all interactive elements (buttons, links, inputs) working?
- [ ] Does the auth state affect this page? (logged in vs anonymous — test both)

### Code Quality
- [ ] TypeScript strict mode passes with zero errors?
- [ ] No `any` types?
- [ ] No unused imports or variables?
- [ ] Component under 300 lines?
- [ ] Proper error handling on every async call?
- [ ] No hardcoded strings that should be constants?
- [ ] Using proper semantic HTML elements? (`<button>` for actions, `<a>` for links, `<h1>`-`<h6>` for headings)

### Visual
- [ ] Looks correct at 375px width? (pull up mobile view, scroll through entire page)
- [ ] Looks correct at 1440px width?
- [ ] No horizontal overflow at any width?
- [ ] Colors match the spec exactly? (don't approximate — check hex values)
- [ ] Spacing matches the spec? (check padding, margin, gap values)
- [ ] Typography matches? (font sizes, weights, colors)
- [ ] No visual glitches during animations or transitions?
- [ ] Hover states work on all interactive elements?
- [ ] Focus states are visible for keyboard users?

### Performance
- [ ] Using server component where possible?
- [ ] Client component is code-split (not imported directly into server layouts)?
- [ ] Images use `next/image`?
- [ ] No unnecessary re-renders? (check: does the component re-render when it shouldn't?)
- [ ] Database queries use indexes? (check the schema — every WHERE/ORDER BY column should be indexed)

---

## COMMON PITFALLS TO AVOID

These are specific technical traps that catch even experienced developers:

### Next.js Pitfalls
1. **Dynamic params in generateMetadata**: `params` is a Promise in Next.js 15. Await it: `const { slug } = await params;`
2. **Client component imports in server components**: If a server component imports a client component that imports another client component, the entire subtree becomes client. Keep boundaries clean.
3. **Route handler caching**: GET route handlers are cached by default in production. Add `export const dynamic = 'force-dynamic';` if the data changes frequently.
4. **Supabase SSR cookies**: Use `@supabase/ssr` package, not `@supabase/auth-helpers-nextjs` (deprecated). Handle cookie setting in middleware.
5. **Metadata in client components**: You cannot export `metadata` or `generateMetadata` from a `'use client'` page. Keep the page as a server component, extract the interactive part into a client child.

### React Pitfalls
1. **Stale closures in intervals**: The timer in the quiz player MUST use `useRef` for the current time value, not `useState` inside `setInterval`. State inside intervals captures the value at creation time.
```typescript
// ✅ Correct timer pattern
const timeRef = useRef(15);
const [displayTime, setDisplayTime] = useState(15);

useEffect(() => {
  const interval = setInterval(() => {
    timeRef.current -= 1;
    setDisplayTime(timeRef.current);
    if (timeRef.current <= 0) {
      clearInterval(interval);
      handleTimeout();
    }
  }, 1000);
  return () => clearInterval(interval);
}, [questionIndex]); // restart timer on new question
```

2. **Key prop for animation reset**: To replay the question entrance animation, use the question index as the key on the animated container:
```tsx
<div key={questionIndex} className="animate-question-in">
  {/* question content */}
</div>
```

3. **Hydration mismatches**: Never use `Date.now()`, `Math.random()`, or `window.*` in the initial render of server-rendered components. Defer to `useEffect`.

### Supabase Pitfalls
1. **RLS blocks service role**: RLS policies apply to all clients EXCEPT the service role client. The `record_play` function uses `SECURITY DEFINER`, which runs as the function owner (superuser), bypassing RLS. This is intentional.
2. **`.single()` throws on no results**: If no row matches, `.single()` returns an error with code `PGRST116`. Handle it as "not found", not as a server error.
3. **Auth session in API routes**: Always call `supabase.auth.getSession()` in API routes, not `getUser()`. `getSession()` reads from the cookie without a network call. `getUser()` makes an API call to Supabase on every request.

### Performance Pitfalls
1. **Re-fetching on tab switch**: The homepage quiz feed should cache results per tab in state. Switching from "Trending" to "New" and back should NOT re-fetch "Trending" data.
2. **Quiz questions fetch**: Only fetch once per quiz play. Store in state. Don't re-fetch on retry — just reset the quiz state.
3. **Avatar color computation**: This should happen once (at profile creation time) and be stored in the DB. Don't compute it on every render.

---

## PACKAGE DEPENDENCIES

Install ONLY these packages. Do NOT add anything else without explicit justification.

```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "@vercel/og": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/react": "latest",
    "@types/node": "latest",
    "tailwindcss": "latest",
    "postcss": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest"
  }
}
```

**That's it. 8 dependencies, 7 dev dependencies.** This project does not need:
- ❌ State management (Redux, Zustand, Jotai)
- ❌ Form libraries (React Hook Form, Formik)
- ❌ Validation libraries (Zod, Yup, Joi)
- ❌ Animation libraries (Framer Motion, GSAP)
- ❌ CSS-in-JS (Styled Components, Emotion)
- ❌ UI component libraries (Radix, Shadcn, MUI)
- ❌ Date libraries (dayjs, date-fns, moment)
- ❌ HTTP clients (axios)
- ❌ Query libraries (React Query, SWR)
- ❌ Testing libraries (for MVP)
- ❌ Linting extras (Prettier — use ESLint only)

If you need to format a date, write a 5-line function. If you need a modal, write a 20-line component. Do NOT install a package for it.

---

## PROMPT TO START

Paste this into Claude Code as your first instruction:

```
Read these two files completely before writing any code:
1. kpopquizz-v2-spec-FINAL.md — defines WHAT to build
2. kpopquizz-v2-engineering-standards.md — defines HOW to build

Follow the Build Order in the engineering standards document (Phase 1 through Phase 9).
Start with Phase 1: project initialization. After each phase, confirm the app builds
and runs before proceeding to the next phase.

Rules:
- Follow both documents exactly. Do not add features not specified.
- Do not install packages not listed in the engineering standards.
- Use server components by default. Only add 'use client' when necessary.
- Light mode only. No dark mode code.
- Mobile-first (375px). Only use 'sm:' breakpoint for desktop adjustments.
- Run 'pnpm build' after completing each phase to verify zero errors.
- The quiz player page is priority #1. Make it perfect.
```
