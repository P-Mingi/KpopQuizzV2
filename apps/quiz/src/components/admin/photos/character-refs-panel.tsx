'use client';

// Owner, 2026-11-10 (lane charrefs, L32): "Références personnages" of the Photos tab. One card per anime character, three boxes side by side:
//   1. the REFERENCE (private, never published) with its credits as its source gives them (AniList today; the name comes from the host of its page),
//      and the size in pixels once the picture is loaded, so a small one is seen at a glance;
//   2. the FREE PICTURE (the candidate, private): "Remplacer par une image libre", the form pre-filled with the credits of the reference so the
//      owner sees what to replace, "Valider et publier";
//   3. the picture the site shows today (entity_images).
// The previews are short signed URLs asked from the server (POST /api/admin/photos/refs, admin only); the WebP files of a candidate are made
// in the browser like the other panels do (lib/photos/resize.ts). Everything else (the refusals) is decided by the server.
import { useEffect, useMemo, useState } from 'react';

import {
  CANDIDATE_ORIGINAL_MAX, NO_LICENSE_WORDS, REF_LICENSE_OPTIONS, REF_STATUSES, SIGN_BATCH, STATUS_LABEL, filterRefs, foundByLabel, prefillOf, referenceTitle,
} from '@/lib/photos/character-refs';
import { decode, makePhotoFiles } from '@/lib/photos/resize';

import { PHOTO_API, postForm } from './api';
import { DropZone } from './ui';
import s from './photos-admin.module.css';

import type { CharacterRefsData, RefCreditFields, RefFilter, RefListRow, RefStatus } from '@/lib/photos/character-refs';

const PAGE = 12;
/** Signed URLs live 300 s on the server: they are asked again a little before. */
const REFRESH_MS = 240_000;

interface Preview { readonly reference: string | null; readonly candidate: string | null }

const slugOf = (r: RefListRow): string => `${r.series}/${r.character}`;
const licenseLabel = (v: string): string => REF_LICENSE_OPTIONS.find((o) => o.value === v)?.label ?? v;

/** A picture with its size in pixels once the browser has loaded it. */
function SizedPicture({ src, alt }: { src: string; alt: string }): React.ReactElement {
  const [size, setSize] = useState<string | null>(null);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a short signed URL of a private file, shown to the admin only */}
      <img src={src} alt={alt} className={s.refPic} loading="lazy" referrerPolicy="no-referrer"
        onLoad={(e) => setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} />
      {size ? <span className={s.refSize} data-testid="ref-size">{size}</span> : null}
    </>
  );
}

function Link({ href }: { href: string }): React.ReactElement {
  let label = href;
  try { label = new URL(href).host; } catch { /* keep the text */ }
  return <a href={href} target="_blank" rel="noreferrer noopener">{label}</a>;
}

function ReferenceBox({ row, preview }: { row: RefListRow; preview: Preview | undefined }): React.ReactElement {
  const ref = row.reference;
  if (!ref) {
    return (
      <div className={s.refBox} data-testid="ref-box-reference">
        <h3 className={s.refBoxTitle}>Référence</h3>
        <span className={s.refEmpty}>Pas de référence</span>
      </div>
    );
  }
  const found = foundByLabel(ref.foundBy);
  return (
    <div className={s.refBox} data-testid="ref-box-reference">
      <h3 className={s.refBoxTitle}>{referenceTitle(ref.pageUrl)}</h3>
      {preview?.reference ? <SizedPicture src={preview.reference} alt={`Référence de ${row.name}`} /> : <span className={s.refEmpty}>Aperçu en cours</span>}
      <dl className={s.refCredits}>
        <dt>Page</dt><dd>{ref.pageUrl ? <Link href={ref.pageUrl} /> : 'non indiquée'}</dd>
        <dt>Image</dt><dd>{ref.filePageUrl ? <Link href={ref.filePageUrl} /> : ref.imageUrl ? <Link href={ref.imageUrl} /> : 'non indiquée'}</dd>
        <dt>Auteur</dt><dd>{ref.author?.trim() || 'non indiqué'}</dd>
        <dt>Licence</dt><dd className={ref.license?.trim() ? undefined : s.refWarn}>{ref.license?.trim() || NO_LICENSE_WORDS}</dd>
        {found ? (<><dt>Trouvé par</dt><dd>{found}</dd></>) : null}
      </dl>
    </div>
  );
}

function PublishedBox({ row }: { row: RefListRow }): React.ReactElement {
  const pub = row.published;
  return (
    <div className={s.refBox} data-testid="ref-box-published">
      <h3 className={s.refBoxTitle}>Publiée aujourd&apos;hui</h3>
      {pub ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the public file of the character */}
          <img src={pub.url} alt={`Image publiée de ${row.name}`} className={s.refPic} loading="lazy" />
          <dl className={s.refCredits}>
            <dt>Licence</dt><dd>{licenseLabel(pub.license)}{pub.verified ? ', vérifiée' : ', à vérifier'}</dd>
            <dt>Auteur</dt><dd>{pub.author?.trim() || 'non indiqué'}</dd>
            {pub.sourceUrl ? (<><dt>Source</dt><dd><Link href={pub.sourceUrl} /></dd></>) : null}
          </dl>
        </>
      ) : <span className={s.refEmpty}>Rien de publié</span>}
    </div>
  );
}

function CandidateBox({ row, preview, onSaved }: { row: RefListRow; preview: Preview | undefined; onSaved: (message: string) => void }): React.ReactElement {
  const [credit, setCredit] = useState<RefCreditFields>(() => prefillOf({ reference: row.reference, candidate: row.candidate }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCandidate = Boolean(row.candidate?.hasFiles);
  const set = (patch: Partial<RefCreditFields>): void => setCredit({ ...credit, ...patch });

  const body = (action: string): FormData => {
    const form = new FormData();
    form.set('action', action);
    form.set('series', row.series);
    form.set('character', row.character);
    form.set('source_url', credit.source_url);
    form.set('author', credit.author);
    form.set('license', credit.license);
    form.set('license_url', credit.license_url);
    return form;
  };

  const run = async (form: FormData, done: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await postForm(PHOTO_API.refs, form);
      if (!res.ok) throw new Error(res.error);
      onSaved(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // The free picture: the browser makes the three WebP files (like the other panels) and keeps the original only to be hashed on the server.
  const take = async (file: File): Promise<void> => {
    if (file.size > CANDIDATE_ORIGINAL_MAX) { setError(`Le fichier dépasse ${Math.round(CANDIDATE_ORIGINAL_MAX / 1048576)} Mo : réduis-le avant de le glisser.`); return; }
    setBusy(true);
    setError(null);
    try {
      const bitmap = await decode(file);
      try {
        const files = await makePhotoFiles(bitmap, 'character', { x: 50, y: 50 });
        const form = body('candidate');
        form.set('original', file, 'original');
        form.set('x1', files.x1, 'x1.webp');
        form.set('x2', files.x2, 'x2.webp');
        form.set('thumb', files.thumb, 'thumb.webp');
        const res = await postForm(PHOTO_API.refs, form);
        if (!res.ok) throw new Error(res.error);
        onSaved(`${row.name} : image libre gardée en privé. Corrige le crédit, puis « Valider et publier ».`);
      } finally {
        bitmap.close();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const publish = (): void => {
    if (!window.confirm(`Publier l'image libre de ${row.name} ? La référence est supprimée du stockage privé.`)) return;
    void run(body('publish'), `${row.name} : image libre publiée, référence supprimée.`);
  };
  const discard = (): void => {
    if (!window.confirm(`Retirer l'image libre de ${row.name} ?`)) return;
    const form = new FormData();
    form.set('action', 'discard');
    form.set('series', row.series);
    form.set('character', row.character);
    void run(form, `${row.name} : image libre retirée.`);
  };

  const id = `${row.series}-${row.character}`;
  return (
    <div className={s.refBox} data-testid="ref-box-candidate">
      <h3 className={s.refBoxTitle}>Image libre</h3>
      {preview?.candidate ? <SizedPicture src={preview.candidate} alt={`Image libre de ${row.name}`} />
        : <DropZone title="Glisse une image libre" hint="3 Mo au plus" small onFile={(f) => { void take(f); }} button="Remplacer par une image libre" />}
      {preview?.candidate ? <DropZone title="Une autre image" small onFile={(f) => { void take(f); }} button="Remplacer par une image libre" /> : null}
      {!hasCandidate && row.reference ? <p className={s.note}>Le formulaire reprend les crédits de la référence : remplace-les par ceux de ton image libre.</p> : null}
      <div className={`${s.fld} ${s.refForm}`}>
        <div className={s.fld}>
          <label htmlFor={`${id}-src`}>Page source (https)</label>
          <input id={`${id}-src`} type="url" value={credit.source_url} onChange={(e) => set({ source_url: e.target.value })} placeholder="https://" />
        </div>
        <div className={s.fld}>
          <label htmlFor={`${id}-au`}>Auteur</label>
          <input id={`${id}-au`} type="text" value={credit.author} onChange={(e) => set({ author: e.target.value })} />
        </div>
        <div className={s.fld}>
          <label htmlFor={`${id}-lic`}>Licence</label>
          <select id={`${id}-lic`} value={credit.license} onChange={(e) => set({ license: e.target.value })}>
            <option value="">Choisis la licence</option>
            {REF_LICENSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className={s.fld}>
          <label htmlFor={`${id}-lu`}>Adresse de la licence{credit.license === 'other' ? ' (obligatoire)' : ''}</label>
          <input id={`${id}-lu`} type="url" value={credit.license_url} onChange={(e) => set({ license_url: e.target.value })} placeholder="https://" />
        </div>
      </div>
      {error ? <p className={`${s.status} ${s.statusErr}`} role="alert">{error}</p> : null}
      <div className={s.refActions}>
        <button type="button" className={s.primary} disabled={busy || !hasCandidate} onClick={publish}>{busy ? 'En cours' : 'Valider et publier'}</button>
        {hasCandidate ? <button type="button" className={s.secondary} disabled={busy} onClick={() => { void run(body('candidate'), `${row.name} : crédit enregistré.`); }}>Enregistrer le crédit</button> : null}
        {hasCandidate ? <button type="button" className={s.danger} disabled={busy} onClick={discard}>Retirer</button> : null}
      </div>
    </div>
  );
}

function RefCard({ row, preview, onSaved }: { row: RefListRow; preview: Preview | undefined; onSaved: (m: string) => void }): React.ReactElement {
  return (
    <article className={s.refCard} aria-label={`${row.name}, ${row.seriesName}`}>
      <div className={s.refHead}>
        <h2 className={s.refName}>{row.name}</h2>
        <span className={s.refSeries}>{row.seriesName}</span>
        <span className={row.status === 'published' ? s.flagOk : s.flagReview}>{STATUS_LABEL[row.status]}</span>
      </div>
      <div className={s.refBoxes}>
        <ReferenceBox row={row} preview={preview} />
        {/* The form resets when the server changes the row (a candidate saved, a publication). */}
        <CandidateBox key={`${row.status}|${row.candidate?.hasFiles ? 1 : 0}|${row.candidate?.sourceUrl ?? ''}`} row={row} preview={preview} onSaved={onSaved} />
        <PublishedBox row={row} />
      </div>
    </article>
  );
}

export function CharacterRefsPanel({ head, data, onSaved }: {
  head: React.ReactNode; data: CharacterRefsData | null; onSaved: (message: string) => void;
}): React.ReactElement {
  const [series, setSeries] = useState('all');
  const [status, setStatus] = useState<RefFilter['status']>('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => (data ? filterRefs(data.rows, { series, status, query }) : []), [data, series, status, query]);
  const visible = rows.slice(0, shown);
  const wanted = visible.map(slugOf).join(',');

  // Short signed URLs for the cards on screen, asked again before they expire.
  useEffect(() => {
    const slugs = wanted ? wanted.split(',') : [];
    if (slugs.length === 0) return undefined;
    let live = true;
    void (async () => {
      const form = new FormData();
      form.set('action', 'sign');
      form.set('slugs', JSON.stringify(slugs.slice(0, SIGN_BATCH)));
      const res = await postForm(PHOTO_API.refs, form);
      if (live && res.ok && res.previews && typeof res.previews === 'object') setPreviews((prev) => ({ ...prev, ...(res.previews as Record<string, Preview>) }));
    })();
    return () => { live = false; };
  }, [wanted, tick, data]);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <section aria-labelledby="ph" className={s.section}>
      {head}
      {!data ? (
        <p className={s.notice}>La liste des personnages n&apos;a pas pu être lue. Recharge la page dans un instant.</p>
      ) : (
        <>
          {data.schema === 'missing' ? <p className={s.notice}>La table des références (migration L32) n&apos;est pas là : les personnages sont listés sans référence, et l&apos;enregistrement attend la migration.</p> : null}
          <p className={s.refCount} data-testid="ref-counter">{`${data.published} / ${data.total} publiés`}</p>
          <div className={s.filters}>
            <label htmlFor="refs-series" className={s.sr}>Série</label>
            <select id="refs-series" className={s.search} style={{ flex: '0 1 240px' }} value={series} onChange={(e) => { setSeries(e.target.value); setShown(PAGE); }}>
              <option value="all">Toutes les séries ({data.total})</option>
              {data.series.map((x) => <option key={x.slug} value={x.slug}>{x.name} ({x.count})</option>)}
            </select>
            <div className={s.filterGroup} role="group" aria-label="Statut">
              <button type="button" className={s.pill} aria-pressed={status === 'all'} onClick={() => { setStatus('all'); setShown(PAGE); }}>Tous</button>
              {REF_STATUSES.map((st: RefStatus) => (
                <button key={st} type="button" className={s.pill} aria-pressed={status === st} onClick={() => { setStatus(st); setShown(PAGE); }}>{STATUS_LABEL[st]}</button>
              ))}
            </div>
            <label htmlFor="refs-q" className={s.sr}>Rechercher</label>
            <input id="refs-q" type="search" className={s.search} placeholder="Rechercher un personnage ou une série" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
          </div>
          {visible.length > 0 ? (
            <>
              <div className={s.refList}>{visible.map((r) => <RefCard key={slugOf(r)} row={r} preview={previews[slugOf(r)]} onSaved={onSaved} />)}</div>
              <span className={s.footer}>{`${visible.length} sur ${rows.length} ${rows.length === 1 ? 'personnage' : 'personnages'}.`}</span>
              {rows.length > visible.length ? <button type="button" className={`${s.outline} ${s.more}`} onClick={() => setShown(shown + PAGE)}>Voir {Math.min(PAGE, rows.length - visible.length)} de plus</button> : null}
            </>
          ) : (
            <div className={s.empty}><span>Aucun personnage ne correspond à ce filtre.</span></div>
          )}
        </>
      )}
    </section>
  );
}
