# Prompt 10: Polish, SEO, Signup Prompts, Final Touches

## Overview

The final prompt. This adds the finishing touches that turn a functional app into a polished product: signup prompts for anonymous users, SEO pages for organic traffic, metadata on every page, loading states, error handling, and mobile polish.

---

## Step 1: Anonymous Signup Prompt

After 3 anonymous plays, show a modal:

```tsx
// src/components/shared/signup-prompt-modal.tsx

function SignupPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-bg-secondary rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}>
        <p className="text-lg font-semibold mb-1">You're on a roll!</p>
        <p className="text-sm text-text-secondary mb-4">
          Sign up to save your progress:
        </p>
        <ul className="space-y-2 mb-5">
          {['Keep your scores and streak', 'Track group mastery levels', 'Earn badges and climb leaderboards', 'Play the daily challenge'].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="#97C459" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {item}
            </li>
          ))}
        </ul>
        <Link href="/signup"
          className="block w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold text-center mb-3">
          Sign up — it's free
        </Link>
        <button onClick={onClose} className="block w-full text-center text-xs text-text-tertiary py-2">
          Maybe later
        </button>
      </div>
    </div>
  );
}
```

Trigger logic (in the game component):
```typescript
// After finishGame():
if (!session) {
  const count = incrementAnonPlayCount();
  if (count >= 3 && count % 3 === 0) { // show every 3 games: 3, 6, 9...
    setShowSignupPrompt(true);
  }
}
```

The modal slides up from the bottom (mobile sheet pattern). "Maybe later" dismisses it. It shows again after 3 more anonymous plays.

---

## Step 2: SEO — Static Pages

### Landing page for non-logged-in visitors

The home page already handles anonymous visitors with a generic greeting. But for SEO, we need keyword-rich content below the fold.

Add to the bottom of the home page (hidden for logged-in users):

```tsx
{!player && (
  <section className="mt-8 pt-6 border-t border-border-default">
    <h2 className="text-sm font-semibold mb-2">The best K-pop blind test on the web</h2>
    <p className="text-xs text-text-secondary leading-relaxed mb-3">
      Test your K-pop knowledge with over 600 songs from 45+ groups. From BTS and BLACKPINK to NewJeans and LE SSERAFIM, 
      can you name the song from just a clip? Play free — no app download, no subscription.
    </p>
    <h3 className="text-xs font-semibold mb-1 mt-3">How it works</h3>
    <p className="text-xs text-text-secondary leading-relaxed mb-3">
      Listen to a short clip of a K-pop song. Pick the correct answer from 4 choices. The faster you answer, 
      the more points you earn. Build combos, level up your group mastery, and compete on leaderboards.
    </p>
    <h3 className="text-xs font-semibold mb-1 mt-3">Available groups</h3>
    <p className="text-xs text-text-secondary leading-relaxed">
      BTS, BLACKPINK, Stray Kids, TWICE, EXO, SEVENTEEN, aespa, NewJeans, IVE, LE SSERAFIM, ITZY, 
      (G)I-DLE, Red Velvet, TXT, ENHYPEN, ATEEZ, SHINee, Girls' Generation, BIGBANG, 2NE1, NCT 127, 
      NCT DREAM, MAMAMOO, GOT7, MONSTA X, and many more.
    </p>
  </section>
)}
```

### Per-group SEO pages — `/group/[slug]`

Create a page for each group that shows:
- Group name, song count, top players for this group
- Play button (links to `/play/group-{slug}`)
- SEO-optimized metadata

```tsx
// src/app/(main)/group/[slug]/page.tsx

export async function generateMetadata({ params }): Promise<Metadata> {
  const group = await getGroupBySlug(params.slug);
  if (!group) return {};

  return {
    title: `${group.name} Blind Test — Guess ${group.name} Songs | K-pop Blind Test`,
    description: `Can you name ${group.name} songs from just a clip? ${group.song_count} songs available. Play free.`,
    alternates: { canonical: `/group/${params.slug}` },
  };
}

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const group = await getGroupBySlug(params.slug);
  if (!group) return notFound();

  const songCount = await countGroupSongs(group.id);
  const topPlayers = await getGroupTopPlayers(group.id, 10);

  return (
    <div className="px-5 pt-5 pb-8">
      <p className="text-xl font-semibold mb-1">{group.name}</p>
      <p className="text-[13px] text-text-secondary mb-5">{songCount} songs available</p>

      <Link href={`/play/group-${group.slug}`}
        className="block w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold text-center mb-6">
        Play {group.name} blind test
      </Link>

      {topPlayers.length > 0 && (
        <>
          <SectionLabel>Top {group.name} fans</SectionLabel>
          <MiniLeaderboard players={topPlayers} />
        </>
      )}
    </div>
  );
}
```

### Sitemap

```typescript
// src/app/sitemap.ts

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopblindtest.com';
  const supabase = createServerClient();

  // Static pages
  const staticPages = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/daily`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Mode pages
  const modePages = STATIC_MODES.map(m => ({
    url: `${baseUrl}/play/${m.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Group pages
  const { data: groups } = await supabase
    .from('groups')
    .select('slug');

  const groupPages = (groups ?? []).map(g => ({
    url: `${baseUrl}/group/${g.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...modePages, ...groupPages].map(p => ({
    ...p,
    lastModified: new Date(),
  }));
}
```

### robots.txt

```typescript
// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

---

## Step 3: Loading States

Every page and component needs a loading state. Use skeletons that match the dark theme.

### Skeleton component

```tsx
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-bg-tertiary rounded-lg animate-pulse ${className}`} />;
}
```

### Page loading states

```tsx
// src/app/(main)/loading.tsx
export default function MainLoading() {
  return (
    <div className="px-5 pt-5 pb-8 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
        <Skeleton className="h-32 w-[130px] rounded-[14px]" />
      </div>
    </div>
  );
}
```

### Game loading state

While the round is being generated:

```tsx
{gameState === 'loading' && (
  <div className="flex flex-col items-center justify-center h-[60vh]">
    <div className="w-12 h-12 rounded-full border-2 border-border-default border-t-pink-400 animate-spin mb-4" />
    <p className="text-sm text-text-secondary">Loading your round...</p>
  </div>
)}
```

---

## Step 4: Error Handling

### API error responses

All API routes should return consistent error shapes:

```typescript
return NextResponse.json({ error: 'Human readable message', code: 'ERROR_CODE' }, { status: 400 });
```

### Client-side error handling

```tsx
function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-text-secondary mb-3">{message}</p>
      {retry && (
        <button onClick={retry} className="text-sm text-pink-400 font-medium">
          Try again
        </button>
      )}
    </div>
  );
}
```

### YouTube player error

If the YouTube player fails to load entirely (no internet, blocked):

```tsx
{youtubeError && (
  <div className="text-center py-8">
    <p className="text-sm text-text-secondary mb-2">Couldn't load the audio player</p>
    <p className="text-xs text-text-tertiary mb-4">Check your internet connection or try a different browser</p>
    <button onClick={() => window.location.reload()} className="text-sm text-pink-400 font-medium">
      Reload
    </button>
  </div>
)}
```

---

## Step 5: Mobile Polish

### Viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

`user-scalable=no` prevents double-tap zoom on mobile during gameplay (tapping answer buttons quickly).

### Touch feedback

Answer buttons should have `active:scale-[0.98]` for physical tap feedback:

```tsx
<button className="... active:scale-[0.98] transition-transform">
```

### iOS safe areas

Bottom nav already handles safe-area-inset-bottom. Also add to modals and fullscreen game:

```css
padding-bottom: max(1rem, env(safe-area-inset-bottom));
```

### Prevent scroll during gameplay

```typescript
// In the game component, when gameState is 'playing' or 'reveal':
useEffect(() => {
  if (gameState === 'playing' || gameState === 'reveal') {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
  return () => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  };
}, [gameState]);
```

### PWA basics

Add a `manifest.json` for "Add to Home Screen":

```json
{
  "name": "K-pop Blind Test",
  "short_name": "KBT",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0F",
  "theme_color": "#ED93B1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Step 6: 404 Page

```tsx
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
      <p className="text-5xl font-semibold mb-2">404</p>
      <p className="text-sm text-text-secondary mb-6">This page doesn't exist</p>
      <Link href="/" className="px-6 py-3 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold">
        Go home
      </Link>
    </div>
  );
}
```

---

## Step 7: Settings Page (minimal)

```tsx
// src/app/(main)/settings/page.tsx

export default async function SettingsPage() {
  return (
    <div className="px-5 pt-5 pb-8">
      <p className="text-xl font-semibold mb-5">Settings</p>

      {/* Username change */}
      <div className="mb-5">
        <label className="text-xs text-text-tertiary block mb-1.5">Username</label>
        <UsernameEditor />
      </div>

      {/* Sound effects toggle */}
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm">Sound effects</span>
        <SoundToggle />
      </div>

      {/* Sign out */}
      <button onClick={signOut} className="text-sm text-wrong">
        Sign out
      </button>
    </div>
  );
}
```

---

## What NOT To Do

- Do NOT show the signup prompt to logged-in users
- Do NOT make the signup prompt blocking — always dismissible
- Do NOT forget `user-scalable=no` on viewport meta — critical for game UX
- Do NOT use purple anywhere — pink (#ED93B1) is the only accent
- Do NOT forget loading skeletons — empty screens feel broken
- Do NOT forget to handle YouTube player failure gracefully
- Do NOT make the 404 page use default Next.js styling — match the dark theme
- Do NOT skip the manifest.json — "Add to Home Screen" is how mobile users return
