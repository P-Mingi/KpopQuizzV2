// The "-- Verify:" header lines of L21, L22 and L23 and of their rollbacks (owner, 2026-11-09): a read-only query the owner pastes after
// the apply, and the value it returns. up = after the file, down = after its rollback. NULL means the query returns a null (or no row).
// The pglite tests (apps/quiz/src/lib/dle/verify-lines.test.ts) parse these lines out of the generated files and run every one of them.
const CG = (game, slug, expr) => `select ${expr} from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = '${game}' and c.slug = '${slug}';`;
const CF = (slug, col) => `select f.${col} from public.character_facts f join public.characters c on c.id = f.character_id where c.slug = '${slug}';`;
const SERIES = (slug, expr, table) => `select ${expr} from public.${table} t join public.groups g on g.id = t.group_id and g.site_id = 'anime' where g.slug = '${slug}';`;

/** Query text only; the expected values are in VALUES below. */
export const VERIFY = {
  L21: [
    { k: 'op-answers', q: `select count(*) from public.dle_entities where game_id = 'otakudle-one-piece' and can_be_target and in_pool;` },
    { k: 'op-newworld', q: `select count(*) from public.character_game_facts where game_id = 'otakudle-one-piece' and attrs -> 'sea_of_origin' ->> 'v' = 'New World';` },
    { k: 'db-animal', q: `select count(*) from public.character_game_facts where game_id = 'otakudle-dragon-ball' and attrs -> 'race' ->> 'v' = 'Animal';` },
    { k: 'garp', q: CG('otakudle-one-piece', 'monkey-d-garp', `f.attrs -> 'bounty' ->> 'l'`) },
    { k: 'luffy', q: CG('otakudle-one-piece', 'monkey-d-luffy', `f.hints ->> 'devil_fruit_name'`) },
    { k: 'cell', q: CG('otakudle-dragon-ball', 'cell', `f.attrs -> 'race' ->> 'v'`) },
  ],
  L22: [
    { k: 'answers', q: `select count(*) from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool;` },
    { k: 'featured', q: `select count(*) from public.character_facts where featured;` },
    { k: 'roles', q: `select count(*) from public.character_facts where role_at_debut is not null;` },
    { k: 'ginyu', q: CF('captain-ginyu', 'gender') },
    { k: 'raditz', q: CF('raditz', 'voice_actor_ja') },
    { k: 'kaneki', q: `select count(*) from public.character_facts f join public.characters c on c.id = f.character_id where c.slug = 'ken-kaneki';` },
  ],
  L23: [
    { k: 'hxh-year', q: SERIES('hunter-x-hunter', 't.anime_start_year', 'series') },
    { k: 'fb-year', q: SERIES('fruits-basket', 't.anime_start_year', 'series') },
    { k: 'sources', q: `select count(*) from public.entity_sources where entity_type = 'series' and field in ('otakudle.work_year', 'otakudle.first_studios', 'otakudle.anime_start_year');` },
    { k: 'apothecary', q: SERIES('apothecary-diaries', 't.work_year', 'series_facts') },
    { k: 'gon-studio', q: `select e.attrs -> 'studio' ->> 'v' from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = 'gon-freecss';` },
    { k: 'column', q: `select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'series_facts' and column_name = 'first_studios';` },
  ],
};

/** The values the files give on the real chain (read from the pglite run, then pinned by the test): { up: after the file, down: after its rollback }. */
export const VALUES = {
  L21: {
    'op-answers': { up: 72, down: 73 }, 'op-newworld': { up: 0, down: 7 },
    'db-animal': { up: 3, down: 0 }, garp: { up: 'No bounty', down: null }, luffy: { up: 'Human-Human Fruit, Model: Nika', down: 'Gum-Gum Fruit' }, cell: { up: 'Android', down: 'Saiyan' },
  },
  L22: {
    answers: { up: 204, down: 185 }, featured: { up: 208, down: 200 }, roles: { up: 725, down: 715 }, ginyu: { up: 'male', down: 'female' },
    raditz: { up: 'Shigeru Chiba', down: 'Masako Nozawa' }, kaneki: { up: 1, down: 0 },
  },
  L23: {
    'hxh-year': { up: 1999, down: 2011 }, 'fb-year': { up: 2001, down: 2019 }, sources: { up: 8, down: 0 }, apothecary: { up: 2011, down: null },
    'gon-studio': { up: '["Nippon Animation"]', down: '["Madhouse"]' }, column: { up: 1, down: 0 },
  },
};

/** The header lines of one file. values: { key: { up, down } }; dir: 'up' for the forward file, 'down' for its rollback. */
export function verifyLines(file, dir) {
  const values = VALUES[file];
  return VERIFY[file].map((v) => {
    const x = values[v.k]?.[dir];
    if (x === undefined) throw new Error(`${file}: no ${dir} value for ${v.k}`);
    return `-- Verify: ${v.q}   expect ${x === null ? 'NULL' : x}`;
  });
}
