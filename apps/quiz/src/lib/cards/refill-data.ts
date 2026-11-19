// Bunnyverse Cards, lot LAUNCH-PREP lane REFILL: the data of 123-refill.sql from the verdicts of the refill and the state 119 leaves (the export
// of production with the units of 119 applied). scripts/cards/gen-refill-sql.mts reads both from out/ (git-ignored). Pure: no file, no
// network, no database.
//   after119:    the rows of the export once every unit of 119 is applied (what 123 expects to find).
//   refillData:  per subject, its good photos re-ranked with the new ones (best looking first), the owner's rule (planSubject of 119) on its
//                numbered editions, and the rows of its unit; then what the Verify lines expect once every unit is applied.
import { planSubject, type PlanPhoto, type Rarity } from './photocheck-plan';
import type { RefillData, RfExpect, RfNewPhoto, RfStatus, RfUnit } from './refill-sql';

export interface StatePhoto {
  id: number; entity_id: string; slot: number; status: RfStatus; focal_x: number; focal_y: number; file_focal_x: number | null; file_focal_y: number | null;
  storage_path: string | null; source_path: string | null; parts: number | null; source_width: number; source_height: number; stage: boolean;
  source_page: string; sha1: string | null;
}
export interface StateCard { card_no: number; entity_id: string; rarity: Rarity; part: number; photo_id: number | null; in_packs: boolean }
export interface StatePano { pano_no: number; entity_id: string; rarity: Rarity; photo_id: number | null; first_card: number }
export interface StateEntity { id: string; kind: string; lock_reasons: Record<string, string> }
export interface State { photos: StatePhoto[]; catalog: StateCard[]; panoramas: StatePano[]; entities: StateEntity[] }

/** One unit of the plan of 119 (out/launch-prep/pc/plan.json), as 119-photocheck.sql applies it. */
export interface Unit119 {
  entity: string;
  photos: Array<{ id: number; new: { status?: string; fx?: number; fy?: number; reset_files?: boolean } }>;
  cards: Array<{ no: number; new: { photo: number | null } }>;
  panos: Array<{ no: number; new: number | null }>;
  lock: { new: Record<string, string> } | null;
}

const live = (s: string): boolean => s === 'auto' || s === 'approved';
const hasFile = (p: { storage_path: string | null; source_path: string | null }): boolean => p.storage_path !== null || p.source_path !== null;

/** The rows of the export once every unit of 119 is applied, as 119-photocheck.sql writes them (in_packs as cards_photos_ready computes it). */
export function after119(exp: State, units: Unit119[]): State {
  const photos = new Map(exp.photos.map((p) => [p.id, { ...p }]));
  const cards = new Map(exp.catalog.map((c) => [c.card_no, { ...c }]));
  const panos = new Map(exp.panoramas.map((z) => [z.pano_no, { ...z }]));
  const entities = new Map(exp.entities.map((e) => [e.id, { ...e, lock_reasons: { ...e.lock_reasons } }]));
  for (const u of units) {
    for (const p of u.photos) {
      const r = photos.get(p.id);
      if (!r) throw new Error(`refill data: photo ${p.id} of 119 is not in the export`);
      if (p.new.status) r.status = p.new.status as RfStatus;
      if (p.new.fx !== undefined) { r.focal_x = p.new.fx; r.focal_y = p.new.fy!; }
      if (p.new.reset_files) { r.file_focal_x = null; r.file_focal_y = null; }
    }
    for (const c of u.cards) {
      const r = cards.get(c.no);
      if (!r) throw new Error(`refill data: card ${c.no} of 119 is not in the export`);
      r.photo_id = c.new.photo;
      const p = c.new.photo === null ? null : photos.get(c.new.photo)!;
      r.in_packs = p !== null && live(p.status) && hasFile(p);
    }
    for (const z of u.panos) panos.get(z.no)!.photo_id = z.new;
    if (u.lock) entities.get(u.entity)!.lock_reasons = { ...u.lock.new };
  }
  return { photos: [...photos.values()], catalog: [...cards.values()], panoramas: [...panos.values()], entities: [...entities.values()] };
}

/** A new photo of the refill, before its slot is chosen. */
export type RefillNew = Omit<RfNewPhoto, 'slot'>;
/** The verdicts of one subject: its good photos after the refill, best looking first (photo ids, and the keys of its new photos), the new
 *  photos and the pending photos the refill accepts. */
export interface RefillSubject { entity: string; pool: Array<number | string>; add: RefillNew[]; approve: Array<{ id: number; note: string }> }
export interface RefillPlanned {
  entity: string;
  editions: Rarity[];
  need: Record<string, number>;
  /** The edition each photo goes on (photo id or key). */
  assign: Partial<Record<Rarity, number | string>>;
  dropped: Rarity[];
  /** Good photos the rule gives no edition (they stay as they are: a new one is not added, a pending one stays pending). */
  unused: Array<number | string>;
  conflicts: string[];
}

const ORDER: Rarity[] = ['C', 'U', 'R', 'SR', 'UR', 'L'];

/** A photo as the rule reads it: its parts (a person 1; a group the parts its files are cut in, 2 when unset), Full Art when every part is
 *  at least 640 px wide in the original (the full_ok of 118), on stage or not. */
export function planPhoto(group: boolean, w: number, h: number, parts: number | null, stage: boolean): Omit<PlanPhoto, 'id'> {
  const np = group ? (parts ?? 2) : 1;
  const cw = Math.floor(Math.min(w, (h * (group ? np * 5.5 : 5.5)) / 8.5));
  return { parts: np, fullOk: Math.floor(cw / np) >= 640, stage };
}

/** The slot of a new photo: one no live photo holds (nor a new or approved one of the unit); first a slot no pending photo holds either,
 *  then one whose file stem is not the stem of an older photo's files, then the smallest. */
export function chooseSlot(photos: StatePhoto[], taken: Set<number>, slug: string, fx: number, fy: number): number {
  const stem = (slot: number) => (slot > 1 ? `${slug}-s${slot}-${fx}-${fy}` : `${slug}-${fx}-${fy}`);
  const free = [1, 2, 3, 4, 5, 6].filter((s) => !taken.has(s));
  if (free.length === 0) throw new Error(`refill data: ${slug}: no free slot for a new photo`);
  const pending = new Set(photos.filter((p) => p.status === 'pending').map((p) => p.slot));
  const stems = new Set(photos.map((p) => p.storage_path).filter(Boolean));
  const score = (s: number): number[] => [pending.has(s) ? 1 : 0, stems.has(stem(s)) ? 1 : 0, s];
  return free.sort((a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! - y[i]!; return 0; })[0]!;
}

/** `approvedBy119`: the pending photos 119 approves (no file until the publish workflow cuts them), for the Verify line "when the publish
 *  workflow ran after 119". */
export function refillData(state: State, subjects: RefillSubject[], checked_on: string, exportName: string, approvedBy119: Set<number> = new Set()):
  { data: RefillData; planned: RefillPlanned[] } {
  const units: RfUnit[] = [];
  const planned: RefillPlanned[] = [];
  const entities = new Map(state.entities.map((e) => [e.id, e]));
  for (const s of subjects) {
    const ent = entities.get(s.entity);
    if (!ent) throw new Error(`refill data: ${s.entity} is not an entity`);
    const group = ent.kind === 'group';
    const photos = state.photos.filter((p) => p.entity_id === s.entity).sort((a, b) => a.id - b.id);
    const byId = new Map(photos.map((p) => [p.id, p]));
    const news = new Map(s.add.map((n) => [n.key, n]));
    const approveIds = new Set(s.approve.map((a) => a.id));
    const cards = state.catalog.filter((c) => c.entity_id === s.entity).sort((a, b) => a.card_no - b.card_no);
    const editions = ORDER.filter((r) => cards.some((c) => c.rarity === r));
    const need = Object.fromEntries(editions.map((r) => [r, cards.filter((c) => c.rarity === r).length]));
    // the rule reads ids: a new photo gets a stand-in id above every real one, mapped back below
    const stand = new Map<number, number | string>();
    const poolPlan: PlanPhoto[] = s.pool.map((ref, i) => {
      if (typeof ref === 'string') {
        const n = news.get(ref);
        if (!n) throw new Error(`refill data: ${s.entity}: ${ref} is in the pool but not a new photo`);
        const id = 1_000_000_000 + i;
        stand.set(id, ref);
        return { id, ...planPhoto(group, n.width, n.height, n.parts, n.stage) };
      }
      const p = byId.get(ref);
      if (!p) throw new Error(`refill data: ${s.entity}: photo ${ref} is not a photo of the subject`);
      if (!(live(p.status) || (p.status === 'pending' && approveIds.has(ref)))) throw new Error(`refill data: ${s.entity}: photo ${ref} in the pool is neither live nor accepted`);
      stand.set(ref, ref);
      return { id: ref, ...planPhoto(group, p.source_width, p.source_height, p.parts, p.stage) };
    });
    for (const p of photos) if (live(p.status) && !s.pool.includes(p.id)) throw new Error(`refill data: ${s.entity}: live photo ${p.id} is not in the pool`);
    const current = Object.fromEntries(editions.map((r) => [r, cards.find((c) => c.rarity === r)!.photo_id])) as Partial<Record<Rarity, number>>;
    const r = planSubject(editions.map((x) => ({ rarity: x, cards: need[x]! })), poolPlan, current);
    const assign: Partial<Record<Rarity, number | string>> = {};
    for (const [k, v] of Object.entries(r.assign)) assign[k as Rarity] = stand.get(v as number)!;
    const used = new Set(Object.values(assign));
    const unused = s.pool.filter((x) => !used.has(x));
    planned.push({ entity: s.entity, editions, need, assign, dropped: r.dropped, unused, conflicts: r.conflicts });

    const approve = s.approve.filter((a) => used.has(a.id));
    const taken = new Set(photos.filter((p) => live(p.status) || approve.some((a) => a.id === p.id)).map((p) => p.slot));
    const add: RfNewPhoto[] = [];
    for (const n of s.add.filter((x) => used.has(x.key))) {
      const slot = chooseSlot(photos, taken, s.entity.split(':')[1]!, n.fx, n.fy);
      taken.add(slot);
      add.push({ ...n, slot });
    }
    const unitCards = cards.map((c) => ({ no: c.card_no, old: c.photo_id, new: assign[c.rarity] ?? null }));
    const panos = state.panoramas.filter((z) => z.entity_id === s.entity).sort((a, b) => a.pano_no - b.pano_no)
      .map((z) => ({ no: z.pano_no, old: z.photo_id, new: assign[z.rarity] ?? null }));
    const old = { ...ent.lock_reasons };
    const nw: Record<string, string> = {};
    for (const [k, v] of Object.entries(old)) if (!(editions.includes(k as Rarity) && assign[k as Rarity] !== undefined)) nw[k] = v;
    for (const d of r.dropped) if (!(d in nw)) nw[d] = r.lock[d]!;
    const sorted = (o: Record<string, string>) => JSON.stringify(Object.entries(o).sort());
    const lock = sorted(old) === sorted(nw) ? null : { old, new: nw };
    const changes = add.length + approve.length + unitCards.filter((c) => c.new !== c.old).length + panos.filter((z) => z.new !== z.old).length;
    if (changes === 0) continue;
    units.push({
      entity: s.entity, photos: photos.map((p) => ({ id: p.id, status: p.status, slot: p.slot, fx: p.focal_x, fy: p.focal_y })),
      approve, add, cards: unitCards, panos, lock,
    });
  }
  return { data: { checked_on, export: exportName, units, expect: expectOf(state, units, approvedBy119) }, planned };
}

/** What the Verify lines of 123 expect once every unit is applied on the state 119 leaves. */
export function expectOf(state: State, units: RfUnit[], approvedBy119: Set<number> = new Set()): RfExpect {
  let next = Math.max(0, ...state.photos.map((p) => p.id)) + 1;
  const photos = new Map(state.photos.map((p) => [p.id, { ...p }]));
  const cards = new Map(state.catalog.map((c) => [c.card_no, { ...c }]));
  const panos = new Map(state.panoramas.map((z) => [z.pano_no, { ...z }]));
  let added = 0, approved = 0;
  for (const u of units) {
    const ids = new Map<string, number>();
    for (const n of u.add) {
      const id = next++;
      ids.set(n.key, id);
      photos.set(id, { id, entity_id: u.entity, slot: n.slot, status: 'approved', focal_x: n.fx, focal_y: n.fy, file_focal_x: null, file_focal_y: null, storage_path: null,
        source_path: null, parts: n.parts, source_width: n.width, source_height: n.height, stage: n.stage, source_page: n.page, sha1: n.sha1 });
      added++;
    }
    for (const a of u.approve) { photos.get(a.id)!.status = 'approved'; approved++; }
    const res = (v: number | string | null): number | null => (v === null ? null : typeof v === 'string' ? ids.get(v)! : v);
    for (const c of u.cards) {
      if (c.new === c.old) continue;
      const r = cards.get(c.no)!;
      r.photo_id = res(c.new);
      const p = r.photo_id === null ? null : photos.get(r.photo_id)!;
      r.in_packs = p !== null && live(p.status) && hasFile(p);
    }
    for (const z of u.panos) if (z.new !== z.old) panos.get(z.no)!.photo_id = res(z.new);
  }
  const all = [...cards.values()];
  const statuses: Record<string, number> = {};
  for (const p of photos.values()) statuses[p.status] = (statuses[p.status] ?? 0) + 1;
  return {
    units: units.length,
    catalog: all.length,
    added,
    approved,
    dropped: all.filter((c) => c.photo_id === null && !c.in_packs).length,
    inPacks: all.filter((c) => c.in_packs).length,
    inPacksAfter119Publish: all.filter((c) => c.photo_id !== null && (() => { const p = photos.get(c.photo_id!)!; return live(p.status) && (hasFile(p) || approvedBy119.has(p.id)); })()).length,
    inPacksAfterPublish: all.filter((c) => c.photo_id !== null && live(photos.get(c.photo_id)!.status)).length,
    nullPanos: [...panos.values()].filter((z) => z.photo_id === null).length,
    toCut: [...photos.values()].filter((p) => live(p.status) && (p.storage_path === null || p.file_focal_x !== p.focal_x || p.file_focal_y !== p.focal_y)).length,
    statuses,
  };
}
