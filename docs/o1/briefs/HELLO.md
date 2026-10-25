# One mailbox: hello@kpopquiz.org (owner, 2026-10-25)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-hello, branch o1/contact-hello (= o1/integration ebdd664).
Q = apps/quiz/src, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. No push, no production, no connector,
never open ~/kpq-o1/secrets, no en or em dash, no emoji. Read this brief and the files you change; nothing else.
## 1. The address
The owner keeps only hello@kpopquiz.org (the one routed mailbox). Replace every contact@ and support@ address of kpopquiz.org,
fanquiz.org and otakuquiz.org with hello@kpopquiz.org, written literally or built (`contact@${SITE.domain}`, registry fields such as
organization.email, `{email}` copy variables): Q/lib/site/registry.ts, Q/lib/site/b1/codemod-rules.ts, the terms pages (kpop and anime
twin), privacy, banned, Q/lib/seo/org.ts, the hub copy, docs/o1/contracts/registry.md (owner exception), and the tests that pin
the old addresses (update them to hello@kpopquiz.org; never weaken another assertion). One source: the registry gives the mailbox,
the same on every site. Add a test that fails if any file under Q/ (tests excluded) or the registry contains contact@ or support@.
Kpop pages will show hello@kpopquiz.org instead of contact@kpopquiz.org: that difference is wanted; nothing else may change on kpop.
## 2. Deletion without Resend
At launch Resend is not configured and the Send Email hook stays off. Read Q/lib/passport/deletion/* and the email sender it uses:
the deletion request, the cancel and the cron run must work with no Resend key (the email is skipped and logged without any
address, the request and the deletion still happen, the response is the same success). If they do not, fix it (smallest change).
Add a unit test per step with the key unset.
## 3. Docs
- docs/launch/o1/RUNBOOK.md: remove the creation of contact@ mailboxes; the mailbox check becomes "send an email to
  hello@kpopquiz.org and receive it". Section I (Emails, the Send Email hook): mark it "Postponed (owner, 2026-10-25): Resend not
  configured, the hook stays off at launch; sign-in emails use Supabase's default sender"; keep its steps below for later.
- docs/launch/o1/ENV.md: the NEXT_PUBLIC_NET_DELETION row no longer needs a Resend sender: with no Resend the email is skipped and
  the deletion still runs. Any other row that says a Resend sender is required: same correction.
## Checks
tsc 0; `pnpm -C apps/quiz exec vitest run` green; S/check.sh $PWD ok. One commit ("o1: one mailbox hello@kpopquiz.org, deletion
without Resend"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 5 lines: sha, files (count),
what part 2 found and changed, tests.
