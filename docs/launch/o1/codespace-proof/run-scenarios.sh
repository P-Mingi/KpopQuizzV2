#!/usr/bin/env bash
# Two scenarios, in the codespace image (linux/amd64, as on GitHub): created on the PR branch, then on main after the merge.
# Ran from a scratch folder holding origin.git (main and o1/codespace), line.txt (the two lines of CODESPACE.md section 3) and inside.sh.
cd "$(dirname "$0")" || exit 2
T=$PWD
for cb in o1/codespace main; do
  docker volume rm -f kpq-cs-ws >/dev/null 2>&1; docker volume create kpq-cs-ws >/dev/null
  if [ "$cb" = main ]; then
    git clone -q origin.git merge-r && git -C merge-r -c user.email=t@t -c user.name=t merge -q --no-ff origin/o1/codespace -m "test merge" && git -C merge-r push -q origin main
  fi
  echo "######## scenario: codespace created on $cb (linux/amd64, as on GitHub)"
  docker run --rm --platform linux/amd64 --network kpq-cs-test -v kpq-cs-ws:/workspaces -v $T/origin.git:/srv/origin.git -v $T/line.txt:/srv/line.txt:ro -v $T/inside.sh:/srv/inside.sh:ro kpq-codespace:amd64 bash -c "git config --global --add safe.directory '*' && git clone -q --branch $cb /srv/origin.git /workspaces/KpopQuizzV2 && chown -R vscode:vscode /workspaces/KpopQuizzV2 && su vscode -c 'git config --global --add safe.directory \"*\"; bash /srv/inside.sh'"
done
