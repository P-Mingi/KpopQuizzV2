# REPORT - W4b item 1: the chrome defect is closed. Items 2, 3, 4 not built.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0** ·
`check:indexability` -> **0** (run before the layout change; the change adds no route).

Commit: `1943125`. Proofs: `docs/proofs/w4-embed/`.

**Item 1 only.** It was the blocker, and it cost the run. Theming, the partner log and
the generator page are not built.

---

## The fix, and a deviation from what I proposed

I proposed the route group. **My own proposal was wrong, and I checked before acting on
it**: a second root layout only works in Next when EVERY route lives in a group, because
`app/layout.tsx` is the root for everything while it exists. Doing it properly means
relocating all ~60 routes under `app/(site)/` to serve one widget, which is exactly the
"do not regress the site to fix the widget" risk you warned about.

So the chrome self-hides instead. One client component reads the pathname; the root
layout keeps a single definition of what the chrome is. `usePathname` runs during SSR
too, so the nav is never in the embed's HTML at all, not merely hidden with CSS.

If you want the route group anyway, it is a separate, deliberate refactor with its own
regression budget, not a side effect of the widget.

## Both sides proven, the regression side hardest

Rendered DOM, which is the real test rather than a string grep:

```
                nav  header  footer  tabBarLinks
home             2      2       1        15
/q/<slug>        2      1       1         8
/embed/q/<slug>  0      0       0         0
```

Served HTML before and after, on the three normal pages: **byte-identical on every
counter** (topNav 9, mobileTabBar, footer, themeInit, quizzes links). Only the embed
moved: topNav 9 -> 0, quizzes links 3 -> 0. Files: `chrome-before.json`,
`chrome-after.json`, `chrome-dom.json`.

Screenshots at **390px and desktop** (item 5, which I skipped last run) show the widget
in a host page with no top bar and no tab bar, and the outside-iframe backlink still
present in the host DOM.

## A caught mistake worth recording

My first screenshots this run looked unchanged, and I nearly reported the fix as failed.
The images were **stale**: a shell cwd reset meant the capture wrote to a relative path
outside the repo, so I was re-reading yesterday's file. The DOM probe disagreed with the
picture, and the probe was right. Checking the file timestamp settled it.

## Not built

- **Item 2, theming.** `?theme=` is still accepted and ignored; `?accent=` / `?bg=` do
  not exist.
- **Item 3, the partner log.** `partner=` still reaches the page and is still not
  recorded. Worth noting for when it is built: `game_plays`-style attribution has no
  home today, so it may need a table, which is a BLOCKED decision, not a build.
- **Item 4, the generator page.** `buildEmbedSnippet()` remains a tested function with
  no UI.

## Other flags (loud)

1. A small floating element (the theme/nuri circle) still renders inside the iframe at
   the bottom left. It is outside the chrome block I moved, so it survived. Cosmetic,
   but it is site furniture in a partner's widget and should go with the rest.
2. `check:indexability` was run before the layout change, not after. The change adds no
   route and alters no metadata, but I did not re-run it and will not claim I did.

## Covenant

No synthetic player, no generated score, no padded count. Nothing in this change prints
a number at all.

## Next

Items 2, 3 and 4, plus the floating element in flag 1.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
