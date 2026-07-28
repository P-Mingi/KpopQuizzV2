import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Timeline' };
  return { title: `${space.group.name} timeline - ${space.group.fandom_name}`, description: `Key dates for ${space.group.name}: debut and every release, from entity data.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/timeline` } };
}

interface Entry { date: string; label: string; kind: 'debut' | 'release'; }

export default async function TimelinePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { group, albums } = space;

  const entries: Entry[] = [];
  if (group.inception_date) entries.push({ date: group.inception_date.slice(0, 10), label: `${group.name} debuts`, kind: 'debut' });
  for (const a of albums) if (a.release_date) entries.push({ date: a.release_date.slice(0, 10), label: `${a.title} (${a.type.toUpperCase()})`, kind: 'release' });
  entries.sort((x, y) => y.date.localeCompare(x.date));

  if (!entries.length) {
    return <p className="rounded-xl border border-dashed border-default px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>Timeline for {group.name} is being prepared.</p>;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-tertiary">Auto-generated from entity dates. Authored eras and awards will be added by curators.</p>
      <ol className="relative ml-2 border-l-2 pl-5" style={{ borderColor: 'var(--verse-line)' }}>
        {entries.map((e, i) => (
          <li key={i} className="relative mb-4">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full" style={{ background: 'var(--verse-accent)' }} aria-hidden />
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{e.date}</span>
              <span className="text-sm text-primary">{e.label}</span>
              <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>auto</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
