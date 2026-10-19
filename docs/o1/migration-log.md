# Run O1 migration log

| when (UTC) | branch | file | sha256 | result |
|---|---|---|---|---|
| 2026-10-18T10:16:34Z | o1-scratch | auth.users NULL tokens of 3 accounts set to empty (owner decision 2026-10-18, env.sh, not a migration) | n/a | ok |
| 2026-10-18T10:16:34Z | o1-dev | same | n/a | ok |
| 2026-10-19T11:04:05Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/probe.sql | 9c1181cfb0d0772f | ok |
| 2026-10-19T11:09:42Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.sql | c98166da99361bd4 | ok |
| 2026-10-19T11:09:42Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.sql | 644b0b83b0d0ff53 | ok |
| 2026-10-19T11:09:44Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.sql | 040a06f657ce6c58 | ok |
| 2026-10-19T11:09:45Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.sql | 172d42f467139ac4 | ok |
| 2026-10-19T11:09:45Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.sql | 14a41759fcc2ec38 | ok |
| 2026-10-19T11:09:46Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.sql | e905082ca3abaae3 | ok |
| 2026-10-19T11:09:54Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/verify.sql | 920d14da76ece0e9 | ok |
| 2026-10-19T11:09:55Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/guard-test.sql | 930167f6efe9b8d8 | ok |
| 2026-10-19T11:10:30Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.rollback.sql | 5e96976be5bc6fc9 | ok |
| 2026-10-19T11:10:31Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.rollback.sql | f7a96dbf0a68f214 | ok |
| 2026-10-19T11:10:31Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.rollback.sql | 264c3bef09060612 | ok |
| 2026-10-19T11:10:32Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.rollback.sql | 67de25a389771df5 | ok |
| 2026-10-19T11:10:32Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql | c09da616696700b7 | ok |
| 2026-10-19T11:10:33Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.rollback.sql | 3a94f5c858405238 | ok |
| 2026-10-19T11:10:33Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/probe.sql | 9c1181cfb0d0772f | ok |
| 2026-10-19T11:10:46Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/fingerprint.sql | 218e268a7ed0fee6 | failed rc=3 |
| 2026-10-19T11:10:51Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/fingerprint.sql | b191aa4b315c6e37 | ok |
| 2026-10-19T11:10:58Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.sql | c98166da99361bd4 | ok |
| 2026-10-19T11:10:59Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.sql | 644b0b83b0d0ff53 | ok |
| 2026-10-19T11:11:00Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.sql | 040a06f657ce6c58 | ok |
| 2026-10-19T11:11:01Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.sql | 172d42f467139ac4 | ok |
| 2026-10-19T11:11:02Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.sql | 14a41759fcc2ec38 | ok |
| 2026-10-19T11:11:02Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.sql | e905082ca3abaae3 | ok |
| 2026-10-19T11:11:03Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.sql | c98166da99361bd4 | ok |
| 2026-10-19T11:11:04Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.sql | 644b0b83b0d0ff53 | ok |
| 2026-10-19T11:11:05Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.sql | 040a06f657ce6c58 | ok |
| 2026-10-19T11:11:06Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.sql | 172d42f467139ac4 | ok |
| 2026-10-19T11:11:06Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.sql | 14a41759fcc2ec38 | ok |
| 2026-10-19T11:11:07Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.sql | e905082ca3abaae3 | ok |
| 2026-10-19T11:11:07Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.rollback.sql | 5e96976be5bc6fc9 | ok |
| 2026-10-19T11:11:08Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.rollback.sql | f7a96dbf0a68f214 | ok |
| 2026-10-19T11:11:08Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.rollback.sql | 264c3bef09060612 | ok |
| 2026-10-19T11:11:09Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.rollback.sql | 67de25a389771df5 | ok |
| 2026-10-19T11:11:09Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql | c09da616696700b7 | ok |
| 2026-10-19T11:11:10Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.rollback.sql | 3a94f5c858405238 | ok |
| 2026-10-19T11:11:10Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/fingerprint.sql | b191aa4b315c6e37 | ok |
| 2026-10-19T11:11:11Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.rollback.sql | 5e96976be5bc6fc9 | ok |
| 2026-10-19T11:11:11Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.rollback.sql | f7a96dbf0a68f214 | ok |
| 2026-10-19T11:11:12Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.rollback.sql | 264c3bef09060612 | ok |
| 2026-10-19T11:11:12Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.rollback.sql | 67de25a389771df5 | ok |
| 2026-10-19T11:11:13Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql | c09da616696700b7 | ok |
| 2026-10-19T11:11:13Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.rollback.sql | 3a94f5c858405238 | ok |
| 2026-10-19T11:11:20Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/001-sites.sql | c98166da99361bd4 | ok |
| 2026-10-19T11:11:21Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/launch/L01-B2-sites.sql | 644b0b83b0d0ff53 | ok |
| 2026-10-19T11:11:22Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002a-site-columns.sql | 040a06f657ce6c58 | ok |
| 2026-10-19T11:11:23Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002b-site-validate.sql | 172d42f467139ac4 | ok |
| 2026-10-19T11:11:24Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002c-site-indexes.sql | 14a41759fcc2ec38 | ok |
| 2026-10-19T11:11:24Z | o1-scratch | /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B2/docs/pending-migrations/multisite/002d-quiz-site-guard.sql | e905082ca3abaae3 | ok |
| 2026-10-19T11:11:25Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/verify.sql | 920d14da76ece0e9 | ok |
| 2026-10-19T11:11:26Z | o1-scratch | /private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/sql/guard-test.sql | 930167f6efe9b8d8 | ok |
| 2026-10-19T11:51:43Z | o1-dev | docs/pending-migrations/multisite/001-sites.sql | c98166da99361bd4 | ok |
| 2026-10-19T11:51:44Z | o1-dev | docs/pending-migrations/multisite/launch/L01-B2-sites.sql | 644b0b83b0d0ff53 | ok |
| 2026-10-19T11:51:45Z | o1-dev | docs/pending-migrations/multisite/002a-site-columns.sql | 040a06f657ce6c58 | ok |
| 2026-10-19T11:51:46Z | o1-dev | docs/pending-migrations/multisite/002b-site-validate.sql | 172d42f467139ac4 | ok |
| 2026-10-19T11:51:47Z | o1-dev | docs/pending-migrations/multisite/002c-site-indexes.sql | 14a41759fcc2ec38 | ok |
| 2026-10-19T11:51:48Z | o1-dev | docs/pending-migrations/multisite/002d-quiz-site-guard.sql | e905082ca3abaae3 | ok |
