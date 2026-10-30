'use client';

// Daily games step 2: "Bannières et images" of the board (Admin.dc.html): the banner of each game page and the images of the cards and of
// the home v3, each with its desktop and mobile preview, its focal point, its credit and licence, published now or at a date. Every save
// is a new version of the slot (site_assets); the older ones stay in the history and go back on the site in one click.
import { useEffect, useMemo, useState } from 'react';

import { decode, makeAssetFiles } from '@/lib/photos/resize';
import { BANNER_LICENSE_OPTIONS, IMAGE_SLOTS, isLicense, parseFocal } from '@/lib/photos/slots';

import { PHOTO_API, postForm } from './api';
import { DropZone, FocalFrame, frDate, liveVersion, metaPayload, metaProblem, scheduledVersion } from './ui';
import s from './photos-admin.module.css';

import type { AssetVersion } from '@/lib/photos/admin-data';
import type { Focal, ImageSlot } from '@/lib/photos/slots';
import type { MetaState } from './ui';

const FOCALS: readonly [string, string, number][] = [['l', 'Gauche', 25], ['c', 'Centre', 50], ['r', 'Droite', 75]];

export function BannersPanel({ head, assets, now, blocked, onSaved }: {
  head: React.ReactNode; assets: readonly AssetVersion[]; now: number; blocked: string | null; onSaved: (message: string) => void;
}): React.ReactElement {
  const [sel, setSel] = useState<string>(IMAGE_SLOTS[0]!.key);
  const slot = IMAGE_SLOTS.find((x) => x.key === sel) ?? IMAGE_SLOTS[0]!;
  const versions = useMemo(() => assets.filter((a) => a.key === slot.key), [assets, slot.key]);
  const live = liveVersion(assets, slot.key, now);

  return (
    <>
      <section aria-labelledby="ph" className={s.section}>
        {head}
        <div className={s.bannerGrid}>
          {IMAGE_SLOTS.map((b) => <BannerCard key={b.key} slot={b} on={b.key === sel} assets={assets} now={now} onPick={() => setSel(b.key)} />)}
        </div>
        <p className={s.note} style={{ fontSize: 14, lineHeight: 1.5 }}>Une page de série sans bannière reprend celle d&apos;Otakudle. Les anciennes bannières restent dans l&apos;historique et se remettent en un clic.</p>
      </section>
      <BannerAside key={slot.key} slot={slot} live={live} versions={versions} now={now} blocked={blocked} onSaved={onSaved} />
    </>
  );
}

function BannerCard({ slot, on, assets, now, onPick }: { slot: ImageSlot; on: boolean; assets: readonly AssetVersion[]; now: number; onPick: () => void }): React.ReactElement {
  const live = liveVersion(assets, slot.key, now);
  const next = scheduledVersion(assets, slot.key, now);
  const status = live ? 'En ligne' : next ? `Programmée le ${frDate(next.publishedAt!)}` : slot.fallback ? 'Reprend Otakudle' : 'Aucune image';
  const focal = live ? parseFocal(live.settings.focal) : { x: 50, y: 50 };
  return (
    <article className={s.bannerCard} style={on ? { border: `2px solid ${slot.accent}`, boxShadow: '0 10px 26px rgba(31,27,23,.10)' } : undefined}>
      <div className={s.bannerPreview} style={{ background: slot.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the stored 400 px file of the live version */}
        {live?.url ? <img src={live.url} alt="" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} /> : <span aria-hidden="true" className={s.dots} />}
        <span className={`${s.chip} ${live ? s.chipLive : ''}`}>{status}</span>
      </div>
      <div className={s.bannerFoot}>
        <span className={s.bannerName}><strong>{slot.name}</strong><span className={s.num}>{slot.where}</span></span>
        <button type="button" className={s.outline} style={{ flex: 'none' }} onClick={onPick} aria-pressed={on}>Changer</button>
      </div>
    </article>
  );
}

function BannerAside({ slot, live, versions, now, blocked, onSaved }: {
  slot: ImageSlot; live: AssetVersion | null; versions: readonly AssetVersion[]; now: number; blocked: string | null; onSaved: (message: string) => void;
}): React.ReactElement {
  const card = slot.type === 'card_image';
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(live?.url ?? null);
  const [focal, setFocal] = useState<Focal>(live ? parseFocal(live.settings.focal) : { x: 50, y: 50 });
  const [meta, setMeta] = useState<MetaState>({
    source: live?.sourceUrl ?? '', author: live?.author ?? '', license: live?.license && isLicense(live.license) ? live.license : 'cc_by', note: live?.licenseNote ?? '',
  });
  const [verified, setVerified] = useState(Boolean(live?.verified));
  const [when, setWhen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const take = (b: Blob): void => { setFile(b); setPreview(URL.createObjectURL(b)); setError(null); setDone(false); };
  const hasPicture = Boolean(file || live?.url || versions.some((v) => v.url));

  const publish = async (at: 'now' | string): Promise<void> => {
    if (blocked) return;
    if (!hasPicture) { setError('Choisis une image d\'abord.'); return; }
    const problem = metaProblem(meta, true);
    if (problem) { setError(problem); return; }
    if (!verified) { setError('Coche « licence vérifiée » : une image sans licence vérifiée ne s\'affiche jamais.'); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('action', 'save');
      form.set('key', slot.key);
      form.set('settings', JSON.stringify({ focal }));
      form.set('meta', metaPayload(meta));
      form.set('verified', '1');
      form.set('publish', at === 'now' ? 'now' : new Date(at).toISOString());
      if (file) {
        const bitmap = await decode(file);
        try {
          const f = await makeAssetFiles(bitmap, slot.type);
          form.set('large', f.large, 'large.webp');
          if (f.mid) form.set('mid', f.mid, 'mid.webp');
          form.set('thumb', f.thumb, 'thumb.webp');
        } finally {
          bitmap.close();
        }
      }
      const res = await postForm(PHOTO_API.assets, form);
      if (!res.ok) throw new Error(res.error);
      setDone(true);
      onSaved(at === 'now' ? `${slot.name} : publiée. Elle change sur le site dans la minute.` : `${slot.name} : programmée le ${frDate(new Date(at).toISOString())}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id: number): Promise<void> => {
    setBusy(true);
    const form = new FormData();
    form.set('action', 'restore');
    form.set('id', String(id));
    const res = await postForm(PHOTO_API.assets, form);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onSaved(`${slot.name} : l'ancienne version est remise.`);
  };

  const history = versions.filter((v) => v.url && v.id !== live?.id && v.publishedAt && Date.parse(v.publishedAt) <= now).slice(0, 5);
  const minDate = new Date(now + 5 * 60000).toISOString().slice(0, 16);

  return (
    <aside aria-labelledby="bh" className={`${s.aside} ${s.asideWide}`}>
      <div className={s.asideHead}>
        <span className={s.asideKicker}>{card ? 'Changer l\'image' : 'Changer la bannière'}</span>
        <h2 id="bh" className={s.asideTitle}>{card ? slot.name : `Bannière ${slot.name}`}</h2>
      </div>
      {blocked ? <p className={s.notice}>{blocked}</p> : null}
      <DropZone title="Glisse ton image ici" hint={card ? 'Grande et nette, sujet au centre, JPG ou PNG' : '1920 × 600 conseillé, sujet au centre, JPG ou PNG'} onFile={take} small />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Aperçu et point focal</span>
        <FocalFrame src={preview} focal={focal} onFocal={setFocal} className={s.big} style={{ aspectRatio: card ? slot.ratio : '16 / 5', background: slot.bg }}
          label="Point focal sur l'aperçu ordinateur : clique, ou utilise les flèches">
          <span className={s.frameTag}>Ordinateur</span>
        </FocalFrame>
        <div className={s.mobRow}>
          <div className={s.mob} style={{ background: slot.bg }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the admin's own preview */}
            {preview ? <img src={preview} alt="" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} /> : null}
            <span aria-hidden="true" className={s.focalDot} style={{ left: `${focal.x}%`, top: `${focal.y}%` }} />
            <span className={`${s.frameTag} ${s.frameTagSm}`}>Mobile</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: '#57514B' }}>Clique sur l&apos;image pour placer le point focal : il reste visible sur mobile.</span>
            <div role="group" aria-label="Point focal" className={s.focalBtns}>
              {FOCALS.map(([id, label, x]) => (
                <button key={id} type="button" className={s.focalBtn} aria-pressed={Math.round(focal.x) === x} onClick={() => setFocal({ x, y: focal.y })}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={s.fld}><label htmlFor="bsrc">Page source</label><input id="bsrc" type="url" placeholder="Page où l'image est publiée" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} /></div>
      <div className={s.fld}><label htmlFor="bau">Crédit affiché en bas à droite</label><input id="bau" type="text" placeholder="Ex. : Photo : Nom de l'auteur, CC BY-SA 4.0" value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} /></div>
      <div className={s.fld}>
        <label htmlFor="blic">Licence</label>
        <select id="blic" value={meta.license} onChange={(e) => setMeta({ ...meta, license: isLicense(e.target.value) ? e.target.value : '' })}>
          {BANNER_LICENSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <label className={s.check}>
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        <span>J&apos;ai vérifié la licence. Pas d&apos;affiche, de capture d&apos;anime ni de logo protégé sans accord écrit.</span>
      </label>
      {error ? <p className={`${s.status} ${s.statusErr}`} role="alert">{error}</p> : null}
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={() => { void publish('now'); }} disabled={busy || Boolean(blocked)}>{done ? 'Publiée' : card ? 'Publier l\'image' : 'Publier la bannière'}</button>
        <button type="button" className={s.secondary} onClick={() => setWhen(when === null ? minDate : null)} disabled={busy || Boolean(blocked)} aria-expanded={when !== null}>Programmer une date</button>
      </div>
      {when !== null ? (
        <div className={s.lineRow}>
          <label htmlFor="bwhen" className={s.lineLabel}>Le</label>
          <input id="bwhen" type="datetime-local" min={minDate} value={when} onChange={(e) => setWhen(e.target.value)} className={s.search} style={{ flex: '1 1 200px', height: 40 }} />
          <button type="button" className={s.small} onClick={() => { void publish(when); }} disabled={busy || !when}>Programmer</button>
        </div>
      ) : null}
      <span className={s.note}>La bannière change sur le site à la prochaine minute, sans nouveau déploiement. Programmer une date sert pour un comeback ou une sortie d&apos;anime.</span>
      {history.length > 0 ? (
        <div className={s.history}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Historique</span>
          {history.map((v) => (
            <div key={v.id} className={s.historyRow}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a stored 96 px file */}
              <img src={v.thumbUrl ?? v.url!} alt="" />
              <span>{v.author}, {frDate(v.publishedAt!)}</span>
              <button type="button" className={s.small} onClick={() => { void restore(v.id); }} disabled={busy}>Remettre</button>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
