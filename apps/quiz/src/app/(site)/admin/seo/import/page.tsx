import { redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { compareFamilies, computeFamilies } from '@/lib/seo/weekly/ai-performance';
import { readAiMonths, readAiPages, readAiQueries } from '@/lib/seo/weekly/ai-store';
import { readTargetsMd } from '@/lib/seo/weekly/repo-docs';
import { MissingTableError } from '@/lib/seo/weekly/store';
import { parseTargets, RULEBOOK_V1_CLUSTERS } from '@/lib/seo/weekly/targets';

import { FamilyTable, formatInt, formatPct } from './family-table';
import { ImportClient } from './import-client';

import type { Metadata } from 'next';
import type { AiPageRow, FamilyReport } from '@/lib/seo/weekly/ai-performance';

// SEO Mission 3, part C: the monthly Bing AI Performance upload and the Copilot query families
// (citations, implied total, share, gap). Admin only, under /admin (noindex, not in the sitemap).
// Families are the clusters of docs/seo/TARGETS.md; when that file cannot be read the page says
// so and uses the cluster list of the rulebook (v1) instead.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Import Bing AI',
  robots: { index: false, follow: false },
};

const monthLabel = (m: string): string => m.slice(0, 7);

function previousMonth(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

interface Stored {
  month: string;
  report: FamilyReport;
  previous: { month: string; report: FamilyReport } | null;
  pages: AiPageRow[];
}

export default async function SeoImportPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const targetsMd = await readTargetsMd();
  const parsed = targetsMd ? parseTargets(targetsMd) : [];
  const fromTargets = parsed.length > 0;
  const clusters = fromTargets ? parsed : RULEBOOK_V1_CLUSTERS;

  let tableMissing = false;
  let readError = false;
  let stored: Stored | null = null;
  let months: string[] = [];
  try {
    const db = createServiceRoleClient();
    months = await readAiMonths(db);
    if (months[0]) {
      const [rows, pages, prevRows] = await Promise.all([
        readAiQueries(db, months[0]),
        readAiPages(db, months[0]),
        months[1] ? readAiQueries(db, months[1]) : Promise.resolve(null),
      ]);
      stored = {
        month: months[0],
        report: computeFamilies(rows, clusters),
        previous: months[1] && prevRows ? { month: months[1], report: computeFamilies(prevRows, clusters) } : null,
        pages: [...pages].sort((a, b) => b.citations - a.citations).slice(0, 20),
      };
    }
  } catch (e) {
    if (e instanceof MissingTableError) tableMissing = true;
    else readError = true;
  }

  return (
    <div className="max-w-4xl pb-12">
      <h1 className="text-xl font-medium text-primary">Import Bing AI Performance</h1>
      <p className="text-sm text-secondary mt-2 leading-relaxed">
        Une fois par mois: dans Bing Webmaster Tools, ouvre AI Performance, exporte l&apos;onglet Requêtes puis
        l&apos;onglet Pages, et dépose les deux fichiers ici. Pour chaque famille de requêtes: les citations, le total
        implicite (citations divisées par la part), la part et l&apos;écart (les citations parties vers d&apos;autres sites).
      </p>
      <p className="text-xs text-secondary mt-2">
        {fromTargets
          ? `Familles: les ${clusters.length} clusters de docs/seo/TARGETS.md.`
          : `TARGETS.md non lu: familles du rulebook v1 (${clusters.length} clusters). Elles suivront TARGETS.md dès qu'il sera en ligne.`}
        {' '}Une requête sans part est comptée dans les citations, pas dans le total implicite.
      </p>
      {tableMissing && (
        <p className="text-sm text-wrong-text mt-3">
          Les tables ne sont pas encore créées (docs/pending-migrations/seo-weekly-data.sql). Le calcul marche, l&apos;enregistrement attendra.
        </p>
      )}
      {readError && <p className="text-sm text-wrong-text mt-3">Lecture des mois enregistrés impossible pour le moment.</p>}

      <ImportClient clusters={clusters} defaultMonth={previousMonth(new Date())} tableMissing={tableMissing} />

      {stored && (
        <section aria-labelledby="stored-title" className="mt-10">
          <h2 id="stored-title" className="text-base font-medium text-primary">Dernier mois enregistré: {monthLabel(stored.month)}</h2>
          <p className="text-xs text-secondary mt-1">Mois enregistrés: {months.map(monthLabel).join(', ')}.</p>
          <div className="mt-3">
            <FamilyTable
              report={stored.report}
              deltas={compareFamilies(stored.report, stored.previous?.report ?? null)}
              caption={stored.previous ? `Comparé à ${monthLabel(stored.previous.month)}. Une part en baisse s'affiche en rouge.` : 'Premier mois enregistré: pas encore de comparaison.'}
            />
          </div>
          {stored.pages.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <h3 className="text-sm font-medium text-primary">Pages les plus citées ({monthLabel(stored.month)})</h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-xs text-secondary">
                    <th scope="col" className="text-left font-normal pb-1">Page</th>
                    <th scope="col" className="text-right font-normal pb-1 px-2">Citations</th>
                    <th scope="col" className="text-right font-normal pb-1 pl-2">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {stored.pages.map((p) => (
                    <tr key={p.url} className="border-t border-default">
                      <td className="py-1.5 pr-3 break-all">{p.url}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{formatInt(p.citations)}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums whitespace-nowrap">{formatPct(p.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
