'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SourceChip } from '@/components/verse/source-chip';

import { INFOBOX_FIELDS } from '@/lib/verse/fields';

import { InfoboxEditor, type FieldRow } from './infobox-editor';

import type { IdolFact, EditableField } from '@/lib/verse/idol';

interface Props {
  entityType: string;
  entityId: string;
  facts: IdolFact[];
  editableFields: EditableField[];
}

function SourceBadge({ f }: { f: IdolFact }): React.ReactElement | null {
  if (!f.source) return null;
  // V-POLISH-2 C3: readers get the jewelry (outlet name, ring glyph); the
  // wd/cur shorthand stays for editors inside the editor surfaces only.
  if (f.source === 'wd') return <span className="ml-1"><SourceChip label="Wikidata" detail="Ingested from Wikidata (CC0)" /></span>;
  return <span className="ml-1"><SourceChip href={f.sourceUrl} label={f.sourceUrl ? undefined : 'Curated'} detail="Entered by a curator, with source" /></span>;
}

export function InfoboxCard({ entityType, entityId, facts, editableFields }: Props): React.ReactElement {
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

      {/* V-MODES: no personal-email mailto in reader HTML; corrections ride the
          in-page suggest flow (SectionSurface), the blessed progression path. */}
      <p className="mt-4 border-t border-default pt-3 text-[11px] text-tertiary">Sources: Wikidata (CC0).</p>
    </div>
  );
}
