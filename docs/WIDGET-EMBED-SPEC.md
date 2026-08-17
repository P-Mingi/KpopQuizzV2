# Embeddable Quiz Widget Spec (off-site SEO / backlinks)

Status: spec, ready for Claude Code. Owner: SEO/growth. Relates to
`SEO-AUDIT-2026-06-11.md` (Section 6) and `SEO-OUTREACH-PLAYBOOK.md`.

Copy rule: no em dashes and no en dashes anywhere (UI copy, code comments,
attribution text). Use plain hyphens, colons, periods, middots.

---

## 1. Why we are building this

Outreach (blogs, kpop shops like nolae.eu, creators) converts far better when we
hand partners a finished tool instead of asking them to do work. An embeddable
quiz widget lets any site drop a kpopquiz quiz at the end of an article with one
paste. For us, every embed is a placement that:

1. Sends referral traffic and brand searches (the signal the audit says we need).
2. Carries a real backlink, IF we include a visible normal link in the embed.

Critical SEO fact: an `<iframe src>` passes almost no link equity by itself. The
backlink that counts must be a visible HTML `<a href="https://kpopquiz.org/...">`
rendered by the paste snippet, OUTSIDE the iframe, in the partner's page DOM. The
spec below makes that link mandatory and non-removable-by-accident.

## 2. Scope

In scope:
- A public, frameable, lightweight render of a single quiz at `/embed/q/[slug]`.
- An auto-resize handshake so the iframe has no internal scrollbar and no clipping.
- Light theming so the widget can blend into a partner site.
- A copy-paste embed snippet that always includes the dofollow attribution link.
- A simple generator page to produce that snippet per quiz.
- Per-partner attribution (UTM + optional partner tag) so we can measure each
  placement in GSC and analytics.

Out of scope (later):
- Embedding full game modes (blind test, battle). Quizzes first.
- Account/login inside the iframe. The embed is play-as-guest only.
- WordPress/Shopify plugins. A raw HTML snippet covers Shopify (nolae) and most
  CMSes already.

## 3. Constraints from current architecture (read before coding)

These come from the project history and must be respected or the route breaks or
takes the site down:

1. KNOWN_ROUTES middleware gotcha. `apps/quiz/src/lib/supabase/middleware.ts`
   301-redirects any path not in `KNOWN_ROUTES` to `/`. The new `/embed/*` paths
   MUST be added to `KNOWN_ROUTES` (as a prefix match) or every embed 301s to home.
2. DB fragility (NANO, Incident 2). Embeds will be crawled and hit at volume. The
   embed route MUST be static or ISR with prerendered top-N slugs and a cookie-free
   read client (`createPublicReadClient`), never a cold per-hit DB query. Reuse the
   same `generateStaticParams` + ISR pattern already applied to `/q/[slug]`.
3. Framing headers. The site likely sends security headers. The embed route must
   allow cross-origin framing (see Section 7). The rest of the site should keep its
   normal anti-clickjacking posture. Scope the relaxed header to `/embed/*` only.
4. Middleware must not run Supabase on `/embed/*` (public path, like the existing
   public-path early return). No auth on embeds.

## 4. Route and rendering

New route: `apps/quiz/src/app/embed/q/[slug]/page.tsx`.

- Own minimal layout `apps/quiz/src/app/embed/layout.tsx` that does NOT render
  `<TopNav>`, `<Footer>`, `<MobileTabBar>`. Just the quiz body on a transparent or
  theardable background. This keeps the iframe small and chrome-free.
- Reuse the existing quiz fetch (`getQuizBySlug`) via `createPublicReadClient`
  (cookie-free) so the route stays static/ISR-eligible.
- `export const revalidate = 3600;` and `generateStaticParams` returning the top N
  published slugs (mirror `/q/[slug]`, same cap), so crawls hit static HTML.
- Render the quiz in a compact, self-contained player. The existing `QuizPlayer`
  may be reusable if it has no hard dependency on the global layout or auth. If it
  does, create a trimmed `EmbedQuizPlayer` that shares the play logic but drops
  nav/social/profile chrome.
- `notFound()` if the slug is missing or unpublished.
- Always render, inside the iframe body, a small footer link back to the full quiz
  (secondary to the required external attribution link in Section 6):
  `<a href="https://kpopquiz.org/q/{slug}?utm_source=embed&utm_medium=iframe" target="_blank" rel="noopener">Play the full quiz on kpopquiz.org</a>`.

Metadata for the embed route: set `robots: { index: false, follow: true }`. We do
NOT want the bare `/embed/q/[slug]` URL competing with the canonical `/q/[slug]`
in the index, but we DO want links followed. Add `alternates: { canonical:
'https://kpopquiz.org/q/{slug}' }` pointing at the real page.

## 5. Auto-resize handshake

Goal: no scrollbar inside the iframe, no clipped content, no fixed guessed height.

Mechanism: postMessage from child (embed page) to parent (partner page).

Child (inside the embed page): after render and on every height change (use a
`ResizeObserver` on the document body), post the height:

```js
function postHeight() {
  const h = document.documentElement.scrollHeight;
  parent.postMessage({ type: 'kpopquiz:resize', height: h }, '*');
}
new ResizeObserver(postHeight).observe(document.body);
window.addEventListener('load', postHeight);
```

Parent (inside the paste snippet): listen and set the iframe height. Verify the
message origin is `https://kpopquiz.org`:

```js
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://kpopquiz.org') return;
  if (e.data && e.data.type === 'kpopquiz:resize') {
    var f = document.getElementById('kpopquiz-embed');
    if (f) f.style.height = e.data.height + 'px';
  }
});
```

Do not pull a third-party resizer library into the partner snippet. Keep the
snippet dependency-free and tiny.

## 6. The paste snippet (what partners copy) and the required backlink

This is the exact block the generator outputs. The visible `<a>` above the iframe
is the SEO backlink and must always be present. Keep it short and natural.

```html
<!-- kpopquiz.org quiz embed -->
<div class="kpopquiz-embed-wrap" style="max-width:680px;margin:24px auto;">
  <p style="font:14px/1.4 sans-serif;margin:0 0 8px;">
    Quiz: <a href="https://kpopquiz.org/q/SLUG?utm_source=PARTNER&utm_medium=embed&utm_campaign=widget">
    TITLE on kpopquiz.org</a>
  </p>
  <iframe
    id="kpopquiz-embed"
    src="https://kpopquiz.org/embed/q/SLUG?partner=PARTNER&theme=light"
    title="TITLE - K-pop quiz"
    loading="lazy"
    style="width:100%;border:0;display:block;"
    referrerpolicy="no-referrer-when-downgrade"></iframe>
  <script>
    window.addEventListener('message',function(e){
      if(e.origin!=='https://kpopquiz.org')return;
      if(e.data&&e.data.type==='kpopquiz:resize'){
        var f=document.getElementById('kpopquiz-embed');
        if(f)f.style.height=e.data.height+'px';
      }
    });
  </script>
</div>
```

Placeholders replaced by the generator: `SLUG`, `TITLE`, `PARTNER` (a short slug
per partner, for example `nolae`).

Notes:
- The visible link uses descriptive anchor text (the quiz title plus "on
  kpopquiz.org"), not exact-match keyword spam. Natural and safe.
- `utm_*` lets us see partner referral traffic in analytics. `partner=` on the
  iframe lets the embed page log which site rendered it.
- If a partner strips the script (some CMSes do), the iframe still works with a
  sensible fallback height (Section 8), and the backlink still stands because it is
  separate from the script.

## 7. Framing and security headers

The embed route must be allowed in cross-origin iframes; the rest of the site
should not change.

- For `/embed/*` only, send `Content-Security-Policy: frame-ancestors *` (or an
  allowlist of partner domains if we prefer control). Do NOT send
  `X-Frame-Options: DENY/SAMEORIGIN` on these paths.
- Implement via `next.config.ts` `headers()` scoped to `source: '/embed/:path*'`,
  or set them in the embed layout/route. Keep global anti-clickjacking headers on
  all other routes.
- The embed page reads no cookies and exposes no user data, so framing it is safe.
- Sandbox is applied by partners if they wish; we should function under a
  reasonable `sandbox="allow-scripts allow-same-origin allow-popups"`.

## 8. Theming

Keep it simple and query-driven so no partner JS is needed:

- `?theme=light|dark` sets the base palette. Default light.
- Optional `?accent=ec4899` (hex without `#`) overrides the brand accent so the
  widget can match a partner. Validate it is a 3 or 6 char hex; ignore otherwise.
- Background defaults to transparent so it blends into the partner page; `?bg=...`
  optional.
- No layout shift: reserve space, set a sensible min-height (for example 420px)
  before the resize message lands, so CWV/CLS on the partner page stays clean.

## 9. Attribution and analytics

- `partner=` on the embed URL: log it (lightweight, fire-and-forget) so we can
  count embeds per partner. Do not block render on logging.
- `utm_source/medium/campaign` on the outbound links: visible in our analytics and
  useful for GSC referral context.
- Optionally mint a unique quiz or landing slug per big partner so their traffic is
  unmistakable (mentioned in the outreach playbook for creators).

## 10. Generator page (internal, optional but recommended)

Route: `apps/quiz/src/app/admin/embed/page.tsx` (admin-gated, noindex).

- Pick a quiz (search by title/slug), set an optional partner tag and theme.
- Output the Section 6 snippet with placeholders filled, plus a "Copy" button and a
  live preview iframe.
- This makes outreach fast: paste partner name, copy, send.

## 11. Implementation steps for Claude Code

Do in order. Build after each. Respect the no-dash copy rule; run the CLAUDE.md
dash grep before finishing.

1. Add `/embed` to `KNOWN_ROUTES` (prefix) in `lib/supabase/middleware.ts`, and
   ensure middleware treats `/embed/*` as a public path with zero Supabase IO.
2. Create `app/embed/layout.tsx`: minimal, no TopNav/Footer/MobileTabBar,
   transparent background, theme class hook.
3. Create `app/embed/q/[slug]/page.tsx`: cookie-free fetch via
   `createPublicReadClient`, `revalidate = 3600`, `generateStaticParams` top-N
   slugs, `robots: noindex/follow`, canonical to `/q/[slug]`, `notFound()` guard.
4. Build `EmbedQuizPlayer` (or confirm `QuizPlayer` works chrome-free) with the
   play flow, the in-iframe "Play the full quiz" link, theme + accent params.
5. Add the postMessage `ResizeObserver` height reporter to the embed layout/page.
6. Add scoped framing headers for `/embed/:path*` in `next.config.ts`
   (`frame-ancestors *`, no `X-Frame-Options`).
7. Add lightweight `partner=` logging (fire-and-forget; reuse an existing events
   table or a tiny endpoint; never block render).
8. Build the admin generator page `app/admin/embed/page.tsx` (admin-gated,
   noindex) that outputs the Section 6 snippet with a copy button and preview.
9. Verify (Section 12), then run the dash grep from CLAUDE.md.

## 12. Acceptance criteria

- `https://kpopquiz.org/embed/q/<real-slug>` renders the quiz with no site nav or
  footer, plays start to finish, and does NOT 301 to `/`.
- Embedding the Section 6 snippet on a test HTML page (and on a Shopify blog
  article) shows the quiz with no internal scrollbar; height tracks content.
- The visible attribution `<a>` renders in the partner DOM (view source on the
  partner page) and points to `https://kpopquiz.org/q/<slug>` with UTM params.
- `curl -sI https://kpopquiz.org/embed/q/<slug>` shows it is frameable (no
  `X-Frame-Options: DENY`; CSP allows frame-ancestors), and the page is static/ISR
  (`x-vercel-cache: HIT` on a second request).
- The bare `/embed/q/<slug>` is `noindex` and canonicals to `/q/<slug>`.
- A crawl wave of embed URLs does not trigger cold DB queries (prerendered/ISR
  confirmed), protecting the NANO DB.
- Admin generator outputs a working snippet with one click.

## 13. Reuse for outreach

Once live, this serves every partner in `SEO-OUTREACH-PLAYBOOK.md`. The first
target is nolae.eu: generate an ATEEZ embed (partner tag `nolae`) to match their
GOLDEN HOUR PART.5 post, and send it with the warm message already drafted.

## 14. Open decisions (confirm before or during build)

- Group-hub embeds (`/embed/g/[group]`)? Useful for "best X quizzes" lists. Defer
  to v2 unless a partner asks.
- Allowlist partner domains in `frame-ancestors` (more control, more maintenance)
  vs `*` (frictionless). Recommend `*` to start; revisit only if abused.
- Reuse `QuizPlayer` vs new `EmbedQuizPlayer`: decide after checking QuizPlayer's
  coupling to layout/auth.
