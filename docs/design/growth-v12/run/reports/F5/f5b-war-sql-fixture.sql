create role anon; create role authenticated; create role service_role;
create table public.groups(id int primary key, name text, slug text, logo_url text, display_color text);
create table public.quizzes(id int primary key, group_id int);
create table public.plays(id serial, quiz_id int, player_id uuid, created_at timestamptz);
create table public.editorial_accounts(user_id uuid, active boolean);
CREATE OR REPLACE FUNCTION public.is_editorial(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.editorial_accounts a WHERE a.user_id = uid AND a.active); $$;
grant select on groups, quizzes, plays to anon;
insert into groups values (1,'ATEEZ','ateez',null,'#1'),(2,'BTS','bts',null,'#2');
insert into quizzes values (10,1),(20,2);
-- team plays ATEEZ 5 times this week and once last week; a fan plays BTS 3, ATEEZ 2; one anonymous ATEEZ play
insert into plays(quiz_id,player_id,created_at) select 10,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()-interval '1 day' from generate_series(1,5);
insert into plays(quiz_id,player_id,created_at) select 20,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',now()-interval '1 day' from generate_series(1,3);
insert into plays(quiz_id,player_id,created_at) select 10,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',now()-interval '2 day' from generate_series(1,2);
insert into plays(quiz_id,player_id,created_at) values (10,null,now()-interval '1 day'),(20,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',now()-interval '9 day'),(10,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()-interval '9 day');
insert into editorial_accounts values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
