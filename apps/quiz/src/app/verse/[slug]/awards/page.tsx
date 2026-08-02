import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/verse/primitives/empty-state';

import { SourceChip } from '@/components/verse/source-chip';
import { PageGrammar } from '@/components/verse/page-grammar';
import { getSpace } from '@/lib/verse/space';
import { getScene } from '@/lib/verse/entities';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Awards' };
  return {
    title: `${space.group.name} awards and nominations`,
    description: `Awards and nominations for ${space.group.name}, with sources.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/awards` },
  };
}

export default async function AwardsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const rows = await getScene('awards', space.group.id) as Array<{ id: number; award_name: string; category: string | null; ceremony: string | null; year: number | null; result: string | null; source_url: string | null }>;

  if (rows.length === 0) {
    return <EmptyState headline="No awards yet." body="Wins and nominations appear here as they are sourced." />;
  }

  // Group by year (undated last), then render newest first.
  const byYear = new Map<number | 0, typeof rows>();
  for (const r of rows) { const y = r.year ?? 0; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y)!.push(r); }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const wins = rows.filter((r) => r.result === 'won').length;
  const noms = rows.filter((r) => r.result === 'nominated').length;
  const datedYears = years.filter((y) => y !== 0);
  const since = datedYears.length ? Math.min(...datedYears) : null;

  const Trophy = ({ won }: { won: boolean }): React.ReactElement => won ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--verse-cta, var(--verse-accent))" aria-hidden>
      <path d="M6 3h12v2h3v3c0 2.4-1.9 4.4-4.3 4.9A6 6 0 0 1 13 16v2h3v2H8v-2h3v-2a6 6 0 0 1-3.7-3.1C4.9 12.4 3 10.4 3 8V5h3V3zm-1 4v1c0 1.2.8 2.3 1.9 2.7A9 9 0 0 1 6.2 7H5zm14 0h-1.2a9 9 0 0 1-.7 3.7C18.2 10.3 19 9.2 19 8V7z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--verse-ink)" strokeWidth="1.8" opacity="0.55" aria-hidden>
      <circle cx="12" cy="9" r="5.2" /><path d="M9.5 13.5 8 21l4-2.2L16 21l-1.5-7.5" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div>
      <PageGrammar kicker="Awards" title="The record"
        dek={`Awards and nominations for ${space.group.name}, every line sourced. Fans and curators keep it current.`} />
      {/* The record, in one band: oversized counts in the vitals-band spirit. */}
      <div className="mb-7 flex flex-wrap items-end gap-x-8 gap-y-3 rounded-xl px-5 py-4" style={{ background: 'var(--verse-soft)' }}>
        <div>
          <p className="text-[2.1rem] font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{wins}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Wins</p>
        </div>
        <div>
          <p className="text-[2.1rem] font-extrabold leading-none tabular-nums text-secondary">{noms}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Nominations</p>
        </div>
        {since ? (
          <div>
            <p className="text-[2.1rem] font-extrabold leading-none tabular-nums text-secondary">{since}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Since</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-9">
        {years.map((y) => (
          <section key={y}>
            <h2 className="v-section-title tabular-nums">{y === 0 ? 'Year unconfirmed' : y}</h2>
            <div className="v-section-rule" aria-hidden />
            <ul className="max-w-[66ch] space-y-2">
              {byYear.get(y)!.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--verse-soft)' }}>
                  <span className="mt-0.5 flex-shrink-0" aria-hidden><Trophy won={r.result === 'won'} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{r.award_name}</span>
                      {r.source_url ? <SourceChip href={r.source_url} /> : null}
                    </span>
                    {r.category ? <span className="block text-[13px] leading-snug text-secondary">{r.category}</span> : null}
                    {r.ceremony && r.ceremony !== r.award_name ? <span className="block text-[11.5px] text-tertiary">{r.ceremony}</span> : null}
                  </span>
                  <span className="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                    style={r.result === 'won'
                      ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }
                      : { border: '1px solid var(--verse-line)', color: 'var(--verse-ink)' }}>
                    {r.result === 'won' ? 'Won' : r.result === 'nominated' ? 'Nominated' : r.result ?? 'Listed'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
