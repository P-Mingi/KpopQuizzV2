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

## Entries
