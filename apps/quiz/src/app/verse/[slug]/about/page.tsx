import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { hubsForGroup } from '@/lib/verse/tags';
import { getSection } from '@/lib/verse/content';
import { renderTipTapJSON } from '@/lib/verse/render-content';
import { SectionSurface } from '@/components/verse/editor/section-surface';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'About' };
  return { title: `About the ${space.group.fandom_name} space`, description: `About ${space.group.fandom_name}, the ${space.group.name} space on Verse.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/about` } };
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { group, config, counts } = space;
  const est = config.est_year ?? (group.inception_date ? Number(group.inception_date.slice(0, 4)) : null);
  const hubs = await hubsForGroup(group);
  const overview = await getSection('group', String(group.id), 'overview');

  return (
    <div className="max-w-2xl space-y-6">
      <SectionSurface
        entityType="group" entityId={String(group.id)} section="overview" label="Overview"
        initialHtml={renderTipTapJSON(overview.content)} initialContent={overview.content}
        baseRevisionId={overview.currentRevisionId} locked={overview.locked} lockReason={overview.lockReason}
        groupSlug={group.slug}
        emptyInvite={`Introduce ${group.name}: who they are, their sound, and why fans love them. Fan-written and credited.`}
      />
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>About this space</h2>
        <p className="text-sm leading-relaxed text-secondary">
          {group.fandom_name} is the home of {group.name} fans on Verse. Its knowledge is built on open, sourced data
          (Wikidata and MusicBrainz, both CC0) and kept accurate by curators. Facts show where they come from; corrections
          by curators always win.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Space stats</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[{ n: counts.members, l: 'members' }, { n: counts.albums, l: 'releases' }, { n: counts.tracks, l: 'tracks' }].map((s) => (
            <div key={s.l} className="rounded-xl border border-default bg-surface p-3" style={{ borderColor: 'var(--verse-line)' }}>
              <div className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{s.n}</div>
              <div className="text-[11px] text-tertiary">{s.l}</div>
            </div>
          ))}
        </div>
        {est ? <p className="mt-2 text-xs text-tertiary">Est. {est}{group.record_label ? `  ·  ${group.record_label}` : ''}{group.origin_country ? `  ·  ${group.origin_country}` : ''}</p> : null}
      </section>

      {hubs.length ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Categories</h2>
          <div className="flex flex-wrap gap-2">
            {hubs.map((h) => (
              <Link key={h.slug} href={`/verse/tag/${h.slug}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold no-underline" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>
                {h.label}<span className="text-tertiary tabular-nums">{h.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-dashed p-5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Charter</h2>
        <p className="mt-1 text-sm text-secondary">{config.charter_text ?? `The ${group.fandom_name} charter (rules, roles, how the space is run) will be written by its curator team.`}</p>
        <a href={`/login?returnTo=${encodeURIComponent(`/verse/${group.slug}`)}`} className="mt-2 inline-block text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Join the team</a>
      </section>
    </div>
  );
}
