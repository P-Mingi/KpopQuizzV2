import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import { resolveName } from '@/lib/verse/disambig';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }): Promise<Metadata> {
  const { term } = await params;
  const pretty = term.replace(/-/g, ' ');
  return {
    title: `${pretty} - which one?`,
    description: `Entities on Verse named "${pretty}".`,
    alternates: { canonical: `https://kpopquiz.org/verse/name/${term}` },
    robots: { index: false, follow: true }, // a chooser page: follow through, don't index the stub
  };
}

export default async function DisambiguationPage({ params }: { params: Promise<{ term: string }> }): Promise<React.ReactElement> {
  const { term } = await params;
  const candidates = await resolveName(term);

  if (candidates.length === 0) notFound();
  if (candidates.length === 1) permanentRedirect(candidates[0]!.href); // a single match is not ambiguous

  const pretty = term.replace(/-/g, ' ');
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: pretty }]} />
      <h1 className="text-2xl font-black capitalize tracking-tight text-primary">{pretty}</h1>
      <p className="mt-1 text-sm text-secondary">More than one thing goes by this name. Which did you mean?</p>
      <ul className="mt-5 space-y-2">
        {candidates.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="flex items-center justify-between gap-3 rounded-xl border border-default px-4 py-3 no-underline transition-colors hover:bg-surface-1">
              <span>
                <span className="font-bold text-primary">{c.name}</span>
                <span className="ml-2 text-sm text-secondary">{c.detail}</span>
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-tertiary" style={{ border: '1px solid var(--border)' }}>{c.type}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
