# Brief E1b: /admin/review and the quiz publisher (OQ-09, OQ-10) (Wave 2, screen lane)

Full brief written by ORCH when the lane starts (needs, deliverables from BACKLOG section 3, owned paths, ports, done
test, reviewer profiles). What is fixed now:

## Rule 18 (owner, 16 October 2026): same product, new skin
Read rule 18 in `O1/docs/o1/briefs/COMMON.md`. OtakuQuiz is kpopquiz.org with small changes, not a new design. Every
page of this lane starts from its kpop twin and keeps its layout, components, interactions and copy structure. Pages
import the shared components (`components/ux-v1/**` and the components of each area) and never fork, copy (even in
part) or rewrite them. A difference a shared component needs is a prop or a theme token added by its owner on request
(`docs/o1/requests/E1b.md`). What changes, and nothing else: the theme tokens, the vocabulary (series, character,
oshi with a star), and only the anime blocks of the spec.

Your twins: `O1/docs/o1/contracts/TWINS.md` row 29 (draft until F0 merges: `O1/docs/o1/briefs/TWINS-draft.md`).
Each page imports the shared components of its row; every difference is in the row's closed list or in a CR approved in
`LEDGER.md` before you build it. `scripts/o1/check.sh` runs `apps/quiz/scripts/o1/twins.mts` on every gate, and R
fails any screen whose structure differs from its twin.

The shared editorial admin with kind quiz added by its owner; no new review screen.

Several twin components are on the HOT list today (for example `components/group/ux-v1/hub.tsx`,
`components/home/ux-v1/ux-home.tsx`, `components/quiz/ux-v1/quiz-page.tsx`, `results.tsx`,
`components/profile/ux-v1/settings.tsx`): importing them is fine; a prop added to one waits for its SEO or Mission U
branch to merge.
