# PR-W1 - Home + /quizzes head term (proof)

Branch `feat/seo-w1-head` off main `645d707` (all of Phase 1 merged). Target head terms:
"kpop quiz" (5127 impr, pos 9.14) -> home, and "kpop quizzes" (pos 18) -> /quizzes. Zero DB/DDL.

## Finding: title + ItemList were already shipped; the real gap was the home H1
Prior missions (#31 and earlier) already gave both pages most of the W1 lever set:
- **Home**: `<title>` leads "K-pop Quiz - 380+ Free Fan-Made Quizzes" (title.absolute, #31),
  ItemList + WebSite + SearchAction JSON-LD, and an H2 with "K-pop quizzes". But the H1 was
  "Are you a real fan?" with NO keyword - the site's #1 page for "kpop quiz" had a keyword-free H1.
- **/quizzes**: `<title>` leads "K-pop Quizzes: ... Free Fan-Made Tests", H1 is "K-pop quizzes",
  intro leads "Browse every K-pop quiz", ItemList + FAQPage JSON-LD. Already complete - no change.

So W1 does NOT regress the tuned title (mission: "build on it, do not regress it"); it closes the one
real gap (the home H1) and strengthens the internal anchor into the weak /quizzes page.

## Changes (home only - `components/home/home-hero.tsx`)
1. **H1 now leads with the exact "K-pop Quiz" anchor.** Added a keyword eyebrow line as the first
   text in the H1, keeping "Are you a real fan?" as the visual hook below it. The H1 now carries the
   5127-impression head term; the conversion hook is preserved.
2. **Primary CTA is now an exact-match anchor into /quizzes.** "Browse quizzes" -> "Browse K-pop
   quizzes" (+ matching aria-label). The home page is the strongest internal-link source for the
   plural head term stuck at pos 18.

## Proof (dev :3021)
```
H1 text order:   "K-pop Quiz" ... "Are you a real fan?"   (keyword leads the H1)
CTA anchor:      "Browse K-pop quizzes" -> /quizzes        (4 matches: text + aria-label)
<title>:         K-pop Quiz - 380+ Free Fan-Made Quizzes for Every Group   (unchanged, not regressed)
```

## Gates
`tsc --noEmit` exit 0 - unit 121/121 - `next build` (see CI) - render 200 - 0 em/en dash.
DO NOT MERGE - owner merges.
