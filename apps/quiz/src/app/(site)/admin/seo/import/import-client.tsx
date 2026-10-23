'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { computeFamilies, parseAiPagesCsv, parseAiQueriesCsv } from '@/lib/seo/weekly/ai-performance';

import { FamilyTable, formatInt } from './family-table';

import type { AiPageRow, AiQueryRow } from '@/lib/seo/weekly/ai-performance';
import type { TargetCluster } from '@/lib/seo/weekly/targets';

// The monthly upload of /admin/seo/import (SEO Mission 3, part C). Both CSV files are read and
// parsed here, in the browser; the family table shows at once, before anything is saved.
// "Enregistrer" posts the parsed rows to /api/admin/seo/import, which checks them again.

interface Props {
  clusters: TargetCluster[];
  defaultMonth: string;
  tableMissing: boolean;
}

interface Parsed<T> {
  name: string;
  rows: T[];
  skipped: number;
  error: string | null;
}

async function readFile(file: File): Promise<string> {
  return file.text();
}

export function ImportClient({ clusters, defaultMonth, tableMissing }: Props): React.ReactElement {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [queries, setQueries] = useState<Parsed<AiQueryRow> | null>(null);
  const [pages, setPages] = useState<Parsed<AiPageRow> | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const report = useMemo(() => (queries && queries.rows.length > 0 ? computeFamilies(queries.rows, clusters) : null), [queries, clusters]);

  async function onQueries(file: File | undefined): Promise<void> {
    setStatus(null);
    if (!file) return setQueries(null);
    const out = parseAiQueriesCsv(await readFile(file));
    setQueries({ name: file.name, ...out });
  }

  async function onPages(file: File | undefined): Promise<void> {
    setStatus(null);
    if (!file) return setPages(null);
    const out = parseAiPagesCsv(await readFile(file));
    setPages({ name: file.name, ...out });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/seo/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, queries: queries?.rows ?? [], pages: pages?.rows ?? [] }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; rows?: number; error?: string };
      if (res.ok && json.ok) {
        setStatus({ kind: 'ok', text: `Enregistré: ${formatInt(json.rows ?? 0)} lignes pour ${month}.` });
        router.refresh();
      } else {
        setStatus({ kind: 'error', text: json.error ?? `Échec (HTTP ${res.status}).` });
      }
    } catch {
      setStatus({ kind: 'error', text: 'Réseau indisponible, rien n\'est enregistré.' });
    } finally {
      setSaving(false);
    }
  }

  const canSave = !saving && /^\d{4}-\d{2}$/.test(month) && ((queries?.rows.length ?? 0) > 0 || (pages?.rows.length ?? 0) > 0);

  return (
    <section aria-labelledby="upload-title" className="mt-6">
      <h2 id="upload-title" className="text-base font-medium text-primary">Déposer l&apos;export du mois</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-secondary">
          Mois couvert
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 block w-full rounded border border-default bg-surface px-2 py-1.5 text-primary" />
        </label>
        <label className="text-sm text-secondary">
          CSV Requêtes
          <input type="file" accept=".csv,text/csv" onChange={(e) => void onQueries(e.target.files?.[0])} className="mt-1 block w-full text-xs text-primary" />
        </label>
        <label className="text-sm text-secondary">
          CSV Pages
          <input type="file" accept=".csv,text/csv" onChange={(e) => void onPages(e.target.files?.[0])} className="mt-1 block w-full text-xs text-primary" />
        </label>
      </div>

      {queries && (
        <p className={`mt-3 text-xs ${queries.error ? 'text-wrong-text' : 'text-secondary'}`}>
          {queries.name}: {queries.error ?? `${formatInt(queries.rows.length)} requêtes lues${queries.skipped > 0 ? `, ${queries.skipped} lignes ignorées` : ''}.`}
        </p>
      )}
      {pages && (
        <p className={`mt-1 text-xs ${pages.error ? 'text-wrong-text' : 'text-secondary'}`}>
          {pages.name}: {pages.error ?? `${formatInt(pages.rows.length)} pages lues${pages.skipped > 0 ? `, ${pages.skipped} lignes ignorées` : ''}.`}
        </p>
      )}

      {report && (
        <div className="mt-4">
          <FamilyTable report={report} caption={`Aperçu de ${month}, calculé dans le navigateur (pas encore enregistré).`} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={!canSave} className="rounded bg-btn px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
          {saving ? 'Enregistrement...' : 'Enregistrer ce mois'}
        </button>
        {tableMissing && <span className="text-xs text-secondary">Migration non appliquée: le calcul s&apos;affiche, l&apos;enregistrement sera refusé.</span>}
      </div>
      {status && <p role="status" className={`mt-2 text-sm ${status.kind === 'ok' ? 'text-correct-text' : 'text-wrong-text'}`}>{status.text}</p>}
    </section>
  );
}
