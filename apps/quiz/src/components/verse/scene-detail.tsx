import { SectionSurface } from '@/components/verse/editor/section-surface';
import { getSection } from '@/lib/verse/content';
import { renderTipTapJSON } from '@/lib/verse/render-content';

import type { SceneDef } from '@/lib/verse/entity-types';
import type { SceneRow } from '@/lib/verse/entities';

/** Reader detail for one entity (tour / show / ost): a facts panel + editable narration. */
export async function SceneDetail({ scene, groupSlug, row }: { scene: SceneDef; groupSlug: string; row: SceneRow }): Promise<React.ReactElement> {
  const title = String(row[scene.titleField] ?? scene.singular);
  const facts = scene.fields
    .map((f) => ({ label: f.label, value: row[f.key] }))
    .filter((x) => x.value !== null && x.value !== undefined && x.value !== '')
    .map((x) => ({ label: x.label, value: x.value as string | number }));

  const sourceUrl = row.source_url ? String(row.source_url) : null;

  let narration: React.ReactNode = null;
  if (scene.hasNarration) {
    const section = await getSection(scene.entityType, String(row.id), 'overview');
    narration = (
      <div className="mt-6">
        <SectionSurface
          entityType={scene.entityType} entityId={String(row.id)} section="overview" label="About"
          initialHtml={renderTipTapJSON(section.content)} initialContent={section.content}
          baseRevisionId={section.currentRevisionId} locked={section.locked} lockReason={section.lockReason}
          groupSlug={groupSlug}
          emptyInvite={`Write about this ${scene.singular.toLowerCase()}: what happened, why it mattered. Fan-written and credited.`}
        />
      </div>
    );
  }

  return (
    <article>
      <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--verse-ink)' }}>{title}</h1>
      {facts.length ? (
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: 'var(--verse-line)' }}>
              <dt className="text-secondary">{f.label}</dt>
              <dd className="font-semibold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{String(f.value).slice(0, 40)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {sourceUrl ? (
        <p className="mt-2 text-xs text-tertiary">Source: <a href={sourceUrl} rel="nofollow noopener" target="_blank" className="underline">reference</a></p>
      ) : null}
      {narration}
    </article>
  );
}
