-- 089 - Group generation/era for the passport collection layer (Workstream M, M0.4).
-- The groups table had no era or company field. Era is backfilled here from the
-- EXISTING canonical map (apps/quiz/src/lib/discord/discord.ts GROUPS_BY_GEN), not
-- an invented mapping. Company/agency has no canonical source and is left out
-- (flagged for owner decision). Read-time stays trivial: passport.ts reads
-- groups(id, generation) with one small query, no scans.
--
-- One-time backfill only (additive, not per-action). Groups absent from the map
-- keep generation NULL and are reported as "unknown era".
alter table public.groups
  add column if not exists generation text;

with gen(name, generation) as (
  values
    ('H.O.T.','1st Gen'), ('Sechskies','1st Gen'), ('S.E.S.','1st Gen'),
    ('Fin.K.L','1st Gen'), ('Shinhwa','1st Gen'), ('g.o.d','1st Gen'), ('Baby V.O.X','1st Gen'),
    ('TVXQ','2nd Gen'), ('Super Junior','2nd Gen'), ('BIGBANG','2nd Gen'),
    ('Wonder Girls','2nd Gen'), ('Girls'' Generation','2nd Gen'), ('KARA','2nd Gen'),
    ('SHINee','2nd Gen'), ('2NE1','2nd Gen'), ('2PM','2nd Gen'), ('2AM','2nd Gen'),
    ('BEAST','2nd Gen'), ('4Minute','2nd Gen'), ('f(x)','2nd Gen'), ('SISTAR','2nd Gen'),
    ('Apink','2nd Gen'), ('INFINITE','2nd Gen'), ('B1A4','2nd Gen'), ('Block B','2nd Gen'),
    ('EXID','2nd Gen'), ('Girl''s Day','2nd Gen'), ('AOA','2nd Gen'), ('B.A.P','2nd Gen'),
    ('VIXX','2nd Gen'), ('Teen Top','2nd Gen'),
    ('EXO','3rd Gen'), ('BTS','3rd Gen'), ('Red Velvet','3rd Gen'), ('GOT7','3rd Gen'),
    ('SEVENTEEN','3rd Gen'), ('TWICE','3rd Gen'), ('BLACKPINK','3rd Gen'), ('MAMAMOO','3rd Gen'),
    ('GFRIEND','3rd Gen'), ('MONSTA X','3rd Gen'), ('NCT','3rd Gen'), ('iKON','3rd Gen'),
    ('WINNER','3rd Gen'), ('Oh My Girl','3rd Gen'), ('WJSN','3rd Gen'), ('ASTRO','3rd Gen'),
    ('PENTAGON','3rd Gen'), ('The Boyz','3rd Gen'), ('Dreamcatcher','3rd Gen'),
    ('NU''EST','3rd Gen'), ('DAY6','3rd Gen'), ('Lovelyz','3rd Gen'), ('MOMOLAND','3rd Gen'),
    ('Stray Kids','4th Gen'), ('(G)I-DLE','4th Gen'), ('ITZY','4th Gen'), ('ATEEZ','4th Gen'),
    ('TXT','4th Gen'), ('aespa','4th Gen'), ('ENHYPEN','4th Gen'), ('IVE','4th Gen'),
    ('LE SSERAFIM','4th Gen'), ('NewJeans','4th Gen'), ('NMIXX','4th Gen'), ('STAYC','4th Gen'),
    ('Kep1er','4th Gen'), ('TREASURE','4th Gen'), ('CRAVITY','4th Gen'), ('P1Harmony','4th Gen'),
    ('Billlie','4th Gen'), ('Weeekly','4th Gen'), ('Purple Kiss','4th Gen'), ('FIFTY FIFTY','4th Gen'),
    ('ZEROBASEONE','5th Gen'), ('RIIZE','5th Gen'), ('BABYMONSTER','5th Gen'),
    ('KISS OF LIFE','5th Gen'), ('BOYNEXTDOOR','5th Gen'), ('ILLIT','5th Gen'),
    ('NCT WISH','5th Gen'), ('tripleS','5th Gen'), ('MEOVV','5th Gen'), ('Hearts2Hearts','5th Gen'),
    ('&TEAM','5th Gen'), ('TWS','5th Gen'), ('izna','5th Gen'), ('ARTMS','5th Gen')
)
update public.groups g
  set generation = gen.generation
  from gen
  where g.name = gen.name
    and g.generation is distinct from gen.generation;
