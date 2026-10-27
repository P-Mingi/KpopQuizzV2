#!/bin/sh
# Install the O1 ownership guard in THIS worktree only (never repo-wide).
# Run from inside the worktree: sh scripts/o1-hooks/install.sh <lane id>
# Undo: git config --worktree --unset core.hooksPath; git config --worktree --unset o1.agent
set -e
[ -n "$1" ] || { echo "usage: sh scripts/o1-hooks/install.sh <lane id>"; exit 2; }
git rev-parse --show-toplevel >/dev/null
git config extensions.worktreeConfig true
git config --worktree core.hooksPath scripts/o1-hooks
git config --worktree o1.agent "$1"
git config --worktree gc.auto 0
git config --worktree maintenance.auto false
git config --worktree remote.origin.pushurl NO_PUSH_FROM_O1
chmod +x "$(git rev-parse --show-toplevel)/scripts/o1-hooks/pre-commit"
echo "o1 guard installed for $(git rev-parse --show-toplevel) as $(git config --worktree --get o1.agent)"
