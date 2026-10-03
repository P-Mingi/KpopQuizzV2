#!/bin/sh
# Install the V12 ownership guard in THIS worktree only (never repo-wide).
# Run from inside the worktree: sh scripts/v12-hooks/install.sh <agent id>
# Undo: git config --worktree --unset core.hooksPath; git config --worktree --unset v12.agent
set -e
[ -n "$1" ] || { echo "usage: sh scripts/v12-hooks/install.sh <agent id>"; exit 2; }
git rev-parse --show-toplevel >/dev/null
git config extensions.worktreeConfig true
git config --worktree core.hooksPath scripts/v12-hooks
git config --worktree v12.agent "$1"
chmod +x "$(git rev-parse --show-toplevel)/scripts/v12-hooks/pre-commit"
echo "v12 guard installed for $(git rev-parse --show-toplevel) as $(git config --worktree --get v12.agent)"
echo "core.hooksPath (repo-wide) = $(git config --local --get core.hooksPath || echo '<unset>')"
