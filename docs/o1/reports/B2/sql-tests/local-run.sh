#!/bin/bash
# Full local run of B2's SQL on a fresh copy of the production public schema (local PG18, TCP 127.0.0.1).
S=<scratchpad>
M=<B2>/docs/pending-migrations/multisite
A=$S/apply-local.sh; L=$S/lpsql; BIN=/opt/homebrew/opt/postgresql@18/bin; DB=t2
APPLY="$M/001-sites.sql $M/launch/L01-B2-sites.sql $M/002a-site-columns.sql $M/002b-site-validate.sql $M/002c-site-indexes.sql $M/002d-quiz-site-guard.sql"
ROLL="$M/002d-quiz-site-guard.rollback.sql $M/002c-site-indexes.rollback.sql $M/002b-site-validate.rollback.sql $M/002a-site-columns.rollback.sql $M/launch/L01-B2-sites.rollback.sql $M/001-sites.rollback.sql"
strip() { sed -e 's#psql:[^ ]*: ##' ; }
$L -d postgres -qc "drop database if exists $DB" -c "create database $DB template base" 2>/dev/null
$L -d $DB -q -f $S/sql/seed.sql
echo "server: $($L -d $DB -Atc 'show server_version') local, prod-public.sql loaded, seed: 1 profile, 1 group, 1 quiz"
echo "== 1. apply"; $A $DB $APPLY
echo "== 2. apply again (idempotent)"; $A $DB $APPLY
echo "== 3. verify"; $L -d $DB -q -f $S/sql/verify.sql
echo "== 4. guard test (one transaction, rolled back)"; $L -d $DB -q -f $S/sql/guard-test.sql 2>&1 | strip | grep -v '^$'
echo "== 5. rollback refusals"
$L -d $DB -qc "insert into public.groups (name, slug, display_color, text_color, site_id) values ('O1 B2 anime keep', 'o1-b2-anime-keep', '#111111', '#ffffff', 'anime')"
for f in launch/L01-B2-sites.rollback.sql 001-sites.rollback.sql 002a-site-columns.rollback.sql; do $A $DB $M/$f 2>&1 | strip | sed -E 's/\(activity_events[^)]*\)/(24 site_id keys)/'; done
$A $DB $M/002d-quiz-site-guard.rollback.sql $M/002c-site-indexes.rollback.sql $M/002b-site-validate.rollback.sql >/dev/null
$A $DB $M/002a-site-columns.rollback.sql 2>&1 | strip
$L -d $DB -qc "delete from public.groups where slug = 'o1-b2-anime-keep'"
$A $DB $M/002a-site-columns.sql $M/002b-site-validate.sql $M/002c-site-indexes.sql $M/002d-quiz-site-guard.sql >/dev/null
echo "== 6. rollback (reverse order)"; $A $DB $ROLL
echo "== 7. rollback again (idempotent)"; $A $DB $ROLL
$BIN/pg_dump -h 127.0.0.1 -p 54392 -U postgres -d base --schema-only | grep -v '^\\restrict\|^\\unrestrict' > $S/base.schema.sql
$BIN/pg_dump -h 127.0.0.1 -p 54392 -U postgres -d $DB --schema-only | grep -v '^\\restrict\|^\\unrestrict' > $S/$DB.schema.sql
diff -q $S/base.schema.sql $S/$DB.schema.sql >/dev/null && echo "schema after rollback: identical to the production copy (pg_dump --schema-only)" || echo "schema after rollback: DIFFERS"
echo "kpop seed quiz still there: $($L -d $DB -Atc "select count(*) from quizzes where slug = 'b2-local-quiz'")"
echo "== 8. apply again"; $A $DB $APPLY
echo "== 9. verify"; $L -d $DB -q -f $S/sql/verify.sql
echo "== 10. guard test again"; $L -d $DB -q -f $S/sql/guard-test.sql 2>&1 | strip | grep -v '^$'
