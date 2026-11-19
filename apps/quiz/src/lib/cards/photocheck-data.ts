// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: the data of 119-photocheck.sql from the plan of the photo check and the export of
// production it was made from (scripts/cards/gen-photocheck-sql.mts reads both from out/, git-ignored). Pure: no file, no network, no database.
//   checkPlan: the plan must be what planSubject (the tested rule) gives for every subject, and its card rows must follow it.
//   dataOf:    the units of the plan, and what the Verify lines of the file expect once every unit is applied (counted on the export).
import { planSubject, type PlanPhoto, type Rarity } from './photocheck-plan';
import type { PcExpect, PcUnit, PhotocheckData } from './photocheck-sql';

export interface ExportPhoto { id: number; status: string; focal_x: number; focal_y: number; file_focal_x: number | null; file_focal_y: number | null; storage_path: string | null; source_path: string | null }
export interface ExportCard { card_no: number; photo_id: number | null; in_packs: boolean }
export interface Export { photos: ExportPhoto[]; catalog: ExportCard[]; panoramas: Array<{ pano_no: number; photo_id: number | null }> }
export interface PlanUnit {
  entity: string;
  photos: Array<{ id: number; old: { status: string; fx: number; fy: number; ffx: number | null; ffy: number | null }; new: { status?: string; fx?: number; fy?: number; reset_files?: boolean }; note?: string }>;
  cards: Array<{ no: number; old: { photo: number | null; in_packs: boolean }; new: { photo: number | null } }>;
  panos: Array<{ no: number; old: number | null; new: number | null }>;
  lock: { old: Record<string, string>; new: Record<string, string> } | null;
}

/** The data of the file: the units of the plan, and what the Verify lines expect after them (computed on the export). */
export function dataOf(plan: { checked_on: string; export: string; units: PlanUnit[] }, exp: Export): PhotocheckData {
  const units = plan.units.map((u) => ({
    entity: u.entity,
    photos: u.photos.map((p) => ({ id: p.id, old: p.old, new: p.new, ...(p.note ? { note: p.note } : {}) })),
    cards: u.cards.map((c) => ({ no: c.no, old: { photo: c.old.photo, in_packs: c.old.in_packs }, new: { photo: c.new.photo } })),
    panos: u.panos,
    lock: u.lock,
  })) as PcUnit[];
  // the state after every unit, on the export
  const photo = new Map(exp.photos.map((p) => [p.id, { ...p }]));
  const card = new Map(exp.catalog.map((c) => [c.card_no, { ...c }]));
  const pano = new Map(exp.panoramas.map((z) => [z.pano_no, { ...z }]));
  for (const u of units) {
    for (const p of u.photos) {
      const r = photo.get(p.id);
      if (!r) throw new Error(`photocheck data: photo ${p.id} is not in the export`);
      if (p.new.status) r.status = p.new.status;
      if (p.new.fx !== undefined) { r.focal_x = p.new.fx; r.focal_y = p.new.fy!; }
      if (p.new.reset_files) { r.file_focal_x = null; r.file_focal_y = null; }
    }
    for (const c of u.cards) {
      const r = card.get(c.no);
      if (!r) throw new Error(`photocheck data: card ${c.no} is not in the export`);
      r.photo_id = c.new.photo;
      const p = c.new.photo === null ? null : photo.get(c.new.photo)!;
      r.in_packs = p !== null && (p.status === 'auto' || p.status === 'approved') && (p.storage_path !== null || p.source_path !== null);
    }
    for (const z of u.panos) pano.get(z.no)!.photo_id = z.new;
  }
  const cards = [...card.values()];
  const live = (s: string): boolean => s === 'auto' || s === 'approved';
  const statuses: Record<string, number> = {};
  for (const p of photo.values()) statuses[p.status] = (statuses[p.status] ?? 0) + 1;
  const expect: PcExpect = {
    units: units.length,
    catalog: cards.length,
    dropped: cards.filter((c) => c.photo_id === null && !c.in_packs).length,
    inPacks: cards.filter((c) => c.in_packs).length,
    inPacksAfterPublish: cards.filter((c) => c.photo_id !== null && live(photo.get(c.photo_id)!.status)).length,
    nullPanos: [...pano.values()].filter((z) => z.photo_id === null).length,
    toCut: [...photo.values()].filter((p) => live(p.status) && (p.storage_path === null || p.file_focal_x !== p.focal_x || p.file_focal_y !== p.focal_y)).length,
    statuses,
  };
  return { checked_on: plan.checked_on, export: plan.export, units, expect };
}

export interface PlanSubject { entity: string; editions: Rarity[]; need: Record<string, number>; current: Record<string, number>; assign: Record<string, number>; dropped: Rarity[]; pool: number[]; lock: Record<string, string> }
export interface ExportPhotoFull extends ExportPhoto { entity_id: string; parts: number | null; source_width: number; source_height: number; stage: boolean }

/** The plan must be what planSubject (the tested rule) gives for every subject, and its card rows must follow it: else nothing is written. */
export function checkPlan(plan: { subjects: PlanSubject[]; units: PlanUnit[] }, exp: { photos: ExportPhotoFull[]; catalog: Array<ExportCard & { entity_id: string; rarity: string }> }): number {
  const photo = new Map(exp.photos.map((p) => [p.id, p]));
  const of = (id: number): PlanPhoto => {
    const p = photo.get(id);
    if (!p) throw new Error(`photocheck data: photo ${id} of the plan is not in the export`);
    const group = p.entity_id.startsWith('group:');
    const np = group ? (p.parts ?? 2) : 1;
    const cw = Math.floor(Math.min(p.source_width, (p.source_height * (group ? np * 5.5 : 5.5)) / 8.5));
    return { id, parts: np, fullOk: Math.floor(cw / np) >= 640, stage: p.stage };
  };
  const newPhoto = new Map<number, number | null>();
  for (const u of plan.units) for (const c of u.cards) newPhoto.set(c.no, c.new.photo);
  let n = 0;
  for (const s of plan.subjects) {
    const r = planSubject(s.editions.map((e) => ({ rarity: e, cards: s.need[e]! })), s.pool.map(of), s.current as Partial<Record<Rarity, number>>);
    const same = JSON.stringify(Object.entries(r.assign).sort()) === JSON.stringify(Object.entries(s.assign).sort())
      && JSON.stringify(r.dropped) === JSON.stringify(s.dropped) && JSON.stringify(Object.entries(r.lock).sort()) === JSON.stringify(Object.entries(s.lock).sort());
    if (!same) throw new Error(`photocheck data: ${s.entity}: the plan differs from planSubject (${JSON.stringify(r.assign)} against ${JSON.stringify(s.assign)})`);
    for (const c of exp.catalog.filter((k) => k.entity_id === s.entity)) {
      const want = (r.assign as Record<string, number | undefined>)[c.rarity] ?? null;
      const got = newPhoto.has(c.card_no) ? newPhoto.get(c.card_no)! : c.photo_id;
      if (want !== got) throw new Error(`photocheck data: card ${c.card_no} of ${s.entity} would get photo ${got}, the rule says ${want}`);
    }
    n++;
  }
  return n;
}
