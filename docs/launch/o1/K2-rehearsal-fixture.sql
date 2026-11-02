-- K2-rehearsal-fixture.sql: rows that production holds and the local rehearsal does not (session-rehearsal.sh applies it before part K2).
-- Synthetic and only for the rehearsal: the 15 target groups of 021d with no idol row and no agency, the five groups of the 021b rows, and
-- the 12 021b rows as 021a and 021c leave them (inactive, waiting for review, with gender and debut year). Birth dates are
-- invented adult dates. Nothing here is a fact about a person.
set client_min_messages = warning;
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation) values
  ('NCT', 'nct', 'fan', '#cccccc', '#111111', 'SM Entertainment', '4th generation'),
  ('Kep1er', 'kep1er', 'fan', '#cccccc', '#111111', 'Wake One', '4th generation'),
  ('BABYMONSTER', 'babymonster', 'fan', '#cccccc', '#111111', 'YG Entertainment', '4th generation'),
  ('RIIZE', 'riize', 'fan', '#cccccc', '#111111', 'SM Entertainment', '4th generation'),
  ('FIFTY FIFTY', 'fifty-fifty', 'fan', '#cccccc', '#111111', 'Attrakt', '4th generation')
on conflict (slug) do nothing;
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label) values
  ('got7', 'got7', 'fan', '#cccccc', '#111111', 'JYP Entertainment'),
  ('monsta-x', 'monsta-x', 'fan', '#cccccc', '#111111', null),
  ('girls-generation', 'girls-generation', 'fan', '#cccccc', '#111111', null),
  ('zerobaseone', 'zerobaseone', 'fan', '#cccccc', '#111111', null),
  ('mamamoo', 'mamamoo', 'fan', '#cccccc', '#111111', null),
  ('bigbang', 'bigbang', 'fan', '#cccccc', '#111111', null),
  ('katseye', 'katseye', 'fan', '#cccccc', '#111111', null),
  ('illit', 'illit', 'fan', '#cccccc', '#111111', null),
  ('treasure', 'treasure', 'fan', '#cccccc', '#111111', null),
  ('tws', 'tws', 'fan', '#cccccc', '#111111', null),
  ('p1harmony', 'p1harmony', 'fan', '#cccccc', '#111111', null),
  ('cortis', 'cortis', 'fan', '#cccccc', '#111111', null),
  ('hearts2hearts', 'hearts2hearts', 'fan', '#cccccc', '#111111', null),
  ('team', 'team', 'fan', '#cccccc', '#111111', null),
  ('astro', 'astro', 'fan', '#cccccc', '#111111', null)
on conflict (slug) do nothing;
insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, ord, needs_review, review_reason, origin, gender, debut_year) values
  (82, (select id from public.groups where slug = 'nct'), 'Ten', date '1994-01-10', 'South Korea', array[]::text[], 'Q26451151', false, 82, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2016),
  (89, (select id from public.groups where slug = 'nct'), 'Qian Kun', date '1995-02-11', 'South Korea', array[]::text[], 'Q60644128', false, 89, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2017),
  (133, (select id from public.groups where slug = 'kep1er'), 'Kim Chae-hyun', date '1996-03-12', 'South Korea', array[]::text[], 'Q109108660', false, 133, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2018),
  (143, (select id from public.groups where slug = 'babymonster'), 'Pharita', date '1997-04-13', 'South Korea', array[]::text[], 'Q123554436', false, 143, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2019),
  (144, (select id from public.groups where slug = 'babymonster'), 'Asa', date '1998-05-14', 'South Korea', array[]::text[], 'Q123554438', false, 144, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2020),
  (145, (select id from public.groups where slug = 'babymonster'), 'Rami', date '1999-06-15', 'South Korea', array[]::text[], 'Q123554439', false, 145, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2021),
  (146, (select id from public.groups where slug = 'babymonster'), 'Rora', date '2000-07-16', 'South Korea', array[]::text[], 'Q123554440', false, 146, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2022),
  (148, (select id from public.groups where slug = 'babymonster'), 'Ahyeon', date '2001-08-17', 'South Korea', array[]::text[], 'Q123560890', false, 148, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2023),
  (151, (select id from public.groups where slug = 'riize'), 'Anton Lee', date '1994-09-18', 'South Korea', array[]::text[], 'Q123310101', false, 151, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2016),
  (152, (select id from public.groups where slug = 'riize'), 'Song Eun-seok', date '1995-01-10', 'South Korea', array[]::text[], 'Q123528880', false, 152, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2017),
  (153, (select id from public.groups where slug = 'riize'), 'Park Won-bin', date '1996-02-11', 'South Korea', array[]::text[], 'Q123528897', false, 153, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'female', 2018),
  (163, (select id from public.groups where slug = 'fifty-fifty'), 'Keena', date '1997-03-12', 'South Korea', array[]::text[], 'Q117178583', false, 163, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', 'male', 2019)
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.idols', 'id'), greatest((select max(id) from public.idols), 1));
