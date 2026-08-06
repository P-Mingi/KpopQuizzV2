'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Admin: Game Image Manager
// Three sections:
//   1. Game page headers (the gradient art above the game player)
//   2. Game hub card covers (the /games hub tiles)
//   3. Idol images for name-all-members games (the monogram circles)
// ---------------------------------------------------------------------------

interface GameImageSlot {
  key: string;
  label: string;
  current: string | null;
}

interface NameAllGame {
  id: string;
  slug: string;
  title: string;
  members: Array<{ name: string; photo_url: string | null; position: string }>;
  cover_url: string | null;
}

interface GroupItem {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  display_color: string;
  text_color: string;
}

interface Props {
  headerSlots: GameImageSlot[];
  hubSlots: GameImageSlot[];
  nameAllGames: NameAllGame[];
  groups: GroupItem[];
}

// ---------------------------------------------------------------------------
// Shared upload logic
// ---------------------------------------------------------------------------
async function uploadImage(file: File, key: string): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('key', key);
  const res = await fetch('/api/admin/game-image', { method: 'POST', body: fd });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    alert(data.error ?? 'Upload failed');
    return null;
  }
  return data.url;
}

// ---------------------------------------------------------------------------
// Upload button component
// ---------------------------------------------------------------------------
function UploadBtn({ label, imageKey, onUploaded }: { label: string; imageKey: string; onUploaded: (url: string) => void }): React.ReactElement {
  const [busy, setBusy] = useState(false);

  const pick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      const url = await uploadImage(f, imageKey);
      setBusy(false);
      if (url) onUploaded(url);
    };
    input.click();
  }, [imageKey, onUploaded]);

  return (
    <button type="button" onClick={pick} disabled={busy} style={btnStyle}>
      {busy ? 'Uploading...' : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section: Game Headers / Hub Covers
// ---------------------------------------------------------------------------
function ImageSlotSection({ title, desc, slots: initial }: { title: string; desc: string; slots: GameImageSlot[] }): React.ReactElement {
  const [slots, setSlots] = useState(initial);

  const onUploaded = useCallback((key: string, url: string) => {
    setSlots((prev) => prev.map((s) => s.key === key ? { ...s, current: url } : s));
  }, []);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={h2Style}>{title}</h2>
      <p style={descStyle}>{desc}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {slots.map((s) => (
          <div key={s.key} style={cardStyle}>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.current ? (
                <Image src={s.current} alt={s.label} width={320} height={180} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No image</span>
              )}
            </div>
            <p style={{ margin: '6px 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{s.label}</p>
            <UploadBtn label={s.current ? 'Replace' : 'Upload'} imageKey={s.key} onUploaded={(url) => onUploaded(s.key, url)} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Challenge Card Covers
// ---------------------------------------------------------------------------
function CardCoverSection({ games: initial }: { games: NameAllGame[] }): React.ReactElement {
  const [games, setGames] = useState(initial);
  const [search, setSearch] = useState('');

  const onUploaded = useCallback((slug: string, url: string) => {
    setGames((prev) =>
      prev.map((g) => g.slug === slug ? { ...g, cover_url: url } : g),
    );
  }, []);

  const filtered = search
    ? games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()))
    : games;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={h2Style}>Challenge card covers</h2>
      <p style={descStyle}>Upload custom cover images for individual game challenge cards. These replace the default gradient on the listing page.</p>

      <input
        type="text"
        placeholder="Search games..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ display: 'block', width: '100%', maxWidth: 300, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {filtered.map((g) => (
          <div key={g.id} style={cardStyle}>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {g.cover_url ? (
                <Image src={g.cover_url} alt={g.title} width={320} height={180} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Default gradient</span>
              )}
            </div>
            <p style={{ margin: '6px 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
            <UploadBtn label={g.cover_url ? 'Replace' : 'Upload cover'} imageKey={`card:${g.slug}`} onUploaded={(url) => onUploaded(g.slug, url)} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Name All Idol Images
// ---------------------------------------------------------------------------
function IdolImageSection({ games: initial }: { games: NameAllGame[] }): React.ReactElement {
  const [games, setGames] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'missing'>('missing');
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<{ updated: number; details: Array<{ game: string; member: string }> } | null>(null);

  const onUploaded = useCallback((gameSlug: string, memberIdx: number, url: string) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.slug !== gameSlug) return g;
        const members = [...g.members];
        members[memberIdx] = { ...members[memberIdx]!, photo_url: url };
        return { ...g, members };
      }),
    );
  }, []);

  const handleAutofill = useCallback(async () => {
    setFilling(true);
    setFillResult(null);
    try {
      const res = await fetch('/api/admin/game-image/autofill', { method: 'POST' });
      const data = await res.json() as { updated: number; details: Array<{ game: string; member: string; photo_url: string }> };
      setFillResult(data);
      // Update local state with the filled photos
      if (data.updated > 0) {
        const photoMap = new Map<string, string>();
        for (const d of data.details) {
          photoMap.set(`${d.game}::${d.member}`, d.photo_url);
        }
        setGames((prev) =>
          prev.map((g) => ({
            ...g,
            members: g.members.map((m) => {
              const key = `${g.title}::${m.name}`;
              const filled = photoMap.get(key);
              return filled ? { ...m, photo_url: filled } : m;
            }),
          })),
        );
      }
    } catch {
      alert('Auto-fill failed. Check the console.');
    }
    setFilling(false);
  }, []);

  const filtered = filter === 'missing'
    ? games.filter((g) => g.members.some((m) => !m.photo_url))
    : games;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={h2Style}>Idol images (Name All Members)</h2>
      <p style={descStyle}>Upload photos for idols that only show a letter monogram. Uploading also updates the game data automatically.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setFilter('missing')} style={{ ...pillStyle, ...(filter === 'missing' ? pillActiveStyle : {}) }}>
          Missing only
        </button>
        <button type="button" onClick={() => setFilter('all')} style={{ ...pillStyle, ...(filter === 'all' ? pillActiveStyle : {}) }}>
          All games
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 4 }}>
          {filtered.length} game{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          disabled={filling}
          onClick={handleAutofill}
          style={{
            ...pillStyle,
            marginLeft: 'auto',
            background: 'var(--brand-btn, #e8457a)',
            color: '#fff',
            borderColor: 'var(--brand-btn, #e8457a)',
            opacity: filling ? 0.6 : 1,
          }}
        >
          {filling ? 'Scanning...' : 'Auto-fill from database'}
        </button>
      </div>

      {fillResult && (
        <div style={{
          padding: '8px 12px', marginBottom: 12, borderRadius: 10,
          background: fillResult.updated > 0 ? '#EAF3DE' : 'var(--surface-alt)',
          border: '1px solid var(--border)', fontSize: 12,
        }}>
          {fillResult.updated > 0
            ? `Filled ${fillResult.updated} photo${fillResult.updated !== 1 ? 's' : ''} from the idols database.`
            : 'No matching photos found in the database. All missing idols need manual uploads.'}
        </div>
      )}

      {filtered.map((g) => {
        const missingCount = g.members.filter((m) => !m.photo_url).length;
        const isOpen = expanded === g.slug;

        return (
          <div key={g.id} style={{ marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : g.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12,
                background: isOpen ? 'var(--surface-alt)' : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{g.title}</span>
              <span style={{ fontSize: 11, color: missingCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                {missingCount > 0 ? `${missingCount} missing` : 'All set'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div style={{ padding: '8px 0 4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {g.members.map((m, idx) => (
                  <div key={`${m.name}-${idx}`} style={{ ...cardStyle, padding: 8 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      {m.photo_url ? (
                        <Image src={m.photo_url} alt={m.name} width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                      ) : (
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-tertiary)' }}>{m.name.charAt(0)}</span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{m.name}</p>
                    {m.position && <p style={{ margin: 0, fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>{m.position}</p>}
                    <UploadBtn
                      label={m.photo_url ? 'Replace' : 'Add photo'}
                      imageKey={`idol:${g.slug}:${idx}`}
                      onUploaded={(url) => onUploaded(g.slug, idx, url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '12px 0' }}>
          {filter === 'missing' ? 'All idols have images!' : 'No name-all-members games found.'}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Group logos
// ---------------------------------------------------------------------------
function GroupLogoSection({ groups: initial }: { groups: GroupItem[] }): React.ReactElement {
  const [groups, setGroups] = useState(initial);
  const [search, setSearch] = useState('');

  const onUploaded = useCallback((slug: string, url: string) => {
    setGroups((prev) =>
      prev.map((g) => g.slug === slug ? { ...g, logo_url: url } : g),
    );
  }, []);

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={h2Style}>Group logos</h2>
      <p style={descStyle}>Upload or replace logos for groups. These appear in the browse-by-group circles, quiz cards, and fandom spaces.</p>

      <input
        type="text"
        placeholder="Search groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ display: 'block', width: '100%', maxWidth: 300, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}
      />

      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, display: 'block' }}>
        {filtered.length} group{filtered.length !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {filtered.map((g) => (
          <div key={g.id} style={{ ...cardStyle, padding: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: g.display_color || 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px solid var(--border)' }}>
              {g.logo_url ? (
                <Image src={g.logo_url} alt={g.name} width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 800, color: g.text_color || '#fff' }}>{g.name.charAt(0)}</span>
              )}
            </div>
            <p style={{ margin: '4px 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{g.name}</p>
            <UploadBtn
              label={g.logo_url ? 'Replace' : 'Add logo'}
              imageKey={`group:${g.slug}`}
              onUploaded={(url) => onUploaded(g.slug, url)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function GameImageManager({ headerSlots, hubSlots, nameAllGames, groups }: Props): React.ReactElement {
  return (
    <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Game images</h1>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Upload custom images for game headers, hub cards, and idol photos. Images are stored in Supabase storage and override the default CSS-art gradients.
      </p>

      <ImageSlotSection
        title="Game page headers"
        desc="Replace the CSS-gradient header above each game player with a custom image."
        slots={headerSlots}
      />

      <ImageSlotSection
        title="Game hub cards"
        desc="Custom cover images for the tiles on the /games hub page."
        slots={hubSlots}
      />

      <GroupLogoSection groups={groups} />

      <CardCoverSection games={nameAllGames} />

      <IdolImageSection games={nameAllGames} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const h2Style: React.CSSProperties = { fontSize: 15, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' };
const descStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 12px' };
const cardStyle: React.CSSProperties = { padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
const btnStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 6, padding: '6px 0',
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface-alt)', fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary)', cursor: 'pointer',
};
const pillStyle: React.CSSProperties = {
  padding: '5px 12px', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: 999,
  background: 'var(--surface)', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
};
const pillActiveStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
};
