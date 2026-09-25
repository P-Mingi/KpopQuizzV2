#!/bin/sh
# Install the UX v11 ownership guard in THIS worktree only (never repo-wide).
# Run from inside the worktree: sh scripts/ux11-hooks/install.sh
# Undo: git config --worktree --unset core.hooksPath
set -e
git rev-parse --show-toplevel >/dev/null
git config extensions.worktreeConfig true
git config --worktree core.hooksPath scripts/ux11-hooks
chmod +x "$(git rev-parse --show-toplevel)/scripts/ux11-hooks/pre-commit"
echo "ux11 guard installed for $(git rev-parse --show-toplevel)"
echo "core.hooksPath (worktree) = $(git config --worktree --get core.hooksPath)"
echo "core.hooksPath (repo-wide) = $(git config --local --get core.hooksPath || echo '<unset>')"
