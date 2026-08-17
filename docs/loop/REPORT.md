# REPORT - GRAPHIFY TRIAL: BLOCKED. The tool is not installed on this machine.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every check. No application code, no DDL, no database writes, **nothing pushed**.

Blocker: `graphify-trial` in BLOCKED.md. Proof: `docs/proofs/graphify-trial/not-installed.txt`.

---

## The mission's premise does not hold

It opens "The owner installed Graphify". Every check says otherwise:

    graphify binary     not on PATH; absent from ~/.local/bin, ~/.cargo/bin,
                        /opt/homebrew/bin, /usr/local/bin
    uv                  NOT INSTALLED - and it is the README's recommended installer
    pipx                present, holds only certbot
    python package      import graphify -> ModuleNotFoundError
                        pip show graphifyy -> not found
    skill registration  none under ~/.claude/skills; the project's 12 skills include
                        no graphify; no mention in ~/.claude/settings.json or CLAUDE.md
    build artefact      no graphify-out/ or .graphify/ in the repo

Nine checks, all negative. There is no version of this trial I can run and report honestly.

## Why I did not install it myself

Three reasons, and I would rather state them than have the block read as fussiness.

1. **It is the owner's call and the bus said so.** The previous mission listed "whether to
   trial Graphify" under *waiting on the owner*. A mission that assumes the decision was
   taken does not itself take it.
2. **I was blocked from this last session.** The permission classifier refused even the
   prerequisite check (`python3 --version`, `uv --version`), and the instruction on that
   refusal is to stop and explain rather than route around it. Installing is a larger action
   than the one already denied.
3. **The install is three steps here, not two.** `uv` is absent, so the README's recommended
   path needs `brew install uv` first. `pipx install graphifyy` avoids that, since pipx
   already works. Either way it puts a new tool on the machine, which is not mine to decide.

## What unblocks it

    pipx install graphifyy      # pipx is already installed; avoids adding uv
    graphify install            # registers the skill with Claude Code

Then re-issue the trial unchanged. **The answer key is good and I would rather run it than
rewrite it** - questions 1 to 4 are all facts this session established by measurement, and
question 4 is the one that matters, because a code-graph tool asserting a working relationship
between `songs` and `blind_test_songs` would be confidently wrong about the exact thing that
froze the per-song stats.

## The one part of the mission I can answer without the tool

You asked whether `graphify-out/` belongs in `.gitignore`, and to be explicit rather than let
it land by accident. **It should be gitignored.**

It is a derived artefact of a codebase that changes every commit, so a tracked copy is stale
the moment anyone merges. We inverted `docs/` to track-by-default two days ago precisely
because deny-by-default made *humans* responsible for freshness and they were not - but that
inversion came with `check:docs-secrets` making the safety property automatic. A tracked
graph has the mirror problem with no equivalent gate: nothing would tell you it had gone
stale, and a stale graph nobody notices is the exact failure mode this trial exists to test
for. If it is ever tracked, it needs a freshness gate, not a habit.

## Deviations and flags (loud)

1. **I did not write the .gitignore entry.** The mission's scope is the trial, the directory
   does not exist yet, and adding a rule for an artefact no tool produces would be tidying
   something I noticed rather than executing what was asked. The recommendation is above and
   it is one line whenever it is wanted.
2. **Nine checks is more than it took to know.** The first three settled it. I ran the rest
   because "not installed" is the kind of claim that gets challenged, and I would rather the
   block cite a table than an impression.

## Covenant

Nothing was installed, nothing was configured, and no verdict was invented about a tool I
could not run. There is no partial grade in this report because a partial grade of an
uninstalled tool is a fabrication.

## Next

Two commands and the trial runs as written.

---

STOP. **Nothing was pushed.** report pret.
