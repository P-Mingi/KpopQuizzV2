'use client';

// Daily games step 2: the "Ajouter une photo" panel of the board (Admin.dc.html, right column of the photo tabs). The picture comes from a
// file, a pasted address, or the picture the site already had (an idol's file, a group's logo, a series' bundled photo); the 4:5 crop
// follows the focal point the owner clicks; the browser makes the WebP files (lib/photos/resize.ts) and the route stores them.
import { useEffect, useMemo, useState } from 'react';

import { decode, makePhotoFiles } from '@/lib/photos/resize';
import { PHOTO_BOX, PHOTO_LICENSE_OPTIONS, isLicense } from '@/lib/photos/slots';

import { PHOTO_API, fetchPicture, postForm } from './api';
import { DropZone, FocalFrame, metaPayload, metaProblem } from './ui';
import s from './photos-admin.module.css';

import type { AdminRow } from '@/lib/photos/admin-data';
import type { Focal, PhotoKind } from '@/lib/photos/slots';
import type { MetaState } from './ui';

/** Where a picture of each kind is shown, in true words (only what exists or is built in the daily games plan). */
const WHERE: Readonly<Record<PhotoKind, string>> = {
  idol: 'Suggestions et lignes d\'essais du Kpopdle, écran de résultat. Le crédit apparaît au résultat et sur la page Crédits.',
  group: 'Kpopdle Groupe et Membres cachés, quand ils ouvriront. Le crédit apparaît au résultat et sur la page Crédits.',
  agency: 'Les jeux du jour qui montrent l\'agence. Le crédit apparaît sur la page Crédits.',
  character: 'Pages du personnage et de sa série sur OtakuQuiz dès l\'enregistrement, Otakudle quand il ouvrira. Le crédit apparaît sous l\'image et sur la page Crédits.',
  series: 'Page de la série sur OtakuQuiz dès l\'enregistrement, Série du jour quand elle ouvrira. Le crédit apparaît sous l\'image et sur la page Crédits.',
};

const EMPTY_META: MetaState = { source: '', author: '', license: 'cc_by', note: '' };

export function PhotoDrawer({ row, kind, blocked, onSaved, onSkip }: {
  row: AdminRow | null; kind: PhotoKind; blocked: string | null; onSaved: (message: string) => void; onSkip: () => void;
}): React.ReactElement {
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [meta, setMeta] = useState<MetaState>(EMPTY_META);
  const [verified, setVerified] = useState(false);
  const [focal, setFocal] = useState<Focal>({ x: 50, y: 38 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new record: the form takes its stored picture and credit, or the picture the site had, or starts empty.
  useEffect(() => {
    setFile(null);
    setAddress('');
    setError(null);
    const img = row?.image;
    if (img) {
      setMeta({ source: img.sourceUrl, author: img.author, license: isLicense(img.license) ? img.license : '', note: img.licenseNote ?? '' });
      setVerified(img.verified);
      setFocal({ x: img.focalX, y: img.focalY });
      setPreview(img.url);
    } else {
      setMeta({ ...EMPTY_META, source: row?.legacy?.sourceUrl ?? '', author: row?.legacy?.author ?? '' });
      setVerified(false);
      setFocal({ x: 50, y: 38 });
      setPreview(row?.legacy?.url ?? null);
    }
  }, [row]);

  // The object URL of a chosen file is freed when it is replaced.
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const box = PHOTO_BOX[kind];
  const animeKind = kind === 'series' || kind === 'character';
  const take = (b: Blob): void => { setFile(b); setPreview(URL.createObjectURL(b)); setError(null); };
  const fromAddress = async (): Promise<void> => {
    const url = address.trim();
    if (!url) return;
    setBusy(true);
    try { take(await fetchPicture(url)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const problem = useMemo(() => metaProblem(meta), [meta]);

  const save = async (): Promise<void> => {
    if (!row || blocked) return;
    if (problem) { setError(problem); return; }
    if (animeKind && !verified) { setError('Coche « licence vérifiée » : OtakuQuiz montre l\'image dès qu\'elle est enregistrée.'); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('kind', kind);
      form.set('slug', row.slug);
      form.set('meta', metaPayload(meta));
      form.set('verified', verified ? '1' : '0');
      form.set('focal_x', String(focal.x));
      form.set('focal_y', String(focal.y));
      // A new file, or the picture the site had (no stored picture yet), goes through the canvas; else only the credit changes.
      const source = file ?? (!row.image && row.legacy ? await fetchPicture(row.legacy.url) : null);
      if (!source && !row.image) throw new Error('Choisis une image : glisse un fichier ou colle son adresse.');
      // The focal point crops the files when a file is sent; for a stored picture it is saved for the frames that crop it on the page.
      if (source) {
        const bitmap = await decode(source);
        try {
          const files = await makePhotoFiles(bitmap, kind, focal);
          form.set('x1', files.x1, 'x1.webp');
          form.set('x2', files.x2, 'x2.webp');
          form.set('thumb', files.thumb, 'thumb.webp');
        } finally {
          bitmap.close();
        }
      }
      const res = await postForm(PHOTO_API.save, form);
      if (!res.ok) throw new Error(res.error);
      onSaved(verified ? `${row.name} : photo enregistrée, licence vérifiée.` : `${row.name} : photo enregistrée. Elle reste hors ligne tant que la licence n'est pas vérifiée.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside aria-labelledby="dh" className={s.aside}>
      <div className={s.asideHead}>
        <span className={s.asideKicker}>{row?.image ? 'Modifier la photo' : 'Ajouter une photo'}</span>
        <h2 id="dh" className={s.asideTitle}>{row ? (row.context && kind === 'idol' ? `${row.name}, ${row.context}` : row.name) : 'Aucune fiche'}</h2>
      </div>
      {blocked ? <p className={s.notice}>{blocked}</p> : null}
      <div className={s.dropRow}>
        <DropZone title="Glisse une image" onFile={take} />
        <div className={s.cropCol}>
          <FocalFrame src={preview} focal={focal} onFocal={setFocal} className={s.crop} style={{ aspectRatio: `${box.w} / ${box.h}` }}
            label="Point focal : clique sur l'image, ou utilise les flèches" />
          <span className={s.cropHint}>Recadrage {box.w === 400 ? '4:5' : '3:4'}, clique pour le point focal</span>
        </div>
      </div>
      <div className={s.fld}>
        <label htmlFor="u">Ou colle l&apos;adresse de l&apos;image</label>
        <input id="u" type="url" placeholder="https://" value={address} onChange={(e) => setAddress(e.target.value)}
          onBlur={() => { void fromAddress(); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void fromAddress(); } }} />
      </div>
      <div className={s.fld}>
        <label htmlFor="src">Page source</label>
        <input id="src" type="url" placeholder="Page où l'image est publiée" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} />
      </div>
      <div className={s.fld}>
        <label htmlFor="au">Auteur ou crédit</label>
        <input id="au" type="text" placeholder="Tel qu'il doit s'afficher" value={meta.author} onChange={(e) => setMeta({ ...meta, author: e.target.value })} />
      </div>
      <div className={s.fld}>
        <label htmlFor="lic">Licence</label>
        <select id="lic" value={meta.license} onChange={(e) => setMeta({ ...meta, license: isLicense(e.target.value) ? e.target.value : '' })}>
          {PHOTO_LICENSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {meta.license === 'other' ? (
        <div className={s.fld}>
          <label htmlFor="note">Précise la licence</label>
          <input id="note" type="text" placeholder="Obligatoire pour Autre" value={meta.note} onChange={(e) => setMeta({ ...meta, note: e.target.value })} />
        </div>
      ) : null}
      <div className={s.where}>
        <span className={s.whereTitle}>Où elle s&apos;affichera</span>
        <span className={s.whereText}>{WHERE[kind]}</span>
      </div>
      <label className={s.check}>
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        <span>J&apos;ai vérifié que cette licence autorise l&apos;usage sur le site, avec le crédit affiché.</span>
      </label>
      {error ? <p className={`${s.status} ${s.statusErr}`} role="alert">{error}</p> : null}
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={() => { void save(); }} disabled={busy || !row || Boolean(blocked)}>{busy ? 'Enregistrement en cours' : 'Enregistrer'}</button>
        <button type="button" className={s.secondary} onClick={onSkip} disabled={busy}>Passer</button>
      </div>
    </aside>
  );
}
