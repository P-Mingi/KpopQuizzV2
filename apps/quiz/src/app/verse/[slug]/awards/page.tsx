import { notFound } from 'next/navigation';

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
    return <p className="rounded-xl border border-dashed px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>No awards published yet.</p>;
  }

  // Group by year (undated last), then render newest first.
  const byYear = new Map<number | 0, typeof rows>();
  for (const r of rows) { const y = r.year ?? 0; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y)!.push(r); }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div>
      <p className="mb-4 text-xs text-tertiary">Awards and nominations, sourced. Fans and curators keep this current.</p>
      <div className="space-y-6">
        {years.map((y) => (
          <section key={y}>
            <h2 className="mb-2 text-sm font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{y === 0 ? 'Year unconfirmed' : y}</h2>
            <ul className="max-w-[66ch] space-y-1.5">
              {byYear.get(y)!.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg px-3 py-2" style={{ background: 'var(--verse-soft)' }}>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: r.result === 'won' ? 'var(--verse-accent)' : 'var(--verse-soft-strong)', color: r.result === 'won' ? 'var(--verse-accent-text)' : 'var(--verse-ink)' }}>{r.result ?? 'listed'}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--verse-ink)' }}>{r.award_name}</span>
                  {r.category ? <span className="text-sm text-secondary">{r.category}</span> : null}
                  {r.source_url ? <a href={r.source_url} rel="nofollow noopener" target="_blank" className="ml-auto text-xs text-tertiary underline">source</a> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
