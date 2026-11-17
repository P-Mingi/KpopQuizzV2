'use client';

// Bunnyverse Cards, lane U: the "Cartes" tab of the photos admin (amendment 1, point 5). One photo per card subject; the owner sets the
// focal point of its 5.5:8.5 crop by clicking or dragging on the photo, sees the card crop live, and saves it through lane C's admin
// route (POST /api/admin/cards/photos, action "focal"). A photo whose crop is narrower than 640 px (twice the 320 px card, the largest
// the site shows) is flagged "trop petite pour le 2x". The size is read from the picture itself once it has loaded.
// Lot 2 (owner idea, 2026-11-12): a GROUP photo gives a PAIR of cards, the 11:8.5 window at the one focal point split in two halves (1/2 left,
// 2/2 right). For a group the tab shows that window and its two halves side by side, with one focal control for the pair (the same "focal"
// action, writing focal_x and focal_y only) and a "trop petite pour le 2x" flag per half (row.halves, from the cards_catalog rows of the photo).
// Lot 7 (owner, 2026-11-17): a group photo gives 2 OR 3 cards. Each group photo has a choice 2 or 3 (action "parts"), the preview of its parts (2 or 3
// slices of the window, 11:8.5 or 16.5:8.5) and of the panorama (the whole window, landscape), the rule's note and its warning when the window cuts someone.
// Review 1 finding 6: the tab also holds the reports inbox (the open reports with their card, photo and message, and a button to close each),
// removing a photo (its cards leave the packs, the copies already won stay) and the lock reason of the Era and Full Art pockets, hiatus
// included (decision 4: the owner sets it here). The tab lives in the admin of bunnyverse.org/anime, which lib/cards/admin-photos.ts serves.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LOCK_SENTENCES } from '@/lib/cards/rules';
import { keepsEveryone } from '@/lib/cards/parts-rule';
import { withBasePath } from '@/lib/site/base-path';

import s from './photos-admin.module.css';

import type { HeadsBox } from '@/lib/cards/parts-rule';
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
/** Lot 7: the window of a photo in 3 cards (16.5:8.5). */
export const TRIPLE_RATIO = 165 / 85;
export type PartsCount = 2 | 3;
export const windowRatio = (parts: PartsCount): number => (parts === 3 ? TRIPLE_RATIO : PAIR_RATIO);
/** The number of cards of a photo row: its `parts`, 2 when the column is empty (every photo of lots 2 to 6 is a pair). */
export function partsOf(row: Pick<CardPhotoRow, 'parts'>): PartsCount {
  return row.parts === 3 ? 3 : 2;
}
/** The width of one card of a photo in `parts` cards (the floor, as the owner's script cuts it). */
export function partCropWidth(w: number, h: number, parts: PartsCount): number {
  return Math.floor(Math.min(w, h * windowRatio(parts)) / parts);
}
/** Per card: true when it is narrower than the 2x file. The flags of the database while its cards are the chosen number, else read from the picture. */
export function partsTooSmall(row: Pick<CardPhotoRow, 'halves' | 'parts'>, dims: [number, number] | undefined, parts: PartsCount): boolean[] {
  if (parts === 2 && partsOf(row) === 2 && row.halves && row.halves.length > 0) return ([1, 2] as const).map((p) => row.halves?.find((x) => x.part === p)?.small_2x === true);
  const small = dims ? dims[0] > 0 && dims[1] > 0 && partCropWidth(dims[0], dims[1], parts) < TWO_X_WIDTH : false;
  return Array.from({ length: parts }, () => small);
}
/** The rule's warning for the CHOSEN number of cards at the focal point on screen (the server's `partsWarning` is for the saved choice and the saved point). */
export function partsWarningFor(row: Pick<CardPhotoRow, 'heads_box'>, dims: [number, number] | undefined, parts: PartsCount, pos: readonly [number, number]): string | null {
  const b = row.heads_box;
  if (!b || !dims || dims[0] <= 0 || dims[1] <= 0) return null;
  if (keepsEveryone(dims[0], dims[1], parts, pos[0], pos[1], b)) return null;
  return `La fenêtre de ${parts} cartes (${parts === 3 ? '16,5 x 8,5' : '11 x 8,5'}) coupe quelqu'un au point focal ${pos[0]} / ${pos[1]}. Déplace le point focal${parts === 2 ? ' ou passe cette photo à 3 cartes' : ''}.`;
}

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
  /** Lot 7: the cards of the photo (2 or 3, null reads as 2), where the heads are, the rule's line, what the owner's files were cut for, and the rule's warning (server). */
  parts?: 2 | 3 | null; heads_box?: HeadsBox | null; parts_note?: string | null; file_parts?: 2 | 3 | null; file_pano?: boolean; partsWarning?: string | null;
  /** Lot 3 (one edition, one photo): the original's size, where the photo comes from and why it waits for the owner. */
  source_width?: number | null; source_height?: number | null; source_page?: string | null; review_note?: string | null;
  event_name?: string | null; event_date?: string | null; quality?: number | null; stage?: boolean | null;
}

/** The size of the original when the database has it (lot 3: the admin shows a smaller copy), else the loaded picture's. */
export function dimsOf(row: Pick<CardPhotoRow, 'source_width' | 'source_height'>, loaded: [number, number] | undefined): [number, number] | undefined {
  return row.source_width && row.source_height ? [row.source_width, row.source_height] : loaded;
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

/** Lot 6: the age-locked pockets with the month each one opens (admin only; the public pages never get a month). */
export function opensLabel(month: string | null): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return 'inconnue';
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function LocksList({ rows }: { rows: readonly { entity: string; name: string; kind: string; group: string | null; opens_month: string | null }[] }): React.ReactElement {
  if (rows.length === 0) return <p className={s.empty}>Aucune carte verrouillée.</p>;
  return (
    <div className={s.tableBox}>
      <table className={s.table} aria-label="Cartes verrouillées par l'âge">
        <thead><tr><th scope="col">Groupe</th><th scope="col">Carte</th><th scope="col">Ouverture</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.entity} className={s.row}><td>{r.group ?? '-'}</td><td>{r.name}{r.kind === 'group' ? ' (groupe)' : ''}</td><td>{opensLabel(r.opens_month)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
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

/** What cards_catalog_append(true) answers: what an append would add (file 114). */
export interface AppendSummary {
  dry_run?: boolean; cards: number; subjects: number; new_subjects: number; extended_subjects: number; waiting: number;
  from_no: number | null; to_no: number | null; not_shown?: number;
}

/** The French sentence of an append preview or result (no dash). */
export function appendSentence(a: AppendSummary, done: boolean): string {
  if (a.cards === 0) return `Rien à ajouter. ${a.waiting} sujet${a.waiting > 1 ? 's attendent' : ' attend'} une deuxième photo approuvée.`;
  const range = a.from_no === a.to_no ? `la carte ${a.from_no}` : `les cartes ${a.from_no} à ${a.to_no}`;
  const who = `${a.subjects} sujet${a.subjects > 1 ? 's' : ''} (${a.new_subjects} nouveau${a.new_subjects > 1 ? 'x' : ''}, ${a.extended_subjects} complété${a.extended_subjects > 1 ? 's' : ''})`;
  return `${done ? 'Ajouté' : 'À ajouter'} : ${a.cards} carte${a.cards > 1 ? 's' : ''}, ${who}, ${range}. Aucune carte existante ne change de numéro.`;
}

/** The catalog button: "Reconstruire" before the first pack, "Ajouter au catalogue" after it (with its preview and a confirmation click). */
export function CatalogBar({ frozen, busy, preview, onRebuild, onPreview, onConfirm, onCancel }: {
  frozen: boolean | null; busy: boolean; preview: AppendSummary | null;
  onRebuild: () => void; onPreview: () => void; onConfirm: () => void; onCancel: () => void;
}): React.ReactElement | null {
  if (frozen === null) return null;
  if (!frozen) return <button type="button" className={s.pill} onClick={onRebuild} disabled={busy}>Reconstruire le catalogue</button>;
  if (!preview) return <button type="button" className={s.pill} onClick={onPreview} disabled={busy}>Ajouter au catalogue</button>;
  return (
    <div className={s.where} role="group" aria-label="Ajouter au catalogue">
      <p className={s.whereText}>{appendSentence(preview, false)}</p>
      <div className={s.actions}>
        {preview.cards > 0 ? <button type="button" className={s.pill} disabled={busy} onClick={onConfirm}>Confirmer l&apos;ajout</button> : null}
        <button type="button" className={s.secondary} disabled={busy} onClick={onCancel}>{preview.cards > 0 ? 'Annuler' : 'Fermer'}</button>
      </div>
    </div>
  );
}

/** The action's answer, or the database's own message when it refused (the admin route sends it with a 409). */
async function apiOrMessage<T>(body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; message: string | null }> {
  try {
    const r = await fetch(withBasePath('/api/admin/cards/photos'), { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    const j = (await r.json().catch(() => null)) as (T & { message?: string | null }) | null;
    if (r.ok && j) return { ok: true, data: j };
    return { ok: false, message: typeof j?.message === 'string' && j.message ? j.message : null };
  } catch { return { ok: false, message: null }; }
}

/** What the panel says when the catalog action fails: the database's own message, never a guess at the cause. */
export function catalogFailure(what: string, message: string | null): string {
  return message ? `${what} Message de la base : « ${message} »` : `${what} Le serveur n'a pas répondu ; réessaie.`;
}

/** One half of a group's pair in the focal preview: the picture twice as wide as the half, shifted for half 2. maxWidth none: the admin's
 *  reset (img max-width 100%) would shrink it to the half and show the wrong window. */
export function halfImgStyle(part: 1 | 2 | 3, pos: [number, number], parts: PartsCount = 2): React.CSSProperties {
  // Lot 7: the picture is `parts` cards wide and shifted by whole cards: part 1 at 0, part 2 at -100 %, part 3 at -200 %.
  return { position: 'absolute', top: 0, left: part === 1 ? 0 : `-${(part - 1) * 100}%`, width: `${parts * 100}%`, maxWidth: 'none', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%` };
}

/** Lot 7: the choice 2 or 3 cards of a group photo, with the rule's line and its warning. Disabled while a write runs or when the photo cannot change. */
export function PartsChoice({ parts, busy, note, warning, onChoose }: { parts: PartsCount; busy: boolean; note: string | null; warning: string | null; onChoose: (p: PartsCount) => void }): React.ReactElement {
  return (
    <div role="group" aria-label="Nombre de cartes de la photo">
      <p className={s.asideTitle}>Cartes de cette photo</p>
      <div className={s.filterGroup}>
        {([2, 3] as const).map((n) => (
          <button key={n} type="button" className={s.pill} aria-pressed={parts === n} disabled={busy} onClick={() => { if (n !== parts) onChoose(n); }}>{n} cartes{n === 2 ? ' (11 x 8,5)' : ' (16,5 x 8,5)'}</button>
        ))}
      </div>
      {note ? <p className={s.note}>{note}</p> : null}
      {warning ? <p className={s.flagReview} role="status" style={{ whiteSpace: 'normal', marginTop: 6 }}>{warning}</p> : null}
    </div>
  );
}

/** Lot 7: the window of the photo, its cards side by side (2 or 3 slices of it) and the panorama (the whole window, landscape). */
export function PartsPreview({ src, pos, parts, small }: { src: string; pos: [number, number]; parts: PartsCount; small: readonly boolean[] }): React.ReactElement {
  const ratio = parts === 3 ? '165 / 85' : '110 / 85';
  return (
    <div aria-label={`Cadrage de ${parts} cartes`}>
      <div className={s.cardCrop} aria-label="Fenêtre de la photo" style={{ aspectRatio: ratio, width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the window */}
        <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 6 }} aria-label={`Les ${parts} cartes`}>
        {Array.from({ length: parts }, (_, k) => (k + 1) as 1 | 2 | 3).map((part) => (
          <figure key={part} style={{ flex: 1, margin: 0 }} aria-label={`Carte ${part}/${parts}`}>
            <div className={s.cardCrop} style={{ aspectRatio: '55 / 85', position: 'relative', overflow: 'hidden', width: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- live preview of one card */}
              <img src={src} alt="" draggable={false} style={halfImgStyle(part, pos, parts)} />
            </div>
            <figcaption className={s.note}>{part}/{parts}{small[part - 1] ? <> &middot; <span className={s.flagReview}>trop petite pour le 2x</span></> : null}</figcaption>
          </figure>
        ))}
      </div>
      <figure style={{ margin: '10px 0 0' }} aria-label="Panorama">
        <div className={s.cardCrop} style={{ aspectRatio: ratio, position: 'relative', overflow: 'hidden', width: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the panorama */}
          <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
        </div>
        <figcaption className={s.note}>Panorama : la photo entière, donnée au joueur qui a les {parts} cartes.</figcaption>
      </figure>
    </div>
  );
}

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
  const [view, setView] = useState<'photos' | 'reports' | 'locks'>('photos');
  const [locks, setLocks] = useState<{ entity: string; name: string; kind: string; group: string | null; opens_month: string | null }[] | null>(null);
  const [locksFailed, setLocksFailed] = useState(false);
  const [reports, setReports] = useState<CardReportRow[] | null>(null);
  const [reportsFailed, setReportsFailed] = useState(false);
  const [closing, setClosing] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<AppendSummary | null>(null);
  const [choosing, setChoosing] = useState(false);
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
    if (view !== 'locks') return undefined;
    let live = true;
    setLocks(null); setLocksFailed(false);
    void api<{ ok: boolean; rows: { entity: string; name: string; kind: string; group: string | null; opens_month: string | null }[] }>({ action: 'age_locks' }).then((r) => {
      if (!live) return;
      if (r?.ok) setLocks(r.rows); else setLocksFailed(true);
    });
    return () => { live = false; };
  }, [view]);

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

  useEffect(() => {
    let live = true;
    void api<{ ok: boolean; frozen: boolean }>({ action: 'catalog_state' }).then((r) => { if (live) setFrozen(r?.ok ? r.frozen : false); });
    return () => { live = false; };
  }, []);

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

  /** Lot 3: a photo waiting in "À relire" is approved or refused here; it opens an edition at the next rebuild. */
  const decide = async (action: 'approve' | 'reject'): Promise<void> => {
    if (!row || saving) return;
    setSaving(true);
    const r = await api<{ ok: boolean }>({ action, id: row.id });
    setSaving(false);
    if (r?.ok) {
      setRows((xs) => xs?.filter((x) => x.id !== row.id) ?? xs);
      setSel(null);
      onSaved(action === 'approve'
        ? 'Photo approuvée. Elle ouvre une édition quand le catalogue est reconstruit (bouton Reconstruire) ou, une fois les paquets ouverts, complété (bouton Ajouter au catalogue), puis son fichier se fait avec publish-card-files.mjs.'
        : 'Photo refusée : elle ne revient jamais, même après une reconstruction.');
    } else onSaved('La décision n\'a pas pu être enregistrée. Réessaie.');
  };

  /** Lot 3: runs cards_build_catalog() again (the edition rule of file 103), refused once a player owns a card or opened a pack. */
  /** Lot 7: the owner's choice of 2 or 3 cards. The database's own message when it refuses (a pack was opened and the photo is on a catalog card). */
  const choose = async (n: PartsCount): Promise<void> => {
    if (!row || choosing) return;
    setChoosing(true);
    const r = await apiOrMessage<{ ok: boolean }>({ action: 'parts', photo: row.id, parts: n });
    setChoosing(false);
    if (r.ok && r.data.ok) {
      setRows((xs) => xs?.map((x) => (x.id === row.id ? { ...x, parts: n } : x)) ?? xs);
      onSaved(`Cette photo donne ${n} cartes. Les fichiers se refont avec le script du propriétaire (publish-card-files) ; le catalogue se reconstruit tant qu'aucun paquet n'est ouvert.`);
    } else onSaved(catalogFailure('Le nombre de cartes n\'a pas pu changer.', r.ok ? null : r.message));
  };

  const rebuild = async (): Promise<void> => {
    if (saving) return;
    if (!window.confirm('Reconstruire le catalogue avec les photos approuvées ? Les numéros des cartes sont refaits ; c\'est refusé dès qu\'un joueur possède une carte.')) return;
    setSaving(true);
    const r = await apiOrMessage<{ ok: boolean; summary?: { subjects: number; waiting: number; cards: number; not_shown: number; panoramas?: number } }>({ action: 'rebuild' });
    setSaving(false);
    if (r.ok && r.data.summary) onSaved(`Catalogue reconstruit : ${r.data.summary.subjects} sujets, ${r.data.summary.cards} cartes${typeof r.data.summary.panoramas === 'number' ? `, ${r.data.summary.panoramas} panoramas` : ''}, ${r.data.summary.waiting} sujets attendent une deuxième photo, ${r.data.summary.not_shown} cartes attendent leur fichier.`);
    else onSaved(catalogFailure('Le catalogue n\'a pas été reconstruit.', r.ok ? null : r.message));
  };

  /** File 114, after the first pack: the preview first (writes nothing), then the write on a second, explicit click. */
  const previewAppend = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    const r = await apiOrMessage<{ ok: boolean; summary?: AppendSummary }>({ action: 'append_preview' });
    setSaving(false);
    if (r.ok && r.data.summary) setPreview(r.data.summary);
    else onSaved(catalogFailure('L\'aperçu n\'a pas pu être calculé.', r.ok ? null : r.message));
  };
  const confirmAppend = async (): Promise<void> => {
    if (saving || !preview || preview.cards === 0) return;
    setSaving(true);
    const r = await apiOrMessage<{ ok: boolean; summary?: AppendSummary }>({ action: 'append', confirm: true });
    setSaving(false);
    setPreview(null);
    if (r.ok && r.data.summary) onSaved(`${appendSentence(r.data.summary, true)} ${r.data.summary.not_shown ?? 0} cartes attendent leur fichier.`);
    else onSaved(catalogFailure('Le catalogue n\'a pas été complété. Rien n\'a changé.', r.ok ? null : r.message));
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
  const d = row ? dimsOf(row, dims[row.id]) : undefined;
  const group = row ? isGroupPhoto(row) : false;
  const nParts: PartsCount = row ? partsOf(row) : 2;
  const smalls = row && group ? partsTooSmall(row, d, nParts) : [false, false];
  const small = group ? smalls.some(Boolean) : d ? tooSmallFor2x(d[0], d[1]) : false;
  const warning = row && group ? partsWarningFor(row, d, nParts, pos) : null;
  const pill = (v: typeof status, label: string): React.ReactElement => <button type="button" className={s.pill} aria-pressed={view === 'photos' && status === v} onClick={() => { setView('photos'); setStatus(v); }}>{label}</button>;

  if (view === 'locks') {
    return (
      <section aria-labelledby="ph" className={s.section}>
        {head}
        <div className={s.filters}>
          <button type="button" className={s.pill} aria-pressed={false} onClick={() => setView('photos')}>Photos</button>
          <button type="button" className={s.pill} aria-pressed>Verrouillées</button>
        </div>
        {locksFailed ? <p className={s.statusErr} role="alert">Les cartes verrouillées n&apos;ont pas pu être lues (le fichier 116 est-il appliqué ?).</p> : null}
        {locks === null && !locksFailed ? <p className={s.note}>Chargement des cartes verrouillées.</p> : null}
        {locks ? <LocksList rows={locks} /> : null}
      </section>
    );
  }

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
        <button type="button" className={s.pill} aria-pressed={false} onClick={() => setView('locks')}>Verrouillées</button>
        <CatalogBar frozen={frozen} busy={saving} preview={preview} onRebuild={() => void rebuild()} onPreview={() => void previewAppend()}
          onConfirm={() => void confirmAppend()} onCancel={() => setPreview(null)} />
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
                  const dm = dimsOf(r, dims[r.id]);
                  return (
                    <tr key={r.id} className={`${s.row} ${r.id === sel ? s.rowOn : ''}`}>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element -- the source photo of the images bucket */}
                        {u ? <img src={u} alt="" width={44} height={44} className={s.phImg} loading="lazy" onLoad={(e) => { const im = e.currentTarget; setDims((x) => ({ ...x, [r.id]: [im.naturalWidth, im.naturalHeight] })); }} /> : null}
                      </td>
                      <td className={s.cellName}><button type="button" className={s.outline} onClick={() => setSel(r.id)} aria-pressed={r.id === sel}>{r.entity_id}</button></td>
                      <td>{(isGroupPhoto(r) ? partsTooSmall(r, dm, partsOf(r)).some(Boolean) : dm && tooSmallFor2x(dm[0], dm[1])) ? <span className={s.flagReview}>Trop petite pour le 2x</span> : <span className={s.flagOk}>{r.storage_path ? 'Fichier carte envoyé' : 'Photo source seule'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {row ? (
            <aside className={s.cardsEdSide} aria-label="Point focal">
              <p className={s.asideTitle}>{row.entity_id} &middot; photo {row.slot}</p>
              <p className={s.note}>
                {[row.event_date, row.event_name, row.quality ? `qualité ${row.quality}/5` : null, row.stage ? 'photo de scène' : null].filter(Boolean).join(' · ')}
                {row.source_page ? <> &middot; <a href={row.source_page} target="_blank" rel="noreferrer">page source</a></> : null}
              </p>
              {row.status === 'pending' ? (
                <div role="group" aria-label="Relecture de la photo">
                  {row.review_note ? <p className={s.flagReview}>{row.review_note}</p> : null}
                  <button type="button" className={s.primary} onClick={() => void decide('approve')} disabled={saving}>Approuver</button>{' '}
                  <button type="button" className={s.pill} onClick={() => void decide('reject')} disabled={saving}>Refuser</button>
                </div>
              ) : null}
              <p className={s.note}>Clique ou fais glisser sur la photo : {group ? 'le point choisi place la fenêtre de la photo (11 x 8,5 pour 2 cartes, 16,5 x 8,5 pour 3, côte à côte).' : 'le point choisi reste au centre du cadrage de la carte (5,5 x 8,5).'}</p>
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
              {group ? <PartsChoice parts={nParts} busy={choosing || saving} note={row.parts_note ?? null} warning={warning ?? row.partsWarning ?? null} onChoose={(n) => void choose(n)} /> : null}
              {group && row.file_parts && row.file_parts !== nParts ? <p className={s.flagReview} role="status" style={{ whiteSpace: 'normal' }}>Les fichiers sont coupés pour {row.file_parts} cartes : à refaire avec publish-card-files.</p> : null}
              {src && group ? <PartsPreview src={src} pos={pos} parts={nParts} small={smalls} /> : null}
              {src && !group ? (
                <div className={s.cardCrop} aria-label="Cadrage de la carte" style={{ aspectRatio: '55 / 85' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the crop */}
                  <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
                </div>
              ) : null}
              <p className={s.note}>Point focal : <span className={s.num}>{pos[0]} / {pos[1]}</span>{d ? <> &middot; photo <span className={s.num}>{d[0]} x {d[1]}</span>, {group ? 'chaque carte' : 'cadrage'} <span className={s.num}>{group ? partCropWidth(d[0], d[1], nParts) : Math.round(cropWidth(d[0], d[1]))} px</span> de large</> : null}</p>
              {small ? <p className={s.flagReview} role="status">{group ? `Trop petite pour le 2x : ${smalls.every(Boolean) ? 'toutes les cartes' : `la carte ${smalls.findIndex(Boolean) + 1}/${nParts}`} de la photo font moins de ${TWO_X_WIDTH} px de large.` : `Trop petite pour le 2x : le cadrage fait moins de ${TWO_X_WIDTH} px de large.`}</p> : null}
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
