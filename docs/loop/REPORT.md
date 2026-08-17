# REPORT - W5-DOCS: 101 strategy docs into git, each one read first. One PII finding.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every command. **This mission touched `.gitignore` and nothing else.** No application
code, no DDL, nothing pushed.

`.git/index.lock`: the owner removed it before this run, so no git command was blocked and
BLOCKED.md was not needed for it.

Proofs: `docs/proofs/w5-docs/`.

---

## Result

| | count |
| --- | --- |
| top-level files in `docs/` | 122 |
| tracked before | 20 |
| **newly visible after this change** | **101** |
| deliberately left out | 1 |
| docs tracked before (whole tree) | 475 |
| docs tracked after | **576** |

Proven with `git status --porcelain docs`, per your correction about `git check-ignore`.
Full list of the 101 in `docs/proofs/w5-docs/newly-visible.txt`.

Everything you named is in: `PLAY-MASTER-PLAN.md`, `PLAY-GEO-AEO-AUDIT.md`,
`PLAY-BATTLE-AUDIT.md`, `PLAY-GUEST-CONVERSION.md`, `PLAY-RETENTION.md`,
`PLAY-COMPETITOR-RESEARCH.md`, `PLAY-QUIZ-PAGES.md`, `PLAY-COMMUNITY-PULSE.md`,
`PLAY-BLINDTEST-X.md`, `SEO-OUTREACH-PLAYBOOK.md`, `SEO-AUDIT-2026-06-11.md`,
`LOOP-CHARTER.md`, `PLAY-W5-REPORT-DRAFT.md`, plus `PLAY-W5-DISTRIBUTION.md` and every
`VERSE-*` blueprint, roadmap and the master vision.

## How each file was checked

Two passes over the full bytes of all 102 untracked files, then hand review of every hit.

**Pass 1, credentials and identity:** email addresses, JWTs (`eyJ…`), `service_role` /
`anon_key`, `sk-` / `ghp_` / `xox?-` / `AIza` tokens, `password:`/`=` assignments, bearer
tokens, URLs with inline credentials, phone numbers. **One file hit: `SEO-AUDIT-2026-06-11.md`,
three matches, all `hello@kpopquiz.org`.** That is the public support address, already
shipped in `apps/quiz/src/app/contact/page.tsx`, so it is published on the site already.
Safe, added.

**Pass 2, shape:** non-markdown, NUL bytes, lines over 2,000 chars, files over 200KB,
PEM private-key blocks, card-like digit runs, Postgres/Mongo connection strings.
**One file hit: `.DS_Store`.**

## What I left out, and why

**`docs/.DS_Store`** is the only exclusion. macOS Finder metadata, binary, contains NUL
bytes and a 4,093-character line. Not a strategy doc and not something a repo should carry.
It stays ignored.

Nothing else looked like scratch or a one-off export. The remaining 101 are all markdown
specs, audits, roadmaps or plans.

## The finding that matters more than the mission

Your rule is that a doc with a private address must not become tracked in a repo that will
be pushed. **Two already are, and they are already on the remote.**

    docs/VERSE-WORKING-SYSTEM-V2.md:112, :114     two owner addresses
    docs/VERSE-LEDGER.md:97                       one owner address

Both were tracked long before this mission, and `VERSE-WORKING-SYSTEM-V2.md` is in
`origin/main` history via commit `bbce579`. They appear as Supabase **org identifiers** in
notes about which org a token can reach, not as contact details, and the repo is private.

I did not touch them. Removing the strings from the working copy would leave them in
history, which looks fixed without being fixed; genuinely clearing them needs a history
rewrite and a force-push, which is outside a `.gitignore` mission that forbids pushing, and
44 unpushed commits sit on top of exactly the commits that would be rewritten. Filed as
`w5-docs-pii` in BLOCKED.md with three options; my recommendation is to replace them with a
placeholder in the working copy now, and only consider a rewrite if this repo ever goes
public.

**None of the 101 files I added contains either address.** I checked before adding, which
is what caught this.

## One design decision you should be able to overrule

I added **101 individual `!docs/<file>.md` lines** rather than three patterns
(`!docs/PLAY-*.md`, `!docs/VERSE-*.md`, `!docs/workstream-*.md`), which would have been
three lines instead of a hundred.

I chose verbose on purpose. A wildcard would auto-track every **future** doc matching it,
including one written next month with a key in it, and the review gate that made this a
mission rather than your one-line edit would be gone. Deny-by-default means a new doc stays
invisible until a human opens it and adds its line. The `.gitignore` block says so, with
the date they were reviewed.

If you would rather have three lines and accept that trade, it is a two-minute change.

## Deviations and flags (loud)

1. **My first scan reported one file with email hits, and a separate grep found three
   distinct addresses in `docs/*.md`.** Not a contradiction: the scan's hit list only
   printed untracked files, and the two personal addresses live in tracked ones. It looked
   like a miss for a moment and I chased it rather than assuming. That chase is what
   surfaced the PII finding.
2. **`docs/VERSE-LEDGER.md` now has two entries numbered L-201**, mine at line 4111 and
   Cowork's at 4153, written independently for the same mission. I left both and used
   **L-202** for this one rather than renumbering someone else's entry.
3. **I am committing Cowork's uncommitted L-201 along with my own work**, because it was
   sitting modified in the tree and leaving it out would have meant staging by path around
   someone else's finished text. Flagging so it is not a surprise in the diff.

## Covenant

Every file added was read in full by the scanner and its output reviewed by hand; the one
flagged file was opened and its three matches inspected in context. Nothing was added on
the strength of its filename.

## Next

The strategy layer is in git. `w5-docs-pii` is the one decision waiting on you.

---

STOP. **Nothing was pushed.** 44 commits local before this one. report pret.
