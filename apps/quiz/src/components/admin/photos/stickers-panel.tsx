'use client';

// Daily games step 2: "Stickers" of the board (Admin.dc.html): PNGs that decorate the empty sides of a page (Kpopdle, Otakudle, the Burrow,
// the home), each with its side, position, size, rotation, mirror, opacity and entrance animation, previewed live on a sketch of the page.
// A save is a new version of the sticker (site_assets, type sticker), live at once; "Retirer" takes it off. Our own illustrations only.
import { useEffect, useMemo, useState } from 'react';

import { decode, makeAssetFiles } from '@/lib/photos/resize';
import { NEW_STICKER, STICKER_PAGES, STICKER_RANGES, parseStickerSettings, stickerKey } from '@/lib/photos/slots';

import { MASCOTS } from './icons-panel';
import { PHOTO_API, fetchPicture, postForm, withBase } from './api';
import { liveVersion } from './ui';
import s from './photos-admin.module.css';

import type { AssetVersion } from '@/lib/photos/admin-data';
import type { StickerSettings } from '@/lib/photos/slots';

interface Sticker { readonly key: string; readonly src: string; readonly settings: StickerSettings; readonly saved: boolean }

const S = 600 / 1180;
const SLIDERS: readonly [keyof typeof STICKER_RANGES, string, string][] = [
  ['x', 'Horizontal', ' px'], ['y', 'Vertical', ' px'], ['w', 'Taille', ' px'], ['r', 'Rotation', '°'], ['o', 'Opacité', ' %'],
];

const newId = (): string => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');

/** The live stickers of a page, oldest first (the order of their keys' first versions). */
function liveStickers(assets: readonly AssetVersion[], page: string, now: number): Sticker[] {
  const keys = [...new Set(assets.filter((a) => a.type === 'sticker' && a.page === page).map((a) => a.key))];
  const out: Sticker[] = [];
  for (const key of keys) {
    const v = liveVersion(assets, key, now);
    const settings = v ? parseStickerSettings(v.settings) : null;
    if (v?.url && settings) out.push({ key, src: v.url, settings, saved: true });
  }
  return out;
}

export function StickersPanel({ head, assets, now, blocked, onSaved }: {
  head: React.ReactNode; assets: readonly AssetVersion[]; now: number; blocked: string | null; onSaved: (message: string) => void;
}): React.ReactElement {
  const [page, setPage] = useState(STICKER_PAGES[0]!.id);
  const saved = useMemo(() => liveStickers(assets, page, now), [assets, page, now]);
  const [drafts, setDrafts] = useState<Sticker[]>([]);
  const [edits, setEdits] = useState<Record<string, Sticker>>({});
  const [selKey, setSelKey] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [own, setOwn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDrafts([]); setEdits({}); setSelKey(null); setFile(null); setError(null); }, [page, assets]);

  const list = [...saved, ...drafts].map((k) => edits[k.key] ?? k);
  const sel = list.find((k) => k.key === selKey) ?? list[0] ?? null;
  const pageLabel = STICKER_PAGES.find((p) => p.id === page)!.label;
  const accent = page === 'otakudle' ? '#C2410C' : '#D13A6E';

  const patch = (p: Partial<StickerSettings> & { src?: string }): void => {
    if (!sel) return;
    const { src, ...rest } = p;
    setEdits({ ...edits, [sel.key]: { ...sel, src: src ?? sel.src, settings: { ...sel.settings, ...rest } } });
  };
  const add = (): void => {
    const key = stickerKey(page, newId());
    setDrafts([...drafts, { key, src: withBase(MASCOTS[0]!.src), settings: { ...NEW_STICKER, side: list.length % 2 ? 'right' : 'left' }, saved: false }]);
    setSelKey(key);
    setFile(null);
  };
  const takeFile = (f: File): void => { setFile(f); patch({ src: URL.createObjectURL(f) }); };

  const save = async (): Promise<void> => {
    if (!sel || blocked) return;
    if (!own) { setError('Coche la case : un sticker doit être une illustration à nous.'); return; }
    setBusy(true);
    setError(null);
    try {
      const original = saved.find((k) => k.key === sel.key);
      const form = new FormData();
      form.set('action', 'save');
      form.set('key', sel.key);
      form.set('settings', JSON.stringify(sel.settings));
      form.set('meta', JSON.stringify({ source_url: '', author: 'Bunnyverse', license: 'own_photo', license_note: '' }));
      form.set('verified', '1');
      form.set('publish', 'now');
      if (!original || original.src !== sel.src) {
        const blob = file ?? (await fetchPicture(sel.src));
        const bitmap = await decode(blob);
        try {
          const f = await makeAssetFiles(bitmap, 'sticker');
          form.set('large', f.large, 'large.webp');
          form.set('thumb', f.thumb, 'thumb.webp');
        } finally {
          bitmap.close();
        }
      }
      const res = await postForm(PHOTO_API.assets, form);
      if (!res.ok) throw new Error(res.error);
      onSaved(`Sticker de la page ${pageLabel} enregistré.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!sel) return;
    if (!sel.saved) { setDrafts(drafts.filter((d) => d.key !== sel.key)); setSelKey(null); return; }
    setBusy(true);
    const form = new FormData();
    form.set('action', 'retire');
    form.set('key', sel.key);
    const res = await postForm(PHOTO_API.assets, form);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onSaved(`Sticker retiré de la page ${pageLabel}.`);
  };

  const k0 = sel?.settings ?? NEW_STICKER;
  const index = sel ? list.findIndex((k) => k.key === sel.key) : -1;

  return (
    <>
      <section aria-labelledby="ph" className={s.section}>
        {head}
        <div role="group" aria-label="Page à décorer" className={s.lineRow}>
          {STICKER_PAGES.map((p) => <button key={p.id} type="button" className={s.pillSm} aria-pressed={p.id === page} onClick={() => setPage(p.id)}>{p.label}</button>)}
        </div>
        <div className={s.stkLayout}>
          <div aria-label="Aperçu de la page avec les stickers" role="img" className={s.stage}>
            <span style={{ left: 0, right: 0, top: 0, height: 90, background: page === 'otakudle' ? 'linear-gradient(120deg, #FFF1E6, #FBE1CC 55%, #FCE8EF)' : 'linear-gradient(120deg, #FCE8EF, #F8DCE6 55%, #FFF1E6)' }} />
            <span style={{ left: 0, right: 0, top: 90, height: 10, background: '#1F1B17' }} />
            <span style={{ left: 210, width: 180, top: 118, height: 14, borderRadius: 6, background: '#1F1B17', opacity: 0.85 }} />
            <span style={{ left: 240, width: 120, top: 140, height: 6, borderRadius: 4, background: '#CFC8BF' }} />
            {[0, 1, 2, 3].map((i) => <span key={`d${i}`} style={{ top: 172, left: 222 + i * 42, width: 26, height: 26, borderRadius: '50%', ...(i === 0 ? { background: accent } : { background: '#FFFFFF', border: '1px solid #E5E0DA' }) }} />)}
            {[0, 1, 2].map((i) => <span key={`h${i}`} style={{ top: 226, left: 110 + i * 130, width: 122, height: 34, borderRadius: 8, background: '#FFFFFF', border: '1px solid #ECE8E3' }} />)}
            <span style={{ left: 130, width: 290, top: 278, height: 28, borderRadius: 9, background: '#FFFFFF', border: '1px solid #D9D3CB' }} />
            <span style={{ left: 426, width: 50, top: 278, height: 28, borderRadius: 9, background: accent }} />
            {list.map((k) => (
              // eslint-disable-next-line @next/next/no-img-element -- the live preview of a sticker
              <img key={k.key} src={k.src} alt="" style={{
                [k.settings.side === 'left' ? 'left' : 'right']: Math.round(k.settings.x * S), top: Math.round(100 + k.settings.y * 0.5),
                width: Math.round(k.settings.w * S), height: 'auto', opacity: k.settings.o / 100,
                transform: `rotate(${k.settings.r}deg)${k.settings.mirror ? ' scaleX(-1)' : ''}`, filter: 'drop-shadow(0 3px 5px rgba(31,27,23,.15))',
              }} />
            ))}
          </div>
          <div className={s.stkList}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#57514B' }}>Stickers de la page</span>
            {list.map((k, i) => (
              <button key={k.key} type="button" className={`${s.stkRow} ${sel?.key === k.key ? s.stkRowOn : ''}`} onClick={() => { setSelKey(k.key); setFile(null); }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the sticker's own file */}
                <img src={k.src} alt="" width={40} height={40} />
                <span><strong>Sticker {i + 1}{k.saved ? '' : ' (pas encore enregistré)'}</strong><small>{k.settings.side === 'left' ? 'Gauche' : 'Droite'} · {k.settings.w} px · {k.settings.r}°{k.settings.mirror ? ' · miroir' : ''}</small></span>
              </button>
            ))}
            <button type="button" className={s.addStk} onClick={add}>Ajouter un sticker PNG</button>
            <p className={s.note} style={{ fontSize: 12, marginTop: 4 }}>Les stickers restent dans les espaces vides et se cachent sous 1 240 px de large, pour ne jamais gêner le jeu.</p>
          </div>
        </div>
      </section>
      <aside aria-labelledby="sh" className={`${s.aside} ${s.asideNarrow}`}>
        <div className={s.asideHead}><span className={s.asideKicker}>Régler le sticker</span><h2 id="sh" className={s.asideTitleSm}>{sel ? `Sticker ${index + 1}, ${pageLabel}` : 'Aucun sticker'}</h2></div>
        {blocked ? <p className={s.notice}>{blocked}</p> : null}
        <div className={s.pngLib}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#57514B' }}>Image :</span>
          {MASCOTS.map((m) => (
            <button key={m.src} type="button" className={s.pngBtn} aria-label={m.name} aria-pressed={sel?.src === withBase(m.src)} disabled={!sel} onClick={() => { setFile(null); patch({ src: withBase(m.src) }); }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- our own mascot file */}
              <img src={withBase(m.src)} alt="" width={34} height={34} />
            </button>
          ))}
          <label className={s.small} style={{ display: 'inline-flex', alignItems: 'center', cursor: sel ? 'pointer' : 'not-allowed' }}>
            ou glisse un PNG
            <input type="file" accept="image/png,image/webp" className={s.sr} disabled={!sel} onChange={(e) => { const f = e.target.files?.[0]; if (f) takeFile(f); e.target.value = ''; }} />
          </label>
        </div>
        <div role="group" aria-label="Côté" className={s.lineRow}>
          <span className={s.sideLabel}>Côté</span>
          <button type="button" className={s.pillSm} aria-pressed={k0.side === 'left'} disabled={!sel} onClick={() => patch({ side: 'left' })}>Gauche</button>
          <button type="button" className={s.pillSm} aria-pressed={k0.side === 'right'} disabled={!sel} onClick={() => patch({ side: 'right' })}>Droite</button>
        </div>
        {SLIDERS.map(([key, label, unit]) => (
          <label key={key} className={s.slider}>
            {label}
            <input type="range" min={STICKER_RANGES[key][0]} max={STICKER_RANGES[key][1]} value={k0[key]} disabled={!sel} onChange={(e) => patch({ [key]: Number(e.target.value) })} />
            <span className={s.num}>{k0[key]}{unit}</span>
          </label>
        ))}
        <label className={s.toggle}>Miroir (retourné)<input type="checkbox" checked={k0.mirror} disabled={!sel} onChange={() => patch({ mirror: !k0.mirror })} /></label>
        <label className={s.toggle}>Petite animation d&apos;entrée<input type="checkbox" checked={k0.anim} disabled={!sel} onChange={() => patch({ anim: !k0.anim })} /></label>
        <label className={s.check}>
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
          <span>Cette image est une illustration à nous : elle s&apos;affiche sans crédit.</span>
        </label>
        {error ? <p className={`${s.status} ${s.statusErr}`} role="alert">{error}</p> : null}
        <div className={s.actions}>
          <button type="button" className={s.primary} style={{ flex: 1 }} onClick={() => { void save(); }} disabled={busy || !sel || Boolean(blocked)}>{busy ? 'Enregistrement en cours' : 'Enregistrer'}</button>
          <button type="button" className={s.danger} onClick={() => { void remove(); }} disabled={busy || !sel}>Retirer</button>
        </div>
      </aside>
    </>
  );
}
