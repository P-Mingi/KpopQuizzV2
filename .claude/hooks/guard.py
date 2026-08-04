#!/usr/bin/env python3
# Verse Working System V2 - PreToolUse guard. Hard-blocks three things the worker
# must never do; everything else passes. Fail-OPEN on any parse error so a hook bug
# can never brick the agent. Exit 2 = block (stderr is shown back to the agent).
import sys, json, re

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)  # fail-open

tool = d.get("tool_name", "") or ""
ti = d.get("tool_input", {}) or {}
cmd = str(ti.get("command", "") or "")
path = str(ti.get("file_path", "") or "")


def block(msg):
    sys.stderr.write(msg + "\n")
    sys.exit(2)


# 1) git push is owner-gated - the worker never pushes.
if tool == "Bash" and re.search(r'(^|[;&|\s])git\s+push(\s|$)', cmd):
    block("BLOCKED: git push is owner-gated (Working System V2). The worker never pushes; ask the owner.")

# 2) migrations are owner-run - never write supabase/migrations/ directly.
if "supabase/migrations/" in path or (tool == "Bash" and "supabase/migrations/" in cmd and re.search(r'>\s*|tee|cp |mv ', cmd)):
    block("BLOCKED: do not write supabase/migrations/ directly. Put migration SQL in docs/pending-migrations/ as a file for the owner to run.")

# 3) RATCHET LAW - gate/proof scripts are read-only for the worker (never edit a
#    test/gate/proof to go green; gates only move forward).
if tool in ("Write", "Edit", "MultiEdit") and re.search(r'apps/quiz/scripts/(_[^/]*|check-[^/]*|test-[^/]*)\.mts$', path):
    block("BLOCKED (RATCHET LAW): gate/proof scripts (scripts/_*.mts, check-*.mts, test-*.mts) may not be edited to go green. Gates only move forward.")

sys.exit(0)
