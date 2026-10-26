# Report: what the owner still has to do for the launch, in RUNBOOK order, with times (owner, 2026-10-26)
Read docs/launch/o1/RUNBOOK.md, SQL-ORDER.md, ENV.md, VERIFY.md, ROLLBACK.md and docs/o1/LEDGER.md decisions D-099 to D-121 (grep
"owner" and "requests"), and docs/o1/requests/*.md for anything still open. Read only; write one file:
docs/launch/o1/OWNER-TODO.md (French, plain, short lines, no en or em dash, no emoji), then commit it on the branch named in your
prompt ("o1: owner launch todo"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Content: every step the owner does himself, in the RUNBOOK's order (domains and DNS, Vercel projects and variables, Google OAuth
clients and redirect URIs, secrets to create, Supabase Auth redirect URLs and settings, Resend (postponed), the launch SQL in
SQL-ORDER order with what each file does, the flags in order, verifications, the go), each with: what to click or run (the RUNBOOK
section reference), the time it takes (a realistic estimate), and what must be true before. Mark what can be done now (before T0)
and what is launch day. Then the open owner decisions (one line each) and the post-launch steps. Total time at the end.
Never invent a step: each line cites its RUNBOOK section or ledger decision. Hand back at most 4 lines: path, sha, total time, open decisions count.
