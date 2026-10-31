#!/usr/bin/env bash
# session.sh (run O1, owner order 2026-10-30): one command per part of a SQL session. It applies the files of SQL-ORDER.md
# in order with psql and ON_ERROR_STOP, runs the checks of each file right after it (VERIFY.md, as OK or KO lines), and stops
# at the first difference. It prints OK or KO, file names and counts: never a name, an e-mail, a key or the connection string.
#
#     bash docs/launch/o1/session.sh B1            (the parts: B1 B2 B3 D E1 E2 G J1 J2 J3 J4; OWNER-NOW.md says when)
#     bash docs/launch/o1/session.sh B1 --dry-run  (prints the plan of the part, touches nothing, needs no database)
#
# Before it: the backup line of the session (OWNER-NOW.md), in the same terminal. It exports PROD_DB_URL; this script reads it
# and refuses any database but the production project. Every file is idempotent, so a part can be run again from its start
# after a KO is fixed: the files already applied change nothing the second time, and the gates that only make sense before a
# file (008, 010) are skipped once that file is in.
# The full psql output goes to ~/kpq-launch/logs (mode 600, on your machine only), never to the screen.
#
# Rehearsal on a local throwaway database only (docs/launch/o1/session-rehearsal.sh): KPQ_REHEARSAL=1 with a PROD_DB_URL on
# 127.0.0.1 lifts the production-only guards (target, time of day, branch) and nothing else.

set -uo pipefail

PROD_REF="rdkgouofytwfdpbxbzio"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT" || exit 2
M="docs/pending-migrations/multisite"
L="$M/launch"
C="docs/launch/o1/checks"
# The files of the two lots of the old worker (owner order 2026-10-30). The session stops with a KO while a file is not on main.
# Lot K1 is two files (K1-RELECTURE.md): 021a stores gender and debut year with their sources, 021b has an empty list in session G (activation comes after, on a list the owner ticks).
K1A_SQL="$M/021a-k1-idol-gender-debut.sql"
K1B_SQL="$M/021b-k1-idol-activate.sql"
A1_SQL="$L/L13-A1-character-facts.sql"

PART="${1:-}"
DRY=0
[ "${2:-}" = "--dry-run" ] && DRY=1
REHEARSAL=0
[ "${KPQ_REHEARSAL:-}" = "1" ] && REHEARSAL=1
# A rehearsal may point the two lots at stand-in files while theirs are not on main (session-rehearsal.sh); production never can.
[ "$REHEARSAL" = 1 ] && K1A_SQL="${KPQ_K1A_SQL:-$K1A_SQL}" && K1B_SQL="${KPQ_K1B_SQL:-$K1B_SQL}" && A1_SQL="${KPQ_A1_SQL:-$A1_SQL}"

[ -d /opt/homebrew/opt/postgresql@18/bin ] && export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
umask 077
LOG_DIR="${KPQ_LOG_DIR:-$HOME/kpq-launch/logs}"
LOG="$LOG_DIR/session-$PART-$(date -u +%Y%m%d-%H%M%S).log"

say() { printf '%s\n' "$*"; }
stop() {
  say "KO   $*"
  say ""
  say "Arrêt : rien d'autre n'a été lancé. Colle ces lignes dans le chat."
  [ -s "$LOG" ] && say "Journal complet (sur ta machine seulement) : $LOG"
  exit 1
}

# ------------------------------------------------------------------------------------------------------------------------
# Guards

usage() { say "usage: bash docs/launch/o1/session.sh B1|B2|B3|D|E1|E2|G|J1|J2|J3|J4 [--dry-run]"; exit 2; }
case "$PART" in B1|B2|B3|D|E1|E2|G|J1|J2|J3|J4) ;; *) usage ;; esac

utc_hm() { date -u +%H%M; }
guard() {
  [ -n "${PROD_DB_URL:-}" ] || stop "PROD_DB_URL est vide : relance la ligne de sauvegarde de la session (elle l'exporte), dans ce terminal."
  if [ "$REHEARSAL" = 1 ]; then
    case "$PROD_DB_URL" in *@127.0.0.1:*|*@localhost:*) ;; *) stop "répétition : seule une base locale (127.0.0.1) est acceptée." ;; esac
  else
    case "$PROD_DB_URL" in *"$PROD_REF"*) ;; *) stop "la chaîne de connexion ne nomme pas le projet de production." ;; esac
    local hm; hm="$(utc_hm)"
    if [ "$hm" -ge 2350 ] || [ "$hm" -lt 0030 ]; then stop "il est $(date -u +%H:%M) UTC : jamais de SQL entre 23:50 et 00:30."; fi
    [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ] || stop "le dépôt n'est pas sur main : git checkout main && git pull --ff-only"
    [ -z "$(git status --porcelain --untracked-files=no -- docs/pending-migrations docs/launch 2>/dev/null)" ] || stop "un fichier SQL ou de lancement a été modifié à la main : git status"
  fi
  command -v psql >/dev/null || stop "psql introuvable."
  local v; v="$(psql --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
  [ "${v:-0}" -ge 15 ] || stop "psql $v : il faut 15 ou plus (la ligne PATH de la sauvegarde met PostgreSQL 18 en premier)."
  mkdir -p "$LOG_DIR" && : > "$LOG" || stop "impossible d'écrire le journal dans $LOG_DIR."
  q "select 1" >/dev/null || stop "connexion refusée (mot de passe, réseau ou pooler) : relance la ligne de sauvegarde."
}

# ------------------------------------------------------------------------------------------------------------------------
# psql helpers: the output goes to the log; the screen gets one line per file and the check rows.

q() { psql "$PROD_DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "$1" 2>>"$LOG"; }

first_error() { grep -E '(ERROR|FATAL|error):' "$1" | tail -1 | sed -E 's/^.*(ERROR|FATAL|error): +//' | cut -c1-200; }

apply() {   # apply single|none <file>
  local mode="$1" file="$2" out
  [ -f "$file" ] || stop "$file : fichier absent de main."
  if [ "$DRY" = 1 ]; then say "plan $file ($mode)"; return; fi
  out="$(mktemp "$LOG_DIR/out.XXXXXX")"
  local tx=(); [ "$mode" = single ] && tx=(--single-transaction)
  local t0; t0=$(date +%s)
  if psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 ${tx[@]+"${tx[@]}"} -f "$file" >"$out" 2>&1; then
    { echo "== $file ($mode)"; cat "$out"; } >>"$LOG"; rm -f "$out"
    say "OK   $(basename "$file") ($(( $(date +%s) - t0 )) s)"
  else
    { echo "== $file ($mode) FAILED"; cat "$out"; } >>"$LOG"
    local e; e="$(first_error "$out")"; rm -f "$out"
    case "$e" in *lock*timeout*|*canceling\ statement\ due\ to\ lock*) e="$e (une table était occupée : relance cette commande plus tard, à une heure calme)" ;; esac
    stop "$(basename "$file") : ${e:-erreur sans message}"
  fi
}

check() {   # check <check file>: prints its rows; a row with a KO field stops the part
  local file="$1" out
  [ -f "$file" ] || stop "$file : vérification absente."
  if [ "$DRY" = 1 ]; then say "     vérif $(basename "$file" .sql)"; return; fi
  out="$(psql "$PROD_DB_URL" -X -q -At -F ' | ' -v ON_ERROR_STOP=1 -f "$file" 2>>"$LOG")" || stop "$(basename "$file") : la vérification n'a pas pu tourner ($(tail -1 "$LOG" | sed -E 's/^.*ERROR: +//' | cut -c1-160))."
  { echo "== check $file"; echo "$out"; } >>"$LOG"
  printf '%s\n' "$out" | sed 's/^/     /'
  printf '%s\n' "$out" | grep -qE '(^| )KO( |$)' && stop "$(basename "$file" .sql) : une ligne KO ci-dessus."
  return 0
}

vs4() {
  if [ "$DRY" = 1 ]; then say "     vérif V-S4"; return; fi
  if psql "$PROD_DB_URL" -X -q -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql >>"$LOG" 2>&1; then
    say "     ok | V-S4 : les 28 fonctions de S4 restent fermées à anon et authenticated | 28"
  else
    stop "V-S4 : une des 28 fonctions de S4 est rouverte ou absente (VERIFY A0)."
  fi
}

# content <columns...>: compares launch/content-verify.sql with expected-counts.json on the given columns (1 to 15).
content() {
  if [ "$DRY" = 1 ]; then say "     vérif contenu, colonnes $*"; return; fi
  local row
  row="$(psql "$PROD_DB_URL" -X -q -At -F '|' -v ON_ERROR_STOP=1 -f "$L/content-verify.sql" 2>>"$LOG")" || stop "content-verify.sql n'a pas pu tourner."
  echo "== content $* : $row" >>"$LOG"
  local out
  out="$(python3 - "$L/expected-counts.json" "$row" "$@" <<'PY'
import json, sys
counts = json.load(open(sys.argv[1]))['counts']
got = [int(x) for x in sys.argv[2].split('|')]
cols = [int(c) for c in sys.argv[3:]]
spec = [('groupes (séries et anime-mix)', counts['groups'] + 1), ('séries', counts['series']), ('arcs', counts['arcs']),
        ('personnages', counts['characters']), ('génériques', counts['themes']), ('faits', counts['trivia']),
        ('sources', counts['entity_sources']), ('comptes Team actifs', counts['creators']), ('tampons anime Team', counts['creators']),
        ('quiz publiés', counts['quizzes']), ('questions', counts['questions']), ('lignes de la banque', counts['daily']),
        ('questions de la banque', counts['daily_questions']), ('questions personnalité', counts['personality_questions']),
        ('profils personnalité', counts['personality_profiles'])]
if len(got) != len(spec):
    print(f'KO | content-verify : {len(got)} colonnes, {len(spec)} attendues | {len(got)}'); sys.exit(0)
for c in cols:
    what, want = spec[c - 1]
    print(f"{'ok' if got[c - 1] == want else 'KO'} | contenu : {what} (attendu {want}) | {got[c - 1]}")
PY
)"
  printf '%s\n' "$out" | sed 's/^/     /'
  printf '%s\n' "$out" | grep -qE '^KO ' && stop "contenu : un nombre ne correspond pas à expected-counts.json."
  return 0
}

# ------------------------------------------------------------------------------------------------------------------------
# Gates

is_008_in() { [ "$(q "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'merge_anon_passport' and pronargs = 7")" != "0" ]; }
is_010_in() { [ "$(q "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'ensure_daily_quiz_v2'")" != "0" ]; }

SIG_SQL="select proname || '(' || pg_get_function_identity_arguments(oid) || ') ' || prosecdef || ' ' || coalesce(proconfig::text, '-') || ' ' || coalesce(proacl::text, '-') from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport','ensure_daily_quiz') order by 1"

gate_008() {   # VERIFY V4 "Gate": production still runs the 11 bodies 008's rollback file holds
  if [ "$DRY" = 1 ]; then say "porte 008 : les 11 fonctions de production = le fichier de retour de 008 (sautée si 008 est déjà là)"; return; fi
  if is_008_in; then say "OK   porte 008 sautée : 008 est déjà appliqué"; return; fi
  local bodies; bodies="$(mktemp "$LOG_DIR/fn.XXXXXX")"
  q "select '@@@' || p.proname || E'\n' || p.prosrc || E'\n;;;;\n' from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport') order by p.proname, p.oid" >"$bodies" || stop "porte 008 : lecture des fonctions impossible."
  local res; res="$(python3 - "$M/008-write-locks.rollback.sql" "$bodies" <<'PY'
import sys
n = lambda s: ' '.join(s.split())
back = n(open(sys.argv[1]).read())
blocks = [b.strip() for b in open(sys.argv[2]).read().split(';;;;') if b.strip()]
bad = [b.split('\n')[0][3:] for b in blocks if n(b.split('\n', 1)[1]) not in back]
print(len(blocks), ','.join(bad) if bad else 'none')
PY
)"; rm -f "$bodies"
  echo "== gate 008: $res" >>"$LOG"
  [ "$res" = "11 none" ] || stop "porte 008 : fonctions lues et différentes du fichier de retour : $res (attendu : 11 none). On s'arrête (RUNBOOK D1)."
  say "OK   porte 008 : 11 fonctions lues, toutes identiques au fichier de retour"
  q "$SIG_SQL" >"$LOG_DIR/functions-before-008.txt" || stop "porte 008 : lecture des signatures impossible."
}

after_008_signatures() {   # VERIFY V4 after: only merge_anon_passport changed (it gains p_site)
  [ "$DRY" = 1 ] && { say "     vérif signatures : seule merge_anon_passport change"; return; }
  local before="$LOG_DIR/functions-before-008.txt"
  [ -f "$before" ] || { say "     ok | signatures : 008 était déjà là, comparaison faite à son application | -"; return; }
  local after; after="$(q "$SIG_SQL")" || stop "signatures après 008 illisibles."
  local changed; changed="$(diff <(cat "$before") <(printf '%s\n' "$after") | grep -E '^[<>]' | sed -E 's/^[<>] ([a-z_]+)\(.*/\1/' | sort -u | tr '\n' ' ')"
  rm -f "$before"
  if [ "$changed" = "merge_anon_passport " ]; then say "     ok | signatures : seule merge_anon_passport a changé (p_site) | 1"
  else stop "signatures après 008 : fonctions changées : ${changed:-aucune} (attendu : merge_anon_passport seulement)."; fi
}

gate_010_keys() {   # RUNBOOK E1: the two old unique keys are still there before 009 and 010
  if [ "$DRY" = 1 ]; then say "porte E1 : les deux anciennes clés uniques existent (sautée si 010 est déjà là)"; return; fi
  if is_010_in; then say "OK   porte E1 sautée : 010 est déjà appliqué"; return; fi
  local n; n="$(q "select count(*) from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key')")"
  [ "$n" = "2" ] || stop "porte E1 : $n ancienne(s) clé(s) unique(s) au lieu de 2."
  say "OK   porte E1 : les 2 anciennes clés uniques sont là"
}

gate_time() {   # gate_time <HHMM> <message>: refuse at or after that UTC time (production only)
  [ "$DRY" = 1 ] && { say "porte horaire : avant $1 UTC"; return; }
  [ "$REHEARSAL" = 1 ] && return
  [ "$(utc_hm)" -lt "$1" ] || stop "$2"
}

gate_part_d() {   # RUNBOOK G2: 016 and 017 need Mission U part D (applied 2026-10-27)
  [ "$DRY" = 1 ] && { say "porte 016 : admin_delete_account existe (Mission U partie D)"; return; }
  [ -n "$(q "select to_regprocedure('public.admin_delete_account(uuid,boolean,boolean)')")" ] || stop "porte 016 : admin_delete_account est absente (Mission U partie D) : 016 et 017 attendent."
  say "OK   porte 016 : admin_delete_account est là"
}

gate_launch_files() {   # RUNBOOK J2 and K1: the launch files are the verified ones of MANIFEST.json
  [ "$DRY" = 1 ] && { say "porte jour J : fichiers de MANIFEST.json intacts, aucun DRAFTS, aucune adresse team.otakuquiz.org"; return; }
  local res; res="$(python3 - "$L" <<'PY'
import hashlib, json, os, sys
d = sys.argv[1]
m = json.load(open(os.path.join(d, 'MANIFEST.json')))
bad = [f['name'] for f in m['files'] if hashlib.sha256(open(os.path.join(d, f['name']), 'rb').read()).hexdigest() != f['sha256']]
drafts = [n for n in sorted(os.listdir(d)) if n.endswith('.sql') and open(os.path.join(d, n), encoding='utf8').readline().startswith('-- DRAFTS')]
old = 'team.otakuquiz.org' in open(os.path.join(d, 'L02-K2-team-accounts.sql'), encoding='utf8').read()
print(m['mode'], len(m['files']), ','.join(bad) or 'none', ','.join(drafts) or 'none', 'old' if old else 'none')
PY
)"
  echo "== launch files: $res" >>"$LOG"
  case "$res" in "verified "*" none none none") ;; *) stop "fichiers de lancement : $res (attendu : verified, sha256 identiques, aucun DRAFTS, aucune ancienne adresse)." ;; esac
  say "OK   fichiers de lancement : mode verified, $(echo "$res" | cut -d' ' -f2) fichiers aux sha256 de MANIFEST.json, aucun DRAFTS"
}

bank_14() {   # RUNBOOK K5 step 4: the first fourteen bank rows of the anime daily, at most 14 in all, whatever the number of runs
  [ "$DRY" = 1 ] && { say "plan banque anime : 14 lignes vérifiées au plus"; return; }
  local n; n="$(q "with done as (select count(*) as n from public.quiz_bank where site_id = 'anime' and status = 'verified'), u as (update public.quiz_bank set status = 'verified', verified_at = now() where id in (select id from public.quiz_bank where site_id = 'anime' and status = 'draft' and scheduled_date is null order by md5(title) limit greatest(0, 14 - (select n from done))) returning 1) select (select n from done) + (select count(*) from u)")" || stop "banque anime : la mise à jour a échoué."
  [ "$n" = "14" ] || stop "banque anime : $n lignes vérifiées au lieu de 14."
  say "OK   banque anime : 14 lignes vérifiées, prêtes à dater (étape 52)"
}

trivia_published() {   # VERIFY V8: published facts = the published figure of L05's header
  [ "$DRY" = 1 ] && { say "     vérif faits publiés = l'en-tête de L05"; return; }
  local want got
  want="$(sed -n '1,5p' "$L/L05-K1-facts.sql" | sed -nE 's/.*\(([0-9]+) published.*/\1/p')"
  got="$(q "select count(*) from public.trivia where site_id = 'anime' and status = 'published'")"
  if [ -n "$want" ] && [ "$got" = "$want" ]; then say "     ok | faits anime publiés (en-tête de L05 : $want) | $got"
  else stop "faits anime publiés : $got au lieu de ${want:-?} (en-tête de L05)."; fi
}

# ------------------------------------------------------------------------------------------------------------------------
# The parts. Cut where the owner acts (owner order 2026-10-30); OWNER-NOW.md gives the action between two parts.

part_B1() {
  apply single "$M/001-sites.sql";          check "$C/V-001.sql"
  apply single "$M/002a-site-columns.sql";  check "$C/V-002a.sql"
  apply none   "$M/002b-site-validate.sql"; check "$C/V-002b.sql"
  apply none   "$M/002c-site-indexes.sql";  check "$C/V-002c.sql"
  apply single "$M/002d-quiz-site-guard.sql"; check "$C/V-002d.sql"
  NEXT="toi : un quiz jetable sur kpopquiz.org (crée, vérifie, supprime), puis SITE_SCOPE=1 et le redéploiement (étape 14). Après l'heure de veille du worker : B2."
}
part_B2() {
  check "$C/V-002d.sql"
  apply single "$M/003-memberships.sql";    check "$C/V-003.sql"
  NEXT="toi, tout de suite : un compte jetable sur kpopquiz.org (fenêtre privée, accueil terminé), donne son nom d'utilisateur à Claude. Puis B3."
}
part_B3() {
  check "$C/V-003.sql"
  apply single "$M/004-passport-prefs.sql"; check "$C/V-004.sql"
  apply single "$M/005-net-counters.sql";   check "$C/V-005.sql"
  check "$C/V-003.sql"
  apply single "$M/006-passport-handoff.sql"; check "$C/V-006.sql"
  apply single "$M/007-world-xp.sql";       check "$C/V-007.sql"
  NEXT="le worker refait la photo V1 ; la veille de 24 h commence (étape 18)."
}
part_D() {
  gate_008
  apply single "$M/008-write-locks.sql";    check "$C/V-008.sql"; after_008_signatures; vs4
  NEXT="toi : avec le compte jetable, joue un quiz, like puis retire le like, crée un quiz puis supprime-le (étape 22). La veille de 24 h commence."
}
part_E1() {
  gate_time 2220 "il est $(date -u +%H:%M) UTC : la session E commence avant 22:20 (90 minutes avant 23:50). Reviens demain soir, dès 18:00."
  gate_010_keys
  apply none   "$M/009-daily-prep.sql";     check "$C/V-009.sql"
  NEXT="le worker vérifie le déploiement de kpopquiz (étape 26). Tout de suite après son OK : E2."
}
part_E2() {
  gate_time 2345 "il est $(date -u +%H:%M) UTC : jamais 010 après 23:45. 009 et le déploiement restent en place ; E2 demain soir, après une nouvelle sauvegarde."
  apply single "$M/010-daily-v2.sql";       check "$C/V-010.sql"
  NEXT="Claude note l'heure ; le lendemain après 00:05, le quiz du jour (étape 28)."
}
part_G() {
  apply single "$M/011-anime-series.sql";   check "$C/V-011.sql"
  apply single "$M/018-entity-images.sql";  check "$C/V-018.sql"
  apply single "$M/019-dle-core.sql";       check "$C/V-019.sql"
  apply single "$M/020-dle-kpop-idol.sql";  check "$C/V-020.sql"
  apply single "$K1A_SQL";                  check "$C/V-K1a.sql"
  apply single "$K1B_SQL";                  check "$C/V-K1b.sql"
  apply single "$M/022-photos-admin.sql";   check "$C/V-022.sql"
  apply single "$M/012-editorial-quiz.sql"; check "$C/V-012.sql"
  apply single "$M/013-formats.sql";        check "$C/V-013.sql"
  apply single "$M/014-daily-openings.sql"; check "$C/V-014.sql"
  apply single "$M/015-spoilers.sql";       check "$C/V-015.sql"
  gate_part_d
  apply single "$M/016-passport-deletion.sql"; check "$C/V-016.sql"
  apply single "$M/017-deletion-kpop.sql";  check "$C/V-017.sql"
  vs4
  NEXT="le worker : V1, puis 1 h de journaux (étape 33)."
}
part_J1() {
  gate_launch_files
  apply single "$L/L01-B2-sites.sql";       check "$C/V-L01.sql"
  NEXT="toi : les 31 comptes Team (étape 40, les quatre lignes avec la clé service_role). Puis J2."
}
part_J2() {
  check "$C/V-TEAM.sql"
  apply single "$L/L02-K2-team-accounts.sql"; check "$C/V-L02.sql"; content 8 9
  apply single "$L/L03-B7-sentinel.sql";    check "$C/V-L03.sql"
  apply single "$L/L04-K1-series.sql";      content 1 2 3 4 5; check "$C/V-LEAKS.sql"
  NEXT="le worker vérifie qu'aucun titre anime n'apparaît sur kpopquiz.org (étape 42). À son OK : J3."
}
part_J3() {
  apply single "$L/L05-K1-facts.sql";       content 6 7; trivia_published
  apply single "$L/L06-B3-badges.sql";      check "$C/V-L06.sql"
  apply single "$L/L07-K2-catalogue.sql";   content 10 11; check "$C/V-LEAKS.sql"
  apply single "$L/L08-K3-daily-bank.sql";  content 12 13; check "$C/V-LEAKS.sql"
  apply single "$L/L10-PERS-personality.sql"; content 14 15
  content 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
  vs4
  bank_14
  NEXT="toi : les images si Claude l'a dit (étape 45), la PR des builds (47), le domaine (48), la connexion (49), PASSPORT_JUMP (50). Puis J4."
}
part_J4() {
  apply single "$L/L12-L1-sites-live.sql";  check "$C/V-L12.sql"
  apply single "$A1_SQL";                   content 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
  vs4
  NEXT="toi : le quiz du jour (étape 52), puis la vraie partie (53)."
}

# ------------------------------------------------------------------------------------------------------------------------

NEXT=""
if [ "$DRY" = 1 ]; then
  say "Session $PART : plan (rien n'est lancé)"
else
  guard
  label="base de production"; [ "$REHEARSAL" = 1 ] && label="RÉPÉTITION sur une base locale"
  say "Session $PART, $label, $(date -u '+%Y-%m-%d %H:%M') UTC"
fi
"part_$PART"
say ""
if [ "$DRY" = 1 ]; then say "Fin du plan de $PART."; else say "Session $PART terminée : tout est OK."; say "Ensuite : $NEXT"; fi
exit 0
