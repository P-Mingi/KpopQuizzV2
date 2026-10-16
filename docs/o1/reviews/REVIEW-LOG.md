# Run O1: review log (R's memory across lanes)

ORCH appends here between ticks: the bar each review set, traps found, normalisations accepted, recurring findings.
R reads it before every review and never edits it.

## Standing bar (Phase 0)

- Evidence is only what `scripts/o1/gate.sh` wrote for the exact sha and tree; a builder's own logs prove nothing.
- Parity: identical after flag-off-diff's normalisations (build id, hashed asset names); G0's two extra
  normalisations only once Q0a has implemented and R has passed them.
- Builds before G1 run offline (Supabase unreachable): empty data on pages is expected and is not a finding; a build
  that fails offline is a finding.
- Copy: the gate's `copy` step covers added lines only; read the visible strings of new screens yourself.

- Rule 18 (owner, 16 October 2026): OtakuQuiz and FanQuiz are kpopquiz.org re-skinned. Every anime or hub screen
  is judged next to its kpop twin of `docs/o1/contracts/TWINS.md`: same layout, sections, components, interactions
  and copy structure; differences only from the row's closed list or an approved CR. A forked or copied shared
  component, an invented screen or an unlisted block is a blocker, whatever its quality.

## Entries

### DUMMY r1 ARCH (2026-10-16): PASS
- Good practice confirmed: check the evidence tree hash against the worktree, re-run the guard yourself, test the
  guard with an escaping path. ORCH fixed the guard (paths with `.` or `..` segments are never owned).
- A report must carry the sha, the evidence folder, the tsc and unit results, Decisions and Open points: thin
  reports are a minor finding on real lanes, a major one when a claim cannot be traced.
