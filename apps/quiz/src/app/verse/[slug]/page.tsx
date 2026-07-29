import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { VerseGameLink } from '@/components/verse/verse-game-link';
import { RelatedNavbox } from '@/components/verse/related-navbox';
import { getGroupBacklinks } from '@/lib/verse/backlinks';
import { getSpace } from '@/lib/verse/space';
import { onThisDay } from '@/lib/verse/date-engines';
import { musicGroupLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { CrossPromoTarget } from '@/lib/analytics';
import type { Space } from '@/lib/verse/space';

export const revalidate = 3600;

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-tertiary">{title}</h2>
      {children}
    </section>
  );
}

function PlayRow({ space }: { space: Space }): React.ReactElement | null {
  const { group, surfaces } = space;
  const tiles = [
    surfaces.quiz && { href: `/${group.slug}-quiz`, label: 'Quizzes', sub: 'Test your knowledge', target: 'group-quiz' as CrossPromoTarget },
    surfaces.blindtest && { href: `/blindtest/group-${group.slug}`, label: 'Blind test', sub: 'Name the song', target: 'blindtest' as CrossPromoTarget },
    surfaces.nameAll && { href: `/games/name-all/${group.slug}`, label: 'Name them all', sub: 'The full roster', target: 'name-all' as CrossPromoTarget },
    surfaces.personality && { href: `/personality/${group.slug}`, label: 'Which member', sub: 'Personality match', target: 'games' as CrossPromoTarget },
  ].filter(Boolean) as { href: string; label: string; sub: string; target: CrossPromoTarget }[];
  if (!tiles.length) return null;
  return (
    <Section title="Play">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <VerseGameLink key={t.href} href={t.href} target={t.target} className="verse-tile rounded-xl border border-default bg-surface p-4 no-underline" style={{ borderColor: 'var(--border)' }}>
            <span className="block text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
            <span className="mt-0.5 block text-xs text-tertiary">{t.sub}</span>
          </VerseGameLink>
        ))}
      </div>
    </Section>
  );
}

function MembersStrip({ space }: { space: Space }): React.ReactElement | null {
  const { group, idols } = space;
  if (!idols.length) return null;
  return (
    <Section title="Members">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {idols.map((m) => (
          <Link key={m.id} href={`/verse/${group.slug}/members/${m.slug}`} className="group w-24 shrink-0 no-underline">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-default bg-surface" style={{ borderColor: 'var(--verse-line)' }}>
              {m.photo_url
                ? <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                : <span className="flex h-full w-full items-center justify-center text-lg font-bold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{m.name.slice(0, 2)}</span>}
            </div>
            <span className="mt-1.5 block truncate text-center text-xs font-semibold text-primary">{m.name}</span>
            {m.name_hangul ? <span className="block truncate text-center text-[11px] text-tertiary">{m.name_hangul}</span> : null}
          </Link>
        ))}
      </div>
    </Section>
  );
}

function LatestReleases({ space }: { space: Space }): React.ReactElement | null {
  const { group, albums } = space;
  const recent = albums.filter((a) => a.release_date).slice(0, 6);
  if (!recent.length) return null;
  return (
    <Section title="Latest releases">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {recent.map((a) => (
          <Link key={a.id} href={`/verse/${group.slug}/albums/${a.slug}`} className="verse-tile rounded-xl border border-default bg-surface p-3 no-underline">
            <span className="block truncate text-sm font-semibold" style={{ color: 'var(--verse-ink)' }}>{a.title}</span>
            <span className="mt-0.5 block text-xs text-tertiary">
              {a.release_date?.slice(0, 4)} · {a.type.toUpperCase()}{a.region !== 'kr' ? ` · ${a.region.toUpperCase()}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function OnThisDay({ space }: { space: Space }): React.ReactElement | null {
  const entries = onThisDay(
    space.idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })),
    space.albums.map((a) => ({ title: a.title, slug: a.slug, release_date: a.release_date, type: a.type })),
    space.group.inception_date,
    new Date(),
  );
  if (!entries.length) return null;
  return (
    <div className="rounded-xl border border-default bg-surface p-4" style={{ borderColor: 'var(--verse-line)' }}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>On this day</h3>
      <ul className="space-y-1.5 text-sm text-secondary">
        {entries.map((e, i) => (
          <li key={i}>{e.label}{e.yearsAgo ? <span className="text-tertiary"> · {e.yearsAgo}y ago</span> : null}</li>
        ))}
      </ul>
    </div>
  );
}

function StatsFlex({ space }: { space: Space }): React.ReactElement {
  const { counts } = space;
  const stats = [
    { n: counts.members, l: 'members' },
    { n: counts.albums, l: 'releases' },
    { n: counts.tracks, l: 'tracks' },
  ];
  return (
    <div className="rounded-xl border border-default bg-surface p-4" style={{ borderColor: 'var(--verse-line)' }}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>In numbers</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{s.n}</div>
            <div className="text-[11px] text-tertiary">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MastheadInvite({ space }: { space: Space }): React.ReactElement {
  return (
    <div className="rounded-xl border border-dashed p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Curators</h3>
      <p className="mt-1 text-sm text-secondary">
        This space is looking for its founding {space.group.fandom_name} curators. Run it, and get credited for it.
      </p>
      <a href={`/login?returnTo=${encodeURIComponent(`/verse/${space.group.slug}`)}`} className="mt-2 inline-block text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Become a curator</a>
    </div>
  );
}

export default async function SpaceHomePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const backlinks = await getGroupBacklinks(space.group.slug);

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3">
      {jsonLdScript(musicGroupLd({
        name: space.group.name, slug: space.group.slug, fandom_name: space.group.fandom_name,
        inception_date: space.group.inception_date, official_website: space.group.official_website,
        record_label: space.group.record_label, memberNames: space.idols.map((i) => i.name),
      }))}
      <div className="lg:col-span-3 mb-4">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name }]} />
      </div>
      <div className="lg:col-span-2">
        <PlayRow space={space} />
        <MembersStrip space={space} />
        <LatestReleases space={space} />
      </div>
      <aside className="space-y-4 lg:col-span-1">
        <OnThisDay space={space} />
        <StatsFlex space={space} />
        <MastheadInvite space={space} />
      </aside>
      <div className="lg:col-span-3">
        <RelatedNavbox group={space.group} />
        {backlinks.length > 0 ? (
          <nav aria-label="Mentioned by" className="mt-3 text-sm text-secondary">
            <span className="text-tertiary">Mentioned by: </span>
            {backlinks.map((b, i) => (
              <span key={b.slug}>
                <Link href={`/verse/${b.slug}`} className="no-underline hover:text-primary">{b.name}</Link>
                {i < backlinks.length - 1 ? <span className="text-tertiary">, </span> : null}
              </span>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
