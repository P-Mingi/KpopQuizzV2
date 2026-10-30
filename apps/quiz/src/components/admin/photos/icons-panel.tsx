'use client';

// Daily games step 2: "Icônes du jeu" of the board (Admin.dc.html): the 11 places of the daily games, each an icon of the library or a PNG,
// with or without a circle, in a colour, with the preview of its three states (en cours, fait, à venir). A save is a new version of the
// slot (site_assets, type icon), live at once. A PNG must be an illustration of our own (the licence rule: no picture without its licence).
import { useEffect, useState } from 'react';

import { decode, makeAssetFiles } from '@/lib/photos/resize';
import { ICON_COLORS, ICON_GROUPS, ICON_LIBRARY, ICON_SLOTS, iconKey, parseIconSettings } from '@/lib/photos/slots';

import { PHOTO_API, fetchPicture, postForm, withBase } from './api';
import { DropZone, IconMark, Svg, liveVersion } from './ui';
import s from './photos-admin.module.css';

import type { AssetVersion } from '@/lib/photos/admin-data';
import type { IconColor, IconSettings, IconSlot } from '@/lib/photos/slots';

/** Our own illustrations, bundled with the site (public/mascot): the board's "Tes PNG". */
export const MASCOTS: readonly { readonly src: string; readonly name: string }[] = [
  { src: '/mascot/mascot-default.png', name: 'Lapin' },
  { src: '/mascot/mascot-celebrate.png', name: 'Lapin qui fête' },
  { src: '/mascot/mascot-think.png', name: 'Lapin qui réfléchit' },
  { src: '/mascot/mascot-sad.png', name: 'Lapin triste' },
];

interface IconState { readonly cfg: IconSettings; readonly png: string | null }

function stateOf(slot: IconSlot, assets: readonly AssetVersion[], now: number): IconState {
  const live = liveVersion(assets, iconKey(slot.id), now);
  const cfg = (live && parseIconSettings(live.settings)) || slot.defaults;
  return { cfg, png: live?.url ?? null };
}

export function IconsPanel({ head, assets, now, blocked, onSaved }: {
  head: React.ReactNode; assets: readonly AssetVersion[]; now: number; blocked: string | null; onSaved: (message: string) => void;
}): React.ReactElement {
  const [sel, setSel] = useState(ICON_SLOTS[0]!.id);
  const slot = ICON_SLOTS.find((x) => x.id === sel) ?? ICON_SLOTS[0]!;
  return (
    <>
      <section aria-labelledby="ph" className={s.section}>
        {head}
        <div className={s.iconGroups}>
          {ICON_GROUPS.map((g) => (
            <div key={g.title} className={s.iconGroup}>
              <span className={s.kicker}>{g.title}</span>
              <div className={s.iconGrid}>
                {g.items.map((it) => {
                  const st = stateOf(it, assets, now);
                  return (
                    <button key={it.id} type="button" className={`${s.iconCard} ${it.id === sel ? s.iconCardOn : ''}`} onClick={() => setSel(it.id)} aria-pressed={it.id === sel}>
                      <IconMark cfg={st.cfg} png={st.png} state="current" size={48} glyph={22} />
                      <span className={s.iconText}><strong>{it.name}</strong><span>{it.where}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <IconAside key={slot.id} slot={slot} initial={stateOf(slot, assets, now)} blocked={blocked} onSaved={onSaved} />
    </>
  );
}

function IconAside({ slot, initial, blocked, onSaved }: { slot: IconSlot; initial: IconState; blocked: string | null; onSaved: (m: string) => void }): React.ReactElement {
  const [cfg, setCfg] = useState<IconSettings>(initial.cfg);
  const [png, setPng] = useState<string | null>(initial.png);
  const [file, setFile] = useState<Blob | null>(null);
  const [own, setOwn] = useState(Boolean(initial.png));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (png?.startsWith('blob:')) URL.revokeObjectURL(png); }, [png]);

  const set = (patch: Partial<IconSettings>): void => setCfg({ ...cfg, ...patch });
  const takeFile = (f: Blob): void => { setFile(f); setPng(URL.createObjectURL(f)); set({ mode: 'png' }); setError(null); };
  const takeMascot = (src: string): void => { setFile(null); setPng(withBase(src)); set({ mode: 'png' }); setError(null); };

  const save = async (): Promise<void> => {
    if (blocked) return;
    setError(null);
    const form = new FormData();
    form.set('action', 'save');
    form.set('key', iconKey(slot.id));
    form.set('settings', JSON.stringify(cfg));
    form.set('publish', 'now');
    if (cfg.mode === 'icon') {
      form.set('no_file', '1');
    } else {
      if (!png) { setError('Choisis un PNG : un des tiens, ou glisse un fichier.'); return; }
      if (!own) { setError('Coche la case : un PNG doit être une illustration à nous.'); return; }
      form.set('meta', JSON.stringify({ source_url: '', author: 'Bunnyverse', license: 'own_photo', license_note: '' }));
      form.set('verified', '1');
    }
    setBusy(true);
    try {
      // A new PNG (a file or one of ours) goes through the canvas; the PNG already stored is kept as it is.
      if (cfg.mode === 'png' && png && png !== initial.png) {
        const blob = file ?? (await fetchPicture(png));
        const bitmap = await decode(blob);
        try {
          const f = await makeAssetFiles(bitmap, 'icon');
          form.set('large', f.large, 'large.webp');
          form.set('thumb', f.thumb, 'thumb.webp');
        } finally {
          bitmap.close();
        }
      }
      const res = await postForm(PHOTO_API.assets, form);
      if (!res.ok) throw new Error(res.error);
      onSaved(`Icône ${slot.name} enregistrée.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside aria-labelledby="ih" className={`${s.aside} ${s.asideMid}`}>
      <div className={s.asideHead}><span className={s.asideKicker}>Changer l&apos;icône</span><h2 id="ih" className={s.asideTitleSm}>{slot.name}</h2></div>
      {blocked ? <p className={s.notice}>{blocked}</p> : null}
      <div role="group" aria-label="Source" className={s.seg}>
        <button type="button" className={s.segBtn} aria-pressed={cfg.mode !== 'png'} onClick={() => set({ mode: 'icon' })}>Icône</button>
        <button type="button" className={s.segBtn} aria-pressed={cfg.mode === 'png'} onClick={() => set({ mode: 'png' })}>Image PNG</button>
      </div>
      {cfg.mode !== 'png' ? (
        <div role="group" aria-label="Bibliothèque" className={s.lib}>
          {Object.keys(ICON_LIBRARY).map((k) => (
            <button key={k} type="button" className={s.libBtn} aria-label={k} aria-pressed={cfg.icon === k} onClick={() => set({ icon: k, mode: 'icon' })}>
              <Svg d={ICON_LIBRARY[k]!} size={20} />
            </button>
          ))}
        </div>
      ) : (
        <>
          <DropZone title="Glisse un PNG transparent" hint="256 × 256 conseillé" onFile={takeFile} small accept="image/png,image/webp" />
          <div className={s.pngLib}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#57514B' }}>Tes PNG :</span>
            {MASCOTS.map((m) => (
              <button key={m.src} type="button" className={s.pngBtn} aria-label={m.name} aria-pressed={png === withBase(m.src)} onClick={() => takeMascot(m.src)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- our own mascot file */}
                <img src={withBase(m.src)} alt="" width={34} height={34} />
              </button>
            ))}
          </div>
          <label className={s.check}>
            <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
            <span>Cette image est une illustration à nous : elle s&apos;affiche sans crédit.</span>
          </label>
        </>
      )}
      <div role="group" aria-label="Cercle" className={s.lineRow}>
        <span className={s.lineLabel}>Cercle</span>
        <button type="button" className={s.pillSm} aria-pressed={cfg.circle} onClick={() => set({ circle: true })}>Avec cercle</button>
        <button type="button" className={s.pillSm} aria-pressed={!cfg.circle} onClick={() => set({ circle: false })}>Sans cercle</button>
      </div>
      {cfg.circle ? (
        <div role="group" aria-label="Couleur du cercle" className={s.lineRow} style={{ gap: 8 }}>
          <span className={s.lineLabel}>Couleur</span>
          {(Object.keys(ICON_COLORS) as IconColor[]).map((k) => (
            <button key={k} type="button" className={s.swatch} aria-label={ICON_COLORS[k][2]} aria-pressed={cfg.color === k} style={{ background: ICON_COLORS[k][0] }} onClick={() => set({ color: k })} />
          ))}
        </div>
      ) : null}
      <div className={s.preview}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Aperçu</span>
        <div className={s.previewRow}>
          {([['current', 'En cours'], ['done', 'Fait'], ['next', 'À venir']] as const).map(([st, label]) => (
            <span key={st} className={s.previewCell}>
              <IconMark cfg={cfg} png={png} state={st} size={56} glyph={24} />
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>
      {error ? <p className={`${s.status} ${s.statusErr}`} role="alert">{error}</p> : null}
      <button type="button" className={s.primary} style={{ flex: 'none' }} onClick={() => { void save(); }} disabled={busy || Boolean(blocked)}>{busy ? 'Enregistrement en cours' : 'Enregistrer l\'icône'}</button>
    </aside>
  );
}
