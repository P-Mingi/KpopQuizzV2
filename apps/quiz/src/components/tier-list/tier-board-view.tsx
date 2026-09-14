import type { StoredList } from '@/lib/tier-list/db';
import type { TierListItem } from '@/lib/tier-list/types';

// The read-only ranking board, shared by the public list page and the owner-view
// (private) page so both render an identical board. No emoji; missing photos fall
// back to an initials tile.

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function Face({ item }: { item: TierListItem }) {
  return (
    <div className="tl-face tl-face-72">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.image_url ? <img src={item.image_url} alt="" referrerPolicy="no-referrer" /> : <span className="tl-ini">{initials(item.name)}</span>}
      <span className="tl-nm">{item.name}</span>
    </div>
  );
}

export function TierBoardView({ list, byId }: { list: StoredList; byId: Map<string, TierListItem> }) {
  return (
    <div className="tl-card" style={{ padding: 20 }} data-testid="tl-public-board">
      <div className="tl-board">
        {list.tiers.map((t) => {
          const rowItems = (list.placements[t.label] ?? []).map((id) => byId.get(id)).filter(Boolean) as TierListItem[];
          return (
            <div className="tl-tier" key={t.label}>
              <div className="tl-tlabel" style={{ background: t.color }}>{t.label}</div>
              <div className={`tl-tstrip${rowItems.length === 0 ? ' empty' : ''}`}>
                {rowItems.length === 0 ? 'No picks in this tier' : rowItems.map((it) => <Face key={it.id} item={it} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
