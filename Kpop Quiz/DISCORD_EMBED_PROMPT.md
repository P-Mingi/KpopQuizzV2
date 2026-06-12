# Prompt: Embed / promote our Discord community on kpopquiz.org

Copy everything below the line into a new conversation. Fill in the two
`<FILL IN>` values first (a permanent invite link, and whether the Server Widget
is enabled). The rest is ready to go.

---

## Context
I run **kpopquiz.org**, a K-pop quiz web app (daily Quiz-of-the-Day, blindtests,
1v1 battles, leaderboards). It's a **Next.js (App Router) + TypeScript** app on
**Vercel**, data in **Supabase**. Brand: soft pink **`#e8457a`**, a cute black
**rabbit mascot** (sparkly, slightly chaotic, kawaii). The site is fast and
SEO-sensitive, so I care about performance, no layout shift, and mobile.

I just launched a **Discord community server** ("Kpop Quiz") and I want to
**embed / promote it on the website** in a way that actually drives joins and
feels native to the brand, not a bolted-on iframe.

**Discord facts:**
- Server name: **Kpop Quiz** · Guild ID: `1514908800505872465`
- Permanent invite link: `<FILL IN — e.g. https://discord.gg/xxxx, set to never expire>`
- Server Widget enabled? `<FILL IN — yes/no>` (Server Settings → Widget). If yes,
  `https://discord.com/api/guilds/1514908800505872465/widget.json` returns live
  online count + a join link.
- The server has: a daily quiz posted in-channel, KMQ blindtest games, 88
  self-assignable bias-group roles, onboarding, and AutoMod.

## What I want from you
1. **Compare the realistic options** for surfacing the Discord on the site, with
   honest trade-offs (perf, privacy, maintenance, how "alive" it feels):
   - Discord's official **Server Widget** iframe.
   - A **custom branded component** that fetches `widget.json` for the live
     online/member count + a styled "Join the Discord" CTA (no iframe).
   - **WidgetBot** (or similar) for a live-chat embed.
   - A dedicated **`/community` page** vs a homepage/footer CTA vs a floating button.
2. **Recommend one** primary approach (plus where it should live on the site) and
   say why, given my stack and that I want joins + low maintenance.
3. **Implement it** as a reusable Next.js App Router component:
   - Server-side fetch of `widget.json` (cached, e.g. `revalidate` ~60s) with a
     graceful fallback if the widget is disabled or the request fails.
   - On-brand styling (pink `#e8457a`, mascot, rounded, dark-mode aware), showing
     live online count + member count if available, and a prominent join CTA.
   - Accessible, responsive, zero layout shift, no blocking the main thread.
4. Note any **Discord settings** I must change (enable the Widget, create a
   non-expiring invite, allow the widget's invite channel).

## Constraints / preferences
- Next.js App Router + TypeScript; match the existing component and styling
  conventions in `apps/quiz/src`.
- Keep it light: prefer a custom component over a heavy third-party iframe unless
  live chat is clearly worth it.
- Don't leak anything sensitive; only use the public widget endpoint + invite.
- Mobile-first, dark-mode aware, no CLS, lazy where sensible.

## Deliverables
- A short recommendation write-up (options table + your pick + reasoning).
- The component code + where to mount it (file paths).
- The list of Discord-side settings to flip.
