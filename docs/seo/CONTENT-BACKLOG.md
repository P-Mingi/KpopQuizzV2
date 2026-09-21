# CONTENT BACKLOG - the article queue for the engine

The next ~10 articles for the CONTENT ENGINE (`docs/seo/CONTENT-ENGINE.md`), ranked by ROI
(impact / effort). Every row is grounded in a real query from `docs/seo/GSC-21SEP.md` or a named
gap in `docs/seo/STRATEGY.md` W3. All are TSX-only, zero DB.

**Non-cannibalization rule applied throughout:** the group-name + "quiz" head terms
("cortis quiz", "illit quiz", "seventeen quiz") are owned by their `/{group}-quiz` hubs - articles
here target the *explainer / long-tail / synonym* intent around those groups ("who is X",
"X members", "blind test X"), which the hub pages do not target, and each funnels authority INTO
the hub. An article never competes with our own page for the same term.

Shipped as the proof (not in this queue): **`kpop-blind-test-2026`** - target "blind test kpop
2026" (pos 4, open field), funnels to `/blindtest`.

| # | Article (working title) | Target query (GSC) | Intent | Internal-link target | Schema | ROI |
|---|---|---|---|---|---|---|
| 1 | Who Is Cortis? Members, Debut & Songs | "test cortis" 1026i pos7.8; "cortis" cluster 3410i | Informational (new group) | `/cortis-quiz` + `/blindtest` | Article + FAQ | **Highest** - Cortis is the #1 page by impressions + the freshness weapon; hub owns "cortis quiz", article grabs the "who is / members" surface. Low effort. |
| 2 | BLACKPINK Blind Test: Name Every Song | "blind test blackpink" pos6 (0 clicks, open) | How-to / play | `/blackpink-quiz` + `/blindtest` | Article + FAQ | **Highest** - named open-field long tail, clone of the shipped blindtest pattern. Very low effort. |
| 3 | Who Is ILLIT? The Rookie Group Guide | "illit" cluster 2347i pos5.1; PT "quiz do illit" 255i | Informational (rookie) | `/illit-quiz` + `/blindtest` | Article + FAQ | **High** - big impression pool already near page-1 top; explainer surface is unowned. Low-med effort. |
| 4 | Name All the Members: BTS to the Rookies | "name all X members" (STRATEGY gap) | How-to / challenge | `/quizzes` (name-all) + `/bts-quiz` | Article + FAQ | **High** - captures the "name all" intent cluster the games surface can't title for. Med effort. |
| 5 | SEVENTEEN's 13 Members, Explained | "seventeen quiz" 1315i pos7.4 (broaden) | Informational | `/seventeen-quiz` + `/blindtest` | Article + FAQ | **Med-high** - the "13 members" hook is a real, sticky angle; widens a strong hub's surface. Low effort. |
| 6 | K-pop Blind Test by Generation (1st-5th) | "kpop blind test" pos4 + generation long tail | How-to / play | `/blindtest` + `/articles/kpop-generations-explained` | Article + FAQ | **Med** - distinct from the by-group article already live; ties blindtest to the generations explainer. Low effort. |
| 7 | Who Is BABYMONSTER? Debut & Lineup | "babymonster quiz" 816i pos8.3 | Informational (rookie) | `/q/babymonster-quiz` + `/blindtest` | Article + FAQ | **Med** - page-1 pool, pos 8 has room; explainer surface unowned. Low effort. |
| 8 | aespa: Songs, Members & Where to Start | "aespa quiz" 424i pos8.7 | Informational | `/aespa-quiz` + `/blindtest` | Article + FAQ | **Med** - standalone aespa guide (complements the existing aespa-vs-newjeans piece, different intent). Low effort. |
| 9 | Quiz K-pop em Português (PT localization) | "quiz do illit" 255i pos9; "test cortis" (PT/ES) | Informational (localized) | `/pt` + PT hubs | Article + FAQ | **Med-high, higher effort** - uncaptured international demand; needs the `/pt` surface + localized voice. Queue after the /pt on-page work lands. |
| 10 | The Hardest K-pop Quiz to Beat in 2026 | "kpop quiz" 5127i (dated long-tail cut, not the head) | Commercial / play | `/hard-kpop-quizzes` + `/quizzes` | Article + FAQ | **Med** - dated variant that does NOT fight the head term the home page owns; sends links to the weak `/quizzes` (pos 18). Low effort. |

## Refresh, not new (avoid self-cannibalization)
- **`guess-the-kpop-idol-guide`** already ranks (53 clicks). "guess the kpop idol by picture"
  (pos 5.8) is the same intent - add a "by picture" section + FAQ to the existing article and
  refresh `updatedAt`, rather than shipping a competing article.
- **Group hubs** (`/cortis-quiz`, `/illit-quiz`, etc.) are the on-page-title/schema/internal-link
  job from `docs/seo/AUDIT.md`, not article work - but every article above links into them, which
  is the point.

## How the queue is worked
Top-to-bottom by ROI. Each article is one pass of `docs/seo/CONTENT-ENGINE.md` (brief → draft →
wire-up → self-check → PR). A `[CRON]` (v2) can re-rank this table weekly from fresh GSC impressions
and open the wire-up PRs; a human still merges.
