#!/bin/sh
# G4 flag-off probe: what a server answers on the live URLs. Read only (GET and one
# POST that the route refuses before reading anything when the flag is off).
#   sh probe.sh http://localhost:3064
B=${1:-http://localhost:3064}
for p in /live /join /join/K7Q2PX; do
  printf '%-34s %s\n' "GET $p" "$(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' "$B$p")"
done
for p in /api/live /api/live/rooms/K7Q2PX /api/live/rooms/K7Q2PX/state; do
  printf '%-34s %s\n' "GET $p" "$(curl -s -w ' %{http_code}' "$B$p")"
done
printf '%-34s %s\n' "POST /api/live/rooms" "$(curl -s -w ' %{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$B/api/live/rooms")"
printf '%-34s %s\n' "GET /api/cron/live-expire" "$(curl -s -w ' %{http_code}' "$B/api/cron/live-expire")"
CSS=$(curl -s "$B/api/ux-v1/a0/styles")
printf '%-34s %s\n' "stylesheet" "$(printf '%s' "$CSS" | wc -c | tr -d ' ') bytes, sha256 $(printf '%s' "$CSS" | shasum -a 256 | cut -c1-16), ux-live rules: $(printf '%s' "$CSS" | grep -o 'ux-live-' | wc -l | tr -d ' ')"
printf '%-34s %s\n' "sitemap: /live or /join" "$(curl -s "$B/sitemap.xml" | grep -c -E '<loc>[^<]*/(live|join)(/[^<]*)?</loc>')"
