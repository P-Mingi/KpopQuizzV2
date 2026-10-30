# Contract: the Otakudle character facts of lot A1 (run O1, 2026-10-30)

Between O1 (the daily games) and the old worker (lot A1, the facts). Owner decision of 2026-10-30: Otakudle (the character of the day,
every series) opens on launch day with Bunnyverse and OtakuQuiz. Its pool is the published characters of the 50 launch series; lot A1
supplies the facts the game compares that the database does not hold yet. This file fixes where they go, in what form, and how they are
checked. A change to it is a CR in `docs/o1/LEDGER.md`.

## 1. The columns of Otakudle and where each one comes from

Report `RAPPORT-JEUX-DU-JOUR-v2.md` 5.5 and the owner's list of 2026-10-30 (series, gender, species, role at the start, demographic, debut
year, studio). Values are as the reader first meets the character: never a later reveal. When a value is not known for sure from a source,
it is left out (null), and the character is simply not a target.

| column | kind | near when | comes from |
|---|---|---|---|
| Series | single | the same franchise | `characters.group_id` (L04), already there |
| Gender | single | | **A1**: `character_facts.gender` |
| Species at the first appearance | single | | **A1**: `character_facts.species` |
| Role at the first appearance | single | | **A1**: `character_facts.role_at_debut` |
| Demographic | single | | **A1**: `series_facts.demographic` |
| Year of the work | number | 2 years apart at most | `series` (L04): `manga_start_year`, or `anime_start_year` for an anime original |
| Studio of the first adaptation | multi | one in common | `series.studios` (L04): the studios whose `seasons` contain 1 |

Hints (optional, shown after errors): first appearance after 5 errors (**A1**: `character_facts.first_appearance`), Japanese voice actor
after 8 (**A1**: `character_facts.voice_actor_ja`), initial after 12 (from the name).

## 2. The two tables (O1 creates them; A1 only writes rows)

O1's migration `023-dle-otakudle.sql` creates them in session G, right after `022-photos-admin.sql` (SQL-ORDER row 14g once it lands), with
the view `dle_src_anime_character` and the game row `otakudle` (switched off). RLS on, no policy, closed to anon and authenticated, open to
service_role: the browser reads the pool only through `dle_pool`. The DDL, exactly (to try A1's file on a local copy before 023 is on main):

```sql
create table if not exists public.character_facts (
  character_id integer primary key references public.characters(id) on delete cascade,
  gender text check (gender in ('female', 'male')),
  species text check (species ~ '^[a-z][a-z0-9-]{0,39}$'),
  role_at_debut text check (role_at_debut in ('main', 'supporting', 'antagonist', 'other')),
  first_appearance text check (char_length(first_appearance) between 1 and 80),
  voice_actor_ja text check (char_length(voice_actor_ja) between 1 and 80),
  updated_at timestamptz not null default now()
);
create table if not exists public.series_facts (
  group_id integer primary key references public.series(group_id) on delete cascade,
  demographic text not null check (demographic in ('shonen', 'shojo', 'seinen', 'josei', 'kodomo', 'none')),
  updated_at timestamptz not null default now()
);
```

Value rules:
- `gender`: 'female' or 'male', lower case, as the work presents the character at the first appearance; anything else is left null.
- `species`: one English word or hyphenated words, lower case (`human`, `demon`, `shinigami`, `hollow`, `elf`, `robot`, `alien`...), at the
  first appearance. A species the story reveals later (a human who turns out to be a titan, a hidden demon) is the species shown first.
  The values of one series must be consistent with each other: the same word for the same thing.
- `role_at_debut`: the same four words as `characters.role`, judged at the first appearance, not at the end of the story.
- `first_appearance`: short, no spoiler, in English: `Chapter 1`, `Episode 3`, `Chapter 1 / Episode 1`.
- `voice_actor_ja`: the Japanese voice actor of the first adaptation, as written in the credits (romanized).
- `demographic`: the magazine's demographic of the original work; `none` for an anime original or a webtoon.

Which characters: `characters.status = 'published'`, `spoiler_level = 0` and `identity_spoiler = false` only. A row for any other character is
never read (the view leaves it out) and the check below counts it as an error.

## 3. The file

- Name: `docs/pending-migrations/multisite/launch/L13-A1-character-facts.sql`, with `L13-A1-character-facts.rollback.sql`.
- Order: launch day, part J4 of `docs/launch/o1/session.sh`, right after L12 (owner order 2026-10-30). It needs L04 (series and characters)
  and 023 (the two tables).
- Form: the header of the other launch files (What, Needs, Verify, Undo, `-- o1-transaction: single`), `set lock_timeout = '5s'`, then
  upserts only:
  - a character is found by its series slug and its own slug, never by id:
    `(select c.id from public.characters c join public.groups g on g.id = c.group_id where g.site_id = 'anime' and g.slug = '<series>' and c.slug = '<character>')`;
  - `insert ... on conflict (character_id) do update set ...` and `insert ... on conflict (group_id) do update set ...`, so a second run
    changes nothing;
  - one `public.entity_sources` row per stored value, as L05 writes them: `entity_type` 'character' (entity_id the character slug) or
    'series' (entity_id the series slug), `field` the column name (`gender`, `species`, `role_at_debut`, `first_appearance`,
    `voice_actor_ja`, `demographic`), `source`, `source_ref`, `source_url`, `fetched_at`, `on conflict (entity_type, entity_id, field, source) do update`.
- It touches no other table, no row of L01 to L12, and no kpop row.
- The rollback deletes the rows of the 50 launch series from the two tables and their `entity_sources` rows with these fields, and refuses
  once the game `otakudle` has a play.
- Only verified values, as the launch files: no DRAFTS file ever reaches `main` for production.

## 4. The check after it (`docs/launch/o1/checks/V-L13.sql`, written by O1 with 023)

Read only. Each row is ok or KO and a count, never a name.

```sql
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'démographie : les 50 séries de lancement', (select count(*) = 50 from public.series_facts f join public.groups g on g.id = f.group_id where g.site_id = 'anime'), (select count(*)::text from public.series_facts)),
  (2, 'faits de personnages hors du pool (brouillon, spoiler) : 0', (select count(*) = 0 from public.character_facts f join public.characters c on c.id = f.character_id where c.status <> 'published' or c.spoiler_level > 0 or c.identity_spoiler), null),
  (3, 'valeurs sans source : 0', (select count(*) = 0 from public.character_facts f join public.characters c on c.id = f.character_id, lateral (values ('gender', f.gender), ('species', f.species), ('role_at_debut', f.role_at_debut)) v(field, val) where v.val is not null and not exists (select 1 from public.entity_sources s where s.entity_type = 'character' and s.entity_id = c.slug and s.field = v.field)), null),
  (4, 'personnages avec les 7 colonnes (information)', true, (select count(*)::text from public.dle_src_anime_character s where not exists (select 1 from public.dle_attributes a where a.game_id = 'otakudle' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0))),
  (5, 'le pool atteint le minimum de otakudle', (select count(*) >= (select min_pool from public.dle_games where id = 'otakudle') from public.dle_src_anime_character s where not exists (select 1 from public.dle_attributes a where a.game_id = 'otakudle' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)), null)
) as c(n, what, ok, got) order by n;
rollback;
```

`session.sh J4` then runs the launch counts again (`content-verify.sql` must not move) and V-S4. Otakudle is activated on launch day after
these files, by O1's step (never by A1's file).
