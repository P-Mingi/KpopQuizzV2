#!/usr/bin/env bash
# Runs inside the codespace image as vscode, from /workspaces/KpopQuizzV2. $1 = branch the codespace was created on.
set -u
cd /workspaces/KpopQuizzV2 || exit 2
echo "== codespace on branch: $(git rev-parse --abbrev-ref HEAD)"
echo "== post-create"; bash .devcontainer/post-create.sh 2>&1 | sed 's/^/   /' || true
[ -f .devcontainer/post-create.sh ] || echo "   (no .devcontainer on this branch)"
ls -ld /workspaces/kpq-launch ~/kpq-launch 2>&1 | awk '{print "   " $1, $3, $NF}'
echo "== the line of CODESPACE.md, verbatim (session.sh D), stand-in pooler, password at the prompt"
LINE="$(sed -n 1p /srv/line.txt)"
printf '%s\n%s\n' 'postgresql://postgres.rdkgouofytwfdpbxbzio:[YOUR-PASSWORD]@pooler-standin:5432/postgres' 'standin-only-local' | bash -c "$LINE" 2>&1 | sed 's/^/   /'
echo "   exit ${PIPESTATUS[1]}"
echo "== now on: $(git rev-parse --abbrev-ref HEAD) $(git rev-parse --short HEAD)"
f=$(ls -1 /workspaces/kpq-launch/*.dump | tail -1); echo "   dump $(stat -c '%a %U %s bytes' "$f") $(basename "$f"); entries $(pg_restore --list "$f" | grep -c .)"
cp "$f" ./x.dump; mkdir -p kpq-launch && cp "$f" kpq-launch/; echo "   git status after copying a dump into the repo: [$(git status --porcelain | tr '\n' ' ')]"; rm -rf x.dump kpq-launch
echo "== the same line ending in session.sh D --dry-run"
printf '%s\n%s\n' 'postgresql://postgres.rdkgouofytwfdpbxbzio:[YOUR-PASSWORD]@pooler-standin:5432/postgres' 'standin-only-local' | bash -c "${LINE} --dry-run" 2>&1 | sed 's/^/   /'
echo "== every part in --dry-run (main)"
for p in B1 B2 B3 D E1 E2 G K2 J1 J2 J3 J4 J5; do out=$(bash docs/launch/o1/session.sh $p --dry-run 2>&1); echo "   $p exit $? lines $(printf '%s\n' "$out" | wc -l) KO $(printf '%s\n' "$out" | grep -c '^KO')"; done
echo "== reconnect line, then psql through PGPASSWORD"
RL="$(sed -n 2p /srv/line.txt)"; [ -n "$RL" ] || RL="$(awk '/^## 3\./{s=1} s&&/^```$/{n++; next} s&&n==3{print}' docs/launch/o1/CODESPACE.md 2>/dev/null)"
printf '%s\n%s\n' 'postgresql://postgres.rdkgouofytwfdpbxbzio:[YOUR-PASSWORD]@pooler-standin:5432/postgres' 'standin-only-local' | bash -c "$RL"' && psql "$PROD_DB_URL" -X -At -c "select current_user, version()" | cut -c1-60' 2>&1 | sed 's/^/   /'
