import Link from 'next/link';
import { EmptyState } from '@/components/verse/primitives/empty-state';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageGrammar } from '@/components/verse/page-grammar';

import { getSpace } from '@/lib/verse/space';
import { upcomingBirthday } from '@/lib/verse/date-engines';

import type { Metadata } from 'next';
import type { Space, SpaceIdol } from '@/lib/verse/space';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Members' };
  const title = `${space.group.name} members - ${space.group.fandom_name}`;
  return { title, description: `The ${space.counts.members} members of ${space.group.name}: names, positions and profiles.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/members` } };
}

function birthdayInDays(birth: string | null): number | null {
  if (!birth || birth.length < 10) return null;
  const info = upcomingBirthday([{ name: 'x', slug: 'x', birth_date: birth }], new Date());
  return info ? info.inDays : null;
}

function MemberCard({ idol, slug }: { idol: SpaceIdol; slug: string }): React.ReactElement {
  const bd = birthdayInDays(idol.birth_date);
  return (
    <Link href={`/verse/${slug}/members/${idol.slug}`} className="verse-tile group flex flex-col overflow-hidden rounded-xl border border-default bg-surface no-underline" style={{ borderColor: 'var(--verse-line)' }}>
      <div className="aspect-[3/4] w-full overflow-hidden bg-surface">
        {idol.photo_url
          ? <img src={idol.photo_url} alt={idol.name} className="v-portrait h-full w-full" loading="lazy" />
          : <span className="flex h-full w-full items-center justify-center text-2xl font-bold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{idol.name.slice(0, 2)}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-primary">{idol.name}</span>
          {idol.name_hangul ? <span className="text-xs text-tertiary">{idol.name_hangul}</span> : null}
        </div>
        {idol.positions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {idol.positions.slice(0, 3).map((p) => (
              <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{p}</span>
            ))}
          </div>
        ) : null}
        {bd !== null && bd <= 30 ? (
          <span className="text-[11px] font-semibold" style={{ color: 'var(--verse-ink)' }}>{bd === 0 ? 'Birthday today' : `Birthday in ${bd}d`}</span>
        ) : null}
      </div>
    </Link>
  );
}

function Grid({ idols, slug }: { idols: SpaceIdol[]; slug: string }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {idols.map((m) => <MemberCard key={m.id} idol={m} slug={slug} />)}
    </div>
  );
}

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space: Space | null = await getSpace(slug);
  if (!space) notFound();
  const { idols, units, group } = space;

  if (!idols.length) {
    return <EmptyState headline="No member profiles yet." body={`Profiles for ${group.name} appear here as they are sourced.`} />;
  }

  const unitById = new Map(units.map((u) => [u.id, u]));
  const unassigned = idols.filter((i) => !i.unit_id || !unitById.has(i.unit_id));
  const byUnit = new Map<number, SpaceIdol[]>();
  for (const i of idols) if (i.unit_id && unitById.has(i.unit_id)) {
    if (!byUnit.has(i.unit_id)) byUnit.set(i.unit_id, []);
    byUnit.get(i.unit_id)!.push(i);
  }

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: group.fandom_name, href: `/verse/${slug}` }, { label: 'Members' }]} />
      </div>
      <PageGrammar kicker="Members" title={`The ${idols.length} members of ${group.name}`}
        dek="Portraits, positions and profiles. Facts on each profile carry their source." />
      <Grid idols={unassigned} slug={slug} />
      {[...byUnit.entries()].map(([uid, members]) => (
        <section key={uid} className="mt-8">
          <SectionHeader kicker={unitById.get(uid)?.name} as="h2" />
          <Grid idols={members} slug={slug} />
        </section>
      ))}
    </div>
  );
}
