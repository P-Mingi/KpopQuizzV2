\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
\set q '00000000-0000-0000-0000-0000000000b1'
\set a '00000000-0000-0000-0000-00000000000a'
\set b '00000000-0000-0000-0000-00000000000b'
\set c '00000000-0000-0000-0000-00000000000c'
select 'T01 first vote: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'b', :'a', 'voterhash-aaaaaaaa1');
select 'T02 same pair same day: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'b', :'b', 'voterhash-aaaaaaaa1');
select 'T03 same pair reversed: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'b', :'a', :'b', 'voterhash-aaaaaaaa1');
select 'T04 other voter: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'b', :'b', 'voterhash-bbbbbbbb2');
select 'T05 other pair same voter: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'c', :'c', 'voterhash-aaaaaaaa1');
select 'T06 winner not in pair: ' || status from duel_cast_song_vote(:'q', :'a', :'b', :'c', 'voterhash-cccccccc3');
select 'T07 same song twice: ' || status from duel_cast_song_vote(:'q', :'a', :'a', :'a', 'voterhash-cccccccc3');
select 'T08 song not in question: ' || status from duel_cast_song_vote(:'q', :'a', '00000000-0000-0000-0000-0000000000a1', :'a', 'voterhash-cccccccc3');
select 'T09 member question refused: ' || status from duel_cast_song_vote('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'voterhash-cccccccc3');
select 'T10 unknown question: ' || status from duel_cast_song_vote('00000000-0000-0000-0000-0000000000ff', :'a', :'b', :'a', 'voterhash-cccccccc3');
select 'T11 short voter hash: ' || status from duel_cast_song_vote(:'q', :'a', :'b', :'a', 'short');
select 'T12 null voter hash: ' || status from duel_cast_song_vote(:'q', :'a', :'b', :'a', null);
select 'T13 votes in log: ' || count(*) || ' (2 old + 3 accepted)' from duel_votes;
select 'T14 guard rows: ' || count(*) from duel_vote_guard;
select 'T15 guard pair keys ordered: ' || bool_and(split_part(pair_key, '|', 1) < split_part(pair_key, '|', 2)) from duel_vote_guard;
-- next day: the same voter may vote the same pair again
update duel_vote_guard set vote_day = vote_day - 1 where voter_hash = 'voterhash-aaaaaaaa1';
select 'T16 next day same pair: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'b', :'a', 'voterhash-aaaaaaaa1');
-- daily cap: 200 guard rows today for one voter, then refused
insert into duel_vote_guard (voter_hash, question_id, pair_key, vote_day) select 'voterhash-capcapcap', :'q', 'k' || n, (now() at time zone 'utc')::date from generate_series(1, 200) n;
select 'T17 daily cap: ' || status || ' ' || votes_a || '/' || votes_b from duel_cast_song_vote(:'q', :'a', :'b', :'a', 'voterhash-capcapcap');
select 'T18 votes in log after cap: ' || count(*) from duel_votes;
select 'T19 privileges anon/authenticated/service_role: ' || has_function_privilege('anon', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute') || '/' || has_function_privilege('authenticated', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute') || '/' || has_function_privilege('service_role', 'public.duel_cast_song_vote(uuid,uuid,uuid,uuid,text)', 'execute');
select 'T20 rls guard/rankings: ' || (select relrowsecurity from pg_class where relname = 'duel_vote_guard') || '/' || (select relrowsecurity from pg_class where relname = 'duel_song_rankings');
set role anon;
select 'T21 anon reads guard: ' || has_table_privilege('anon', 'public.duel_vote_guard', 'select');
reset role;
-- concurrency is covered by the primary key: a second insert of the same key is a no-op
select 'T22 old function untouched or absent: ' || count(*) from pg_proc where proname = 'cast_duel_vote';
