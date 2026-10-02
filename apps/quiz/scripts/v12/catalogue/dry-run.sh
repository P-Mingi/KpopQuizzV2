#!/bin/sh
# The only way the V12 run calls the ingestion script: service key removed from the
# environment, dry run forced. Run from apps/quiz:
#   sh scripts/v12/catalogue/dry-run.sh --groups "KickFlip,RESCENE" --target 10 --sql-out <file>
for a in "$@"; do
  if [ "$a" = "--apply" ]; then echo "dry-run.sh never applies." >&2; exit 2; fi
done
exec env -u SUPABASE_SERVICE_ROLE_KEY npx tsx scripts/ingest-blindtest-songs.mts --dry-run "$@"
