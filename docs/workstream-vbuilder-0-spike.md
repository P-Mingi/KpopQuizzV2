# V-BUILDER-0 - the edit-in-place architecture spike (verify before build)

## Claude Code Implementation Prompt

---

The W0 pattern applied to the Builder: BEFORE Phase 2 commits weeks to
the canvas, a focused spike proves the hardest technical problem is
solved. Owner directive: "let's verify, let's be sure to build this 100%
right." This runs alongside/before Phase 1's plumbing.

THE PROBLEM TO PROVE: edit-in-place over server-rendered ISR pages.
Reader pages are Next.js server components (ISR/static). The builder
canvas needs full client interactivity (select, drag, reorder, inline
text editing) over the SAME visual output. The server/client component
boundary is the trap: naive approaches either (a) fork the renderer into
a client copy that drifts from the reader render, or (b) try to hydrate
server components client-side, which Next does not allow.

## Candidate architectures to evaluate (build the smallest possible
proof of the most promising, compare honestly)

A. CLIENT MIRROR: the canvas renders the composition through client
   variants of the same block components (shared markup via common
   sub-components), editing state in client memory, save -> server
   revalidates the real page. Risk: drift between client and server
   renders; mitigated by sharing the leaf markup components and by the
   byte-parity test comparing canvas HTML vs reader HTML.
B. IFRAME PREVIEW + OVERLAY: the canvas is the REAL server-rendered
   page in an iframe (draft mode), with a client overlay for selection/
   drag; edits patch the draft and the iframe refreshes (fast with ISR
   draft bypass). Zero drift by construction; risk: overlay hit-testing
   complexity + refresh latency per edit.
C. HYBRID: iframe truth for preview + client mirror only for the block
   being actively edited (text blocks edit inline in an overlay).

## The spike (timeboxed, throwaway code allowed, NO commit to main
without the verdict)

1. Build the minimal proof on the SPACE HOME: render its composition,
   select a block, reorder two blocks, edit one paragraph inline, save
   as draft, see the real draft page reflect it. For the top candidate
   (start with B, the zero-drift option; fall back through C then A).
2. Measure honestly: edit latency (target: text keystroke feels live;
   structural edit reflected < 1s), drift risk (diff canvas vs reader
   HTML), complexity (LOC + moving parts), mobile behavior.
3. THE VERDICT REPORT: which architecture, why, its costs, what Phase 2
   must respect. If NONE meets the bar honestly: STOP and say so with
   options (this is a real possible outcome; do not force a winner).
4. Dependency check: if drag/selection genuinely needs a library,
   name the smallest candidate + justification for the owner gate;
   hand-rolled first per the law.

## Verify

- [ ] A real block was selected, reordered, and text-edited over the
      real space home, saved to draft, and the draft page shows it
- [ ] The drift question answered with a diff, not an opinion
- [ ] Latency numbers reported honestly
- [ ] The verdict names ONE architecture for Phase 2 (or STOPs honestly)
- [ ] Spike code clearly marked; nothing ships to readers; Play
      untouched; no deps added without the gate

/caveman verdict report. This spike decides Phase 2's foundation: be
brutal about what actually works, exactly like the W0 and Trends
verdicts that saved us before.
