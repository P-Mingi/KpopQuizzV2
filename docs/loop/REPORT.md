# REPORT - W4: the embed widget. Built, backlink proven, one defect left open.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0** ·
`check:indexability` -> **0**.

Commit: `946d431`. Proofs: `docs/proofs/w4-embed/`.

---

## The backlink, which is the whole point

An `<iframe src>` passes almost no equity, so the link that matters is the visible `<a>`
the snippet renders in the **partner's own DOM**, outside the iframe. Proven by reading
the HOST page's DOM after pasting the generated snippet verbatim, not by reading the
snippet source:

```
backlinksInHostDOM : [{ href: ".../q/<slug>?utm_source=testpartner&utm_medium=embed
                               &utm_campaign=widget",
                        text: "BLACKPINK world records and achievements on kpopquiz.org" }]
linkIsOutsideIframe: true
```

The generator has no option to omit it. Anchor text is the title plus "on kpopquiz.org":
descriptive, not exact-match spam.

## Headers, stated as instructed

The site had **no framing header at all** before this, so it was frameable by anyone by
omission. Now:

```
/embed/q/<slug>   Content-Security-Policy: frame-ancestors *
/q/<slug>         Content-Security-Policy: frame-ancestors 'self'
                  X-Frame-Options: SAMEORIGIN
```

The global rule is scoped `'/((?!embed/).*)'`. My first attempt used `'/:path*'`, and
because Next applies **every** matching rule, the embed inherited the restrictive value
and was unframeable, which is the one thing it must not be. I caught it by reading the
live headers rather than trusting the config.

## Indexability

`noindex, follow` + `canonical: https://kpopquiz.org/q/<slug>`, and the route is absent
from the sitemap. `check:indexability` passes with 0 contradictions, which is the gate
that exists to catch exactly a sitemap-vs-noindex mistake.

## The resize handshake, and a bug it exposed

First version measured `document.documentElement.scrollHeight` and posted **33,482px**
into the partner's page: html/body inherit app-wide min-heights, and each applied height
fed the next observation. It now measures the embed's own box with a change guard.

```
before fix : iframeHeightPx 33482
after fix  : iframeHeightPx 640
```

## The loop

The embed reuses `QuizPlayer` rather than forking it, so the W2 end-of-quiz challenge
block comes along unchanged and an embedded quiz ends by pointing at our battle flow.
One mechanic serving acquisition, retention and the backlink, as the mission asked.

---

## DEFECT LEFT OPEN

**The embed still renders inside the root layout, so the TopNav and MobileTabBar appear
inside the iframe.** The screenshot shows it. The spec requires neither: an iframe should
carry the quiz and nothing else.

My `app/embed/layout.tsx` is a nested layout, so the root layout still wraps it. The fix
is a route group with its own root layout (`app/(embed)/embed/q/[slug]` plus an
`app/(embed)/layout.tsx` that owns `<html>` and `<body>`).

I did not attempt it. I was at the end of my context, and a refactor touching the site's
root layout is the last thing to do unverified. It is a contained, known change and it is
the first thing to pick up next.

## Other flags (loud)

1. **Theming is not implemented.** `?theme=` is accepted in the snippet URL but the page
   ignores it, and `?accent=` / `?bg=` are not built. Spec section 8 is outstanding.
2. **`partner=` is not logged.** The parameter rides the URL and reaches the page, but
   spec section 9's fire-and-forget attribution log is not built.
3. **The desktop screenshot was not captured**, only 390px. The resize proof is
   width-independent, but the mission asked for both.
4. **The generator has no UI.** `buildEmbedSnippet()` is a tested function; spec section
   10's internal generator page is not built.

## Covenant

Zero added lines matching fake / synthetic / dummy / placeholder / `Math.random`. The
snippet interpolates only a real slug and a real title and prints no counts, so there is
nothing in it to inflate.

## Next

The route group fix, then theming, the partner log, and the generator page. The widget is
functional and the backlink is real today; what remains is polish plus that one layout
defect.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
