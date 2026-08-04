# Pending migrations (owner-run)

Migrations are OWNER-RUN, always. The worker never writes to
`supabase/migrations/` (the PreToolUse guard hard-blocks it) and never runs SQL.

When a step needs a migration, the worker writes the SQL here as a numbered file
(e.g. `146_verse_entity_composition.sql`) with a header comment explaining what it
does and why, then STOPS and asks the owner to run it. Cowork reads every line
first. After the owner applies it, the file can be moved into
`supabase/migrations/` by the owner (or left here as the record).

Nothing pending right now.
