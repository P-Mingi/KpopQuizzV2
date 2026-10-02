-- G6 local check: after v12-g6-name-all.sql was applied twice. Each line prints
-- "<id> <what> = <value> (expected <value>)".
\pset tuples_only on
\pset format unaligned

select 'C01 old rows kept = ' || count(*) || ' (expected 8)' from public.name_all_member_results;
select 'C02 old rows have no order and no time = ' || count(*) || ' (expected 8)' from public.name_all_member_results where found_order is null and round_seconds is null;
select 'C03 columns = ' || string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' order by ordinal_position) || ' (expected ...,found_order:smallint:YES,round_seconds:smallint:YES)'
  from information_schema.columns where table_schema = 'public' and table_name = 'name_all_member_results';
select 'C04 stats with only old rounds = ' || public.name_all_round_stats(2)::text || ' (expected rounds 0, perfect 0, firsts [])';
select 'C05 anon may execute = ' || has_function_privilege('anon', 'public.name_all_round_stats(integer)', 'execute') || ' (expected false)';
select 'C06 authenticated may execute = ' || has_function_privilege('authenticated', 'public.name_all_round_stats(integer)', 'execute') || ' (expected false)';
select 'C07 service_role may execute = ' || has_function_privilege('service_role', 'public.name_all_round_stats(integer)', 'execute') || ' (expected true)';
select 'C08 anon may read the table = ' || has_table_privilege('anon', 'public.name_all_member_results', 'select') || ' (expected false: no grant in this local setup; on production RLS has no policy)';

-- three v12 rounds for BLACKPINK, written the way lib/name-all/round.ts roundRows() writes them
insert into public.name_all_member_results (group_id, member_name, found, round_id, found_order, round_seconds) values
  -- round A: perfect, Lisa first
  (2, 'Jisoo', true, '00000000-0000-4000-8000-00000000000a', 2, 14),
  (2, 'Jennie', true, '00000000-0000-4000-8000-00000000000a', 3, 14),
  (2, 'Rose', true, '00000000-0000-4000-8000-00000000000a', 4, 14),
  (2, 'Lisa', true, '00000000-0000-4000-8000-00000000000a', 1, 14),
  -- round B: two found, Lisa first
  (2, 'Jisoo', false, '00000000-0000-4000-8000-00000000000b', null, 60),
  (2, 'Jennie', true, '00000000-0000-4000-8000-00000000000b', 2, 60),
  (2, 'Rose', false, '00000000-0000-4000-8000-00000000000b', null, 60),
  (2, 'Lisa', true, '00000000-0000-4000-8000-00000000000b', 1, 60),
  -- round C: nothing found (a give up at once)
  (2, 'Jisoo', false, '00000000-0000-4000-8000-00000000000c', null, 0),
  (2, 'Jennie', false, '00000000-0000-4000-8000-00000000000c', null, 0),
  (2, 'Rose', false, '00000000-0000-4000-8000-00000000000c', null, 0),
  (2, 'Lisa', false, '00000000-0000-4000-8000-00000000000c', null, 0),
  -- round D: perfect, Jennie first
  (2, 'Jisoo', true, '00000000-0000-4000-8000-00000000000d', 4, 22),
  (2, 'Jennie', true, '00000000-0000-4000-8000-00000000000d', 1, 22),
  (2, 'Rose', true, '00000000-0000-4000-8000-00000000000d', 2, 22),
  (2, 'Lisa', true, '00000000-0000-4000-8000-00000000000d', 3, 22);

select 'C09 stats after 4 v12 rounds = ' || public.name_all_round_stats(2)::text || ' (expected rounds 4, perfect 2, firsts Lisa 2 then Jennie 1)';
select 'C10 another group = ' || public.name_all_round_stats(3)::text || ' (expected rounds 0, perfect 0, firsts [])';
select 'C11 unknown group = ' || public.name_all_round_stats(999)::text || ' (expected rounds 0, perfect 0, firsts [])';
select 'C12 total rows = ' || count(*) || ' (expected 24)' from public.name_all_member_results;
select 'C13 partial index used for v12 rounds only = ' || pg_get_indexdef('public.idx_namr_v12_group_round'::regclass);
