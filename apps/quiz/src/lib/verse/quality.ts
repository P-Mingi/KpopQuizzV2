// W3K.10 - computed quality engine. Measures how complete each group's Verse presence
// is (coverage), which entities are thin (stubs), and what work is most wanted. All
// derived from existing data; a curator dashboard reads this. No new schema.
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { contentIsEmpty } from '@/lib/verse/render-content';

export interface GroupCoverage {
  slug: string; name: string;
  score: number;                 // 0..1 across the signals below
  signals: { overview: boolean; eraStory: boolean; idolLore: boolean; awards: boolean };
  erasTotal: number; erasNarrated: number;
  idolsTotal: number; idolsWithLore: number;
}

export interface WantedItem { kind: string; label: string; href: string; weight: number; }

export interface QualityReport {
  summary: { groups: number; withOverview: number; eras: number; erasNarrated: number; idols: number; idolsWithLore: number; awardsPublished: number };
  groups: GroupCoverage[];
  wanted: WantedItem[];
}

export async function computeQuality(): Promise<QualityReport> {
  const db = createServiceRoleClient();

  // verse_content is read whole-table here (admin quality report); paginate it so
  // the authored-section set does not truncate at 1000 rows (V-REPAIR sweep B).
  // The sibling reads are smaller per-group tables (reported as lower-priority).
  const [{ data: albums }, { data: groupsRaw }, { data: idols }, { data: eras }, content, { data: awards }] = await Promise.all([
    db.from('albums').select('group_id'),
    db.from('groups').select('id, slug, name'),
    db.from('idols').select('id, name, group_id').eq('active', true),
    db.from('eras').select('id, group_id'),
    fetchAllRows<{ entity_type: string; entity_id: string; section_key: string; content: unknown }>(() => db.from('verse_content').select('entity_type, entity_id, section_key, content')),
    db.from('awards').select('group_id').eq('status', 'published'),
  ]);

  const contentIds = new Set(((albums ?? []) as Array<{ group_id: number }>).map((a) => a.group_id));
  const groups = ((groupsRaw ?? []) as Array<{ id: number; slug: string; name: string }>).filter((g) => contentIds.has(g.id));

  // Set of authored (non-empty) sections, keyed "type:id:section".
  const authored = new Set<string>();
  for (const r of content) {
    if (!contentIsEmpty(r.content)) authored.add(`${r.entity_type}:${r.entity_id}:${r.section_key}`);
  }

  const erasByGroup = new Map<number, number[]>();
  for (const e of (eras ?? []) as Array<{ id: number; group_id: number }>) { const l = erasByGroup.get(e.group_id) ?? []; l.push(e.id); erasByGroup.set(e.group_id, l); }
  const idolsByGroup = new Map<number, Array<{ id: number; name: string }>>();
  for (const i of (idols ?? []) as Array<{ id: number; name: string; group_id: number }>) { const l = idolsByGroup.get(i.group_id) ?? []; l.push({ id: i.id, name: i.name }); idolsByGroup.set(i.group_id, l); }
  const awardsByGroup = new Map<number, number>();
  for (const a of (awards ?? []) as Array<{ group_id: number | null }>) { if (a.group_id) awardsByGroup.set(a.group_id, (awardsByGroup.get(a.group_id) ?? 0) + 1); }

  const coverage: GroupCoverage[] = [];
  const wanted: WantedItem[] = [];

  for (const g of groups) {
    const groupEras = erasByGroup.get(g.id) ?? [];
    const erasNarrated = groupEras.filter((id) => authored.has(`era:${id}:era_story`)).length;
    const groupIdols = idolsByGroup.get(g.id) ?? [];
    const idolsWithLore = groupIdols.filter((i) => authored.has(`idol:${i.id}:lore`)).length;
    const awardsN = awardsByGroup.get(g.id) ?? 0;

    const signals = {
      overview: authored.has(`group:${g.id}:overview`),
      eraStory: erasNarrated > 0,
      idolLore: idolsWithLore > 0,
      awards: awardsN > 0,
    };
    const score = Object.values(signals).filter(Boolean).length / 4;
    coverage.push({ slug: g.slug, name: g.name, score, signals, erasTotal: groupEras.length, erasNarrated, idolsTotal: groupIdols.length, idolsWithLore });

    if (!signals.overview) wanted.push({ kind: 'overview', label: `Write the ${g.name} overview`, href: `/verse/${g.slug}`, weight: 5 });
    if (groupEras.length > 0 && erasNarrated === 0) wanted.push({ kind: 'era', label: `${g.name}: ${groupEras.length} eras need a story`, href: `/verse/${g.slug}/timeline`, weight: 3 });
    if (groupIdols.length > 0 && idolsWithLore === 0) wanted.push({ kind: 'lore', label: `${g.name}: members need lore`, href: `/verse/${g.slug}/members`, weight: 2 });
  }

  coverage.sort((a, b) => a.score - b.score || b.erasTotal - a.erasTotal);
  wanted.sort((a, b) => b.weight - a.weight);

  return {
    summary: {
      groups: groups.length,
      withOverview: coverage.filter((c) => c.signals.overview).length,
      eras: coverage.reduce((s, c) => s + c.erasTotal, 0),
      erasNarrated: coverage.reduce((s, c) => s + c.erasNarrated, 0),
      idols: coverage.reduce((s, c) => s + c.idolsTotal, 0),
      idolsWithLore: coverage.reduce((s, c) => s + c.idolsWithLore, 0),
      awardsPublished: [...awardsByGroup.values()].reduce((s, n) => s + n, 0),
    },
    groups: coverage,
    wanted: wanted.slice(0, 40),
  };
}
