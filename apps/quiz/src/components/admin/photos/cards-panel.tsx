'use client';

// Bunnyverse Cards, lane U: the "Cartes" tab of the photos admin (amendment 1, point 5). One photo per card subject; the owner sets the
// focal point of its 5.5:8.5 crop by clicking or dragging on the photo, sees the card crop live, and saves it through lane C's admin
// route (POST /api/admin/cards/photos, action "focal"). A photo whose crop is narrower than 640 px (twice the 320 px card, the largest
// the site shows) is flagged "trop petite pour le 2x". The size is read from the picture itself once it has loaded.
// Lot 2 (owner idea, 2026-11-12): a GROUP photo gives a PAIR of cards, the 11:8.5 window at the one focal point split in two halves (1/2 left,
// 2/2 right). For a group the tab shows that window and its two halves side by side, with one focal control for the pair (the same "focal"
// action, writing focal_x and focal_y only) and a "trop petite pour le 2x" flag per half (row.halves, from the cards_catalog rows of the photo).
// Review 1 finding 6: the tab also holds the reports inbox (the open reports with their card, photo and message, and a button to close each),
// removing a photo (its cards leave the packs, the copies already won stay) and the lock reason of the Era and Full Art pockets, hiatus
// included (decision 4: the owner sets it here). The tab lives in the admin of bunnyverse.org/anime, which lib/cards/admin-photos.ts serves.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LOCK_SENTENCES } from '@/lib/cards/rules';
import { withBasePath } from '@/lib/site/base-path';

import s from './photos-admin.module.css';

import type { LockReason } from '@/lib/cards/types';

export const CARD_RATIO = 55 / 85;
export const TWO_X_WIDTH = 640;

/** The width of the 5.5:8.5 crop of a picture: the whole width when the picture is taller than the card, else the card's share of the height. */
export function cropWidth(w: number, h: number): number {
  return Math.min(w, h * CARD_RATIO);
}
export function tooSmallFor2x(w: number, h: number): boolean {
  return w > 0 && h > 0 && cropWidth(w, h) < TWO_X_WIDTH;
}

export const PAIR_RATIO = 110 / 85;

/** A group photo gives a pair of cards (lot 2). */
export function isGroupPhoto(row: Pick<CardPhotoRow, 'entity_id' | 'cards_entities'>): boolean {
  const e = row.cards_entities;
  const one = Array.isArray(e) ? e[0] : e;
  return one?.kind === 'group' || row.entity_id.startsWith('group:');
}
/** The width of each half of the 11:8.5 window of a picture (half 1 is the floor, half 2 the rest: the smaller is half 1). */
export function halfCropWidth(w: number, h: number): number {
  return Math.floor(Math.min(w, h * PAIR_RATIO) / 2);
}
/** Per half: true when that half is too narrow for its 2x file. The flags of the database when there are some, else read from the picture. */
export function halvesTooSmall(row: Pick<CardPhotoRow, 'halves'>, dims: [number, number] | undefined): [boolean, boolean] {
  if (row.halves && row.halves.length > 0) {
    const f = (p: 1 | 2): boolean => row.halves?.find((x) => x.part === p)?.small_2x === true;
    return [f(1), f(2)];
  }
  const small = dims ? dims[0] > 0 && dims[1] > 0 && halfCropWidth(dims[0], dims[1]) < TWO_X_WIDTH : false;
  return [small, small];
}

interface EntityRef { name: string; kind?: string; lock_reasons?: Record<string, string> | null }

export interface CardPhotoRow {
  id: number; entity_id: string; slot: number; file_url: string | null; storage_path: string | null; author: string; licence: string; status: string; focal_x: number; focal_y: number;
  cards_entities?: EntityRef | EntityRef[] | null;
  /** Group photos only: the small_2x flag of each half of the pair (the admin route). */
  halves?: { part: 1 | 2; small_2x: boolean }[];
}

/** One report of "Report a photo", as the admin route answers it (with its card and photo when it names them). */
export interface CardReportRow {
  id: number; role: string; message: string; contact: string | null; created_at: string; status: string;
  card: { n: number; num: string; entity: string; name: string | null } | null;
  photo: { id: number; entity: string; url: string | null; author: string; licence: string; status: string } | null;
}

/** The lock reasons the owner can set on a missing edition (the five sentences of the plan; hiatus is set here only, decision 4). */
export const LOCK_CHOICES: { value: LockReason; label: string }[] = [
  { value: 'one', label: 'Une seule photo libre' },
  { value: 'sameday', label: 'Toutes les photos du même jour' },
  { value: 'newg', label: 'Groupe trop récent' },
  { value: 'hiatus', label: 'En pause (hiatus)' },
  { value: 'crop', label: 'Seulement sur des photos de groupe' },
];
/** The editions a subject of amendment 1 is missing (one photo: Era and Full Art). */
export const LOCKABLE = ['SR', 'L'] as const;

const ROLE_LABELS: Record<string, string> = { person: 'La personne sur la photo', photographer: 'Le photographe', agency: 'Une agence', other: 'Quelqu\'un d\'autre' };

export function entityOf(row: Pick<CardPhotoRow, 'cards_entities'>): EntityRef | null {
  const e = row.cards_entities;
  return Array.isArray(e) ? (e[0] ?? null) : (e ?? null);
}

/** The reports inbox: every open report with its card, its photo and its message, and a button to close it (the trigger erases the contact). */
export function ReportsInbox({ rows, busy, onClose }: { rows: readonly CardReportRow[]; busy: number | null; onClose: (id: number) => void }): React.ReactElement {
  if (rows.length === 0) return <p className={s.empty}>Aucun signalement ouvert.</p>;
  return (
    <ul className={s.reports} aria-label="Signalements ouverts">
      {rows.map((r) => (
        <li key={r.id} className={s.report}>
          {r.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the source photo of the images bucket
            <img src={r.photo.url} alt="" width={64} height={64} className={s.reportImg} loading="lazy" />
          ) : <span className={s.ph} aria-hidden="true" />}
          <div className={s.reportBody}>
            <p className={s.reportHead}>
              <b>{r.card ? `${r.card.num}${r.card.name ? ` · ${r.card.name}` : ''}` : 'Signalement général'}</b>
              <span className={s.num}> · {new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</span>
            </p>
            <p className={s.note}>
              {ROLE_LABELS[r.role] ?? r.role}
              {r.photo ? <> · photo n° <span className={s.num}>{r.photo.id}</span> de {r.photo.author} ({r.photo.licence}), statut {r.photo.status}</> : null}
            </p>
            <p className={s.reportMsg}>{r.message}</p>
            {r.contact ? <p className={s.note}>Contact : {r.contact}</p> : null}
          </div>
          <button type="button" className={s.outline} disabled={busy === r.id} onClick={() => onClose(r.id)}>{busy === r.id ? 'Fermeture' : 'Clore le signalement'}</button>
        </li>
      ))}
    </ul>
  );
}

/** Why Era and Full Art are missing for this subject. Empty: the default of the plan ("one free photo"). */
export function LockEditor({ lockReasons, busy, onSet }: { lockReasons: Record<string, string> | null | undefined; busy: boolean; onSet: (rarity: (typeof LOCKABLE)[number], reason: LockReason | null) => void }): React.ReactElement {
  return (
    <div className={s.where}>
      <p className={s.whereTitle}>Raison des cases verrouillées</p>
      {LOCKABLE.map((r) => {
        const cur = (lockReasons?.[r] ?? '') as LockReason | '';
        return (
          <div key={r} className={s.fld}>
            <label htmlFor={`lock-${r}`}>{r === 'SR' ? 'Era (SR)' : 'Full Art (L)'}</label>
            <select id={`lock-${r}`} value={cur} disabled={busy} onChange={(e) => onSet(r, (e.target.value || null) as LockReason | null)}>
              <option value="">Par défaut (une seule photo libre)</option>
              {LOCK_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <span className={s.cropHint}>Le joueur lit : {LOCK_SENTENCES[cur || 'one']}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Removes a photo after a second click: its cards leave the packs (trigger cards_photo_retire), the copies already won stay in the binders. */
export function RemovePhoto({ busy, onRemove }: { busy: boolean; onRemove: () => void }): React.ReactElement {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={s.danger} disabled={busy} onClick={() => setAsk(true)}>Retirer la photo</button>;
  return (
    <div className={s.where} role="group" aria-label="Retirer la photo">
      <p className={s.whereText}>Ses cartes ne sortiront plus des paquets ; les exemplaires déjà gagnés restent dans les classeurs.</p>
      <div className={s.actions}>
        <button type="button" className={s.danger} disabled={busy} onClick={() => { setAsk(false); onRemove(); }}>Confirmer le retrait</button>
        <button type="button" className={s.secondary} onClick={() => setAsk(false)}>Annuler</button>
      </div>
    </div>
  );
}

/** The address of the source picture: an https address as stored, else a path of the public `images` bucket. */
export function sourceSrc(row: Pick<CardPhotoRow, 'file_url'>, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  const f = row.file_url;
  if (!f) return null;
  if (/^https:\/\//i.test(f)) return f;
  return base ? `${base.replace(/\/+$/, '')}/storage/v1/object/public/images/${f.replace(/^\/+/, '')}` : null;
}

const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

async function api<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(withBasePath('/api/admin/cards/photos'), { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

export function CardsPanel({ head, onSaved }: { head: React.ReactNode; onSaved: (message: string) => void }): React.ReactElement {
  const [rows, setRows] = useState<CardPhotoRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<'auto' | 'approved' | 'pending'>('approved');
  const [sel, setSel] = useState<number | null>(null);
  const [dims, setDims] = useState<Record<number, [number, number]>>({});
  const [pos, setPos] = useState<[number, number]>([50, 30]);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'photos' | 'reports'>('photos');
  const [reports, setReports] = useState<CardReportRow[] | null>(null);
  const [reportsFailed, setReportsFailed] = useState(false);
  const [closing, setClosing] = useState<number | null>(null);
  const drag = useRef(false);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setRows(null); setFailed(false);
    void (async () => {
      const all: CardPhotoRow[] = [];
      let after = 0;
      for (let i = 0; i < 20; i++) {
        const r = await api<{ rows: CardPhotoRow[]; next: number | null }>({ action: 'list', status, limit: 200, after });
        if (!r) { if (live) setFailed(true); break; }
        all.push(...r.rows);
        if (r.next === null) break;
        after = r.next;
      }
      if (live) { setRows(all); setSel(all[0]?.id ?? null); }
    })();
    return () => { live = false; };
  }, [status]);

  useEffect(() => {
    if (view !== 'reports') return;
    let live = true;
    setReports(null); setReportsFailed(false);
    void (async () => {
      const all: CardReportRow[] = [];
      let after = 0;
      for (let i = 0; i < 20; i++) {
        const r = await api<{ rows: CardReportRow[]; next: number | null }>({ action: 'reports', status: 'open', limit: 200, after });
        if (!r) { if (live) setReportsFailed(true); break; }
        all.push(...r.rows);
        if (r.next === null) break;
        after = r.next;
      }
      if (live) setReports(all);
    })();
    return () => { live = false; };
  }, [view]);

  const closeReport = async (id: number): Promise<void> => {
    setClosing(id);
    const r = await api<{ ok: boolean }>({ action: 'close_report', id });
    setClosing(null);
    if (r?.ok) {
      setReports((xs) => xs?.filter((x) => x.id !== id) ?? xs);
      onSaved('Signalement clos. Son adresse de contact est effacée.');
    } else onSaved('Le signalement n\'a pas pu être clos. Réessaie.');
  };

  const row = useMemo(() => rows?.find((r) => r.id === sel) ?? null, [rows, sel]);
  useEffect(() => { if (row) setPos([row.focal_x, row.focal_y]); }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = useCallback((e: React.PointerEvent): void => {
    const f = frame.current;
    if (!f) return;
    const r = f.getBoundingClientRect();
    setPos([clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100)]);
  }, []);

  const save = async (): Promise<void> => {
    if (!row || saving) return;
    setSaving(true);
    const r = await api<{ ok: boolean }>({ action: 'focal', id: row.id, x: pos[0], y: pos[1] });
    setSaving(false);
    if (r?.ok) {
      setRows((xs) => xs?.map((x) => (x.id === row.id ? { ...x, focal_x: pos[0], focal_y: pos[1] } : x)) ?? xs);
      onSaved(`Point focal enregistré (${pos[0]} / ${pos[1]}). Le site recoupe la photo sur ce point ; le fichier WebP se refait avec out/cards-tool.`);
    } else onSaved('Le point focal n\'a pas pu être enregistré. Réessaie.');
  };

  const remove = async (): Promise<void> => {
    if (!row || saving) return;
    setSaving(true);
    const r = await api<{ ok: boolean }>({ action: 'remove', id: row.id });
    setSaving(false);
    if (r?.ok) {
      setRows((xs) => xs?.filter((x) => x.id !== row.id) ?? xs);
      setSel(null);
      onSaved('Photo retirée : ses cartes ne sortent plus des paquets.');
    } else onSaved('La photo n\'a pas pu être retirée. Réessaie.');
  };

  const setLock = async (rarity: (typeof LOCKABLE)[number], reason: LockReason | null): Promise<void> => {
    if (!row || saving) return;
    setSaving(true);
    const r = await api<{ ok: boolean; lock_reasons: Record<string, string> }>({ action: 'lock', entity: row.entity_id, rarity, reason });
    setSaving(false);
    if (r?.ok) {
      setRows((xs) => xs?.map((x) => (x.entity_id === row.entity_id ? { ...x, cards_entities: { ...(entityOf(x) ?? { name: x.entity_id }), lock_reasons: r.lock_reasons } } : x)) ?? xs);
      onSaved('Raison enregistrée.');
    } else onSaved('La raison n\'a pas pu être enregistrée. Réessaie.');
  };

  const src = row ? sourceSrc(row) : null;
  const d = row ? dims[row.id] : undefined;
  const group = row ? isGroupPhoto(row) : false;
  const [small1, small2] = row && group ? halvesTooSmall(row, d) : [false, false];
  const small = group ? small1 || small2 : d ? tooSmallFor2x(d[0], d[1]) : false;
  const pill = (v: typeof status, label: string): React.ReactElement => <button type="button" className={s.pill} aria-pressed={view === 'photos' && status === v} onClick={() => { setView('photos'); setStatus(v); }}>{label}</button>;

  if (view === 'reports') {
    return (
      <section aria-labelledby="ph" className={s.section}>
        {head}
        <div className={s.filters}>
          <div className={s.filterGroup} role="group" aria-label="Statut de la photo">{pill('approved', 'Approuvées')}{pill('auto', 'Automatiques')}{pill('pending', 'À relire')}</div>
          <button type="button" className={s.pill} aria-pressed onClick={() => setView('reports')}>Signalements</button>
        </div>
        {reportsFailed ? <p className={s.statusErr} role="alert">Les signalements n&apos;ont pas pu être lus.</p> : null}
        {reports === null && !reportsFailed ? <p className={s.note}>Chargement des signalements.</p> : null}
        {reports ? <ReportsInbox rows={reports} busy={closing} onClose={(id) => void closeReport(id)} /> : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="ph" className={s.section}>
      {head}
      <div className={s.filters}>
        <div className={s.filterGroup} role="group" aria-label="Statut de la photo">{pill('approved', 'Approuvées')}{pill('auto', 'Automatiques')}{pill('pending', 'À relire')}</div>
        <button type="button" className={s.pill} aria-pressed={false} onClick={() => setView('reports')}>Signalements</button>
      </div>
      {failed ? <p className={s.statusErr} role="alert">La liste des photos de cartes n&apos;a pas pu être lue.</p> : null}
      {rows === null && !failed ? <p className={s.note}>Chargement des photos de cartes.</p> : null}
      {rows && rows.length === 0 ? <p className={s.empty}>Aucune photo de carte avec ce statut.</p> : null}
      {rows && rows.length > 0 ? (
        <div className={s.cardsEd}>
          <div className={s.tableBox}>
            <table className={s.table}>
              <thead><tr><th scope="col" style={{ width: 64 }}>Photo</th><th scope="col">Sujet</th><th scope="col">Fiche</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const u = sourceSrc(r);
                  const dm = dims[r.id];
                  return (
                    <tr key={r.id} className={`${s.row} ${r.id === sel ? s.rowOn : ''}`}>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element -- the source photo of the images bucket */}
                        {u ? <img src={u} alt="" width={44} height={44} className={s.phImg} loading="lazy" onLoad={(e) => { const im = e.currentTarget; setDims((x) => ({ ...x, [r.id]: [im.naturalWidth, im.naturalHeight] })); }} /> : null}
                      </td>
                      <td className={s.cellName}><button type="button" className={s.outline} onClick={() => setSel(r.id)} aria-pressed={r.id === sel}>{r.entity_id}</button></td>
                      <td>{(isGroupPhoto(r) ? halvesTooSmall(r, dm).some(Boolean) : dm && tooSmallFor2x(dm[0], dm[1])) ? <span className={s.flagReview}>Trop petite pour le 2x</span> : <span className={s.flagOk}>{r.storage_path ? 'Fichier carte envoyé' : 'Photo source seule'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {row ? (
            <aside className={s.cardsEdSide} aria-label="Point focal">
              <p className={s.asideTitle}>{row.entity_id}</p>
              <p className={s.note}>Clique ou fais glisser sur la photo : {group ? 'le point choisi place la fenêtre de la paire (11 x 8,5, deux cartes côte à côte).' : 'le point choisi reste au centre du cadrage de la carte (5,5 x 8,5).'}</p>
              {src ? (
                <div
                  ref={frame} className={s.focalFrame} role="group" aria-label="Photo source" tabIndex={0}
                  onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
                  onPointerMove={(e) => { if (drag.current) move(e); }}
                  onPointerUp={() => { drag.current = false; }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 2;
                    if (e.key === 'ArrowLeft') setPos(([x, y]) => [clamp(x - step), y]);
                    else if (e.key === 'ArrowRight') setPos(([x, y]) => [clamp(x + step), y]);
                    else if (e.key === 'ArrowUp') setPos(([x, y]) => [x, clamp(y - step)]);
                    else if (e.key === 'ArrowDown') setPos(([x, y]) => [x, clamp(y + step)]);
                    else return;
                    e.preventDefault();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- the source photo */}
                  <img src={src} alt="" draggable={false} className={s.focalImg} onLoad={(e) => { const im = e.currentTarget; setDims((x) => ({ ...x, [row.id]: [im.naturalWidth, im.naturalHeight] })); }} />
                  <span className={s.focalCross} style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }} aria-hidden="true" />
                </div>
              ) : <p className={s.statusErr}>Pas d&apos;adresse de photo source pour cette fiche.</p>}
              {src && group ? (
                <div aria-label="Cadrage de la paire">
                  <div className={s.cardCrop} aria-label="Fenêtre de la paire" style={{ aspectRatio: '110 / 85' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the pair window */}
                    <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                    {([1, 2] as const).map((part) => (
                      <figure key={part} style={{ flex: 1, margin: 0 }} aria-label={`Carte ${part}/2`}>
                        <div className={s.cardCrop} style={{ aspectRatio: '55 / 85', position: 'relative', overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- live preview of one half */}
                          <img src={src} alt="" draggable={false} style={{ position: 'absolute', top: 0, left: part === 1 ? 0 : '-100%', width: '200%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%` }} />
                        </div>
                        <figcaption className={s.note}>{part}/2{(part === 1 ? small1 : small2) ? <> &middot; <span className={s.flagReview}>trop petite pour le 2x</span></> : null}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
              {src && !group ? (
                <div className={s.cardCrop} aria-label="Cadrage de la carte" style={{ aspectRatio: '55 / 85' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the crop */}
                  <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
                </div>
              ) : null}
              <p className={s.note}>Point focal : <span className={s.num}>{pos[0]} / {pos[1]}</span>{d ? <> &middot; photo <span className={s.num}>{d[0]} x {d[1]}</span>, {group ? 'chaque carte de la paire' : 'cadrage'} <span className={s.num}>{group ? halfCropWidth(d[0], d[1]) : Math.round(cropWidth(d[0], d[1]))} px</span> de large</> : null}</p>
              {small ? <p className={s.flagReview} role="status">{group ? `Trop petite pour le 2x : ${small1 && small2 ? 'les deux cartes' : `la carte ${small1 ? '1/2' : '2/2'}`} de la paire font moins de ${TWO_X_WIDTH} px de large.` : `Trop petite pour le 2x : le cadrage fait moins de ${TWO_X_WIDTH} px de large.`}</p> : null}
              <button type="button" className={s.primary} onClick={() => void save()} disabled={saving || (pos[0] === row.focal_x && pos[1] === row.focal_y)}>{saving ? 'Enregistrement' : 'Enregistrer le point focal'}</button>
              <LockEditor lockReasons={entityOf(row)?.lock_reasons} busy={saving} onSet={(r, why) => void setLock(r, why)} />
              <RemovePhoto busy={saving} onRemove={() => void remove()} />
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
