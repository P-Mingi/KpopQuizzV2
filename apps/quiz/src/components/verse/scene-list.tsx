import Link from 'next/link';
import { EmptyState } from '@/components/verse/primitives/empty-state';

import type { SceneDef } from '@/lib/verse/entity-types';
import type { SceneRow } from '@/lib/verse/entities';

function factLine(s: SceneDef, row: SceneRow): string {
  const parts: string[] = [];
  for (const f of s.fields) {
    const v = row[f.key];
    if (v === null || v === undefined || v === '') continue;
    if (f.type === 'date') parts.push(String(v).slice(0, 10));
    else parts.push(String(v));
  }
  return parts.join(' · ');
}

/** Reader list for a scene (tours / shows / ost). Only published rows reach here. */
export function SceneList({ scene, groupSlug, rows }: { scene: SceneDef; groupSlug: string; rows: SceneRow[] }): React.ReactElement {
  if (rows.length === 0) {
    return (
      <EmptyState headline={`No ${scene.label.toLowerCase()} yet.`} />
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => {
        const title = String(row[scene.titleField] ?? scene.singular);
        const facts = factLine(scene, row);
        const inner = (
          <div className="h-full rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{title}</p>
            {facts ? <p className="mt-1 text-xs text-secondary">{facts}</p> : null}
          </div>
        );
        return (
          <li key={row.id}>
            {scene.detailPage ? <Link href={`/verse/${groupSlug}/${scene.seg}/${row.id}`} className="block no-underline">{inner}</Link> : inner}
          </li>
        );
      })}
    </ul>
  );
}
