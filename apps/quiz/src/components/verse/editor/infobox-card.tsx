'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { INFOBOX_FIELDS } from '@/lib/verse/fields';

import { InfoboxEditor, type FieldRow } from './infobox-editor';

import type { IdolFact, EditableField } from '@/lib/verse/idol';

interface Props {
  entityType: string;
  entityId: string;
  facts: IdolFact[];
  editableFields: EditableField[];
  suggestSubject: string;
}

function SourceBadge({ f }: { f: IdolFact }): React.ReactElement | null {
  if (!f.source) return null;
  const title = f.source === 'wd' ? 'Ingested from Wikidata (CC0)' : 'Entered by a curator';
  const badge = <abbr title={title} className="ml-1 rounded px-1 text-[9px] font-bold uppercase no-underline" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{f.source}</abbr>;
  return f.source === 'cur' && f.sourceUrl
    ? <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" title="View the source">{badge}</a>
    : badge;
}

export function InfoboxCard({ entityType, entityId, facts, editableFields, suggestSubject }: Props): React.ReactElement {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch('/api/verse/can-edit').then((r) => r.ok ? r.json() : null).then((d) => setCanEdit(!!d?.canEdit)).catch(() => {});
  }, []);

  const defs = INFOBOX_FIELDS[entityType] ?? [];
  const rows: FieldRow[] = editableFields
    .map((ef) => { const def = defs.find((d) => d.key === ef.key); return def ? { def, value: ef.value, sourceUrl: ef.sourceUrl, isOverride: ef.isOverride } : null; })
    .filter((x): x is FieldRow => x != null);

  return (
    <div className="rounded-xl border border-default bg-surface p-4 lg:sticky lg:top-4" style={{ borderColor: 'var(--verse-line)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Facts</h2>
        {canEdit && !editing ? <button onClick={() => setEditing(true)} className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Edit</button> : null}
      </div>

      {editing ? (
        <InfoboxEditor entityType={entityType} entityId={entityId} rows={rows} onClose={() => setEditing(false)} onSaved={() => router.refresh()} />
      ) : facts.length ? (
        <dl className="space-y-2 text-sm">
          {facts.map((f) => (
            <div key={f.field} className="flex justify-between gap-3">
              <dt className="text-tertiary">{f.label}</dt>
              <dd className="text-right font-medium text-primary">{f.value}<SourceBadge f={f} /></dd>
            </div>
          ))}
        </dl>
      ) : <p className="text-sm text-tertiary">Facts are being sourced.</p>}

      <p className="mt-4 border-t border-default pt-3 text-[11px] text-tertiary">
        Sources: Wikidata (CC0). <a href={`mailto:kaspermaiden@gmail.com?subject=${encodeURIComponent(suggestSubject)}`} className="font-semibold underline" style={{ color: 'var(--verse-ink)' }}>Suggest an edit</a>
      </p>
    </div>
  );
}
