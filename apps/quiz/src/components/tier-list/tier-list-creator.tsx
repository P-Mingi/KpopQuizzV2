'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getAnonId } from '@/lib/anon-id';
import { TIER_PRESET_LABELS, tiersForPreset, type TierPreset } from '@/lib/tier-list/defaults';
import { SUBJECT_KIND_LABEL } from '@/lib/tier-list/subject';
import { TierMaker } from '@/components/tier-list/tier-maker';

import type { SubjectKind, TierListItem } from '@/lib/tier-list/types';

// The create funnel (CreateSubject.dc.html -> CreatePool.dc.html -> the maker),
// all client-side with no DB. It is ONE component tree on purpose: the pool step
// and the board are the same mounted client, so a custom upload (a client-only
// object URL) added in the pool survives into the maker tray without a
// navigation that would invalidate the blob. Bank data arrives from the server
// shell (group list for step 1; the resolved pool for a chosen subject); picking
// a subject in step 1 navigates so the server loads that pool, which is safe
// because no custom items exist yet at step 1. No emoji: inline SVG icons.

export interface GroupLite { slug: string; name: string; logo: string | null; color: string; generation: string | null }

interface Props {
  groups: GroupLite[];
  initialGroup: { slug: string; name: string } | null;
  initialGroupId: number | null;
  initialKind: SubjectKind;
  initialPool: TierListItem[];
}

const KIND_TILES: { kind: Exclude<SubjectKind, 'blank'>; label: string; hint: string }[] = [
  { kind: 'members', label: 'Members', hint: 'The idols' },
  { kind: 'tracks', label: 'Title tracks', hint: 'Lead singles' },
  { kind: 'albums', label: 'Albums & EPs', hint: 'Cover art' },
  { kind: 'all', label: 'All songs', hint: 'The whole catalog' },
];

function Icon({ d, size = 16, filled = false }: { d: string; size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function Stepper({ step }: { step: 'subject' | 'pool' | 'rank' }) {
  const steps = ['Subject', 'Items', 'Rank', 'Share'];
  const active = step === 'subject' ? 0 : step === 'pool' ? 1 : 2;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <span key={s} className={`tl-chip${i === active ? ' on' : ''}`}>{i + 1} · {s}</span>
      ))}
    </div>
  );
}

export function TierListCreator({ groups, initialGroup, initialGroupId, initialKind, initialPool }: Props) {
  const router = useRouter();
  const hasSubject = Boolean(initialGroup) && initialKind !== 'blank';

  const [step, setStep] = useState<'subject' | 'pool' | 'rank'>(hasSubject ? 'pool' : 'subject');
  const [selGroup, setSelGroup] = useState<GroupLite | null>(
    initialGroup ? (groups.find((g) => g.slug === initialGroup.slug) ?? { slug: initialGroup.slug, name: initialGroup.name, logo: null, color: '#E8457A', generation: null }) : null,
  );
  const [query, setQuery] = useState('');

  // Pool step state.
  const [title, setTitle] = useState(
    initialGroup && hasSubject ? `${initialGroup.name} ${SUBJECT_KIND_LABEL[initialKind]}` : 'My tier list',
  );
  const [kept, setKept] = useState<Set<string>>(() => new Set(initialPool.map((i) => i.id)));
  const [custom, setCustom] = useState<TierListItem[]>([]);
  const [preset, setPreset] = useState<TierPreset>('sd');
  const [view, setView] = useState<'bank' | 'mine'>('bank');
  const [importOpen, setImportOpen] = useState(false);

  // Revoke every custom object URL when the creator unmounts (or a custom item is
  // dropped), so blob URLs do not leak.
  const customRef = useRef<TierListItem[]>([]);
  customRef.current = custom;
  useEffect(() => () => {
    for (const c of customRef.current) if (c.image_url?.startsWith('blob:')) URL.revokeObjectURL(c.image_url);
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
    return base.slice(0, q ? 24 : 12);
  }, [groups, query]);

  function pickKind(kind: Exclude<SubjectKind, 'blank'>) {
    if (!selGroup) return;
    // Navigate so the server loads that subject's pool; no custom items exist yet.
    router.push(`/tier-list/create?group=${encodeURIComponent(selGroup.slug)}&kind=${kind}`);
  }
  function startBlank() {
    setTitle('My tier list');
    setStep('rank');
  }

  function toggleKeep(id: string) {
    setKept((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function dropCustom(id: string) {
    setCustom((prev) => {
      const gone = prev.find((c) => c.id === id);
      if (gone?.image_url?.startsWith('blob:')) URL.revokeObjectURL(gone.image_url);
      return prev.filter((c) => c.id !== id);
    });
  }
  function addCustom(item: TierListItem) {
    setCustom((prev) => [...prev, item]);
    setImportOpen(false);
    setView('mine');
  }

  const boardItems = useMemo(
    () => [...initialPool.filter((i) => kept.has(i.id)), ...custom],
    [initialPool, kept, custom],
  );
  const selectedCount = boardItems.length;
  const boardId = hasSubject && initialGroup ? `${initialGroup.slug}-${initialKind}` : 'blank';

  // -- Rank step: hand the assembled pool to the maker (same mounted client). --
  if (step === 'rank') {
    return (
      <div className="tl tl-wrap">
        <Stepper step="rank" />
        <div className="tl-kick" style={{ marginBottom: 2 }}>KpopQuiz Tier Lists</div>
        <h1 className="tl-d2" data-testid="maker-title">{title}</h1>
        <p className="tl-mut" style={{ marginBottom: 18 }}>
          {boardItems.length > 0 ? `${boardItems.length} items on the board.` : 'Blank board. Add your own items from the pool step, or just build tiers.'}
        </p>
        <TierMaker items={boardItems} boardId={boardId} title={title} initialTiers={tiersForPreset(preset)}
          subjectGroupId={hasSubject ? initialGroupId : null} subjectKind={hasSubject ? initialKind : 'blank'} />
      </div>
    );
  }

  // -- Pool step (CreatePool.dc.html). --
  if (step === 'pool') {
    const shown: { item: TierListItem; isCustom: boolean }[] =
      view === 'mine'
        ? custom.map((c) => ({ item: c, isCustom: true }))
        : [...initialPool.map((i) => ({ item: i, isCustom: false })), ...custom.map((c) => ({ item: c, isCustom: true }))];
    return (
      <div className="tl tl-wrap" data-testid="tl-pool">
        <Stepper step="pool" />
        <h1 className="tl-d1" style={{ fontSize: 34 }}>Your item pool</h1>
        <p className="tl-sub" style={{ marginBottom: 18 }}>
          These come from the official bank. Drop any you do not want on the board, or add your own.
        </p>

        <div className="tl-betw" style={{ marginBottom: 12 }}>
          <div className="tl-seg">
            <button type="button" className={`tl-seg-s${view === 'bank' ? ' on' : ''}`} onClick={() => setView('bank')}>Official bank</button>
            <button type="button" className={`tl-seg-s${view === 'mine' ? ' on' : ''}`} onClick={() => setView('mine')} data-testid="seg-mine">My uploads ({custom.length})</button>
          </div>
          <span className="tl-pill-count" data-testid="pool-count">{selectedCount} selected</span>
        </div>

        <div className="tl-card" style={{ padding: 16 }}>
          <div className="tl-tray-grid" data-testid="pool-grid">
            {shown.length === 0 && view === 'mine' && <span className="tl-mut">No uploads yet. Add your own image below.</span>}
            {shown.map(({ item, isCustom }) => {
              const on = isCustom || kept.has(item.id);
              return (
                <div key={item.id} className="tl-pooltile" data-testid={`pool-tile-${item.id}`}>
                  <div className={`tl-face${on ? '' : ' off'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.image_url ? <img src={item.image_url} alt="" /> : <span className="tl-ini">{initials(item.name)}</span>}
                    <span className="tl-nm">{item.name}</span>
                    <button
                      type="button"
                      className="tl-face-x"
                      aria-label={isCustom ? `Remove ${item.name}` : on ? `Drop ${item.name}` : `Add ${item.name} back`}
                      onClick={() => (isCustom ? dropCustom(item.id) : toggleKeep(item.id))}
                    >
                      {isCustom || on ? <Icon d="M18 6L6 18M6 6l12 12" size={13} /> : <Icon d="M12 5v14M5 12h14" size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}
            <button type="button" className="tl-addtile" onClick={() => setImportOpen(true)} data-testid="open-import" aria-label="Add your own image">
              <Icon d="M12 5v14M5 12h14" size={22} />
              <span>Add image</span>
            </button>
          </div>
        </div>

        <div className="tl-g2" style={{ marginTop: 16 }}>
          <div className="tl-card" style={{ padding: 18 }}>
            <div className="tl-h3">Add your own image</div>
            <p className="tl-mut" style={{ marginBottom: 10 }}>Upload a photo, crop it to a card and name it. Great for ships, sub-units or anything missing. Uploads stay on your device this phase.</p>
            <button type="button" className="tl-dropzone" onClick={() => setImportOpen(true)}>
              <Icon d="M12 3v13m0-13l-4 4m4-4l4 4M4 21h16" size={26} />
              <span>Upload an image</span>
              <span className="tl-mut">PNG / JPG / WEBP · square works best</span>
            </button>
          </div>
          <div className="tl-card" style={{ padding: 18 }}>
            <div className="tl-h3">Tiers &amp; title</div>
            <input className="tl-input big" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label="Tier list title" data-testid="pool-title" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 6px' }}>
              {tiersForPreset(preset).map((t) => (
                <span key={t.label} className="tl-badge" style={{ background: t.color }}>{t.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="tl-mut">Preset:</span>
              {(['sd', 'sf', 'top3'] as TierPreset[]).map((p) => (
                <button key={p} type="button" className={`tl-chip sm${preset === p ? ' on' : ''}`} onClick={() => setPreset(p)}>{TIER_PRESET_LABELS[p]}</button>
              ))}
            </div>
            <p className="tl-mut" style={{ marginTop: 10 }}>Rename, recolor, add or remove tiers on the board.</p>
          </div>
        </div>

        <div className="tl-betw" style={{ marginTop: 20 }}>
          <button type="button" className="tl-btn out" onClick={() => (hasSubject ? router.push('/tier-list/create') : setStep('subject'))}>
            <Icon d="M19 12H5M12 19l-7-7 7-7" size={15} /> Back
          </button>
          <button type="button" className="tl-btn grad lg" onClick={() => setStep('rank')} data-testid="open-board">
            Open the tier board <Icon d="M5 12h14M12 5l7 7-7 7" size={16} />
          </button>
        </div>

        {importOpen && <ImportModal onClose={() => setImportOpen(false)} onAdd={addCustom} existingCount={custom.length} />}
      </div>
    );
  }

  // -- Subject step (CreateSubject.dc.html). --
  return (
    <div className="tl tl-wrap" data-testid="tl-create">
      <Stepper step="subject" />
      <h1 className="tl-d1" style={{ fontSize: 34 }}>What are you ranking?</h1>
      <p className="tl-sub" style={{ marginBottom: 18 }}>Pick from the official K-pop bank. Members, songs and albums come with images already. Or start from a blank board.</p>

      <label className="tl-search" style={{ marginBottom: 20 }}>
        <Icon d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search groups and soloists..." aria-label="Search the bank" data-testid="subject-search" />
      </label>

      <div className="tl-betw" style={{ marginBottom: 10 }}>
        <div className="tl-kick mute">{query.trim() ? 'Results' : 'Popular groups'}</div>
        <button type="button" className="tl-chip sm" onClick={startBlank} data-testid="wizard-start-blank">
          <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" size={13} /> Start blank
        </button>
      </div>

      <div className="tl-grid-groups">
        {filteredGroups.map((g) => {
          const on = selGroup?.slug === g.slug;
          return (
            <button key={g.slug} type="button" className={`tl-card tl-grouptile${on ? ' on' : ''}`} onClick={() => setSelGroup(g)} data-testid={`group-${g.slug}`}>
              <span className="tl-grouplogo" style={{ background: g.color }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.logo ? <img src={g.logo} alt="" width={56} height={56} /> : <span>{initials(g.name)}</span>}
              </span>
              <span className="tl-h3" style={{ margin: '8px 0 0', fontSize: 14 }}>{g.name}</span>
              {g.generation && <span className="tl-mut">{g.generation}</span>}
            </button>
          );
        })}
        {filteredGroups.length === 0 && <p className="tl-mut">No group matches that. Try another name, or start blank.</p>}
      </div>

      {selGroup && (
        <div className="tl-card" style={{ padding: 20, marginTop: 22 }} data-testid="subject-selected">
          <div className="tl-betw">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="tl-grouplogo sm" style={{ background: selGroup.color }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {selGroup.logo ? <img src={selGroup.logo} alt="" width={44} height={44} /> : <span>{initials(selGroup.name)}</span>}
              </span>
              <div>
                <div className="tl-h3" style={{ margin: 0 }}>{selGroup.name} selected</div>
                {selGroup.generation && <div className="tl-mut">{selGroup.generation}</div>}
              </div>
            </div>
            <button type="button" className="tl-btn out sm" onClick={() => setSelGroup(null)}>Change</button>
          </div>
          <div className="tl-hair" />
          <div className="tl-kick mute" style={{ marginBottom: 10 }}>What do you want to rank?</div>
          <div className="tl-g4">
            {KIND_TILES.map((k) => (
              <button key={k.kind} type="button" className="tl-kindtile" onClick={() => pickKind(k.kind)} data-testid={`kind-${k.kind}`}>
                <span className="tl-h3" style={{ margin: 0, fontSize: 15 }}>{k.label}</span>
                <span className="tl-mut">{k.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="tl-note" style={{ marginTop: 22 }}>
        The official bank keeps one moderated, square image per idol, release and track, so picking a subject auto-loads its items with photos and you write nothing. Custom uploads are added in the next step and stay on your device this phase.
      </p>
    </div>
  );
}

// -- ImportModal (ImportModal.dc.html): client upload -> square crop -> name. --
const MAX_BYTES = 8 * 1024 * 1024;
const CROP_SIZE = 400;

function ImportModal({ onClose, onAdd, existingCount }: { onClose: () => void; onAdd: (item: TierListItem) => void; existingCount: number }) {
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (srcUrl) URL.revokeObjectURL(srcUrl); }, [srcUrl]);

  function onFile(file: File | undefined) {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('That is not an image file.'); return; }
    if (file.size > MAX_BYTES) { setError('Image is over 8MB. Pick a smaller one.'); return; }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.onerror = () => setError('Could not read that image.');
    img.src = url;
    if (!name) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 40));
  }

  async function add() {
    if (!imgEl || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      // Cover-fit the source into the square, then apply the zoom around centre:
      // a genuine centre square crop matching the preview.
      const base = Math.max(CROP_SIZE / imgEl.naturalWidth, CROP_SIZE / imgEl.naturalHeight);
      const scale = base * zoom;
      const dw = imgEl.naturalWidth * scale;
      const dh = imgEl.naturalHeight * scale;
      ctx.drawImage(imgEl, (CROP_SIZE - dw) / 2, (CROP_SIZE - dh) / 2, dw, dh);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('no blob');
      const label = name.trim() || `Item ${existingCount + 1}`;

      // Persist the cropped image to the moderated asset store so it survives a
      // publish (and can reach the share card once approved). If the upload fails,
      // fall back to a client-only object URL: the item still works in this local
      // draft, it just cannot be published or embedded until it is uploaded.
      try {
        const fd = new FormData();
        fd.append('file', blob, 'custom.jpg');
        fd.append('name', label);
        const anon = getAnonId();
        if (anon) fd.append('anonId', anon);
        const r = await fetch('/api/tier-list/asset', { method: 'POST', body: fd });
        if (r.ok) {
          const j = await r.json();
          onAdd({ id: j.itemId as string, kind: 'custom', name: label, image_url: j.url as string });
          return;
        }
      } catch { /* fall through to client-only */ }
      onAdd({ id: `custom:${crypto.randomUUID()}`, kind: 'custom', name: label, image_url: URL.createObjectURL(blob) });
    } catch {
      setError('Could not crop that image.');
      setBusy(false);
    }
  }

  return (
    <div className="tl-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add an item" data-testid="import-modal" onClick={onClose}>
      <div className="tl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tl-betw" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div className="tl-d2" style={{ margin: 0, fontSize: 20 }}>Add an item</div>
          <button type="button" className="tl-iconbtn" aria-label="Close" onClick={onClose}>
            <Icon d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <input ref={fileRef} type="file" accept="image/*" data-testid="import-file" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
          {!imgEl ? (
            <button type="button" className="tl-dropzone" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>
              <Icon d="M12 3v13m0-13l-4 4m4-4l4 4M4 21h16" size={30} />
              <span>Choose an image to upload</span>
              <span className="tl-mut">PNG / JPG / WEBP · up to 8MB</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="tl-crop">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {srcUrl && <img src={srcUrl} alt="" style={{ transform: `scale(${zoom})` }} />}
                </div>
                <button type="button" className="tl-chip sm" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>Replace</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div>
                  <div className="tl-kick mute" style={{ marginBottom: 5 }}>Name</div>
                  <input className="tl-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jung Kook (solo)" aria-label="Item name" data-testid="import-name" />
                </div>
                <div>
                  <div className="tl-kick mute" style={{ marginBottom: 5 }}>Zoom</div>
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}
          {error && <p className="tl-mut" role="alert" style={{ color: 'var(--wrong, #A32D2D)', marginTop: 10 }}>{error}</p>}
          <div className="tl-betw" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="tl-btn out" onClick={onClose}>Cancel</button>
            <button type="button" className="tl-btn pri" onClick={add} disabled={!imgEl || busy} data-testid="import-add">Add to pool</button>
          </div>
        </div>
      </div>
    </div>
  );
}
