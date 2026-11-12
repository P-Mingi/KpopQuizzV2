'use client';

// Bunnyverse Cards, lane U: the "Cartes" tab of the photos admin (amendment 1, point 5). One photo per card subject; the owner sets the
// focal point of its 5.5:8.5 crop by clicking or dragging on the photo, sees the card crop live, and saves it through lane C's admin
// route (POST /api/admin/cards/photos, action "focal"). A photo whose crop is narrower than 640 px (twice the 320 px card, the largest
// the site shows) is flagged "trop petite pour le 2x". The size is read from the picture itself once it has loaded.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import s from './photos-admin.module.css';

export const CARD_RATIO = 55 / 85;
export const TWO_X_WIDTH = 640;

/** The width of the 5.5:8.5 crop of a picture: the whole width when the picture is taller than the card, else the card's share of the height. */
export function cropWidth(w: number, h: number): number {
  return Math.min(w, h * CARD_RATIO);
}
export function tooSmallFor2x(w: number, h: number): boolean {
  return w > 0 && h > 0 && cropWidth(w, h) < TWO_X_WIDTH;
}

export interface CardPhotoRow {
  id: number; entity_id: string; slot: number; file_url: string | null; storage_path: string | null; author: string; licence: string; status: string; focal_x: number; focal_y: number;
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
    const r = await fetch('/api/admin/cards/photos', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
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

  const src = row ? sourceSrc(row) : null;
  const d = row ? dims[row.id] : undefined;
  const small = d ? tooSmallFor2x(d[0], d[1]) : false;
  const pill = (v: typeof status, label: string): React.ReactElement => <button type="button" className={s.pill} aria-pressed={status === v} onClick={() => setStatus(v)}>{label}</button>;

  return (
    <section aria-labelledby="ph" className={s.section}>
      {head}
      <div className={s.filters}>
        <div className={s.filterGroup} role="group" aria-label="Statut de la photo">{pill('approved', 'Approuvées')}{pill('auto', 'Automatiques')}{pill('pending', 'À relire')}</div>
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
                      <td>{dm && tooSmallFor2x(dm[0], dm[1]) ? <span className={s.flagReview}>Trop petite pour le 2x</span> : <span className={s.flagOk}>{r.storage_path ? 'Fichier carte envoyé' : 'Photo source seule'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {row ? (
            <aside className={s.cardsEdSide} aria-label="Point focal">
              <p className={s.asideTitle}>{row.entity_id}</p>
              <p className={s.note}>Clique ou fais glisser sur la photo : le point choisi reste au centre du cadrage de la carte (5,5 x 8,5).</p>
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
              {src ? (
                <div className={s.cardCrop} aria-label="Cadrage de la carte" style={{ aspectRatio: '55 / 85' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of the crop */}
                  <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos[0]}% ${pos[1]}%`, display: 'block' }} />
                </div>
              ) : null}
              <p className={s.note}>Point focal : <span className={s.num}>{pos[0]} / {pos[1]}</span>{d ? <> &middot; photo <span className={s.num}>{d[0]} x {d[1]}</span>, cadrage <span className={s.num}>{Math.round(cropWidth(d[0], d[1]))} px</span> de large</> : null}</p>
              {small ? <p className={s.flagReview} role="status">Trop petite pour le 2x : le cadrage fait moins de {TWO_X_WIDTH} px de large.</p> : null}
              <button type="button" className={s.primary} onClick={() => void save()} disabled={saving || (pos[0] === row.focal_x && pos[1] === row.focal_y)}>{saving ? 'Enregistrement' : 'Enregistrer le point focal'}</button>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
