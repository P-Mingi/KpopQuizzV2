'use client';

import { useState, useMemo } from 'react';
import { CardTile } from '@/components/cards/card-tile';
import { GROUPS, RARITY_CONFIG } from '@/lib/cards/constants';

interface Card {
  id: string;
  slug: string;
  name: string;
  idol_name: string | null;
  group_name: string;
  group_slug: string;
  rarity: string;
  art_url: string | null;
  tags: string[];
  position: string | null;
  card_number: number;
}

interface Props {
  cards: Card[];
  ownedIds: string[];
}

export function CollectionGrid({ cards, ownedIds }: Props) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'owned' | 'missing'>('all');

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const totalOwned = ownedIds.length;
  const totalMissing = cards.length - totalOwned;

  const filtered = useMemo(() => {
    let list = [...cards];
    if (groupFilter) list = list.filter(c => c.group_slug === groupFilter);
    if (rarityFilter) list = list.filter(c => c.rarity === rarityFilter);
    if (statusFilter === 'owned') list = list.filter(c => ownedSet.has(c.id));
    if (statusFilter === 'missing') list = list.filter(c => !ownedSet.has(c.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.idol_name?.toLowerCase().includes(q) ?? false) ||
        c.group_name.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cards, groupFilter, rarityFilter, statusFilter, search, ownedSet]);

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search cards, idols, groups..."
        className="w-full px-4 py-2.5 rounded-xl border border-default bg-surface text-sm mb-3"
      />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Group */}
        {GROUPS.map(g => (
          <button key={g.slug}
            onClick={() => setGroupFilter(groupFilter === g.slug ? '' : g.slug)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              groupFilter === g.slug ? 'bg-accent text-white border-accent' : 'bg-surface text-secondary border-default hover:border-accent'
            }`}>
            {g.abbr}
          </button>
        ))}
        <div className="w-px bg-default mx-1" />
        {/* Rarity */}
        {(['R', 'S', 'SS', 'SSS'] as const).map(r => (
          <button key={r}
            onClick={() => setRarityFilter(rarityFilter === r ? '' : r)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-colors"
            style={{
              background: rarityFilter === r ? RARITY_CONFIG[r].badgeBg : undefined,
              color: rarityFilter === r ? RARITY_CONFIG[r].badgeText : RARITY_CONFIG[r].color,
              borderColor: rarityFilter === r ? RARITY_CONFIG[r].color : 'var(--border)',
            }}>
            {r}
          </button>
        ))}
        <div className="w-px bg-default mx-1" />
        {/* Status */}
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'owned' as const, label: `Owned (${totalOwned})` },
          { key: 'missing' as const, label: `Missing (${totalMissing})` },
        ].map(s => (
          <button key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              statusFilter === s.key && s.key !== 'all' ? 'bg-accent text-white border-accent' : 'bg-surface text-secondary border-default hover:border-accent'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-ghost mb-3">Showing {filtered.length} cards</p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {filtered.map(card => (
            <CardTile
              key={card.id}
              card={card}
              owned={ownedSet.has(card.id)}
              size="md"
              linkTo={`/cards/${card.group_slug}/${card.slug}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">{'\uD83C\uDCCF'}</p>
          <p className="text-sm text-tertiary mb-2">No cards match your filters</p>
          <button
            onClick={() => { setSearch(''); setGroupFilter(''); setRarityFilter(''); setStatusFilter('all'); }}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
