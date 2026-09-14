'use client';

import { useEffect, useRef, useState } from 'react';

import { getAnonId } from '@/lib/anon-id';

import type { TierListItem } from '@/lib/tier-list/types';

// The custom-item importer (ImportModal.dc.html): client upload -> square crop ->
// name, one modal reused by the wizard (tier-list-creator) AND the maker toolbar
// so there is ONE uploader, not two. Multi-select: several files chosen at once
// are processed as a queue, each cropped and named, each landing as its own item.
// It uploads to the moderated asset store (/api/tier-list/asset -> tier_list_assets
// pending) so the item survives a publish once approved; on any upload failure it
// falls back to a client-only object URL so the local draft still works. No emoji.

const MAX_BYTES = 8 * 1024 * 1024;
const CROP_SIZE = 400;

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export function ImportModal({ onClose, onAdd, existingCount }: {
  onClose: () => void; onAdd: (item: TierListItem) => void; existingCount: number;
}) {
  const [queue, setQueue] = useState<File[]>([]);
  const [index, setIndex] = useState(0);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (srcUrl) URL.revokeObjectURL(srcUrl); }, [srcUrl]);

  // Load the file at `index` into the cropper whenever the queue or index moves.
  function loadCurrent(files: File[], i: number) {
    const file = files[i];
    if (!file) { setImgEl(null); setSrcUrl(null); return; }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    const url = URL.createObjectURL(file);
    setSrcUrl(url); setZoom(1); setError('');
    setName(file.name.replace(/\.[^.]+$/, '').slice(0, 40));
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.onerror = () => setError('Could not read that image.');
    img.src = url;
  }

  function onFiles(list: FileList | null) {
    setError('');
    const picked = Array.from(list ?? []);
    const ok: File[] = [];
    for (const f of picked) {
      if (!f.type.startsWith('image/')) { setError('Only image files (PNG / JPG / WEBP).'); continue; }
      if (f.size > MAX_BYTES) { setError('Each image must be under 8MB.'); continue; }
      ok.push(f);
    }
    if (ok.length === 0) return;
    setQueue(ok); setIndex(0); setAdded(0);
    loadCurrent(ok, 0);
  }

  function advance() {
    const next = index + 1;
    if (next < queue.length) { setIndex(next); loadCurrent(queue, next); }
    else onClose(); // whole queue done
  }

  async function add() {
    if (!imgEl || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      // Cover-fit into the square, then zoom around centre: a genuine centre crop.
      const base = Math.max(CROP_SIZE / imgEl.naturalWidth, CROP_SIZE / imgEl.naturalHeight);
      const scale = base * zoom;
      const dw = imgEl.naturalWidth * scale;
      const dh = imgEl.naturalHeight * scale;
      ctx.drawImage(imgEl, (CROP_SIZE - dw) / 2, (CROP_SIZE - dh) / 2, dw, dh);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('no blob');
      const label = name.trim() || `Item ${existingCount + added + 1}`;

      // Persist to the moderated asset store (pending) so it survives a publish and
      // can reach the share card once approved. On failure, client-only object URL.
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
        } else {
          onAdd({ id: `custom:${crypto.randomUUID()}`, kind: 'custom', name: label, image_url: URL.createObjectURL(blob) });
        }
      } catch {
        onAdd({ id: `custom:${crypto.randomUUID()}`, kind: 'custom', name: label, image_url: URL.createObjectURL(blob) });
      }
      setAdded((n) => n + 1);
      setBusy(false);
      advance();
    } catch {
      setError('Could not crop that image.');
      setBusy(false);
    }
  }

  const remaining = queue.length > 0 ? queue.length - index : 0;

  return (
    <div className="tl-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add items" data-testid="import-modal" onClick={onClose}>
      <div className="tl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tl-betw" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div className="tl-d2" style={{ margin: 0, fontSize: 20 }}>
            Add images{queue.length > 1 ? ` (${index + 1} of ${queue.length})` : ''}
          </div>
          <button type="button" className="tl-iconbtn" aria-label="Close" onClick={onClose}>
            <Icon d="M18 6L6 18M6 6l12 12" size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <input ref={fileRef} type="file" accept="image/*" multiple data-testid="import-file" style={{ display: 'none' }} onChange={(e) => onFiles(e.target.files)} />
          {!imgEl ? (
            <button type="button" className="tl-dropzone" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>
              <Icon d="M12 3v13m0-13l-4 4m4-4l4 4M4 21h16" size={30} />
              <span>Choose one or more images</span>
              <span className="tl-mut">PNG / JPG / WEBP · up to 8MB each</span>
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
                <p className="tl-mut" style={{ margin: 0 }}>Your uploads stay private and pending review; they show on your own board right away.</p>
              </div>
            </div>
          )}
          {error && <p className="tl-mut" role="alert" style={{ color: 'var(--wrong, #A32D2D)', marginTop: 10 }}>{error}</p>}
          <div className="tl-betw" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="tl-btn out" onClick={onClose}>{added > 0 ? 'Done' : 'Cancel'}</button>
            {imgEl && remaining > 1 && (
              <button type="button" className="tl-btn out" onClick={advance} disabled={busy}>Skip</button>
            )}
            <button type="button" className="tl-btn pri" onClick={add} disabled={!imgEl || busy} data-testid="import-add">
              {remaining > 1 ? 'Add and next' : 'Add to board'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
