import type { FamilyDelta, FamilyReport, FamilyStat } from '@/lib/seo/weekly/ai-performance';

// The Copilot query family table of /admin/seo/import (SEO Mission 3, part C). No hooks: it
// renders on the server for stored months and in the browser for the preview of an upload.
// Numbers are formatted by hand (not toLocaleString) so server and browser print the same.

export function formatInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatPct(share: number | null): string {
  return share === null ? 'n/d' : `${(share * 100).toFixed(1).replace('.', ',')} %`;
}

function formatPoints(p: number | null | undefined): string {
  if (p === null || p === undefined) return '';
  const s = p.toFixed(1).replace('.', ',');
  return p > 0 ? `+${s} pt` : `${s} pt`;
}

function Row({ f, delta, strong }: { f: FamilyStat; delta: FamilyDelta | undefined; strong?: boolean }): React.ReactElement {
  const down = delta?.sharePoints !== null && delta?.sharePoints !== undefined && delta.sharePoints < 0;
  return (
    <tr className={`border-t border-default ${strong ? 'font-medium' : ''}`}>
      <th scope="row" className="py-1.5 pr-3 text-left font-normal align-top">
        <span className={strong ? 'font-medium' : ''}>{f.label}</span>
        {f.url && <span className="block text-[11px] text-ghost">{f.url}</span>}
        {f.topQueries.length > 0 && f.id !== 'total' && <span className="block text-[11px] text-secondary">{f.topQueries.slice(0, 3).join(', ')}</span>}
      </th>
      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{f.queryCount}</td>
      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{formatInt(f.citations)}</td>
      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{f.impliedTotal === null ? 'n/d' : formatInt(f.impliedTotal)}</td>
      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{formatPct(f.share)}</td>
      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{f.gap === null ? 'n/d' : formatInt(f.gap)}</td>
      <td className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${down ? 'text-wrong-text' : 'text-secondary'}`}>{formatPoints(delta?.sharePoints)}</td>
    </tr>
  );
}

export function FamilyTable({ report, deltas, caption }: { report: FamilyReport; deltas?: Map<string, FamilyDelta>; caption: string }): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-xs text-secondary pb-2">{caption}</caption>
        <thead>
          <tr className="text-xs text-secondary">
            <th scope="col" className="text-left font-normal pb-1 pr-3">Famille (cluster)</th>
            <th scope="col" className="text-right font-normal pb-1 px-2">Requêtes</th>
            <th scope="col" className="text-right font-normal pb-1 px-2">Citations</th>
            <th scope="col" className="text-right font-normal pb-1 px-2">Total implicite</th>
            <th scope="col" className="text-right font-normal pb-1 px-2">Part</th>
            <th scope="col" className="text-right font-normal pb-1 px-2">Écart</th>
            <th scope="col" className="text-right font-normal pb-1 pl-2">Part vs mois d&apos;avant</th>
          </tr>
        </thead>
        <tbody>
          {report.families.map((f) => <Row key={f.id} f={f} delta={deltas?.get(f.id)} />)}
          {report.other.queryCount > 0 && <Row f={report.other} delta={deltas?.get('other')} />}
          <Row f={report.total} delta={deltas?.get('total')} strong />
        </tbody>
      </table>
    </div>
  );
}
