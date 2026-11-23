// KpopCards launch (owner, 2026-11-23): the KpopCards tab of /admin on bunnyverse.org/anime. One row for each account that has a KpopCards wallet, with
// its packs, its collection, its ads and its shards, and the totals above. The page has already passed the admin gate (requireAdmin) and read
// cards_admin_stats (SQL 128) with the service role (admin/page.tsx); this only draws the answer. Only a nickname and game figures are ever drawn. The filters and the sort are the URL, so a
// view is a bookmark; every control is a real link or a form field, so it works before any script.
import Link from 'next/link';

import { UxButton } from '@/components/ux-v1/button';
import {
  STATS_ADS, STATS_PAGE_SIZE, STATS_WINDOWS, fmtInt, fmtPct, fmtWhen, pagesOf, sortHref, statsHref,
} from '@/lib/cards/admin-stats';
import { withBasePath } from '@/lib/site/base-path';
import { REGISTRY } from '@/lib/site/registry';

import type { StatsAnswer, StatsQuery, StatsResult, StatsRow, StatsSort } from '@/lib/cards/admin-stats';

/** The columns of the table: the key the database sorts by, the heading, and the longer name for the hover and the screen reader. */
const COLS: ReadonlyArray<{ key: StatsSort; label: string; title: string }> = [
  { key: 'username', label: 'Player', title: 'Nickname' },
  { key: 'first_seen', label: 'First seen', title: 'First seen in KpopCards (UTC)' },
  { key: 'last_seen', label: 'Last seen', title: 'Last time the account used KpopCards (UTC)' },
  { key: 'last_pack', label: 'Last pack', title: 'Last pack opened (UTC)' },
  { key: 'level', label: 'Level', title: 'Level: one for every 10 different cards' },
  { key: 'packs', label: 'Packs', title: 'Packs opened, all time' },
  { key: 'packs_7d', label: '7 d', title: 'Packs opened in the last 7 days' },
  { key: 'src_stock', label: 'Stack', title: 'Packs opened from the stack (timer, ads and missions fill it)' },
  { key: 'src_focus', label: 'Focus', title: 'Group packs opened from the stack' },
  { key: 'src_daily', label: 'Daily', title: 'Packs of the day' },
  { key: 'src_shards', label: 'Shards', title: 'Packs bought with 50 shards' },
  { key: 'src_bonus', label: 'Bonus', title: 'Quiz and Kpopdle bonus packs' },
  { key: 'src_ad', label: 'Old ad', title: 'Packs of the first ad system (no longer given)' },
  { key: 'golden', label: 'Golden', title: 'Golden packs (every 10th pack)' },
  { key: 'guarantee', label: 'Gold card', title: 'Packs that held the Gold guarantee' },
  { key: 'cards', label: 'Cards', title: 'Different cards owned' },
  { key: 'pct', label: '% coll.', title: 'Share of the cards in the packs that the player owns' },
  { key: 'copies', label: 'Copies', title: 'All copies owned' },
  { key: 'dupes', label: 'Dupes', title: 'Copies beyond the first of each card' },
  { key: 'shards', label: 'Shard bal.', title: 'Shards in the wallet now' },
  { key: 'ads', label: 'Ads', title: 'Ads watched: ad packs given plus shard ads' },
  { key: 'crafted', label: 'Crafted', title: 'Cards crafted' },
  { key: 'recycled', label: 'Recycled', title: 'Copies recycled for shards' },
];

function cell(r: StatsRow, key: StatsSort): React.ReactNode {
  switch (key) {
    case 'username':
      // The player page lives on the hub, outside this build's /anime: an absolute address of the hub (a root-relative one is a base path
      // trap on this build, base-path-sinks.test.ts). The page itself says when a player keeps it private.
      return r.username
        ? <a href={`${REGISTRY.hub.url}/kpopcards/u/${encodeURIComponent(r.username)}`} className="anime-adm-kc-name">{r.username}</a>
        : <span className="anime-adm-kc-none">no nickname</span>;
    case 'first_seen': return fmtWhen(r.first_seen);
    case 'last_seen': return fmtWhen(r.last_seen);
    case 'last_pack': return fmtWhen(r.last_pack);
    case 'pct': return fmtPct(r.pct);
    default: return fmtInt(r[key] as number);
  }
}

export function CardsStatsTotals({ data }: { data: StatsAnswer }): React.ReactElement {
  const t = data.totals;
  const items: Array<[string, string, string?]> = [
    ['Players', fmtInt(t.players), 'Accounts with a KpopCards wallet'],
    ['Packs opened', fmtInt(t.packs_total)],
    ['Packs today', fmtInt(t.packs_today), 'Since midnight in Paris'],
    ['Packs, 7 days', fmtInt(t.packs_7d)],
    ['Ads watched', fmtInt(t.ads_total)],
    ['Ads today', fmtInt(t.ads_today), 'Since midnight in Paris'],
    ['Cards in packs', fmtInt(t.cards_in_packs), 'Cards of the catalog that a pack can give'],
    ['Average collection', fmtPct(t.avg_pct), 'Mean over every player, zero included'],
  ];
  return (
    <dl className="anime-adm-kc-totals" data-testid="cards-stats-totals">
      {items.map(([label, value, hint]) => (
        <div key={label} title={hint}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

function Filters({ query }: { query: StatsQuery }): React.ReactElement {
  return (
    <form method="get" action={withBasePath('/admin')} className="anime-adm-kc-filters" role="search" aria-label="Filter the players">
      <input type="hidden" name="tab" value="cards-stats" />
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="dir" value={query.dir} />
      <label className="anime-adm-kc-field"><span className="anime-adm-label">Nickname</span>
        <input type="search" name="q" defaultValue={query.q} maxLength={64} placeholder="Part of a nickname" autoComplete="off" />
      </label>
      <label className="anime-adm-kc-field"><span className="anime-adm-label">Last seen</span>
        <select name="w" defaultValue={query.window}>{STATS_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</select>
      </label>
      <label className="anime-adm-kc-field"><span className="anime-adm-label">Ads</span>
        <select name="ads" defaultValue={query.ads}>{STATS_ADS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
      </label>
      <label className="anime-adm-kc-field"><span className="anime-adm-label">Minimum packs</span>
        <input type="number" name="min" min={0} max={999999} step={1} defaultValue={query.min} inputMode="numeric" />
      </label>
      <div className="anime-adm-actions">
        <UxButton type="submit">Apply</UxButton>
        <Link className="anime-adm-hint" href="/admin?tab=cards-stats">Reset</Link>
      </div>
    </form>
  );
}

export function CardsStatsPager({ query, total }: { query: StatsQuery; total: number }): React.ReactElement {
  const pages = pagesOf(total);
  const from = total === 0 ? 0 : (query.page - 1) * STATS_PAGE_SIZE + 1;
  const to = Math.min(total, query.page * STATS_PAGE_SIZE);
  return (
    <nav className="anime-adm-kc-pager" aria-label="Pages of players">
      <span>{total === 0 ? 'No player' : `${fmtInt(from)} to ${fmtInt(to)} of ${fmtInt(total)} players`}</span>
      {query.page > 1 ? <Link href={statsHref(query, { page: query.page - 1 })} rel="prev">Previous</Link> : <span className="anime-adm-kc-off">Previous</span>}
      <span>Page {fmtInt(query.page)} of {fmtInt(pages)}</span>
      {query.page < pages ? <Link href={statsHref(query, { page: query.page + 1 })} rel="next">Next</Link> : <span className="anime-adm-kc-off">Next</span>}
    </nav>
  );
}

/** What the tab draws for an answer of the database (or its absence). Pure: the tests render it with made-up answers. */
export function CardsStatsView({ result, query }: { result: StatsResult; query: StatsQuery }): React.ReactElement {
  if (result.state === 'missing') {
    return (
      <section data-testid="cards-stats-missing">
        <h2 className="anime-adm-sub">KpopCards</h2>
        <p className="anime-adm-state">SQL 128 has to be applied. The figures come from the function cards_admin_stats, and the database does not have it yet. Run
          128-admin-stats.sql (docs/pending-migrations/cards) in the Supabase SQL Editor, then reload this tab. Nothing is shown until then.</p>
      </section>
    );
  }
  if (result.state === 'error') {
    return (
      <section data-testid="cards-stats-error">
        <h2 className="anime-adm-sub">KpopCards</h2>
        <p className="anime-adm-state">The KpopCards figures could not be read. Reload the tab in a moment.</p>
      </section>
    );
  }
  const { data } = result;
  return (
    <section data-testid="cards-stats">
      <h2 className="anime-adm-sub">KpopCards</h2>
      <CardsStatsTotals data={data} />
      <Filters query={query} />
      <p className="anime-adm-counts" data-testid="cards-stats-count">{fmtInt(data.total)} {data.total === 1 ? 'player' : 'players'} match</p>
      {data.rows.length === 0 ? (
        <p className="anime-adm-state">No player matches these filters.</p>
      ) : (
        <div className="anime-adm-kc-scroll" tabIndex={0} role="region" aria-label="Players, one row each">
          <table className="anime-adm-kc-table">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} scope="col" title={c.title} aria-sort={query.sort === c.key ? (query.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <Link href={sortHref(query, c.key)} aria-label={`Sort by ${c.title}`}>{c.label}{query.sort === c.key ? (query.dir === 'asc' ? ' ↑' : ' ↓') : ''}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={`${r.username ?? 'none'}-${r.first_seen}-${i}`}>
                  {COLS.map((c) => (c.key === 'username' ? <th key={c.key} scope="row">{cell(r, c.key)}</th> : <td key={c.key}>{cell(r, c.key)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CardsStatsPager query={query} total={data.total} />
      <p className="anime-adm-hint">
        Times are UTC. Ads watched are the ad packs given plus the shard ads; an ad refused for the daily limit is not counted. Packs from the stack include the ones
        the timer, the ads and the missions filled, which the database does not tell apart. Level is one for every 10 different cards. A player page may be private.
      </p>
    </section>
  );
}
