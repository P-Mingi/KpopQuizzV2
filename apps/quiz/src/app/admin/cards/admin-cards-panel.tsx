'use client';

import { useState, useMemo } from 'react';
import { CardTile } from '@/components/cards/card-tile';

interface Card {
  id: string;
  card_number: number;
  slug: string;
  name: string;
  idol_name: string | null;
  group_name: string;
  group_slug: string;
  position: string | null;
  era: string | null;
  description: string | null;
  tags: string[];
  rarity: string;
  art_url: string | null;
  is_published: boolean;
  is_limited: boolean;
  idol_info: Record<string, string> | null;
}

interface Pack {
  id: string;
  slug: string;
  name: string;
  pack_type: string;
  group_slug: string | null;
  cost: number;
  card_count: number;
  r_rate: number;
  s_rate: number;
  ss_rate: number;
  sss_rate: number;
  is_active: boolean;
  rotation_order: number | null;
}

interface Economy {
  totalByeol: number;
  avgBalance: number;
  totalPacksOpened: number;
  totalCardsCollected: number;
  totalUsers: number;
  pityTriggers: number;
}

interface Rotation {
  groupSlug: string;
  groupName: string;
  nextGroupSlug: string;
  nextGroupName: string;
  endsAt: string;
  weekNumber: number;
}

interface Props {
  initialData: {
    cards: Card[];
    packs: Pack[];
    economy: Economy;
    recentOpens: Array<Record<string, unknown>>;
    cardFrequency: Record<string, number>;
    rotation: Rotation;
  };
}

const RARITY_COLORS: Record<string, string> = {
  R: '#6B7280',
  S: '#2563EB',
  SS: '#9333EA',
  SSS: '#F59E0B',
};

const GROUP_OPTIONS = ['bts', 'blackpink', 'aespa', 'stray-kids', 'newjeans'];

export function AdminCardsPanel({ initialData }: Props) {
  const [tab, setTab] = useState<'cards' | 'packs' | 'economy'>('cards');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [saving, setSaving] = useState(false);

  const { cards, packs, economy, rotation, cardFrequency } = initialData;

  const filteredCards = useMemo(() => {
    let list = [...cards];
    if (groupFilter) list = list.filter(c => c.group_slug === groupFilter);
    if (rarityFilter) list = list.filter(c => c.rarity === rarityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.group_name.toLowerCase().includes(q));
    }
    return list;
  }, [cards, groupFilter, rarityFilter, search]);

  // Stats per group
  const groupStats = useMemo(() => {
    const gs: Record<string, { total: number; r: number; s: number; ss: number; sss: number }> = {};
    for (const c of cards) {
      if (!gs[c.group_slug]) gs[c.group_slug] = { total: 0, r: 0, s: 0, ss: 0, sss: 0 };
      gs[c.group_slug]!.total++;
      gs[c.group_slug]![c.rarity.toLowerCase() as 'r' | 's' | 'ss' | 'sss']++;
    }
    return gs;
  }, [cards]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-elevated rounded-lg p-[3px]">
        {(['cards', 'packs', 'economy'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors capitalize ${
              tab === t ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
            }`}
          >
            {t === 'cards' ? `Cards (${cards.length})` : t === 'packs' ? `Packs (${packs.length})` : 'Economy'}
          </button>
        ))}
      </div>

      {/* Cards tab */}
      {tab === 'cards' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cards..."
              className="px-3 py-2 rounded-lg border border-default bg-surface text-sm flex-1 min-w-[200px]"
            />
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-sm"
            >
              <option value="">All groups</option>
              {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={rarityFilter}
              onChange={e => setRarityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-sm"
            >
              <option value="">All rarities</option>
              <option value="R">R</option>
              <option value="S">S</option>
              <option value="SS">SS</option>
              <option value="SSS">SSS</option>
            </select>
          </div>

          {/* Group summary */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {Object.entries(groupStats).map(([slug, stats]) => (
              <div key={slug} className="p-2.5 rounded-lg bg-surface border border-default text-center">
                <p className="text-[10px] font-medium text-tertiary uppercase">{slug}</p>
                <p className="text-lg font-bold">{stats.total}</p>
                <div className="flex justify-center gap-1.5 text-[9px] mt-1">
                  <span style={{ color: RARITY_COLORS.R }}>R:{stats.r}</span>
                  <span style={{ color: RARITY_COLORS.S }}>S:{stats.s}</span>
                  <span style={{ color: RARITY_COLORS.SS }}>SS:{stats.ss}</span>
                  <span style={{ color: RARITY_COLORS.SSS }}>SSS:{stats.sss}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Card table */}
          <div className="overflow-x-auto border border-default rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-elevated text-left">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">Rarity</th>
                  <th className="px-3 py-2 font-medium">Era</th>
                  <th className="px-3 py-2 font-medium">Art</th>
                  <th className="px-3 py-2 font-medium">Collected</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(card => (
                  <tr key={card.id} className="border-t border-default hover:bg-elevated/50">
                    <td className="px-3 py-2 tabular-nums text-tertiary">{card.card_number}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{card.name}</p>
                      {card.idol_name && <p className="text-[10px] text-tertiary">{card.idol_name}</p>}
                    </td>
                    <td className="px-3 py-2 text-secondary">{card.group_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: RARITY_COLORS[card.rarity] ?? '#888' }}
                      >
                        {card.rarity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-secondary">{card.era ?? '-'}</td>
                    <td className="px-3 py-2">
                      {card.art_url ? (
                        <div className="w-8 h-10 rounded overflow-hidden bg-elevated">
                          <img src={card.art_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-ghost">--</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-secondary">
                      {cardFrequency[card.id] ?? 0}x
                    </td>
                    <td className="px-3 py-2">
                      <span className={`w-2 h-2 rounded-full inline-block ${card.is_published ? 'bg-correct' : 'bg-wrong'}`} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setEditingCard(card)}
                        className="text-[10px] font-medium text-accent hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-ghost mt-2">{filteredCards.length} cards shown</p>
        </div>
      )}

      {/* Packs tab */}
      {tab === 'packs' && (
        <div>
          {/* Rotation status */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 mb-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Group Pack Rotation</p>
            <p className="text-sm font-bold text-amber-900">
              Current: {rotation.groupName} (Week {rotation.weekNumber})
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Next: {rotation.nextGroupName} &middot; Rotates {new Date(rotation.endsAt).toLocaleDateString()}
            </p>
            <p className="text-[10px] text-amber-600 mt-2">
              Rotation: BTS &rarr; BLACKPINK &rarr; aespa &rarr; Stray Kids &rarr; NewJeans (auto, weekly)
            </p>
          </div>

          {/* Pack list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {packs.map(pack => (
              <div key={pack.id} className="p-4 rounded-xl border border-default bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{pack.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    pack.is_active || pack.pack_type === 'standard'
                      ? 'bg-[#EAF3DE] text-[#27500A]'
                      : pack.group_slug === rotation.groupSlug
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-elevated text-ghost'
                  }`}>
                    {pack.is_active || pack.pack_type === 'standard'
                      ? 'Active'
                      : pack.group_slug === rotation.groupSlug
                        ? 'This week'
                        : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-tertiary">Cost:</span>{' '}
                    <span className="font-medium">{pack.cost} B</span>
                  </div>
                  <div>
                    <span className="text-tertiary">Cards:</span>{' '}
                    <span className="font-medium">{pack.card_count}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 text-[10px] text-tertiary">
                  <span>R:{Math.round(pack.r_rate * 100)}%</span>
                  <span>S:{Math.round(pack.s_rate * 100)}%</span>
                  <span>SS:{Math.round(pack.ss_rate * 100)}%</span>
                  <span>SSS:{Math.round(pack.sss_rate * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Economy tab */}
      {tab === 'economy' && (
        <div>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Byeol in circulation', value: economy.totalByeol.toLocaleString(), icon: '&#11088;' },
              { label: 'Average balance/user', value: economy.avgBalance.toLocaleString(), icon: '&#128181;' },
              { label: 'Total packs opened', value: economy.totalPacksOpened.toLocaleString(), icon: '&#127183;' },
              { label: 'Total cards collected', value: economy.totalCardsCollected.toLocaleString(), icon: '&#127871;' },
              { label: 'Users with Byeol', value: economy.totalUsers.toLocaleString(), icon: '&#128100;' },
              { label: 'Pity triggers', value: economy.pityTriggers.toLocaleString(), icon: '&#128532;' },
            ].map(kpi => (
              <div key={kpi.label} className="p-4 rounded-xl border border-default bg-surface">
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold tabular-nums" dangerouslySetInnerHTML={{ __html: kpi.icon + ' ' + kpi.value }} />
              </div>
            ))}
          </div>

          {/* Byeol reward table */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Byeol reward rates</h3>
            <div className="overflow-x-auto border border-default rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-elevated text-left">
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Quiz complete (pass)', '30-50 B'],
                    ['Daily quiz', '50 B'],
                    ['Daily quiz perfect', '80 B'],
                    ['Blind test play', '30 B'],
                    ['Name All (partial)', '20 B'],
                    ['Name All (perfect)', '50 B'],
                    ['This or That', '20 B'],
                    ['Quiz creation', '30 B (first: 80)'],
                    ['Daily login', '20 B'],
                    ['7-day streak', '100 B'],
                    ['Level up', '100 B'],
                    ['XP conversion', '10 B per 100 XP'],
                    ['Duplicate card refund', 'R:15, S:30, SS:60, SSS:200'],
                  ].map(([source, amount]) => (
                    <tr key={source} className="border-t border-default">
                      <td className="px-3 py-2">{source}</td>
                      <td className="px-3 py-2 font-medium tabular-nums">{amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Card editor modal */}
      {editingCard && (
        <CardEditor
          card={editingCard}
          saving={saving}
          onSave={async (updated) => {
            setSaving(true);
            try {
              const { createBrowserClient } = await import('@/lib/supabase/client');
              const supabase = createBrowserClient();
              const { error } = await supabase
                .from('dev_cards')
                .update({
                  name: updated.name,
                  idol_name: updated.idol_name || null,
                  group_name: updated.group_name,
                  group_slug: updated.group_slug,
                  position: updated.position || null,
                  era: updated.era || null,
                  description: updated.description || null,
                  tags: updated.tags,
                  rarity: updated.rarity,
                  art_url: updated.art_url || null,
                  is_published: updated.is_published,
                  idol_info: updated.idol_info || {},
                })
                .eq('id', updated.id);
              if (error) alert('Save failed: ' + error.message);
              else {
                alert('Card saved!');
                window.location.reload();
              }
            } catch (err) {
              alert('Error: ' + String(err));
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}

// ─── Card Editor Modal ───

function CardEditor({ card, saving, onSave, onClose }: {
  card: Card;
  saving: boolean;
  onSave: (card: Card) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...card });
  const [tagsStr, setTagsStr] = useState((card.tags ?? []).join(', '));
  const [uploading, setUploading] = useState(false);

  function updateField(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const { createBrowserClient } = await import('@/lib/supabase/client');
      const supabase = createBrowserClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `card-art/${card.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('quiz-images').upload(path, file, { upsert: true });
      if (uploadErr) { alert('Upload failed: ' + uploadErr.message); return; }
      const { data: urlData } = supabase.storage.from('quiz-images').getPublicUrl(path);
      updateField('art_url', urlData.publicUrl);
    } catch (err) {
      alert('Upload error: ' + String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-primary rounded-2xl shadow-xl border border-default w-full max-w-3xl mx-4 mb-12">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default">
          <h2 className="text-sm font-bold">Edit Card #{card.card_number}</h2>
          <button onClick={onClose} className="text-tertiary hover:text-primary text-lg">&times;</button>
        </div>

        <div className="p-5 flex gap-6">
          {/* Left: Live preview */}
          <div className="flex-shrink-0 w-[200px]">
            <p className="text-[10px] font-semibold text-ghost uppercase tracking-wider mb-2">Live preview</p>
            <div className="w-[200px]">
              <CardTile
                card={{
                  name: form.name || 'Card Name',
                  rarity: form.rarity || 'R',
                  group_slug: form.group_slug || 'blackpink',
                  group_name: form.group_name || '',
                  art_url: form.art_url || null,
                  tags: form.tags ?? [],
                  position: form.position,
                  card_number: form.card_number,
                }}
                owned={true}
                size="lg"
                showHoverEffect={false}
              />
            </div>

            {/* Image upload */}
            <div className="mt-3">
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-default rounded-lg p-3 text-center hover:border-accent transition-colors">
                  {uploading ? (
                    <span className="text-xs text-tertiary">Uploading...</span>
                  ) : (
                    <span className="text-xs text-secondary">
                      {form.art_url ? 'Replace photo' : 'Upload photo'}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
              {form.art_url && (
                <button
                  onClick={() => updateField('art_url', null)}
                  className="text-[10px] text-wrong mt-1 hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Right: Form fields */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={v => updateField('name', v)} />
            <Field label="Idol name" value={form.idol_name ?? ''} onChange={v => updateField('idol_name', v)} />

            <div>
              <label className="text-[10px] font-medium text-ghost block mb-1">Group</label>
              <select
                value={form.group_slug}
                onChange={e => {
                  const slug = e.target.value;
                  const names: Record<string, string> = { bts: 'BTS', blackpink: 'BLACKPINK', aespa: 'aespa', 'stray-kids': 'Stray Kids', newjeans: 'NewJeans' };
                  updateField('group_slug', slug);
                  updateField('group_name', names[slug] ?? slug);
                }}
                className="w-full px-3 py-2 rounded-lg border border-default bg-surface text-sm"
              >
                {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-medium text-ghost block mb-1">Rarity</label>
              <select
                value={form.rarity}
                onChange={e => updateField('rarity', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-default bg-surface text-sm"
              >
                {['R', 'S', 'SS', 'SSS'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <Field label="Position" value={form.position ?? ''} onChange={v => updateField('position', v)} />
            <Field label="Era" value={form.era ?? ''} onChange={v => updateField('era', v)} />

            <div className="col-span-2">
              <Field label="Tags (comma separated)" value={tagsStr} onChange={v => {
                setTagsStr(v);
                updateField('tags', v.split(',').map((t: string) => t.trim()).filter(Boolean));
              }} />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-medium text-ghost block mb-1">Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => updateField('description', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-default bg-surface text-sm h-16 resize-y"
              />
            </div>

            <div className="col-span-2">
              <Field label="Art URL (or upload above)" value={form.art_url ?? ''} onChange={v => updateField('art_url', v)} />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => updateField('is_published', e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs text-secondary">Published</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save card'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-default text-xs font-medium text-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-ghost block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-default bg-surface text-sm"
      />
    </div>
  );
}
