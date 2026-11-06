#!/usr/bin/env bash
# Runs once when the codespace is created. ~/kpq-launch (the session backups and logs) points into /workspaces, which a
# rebuild of the codespace keeps, outside the repository folder, so a dump can never be committed. Mode 700.
set -eu
umask 077
D=/workspaces/kpq-launch
mkdir -p "$D" 2>/dev/null || sudo install -d -m 700 -o "$(id -u)" -g "$(id -g)" "$D"
chmod 700 "$D"
[ -L "$HOME/kpq-launch" ] || [ ! -e "$HOME/kpq-launch" ] || { echo "post-create: $HOME/kpq-launch exists and is not a link, left as is"; exit 0; }
ln -sfn "$D" "$HOME/kpq-launch"
psql --version
pg_dump --version
