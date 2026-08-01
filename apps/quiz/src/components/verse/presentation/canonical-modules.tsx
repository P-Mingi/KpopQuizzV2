import Link from 'next/link';

import { cache } from 'react';

import { getSection } from '@/lib/verse/content';
import { splitTipTapForFold } from '@/lib/verse/render-content';
import { computeQuality } from '@/lib/verse/quality';
import { getEras } from '@/lib/verse/eras';
import { CoverArt } from '@/components/verse/cover-art';
import { getPhotocards } from '@/lib/verse/photocards';
import { collectibleCount } from '@/lib/verse/collectibles';
import { photocardCount } from '@/lib/verse/photocards';
import { sceneCounts } from '@/lib/verse/entities';
import { SCENE_LIST } from '@/lib/verse/entity-types';
import { getDiscussions } from '@/lib/verse/discussions';
import { countMembers } from '@/lib/verse/membership';
import { IntroNudge } from './intro-nudge';
import { listPublishedPages } from '@/lib/verse/pages/data';

import type { ModuleProps } from './module-registry';

// V-SPACE-FLOW - the canonical-order modules (universe doc 3a, locked). All
// real-data, all min-gated: a module with nothing true to say renders nothing.

/** 2. INTRO - the group overview section rendered as the page's first paragraph
 * (seo_critical; reuses existing verse_content storage, no new storage). Empty ->
 * a client-side members-only nudge; visitors see nothing. */
export async function IntroModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const overview = await getSection('group', String(space.group.id), 'overview');
  if (!overview.content) {
    return <IntroNudge groupId={space.group.id} groupSlug={space.group.slug} groupName={space.group.name} />;
  }
  // V-TEXT: the home intro is a 2-4 sentence lede. A long overview renders its
  // first blocks here with a link to the full text on the About page (which is
  // that content's canonical, fully-served home).
  const split = splitTipTapForFold(overview.content, 2);
  if (!split.previewHtml.replace(/<[^>]*>/g, '').trim()) return <IntroNudge groupId={space.group.id} groupSlug={space.group.slug} groupName={space.group.name} />;
  return (
    <section className="v-module">
      <div
        className="verse-prose text-[1.0625rem] leading-relaxed text-secondary"
        style={{ maxWidth: 'var(--v-measure)' }}
        dangerouslySetInnerHTML={{ __html: split.previewHtml }}
      />
      {split.restHtml ? (
        <Link href={`/verse/${space.group.slug}/about`} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
          Read the full introduction
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      ) : null}
    </section>
  );
}

/** 3. VITALS - one quiet line from entity data (never boxes): debut year, member
 * count, agency, fandom name with its colors. */
export function VitalsStrip({ space }: ModuleProps): React.ReactElement | null {
  const { group, counts } = space;
  const year = group.inception_date ? group.inception_date.slice(0, 4) : null;
  const bits: React.ReactNode[] = [];
  if (year) bits.push(<span key="y">Debut {year}</span>);
  if (counts.members > 0) bits.push(<span key="m">{counts.members} members</span>);
  if (group.record_label) bits.push(<span key="l">{group.record_label}</span>);
  bits.push(
    <span key="f" className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: group.display_color ?? 'var(--verse-accent)' }} />
      {group.fandom_name}
    </span>,
  );
  if (bits.length === 0) return null;
  return (
    <section className="v-module" style={{ marginTop: 'calc(var(--v-space-section) * -0.45)' }}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-tertiary">
        {bits.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-x-3">
            {i > 0 ? <span aria-hidden style={{ color: 'var(--v-hairline)' }}>·</span> : null}
            {b}
          </span>
        ))}
      </p>
    </section>
  );
}

/** 5. THE STORY SO FAR - the era arc, newest first, teasing the full timeline.
 * Hidden entirely when the group has no eras. (V-TEXT folding lands in step 2.) */
export async function StoryModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const eras = await getEras(space.group.id);
  if (eras.length === 0) return null;
  // The trailer shows the CURRENT chapter plus the newest chapters that have
  // stories (excerpts are the pull); pure newest-first only when nothing is
  // written yet.
  const currentIdx = eras.findIndex((x) => !x.periodEnd);
  const current = currentIdx >= 0 ? eras[currentIdx]! : null;
  const withStories = eras.filter((e, i) => i !== currentIdx && e.storyExcerpt);
  const rest = eras.filter((e, i) => i !== currentIdx && !e.storyExcerpt);
  const shown = [...(current ? [current] : []), ...withStories, ...rest].slice(0, 3);
  // "to now" belongs to the ONE current era; older open-ended rows show their start.
  const years = (e: (typeof eras)[number], isCurrent: boolean): string => {
    const a = e.periodStart?.slice(0, 4);
    const b = e.periodEnd?.slice(0, 4);
    if (a && b) return a === b ? a : `${a} to ${b}`;
    if (a) return isCurrent ? `since ${a}` : a;
    return '';
  };
  return (
    <section className="v-module">
      <h2 className="v-section-title">The story so far</h2>
      <div className="v-section-rule" aria-hidden />
      <ol className="space-y-4" style={{ maxWidth: 'var(--v-measure)' }}>
        {shown.map((e, i) => {
          const isCurrent = i === currentIdx;
          return (
          <li key={e.id} className="flex items-start gap-3 border-l-[3px] pl-3" style={{ borderColor: e.color ?? 'var(--verse-accent)' }}>
            {e.albums[0]?.mbid ? <CoverArt mbid={e.albums[0].mbid} title={e.albums[0].title} className="mt-0.5 w-10 flex-shrink-0 rounded-md" /> : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{e.name}</span>
                {years(e, isCurrent) ? <span className="text-[11.5px] uppercase tracking-wide text-tertiary tabular-nums">{years(e, isCurrent)}</span> : null}
                {isCurrent ? <span className="rounded-full px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Now</span> : null}
              </div>
              {e.storyExcerpt ? <p className="mt-1 text-sm leading-relaxed text-secondary">{e.storyExcerpt}</p> : null}
            </div>
          </li>
          );
        })}
      </ol>
      <Link href={`/verse/${space.group.slug}/timeline`} className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        Full timeline
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </section>
  );
}

/** 8. GO DEEPER - the explore grid. Real destinations only, min-gated per target,
 * plus "Surprise me" (a random real page within the space). */
export async function GoDeeperModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const { group, idols, albums } = space;
  const [scenes, pcCount, colCount, eras, wikiPages] = await Promise.all([
    sceneCounts(group.id), photocardCount(group.id), collectibleCount(group.id), getEras(group.id),
    listPublishedPages(group.id),
  ]);
  const targets: { label: string; sub: string; href: string }[] = [];
  if (idols.length > 0) targets.push({ label: 'Members', sub: `${idols.length} profiles`, href: `/verse/${group.slug}/members` });
  if (albums.length > 0) targets.push({ label: 'Discography', sub: `${albums.length} releases`, href: `/verse/${group.slug}/discography` });
  if (albums.some((a) => a.release_date)) targets.push({ label: 'Songs', sub: 'The song deck', href: `/verse/${group.slug}/songs` });
  if (eras.length > 0) targets.push({ label: 'Timeline', sub: `${eras.length} eras`, href: `/verse/${group.slug}/timeline` });
  if (wikiPages.length > 0) targets.push({ label: 'Atlas', sub: `${wikiPages.length} page${wikiPages.length === 1 ? '' : 's'}`, href: `/verse/${group.slug}/wiki` });
  for (const s of SCENE_LIST) {
    const n = scenes[s.kind] ?? 0;
    if (n > 0) targets.push({ label: s.label, sub: `${n} entries`, href: `/verse/${group.slug}/${s.seg}` });
  }
  if (pcCount > 0) targets.push({ label: 'Photocards', sub: `${pcCount} catalogued`, href: `/verse/${group.slug}/photocards` });
  if (colCount > 0) targets.push({ label: 'Collectibles', sub: `${colCount} items`, href: `/verse/${group.slug}/collectibles` });
  if (targets.length >= 5) targets.push({ label: 'Browse everything', sub: 'The index of indexes', href: `/verse/${group.slug}/content` });
  if (targets.length === 0) return null;
  return (
    <section className="v-module">
      <h2 className="v-section-title">Go deeper</h2>
      <div className="v-section-rule" aria-hidden />
      <div className="v-grid-cards">
        {targets.map((t) => (
          <Link key={t.href} href={t.href} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
              <svg className="opacity-0 transition-opacity group-hover:opacity-100" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--verse-ink)" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="mt-0.5 block text-[13px] text-tertiary">{t.sub}</span>
          </Link>
        ))}
        <Link href={`/verse/${group.slug}/random`} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
          <span className="text-[15px] font-bold" style={{ color: 'var(--verse-brand-text)' }}>Surprise me</span>
          <span className="mt-0.5 block text-[13px] text-tertiary">A random page in this space</span>
        </Link>
      </div>
    </section>
  );
}

/** 9. COLLECTIONS teaser - a glimpse of the catalogued photocards/collectibles.
 * Hidden until the space has any. */
export async function CollectionsModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const [cards, colCount] = await Promise.all([getPhotocards(space.group.id), collectibleCount(space.group.id)]);
  if (cards.length === 0 && colCount === 0) return null;
  const thumbs = cards.filter((c) => c.image_url).slice(0, 5);
  return (
    <section className="v-module">
      <h2 className="v-section-title">Collections</h2>
      <div className="v-section-rule" aria-hidden />
      {thumbs.length > 0 ? (
        <div className="flex gap-2.5">
          {thumbs.map((c) => (
            <div key={c.id} className="aspect-[3/4] w-16 overflow-hidden rounded-lg sm:w-20" style={{ background: 'var(--verse-soft-strong)' }}>
              <img src={c.image_url!} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        {cards.length > 0 ? <Link href={`/verse/${space.group.slug}/photocards`} className="no-underline" style={{ color: 'var(--verse-ink)' }}>{cards.length} photocards</Link> : null}
        {colCount > 0 ? <Link href={`/verse/${space.group.slug}/collectibles`} className="no-underline" style={{ color: 'var(--verse-ink)' }}>{colCount} collectibles</Link> : null}
      </div>
    </section>
  );
}

// COMPLETENESS METER (blueprint idea 3) - a public coverage score from the
// quality engine (W3K.10). MIN-GATED past a floor so new spaces are never
// shamed: below the floor the module simply does not exist. Real numbers only.
const COMPLETENESS_FLOOR = 0.35; // owner tunes at review
const qualityCached = cache(computeQuality);

export async function CompletenessModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const report = await qualityCached();
  const g = report.groups.find((x) => x.slug === space.group.slug);
  if (!g || g.score < COMPLETENESS_FLOOR) return null;
  const pct = Math.round(g.score * 100);
  const lines: string[] = [];
  if (g.erasTotal > 0) lines.push(`Eras ${g.erasNarrated}/${g.erasTotal} written`);
  if (g.idolsTotal > 0) lines.push(`Lore ${g.idolsWithLore}/${g.idolsTotal} members`);
  lines.push(g.signals.overview ? 'Overview written' : 'Overview missing');
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">Coverage</h3>
      <div className="flex items-baseline gap-2">
        <span className="font-extrabold leading-none tabular-nums" style={{ fontSize: 'var(--v-type-num)', color: 'var(--verse-ink)' }}>{pct}%</span>
        <span className="text-[11px] uppercase tracking-wide text-tertiary">documented</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--verse-soft)' }} role="img" aria-label={`${pct} percent documented`}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--verse-cta, var(--verse-accent))' }} />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-tertiary">{lines.join(' · ')}</p>
    </div>
  );
}

/** 10. COMMUNITY - real activity only: member count + the latest voices. Hidden
 * when the space has neither members nor discussion. */
export async function CommunityModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const [members, discussions] = await Promise.all([
    countMembers(space.group.id),
    getDiscussions('group', String(space.group.id), space.group.id),
  ]);
  if (members === 0 && discussions.length === 0) return null;
  const latest = [...discussions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  return (
    <section className="v-module">
      <h2 className="v-section-title">Community</h2>
      <div className="v-section-rule" aria-hidden />
      {members > 0 ? (
        <p className="text-sm text-secondary">{members} {space.group.fandom_name} member{members === 1 ? '' : 's'} on this space.</p>
      ) : null}
      {latest.length > 0 ? (
        <ul className="mt-3 space-y-2.5" style={{ maxWidth: 'var(--v-measure)' }}>
          {latest.map((d) => (
            <li key={d.id} className="border-l-2 pl-3" style={{ borderColor: 'var(--v-hairline)' }}>
              <p className="text-sm leading-snug text-secondary">{d.body.length > 120 ? `${d.body.slice(0, 120)}…` : d.body}</p>
              <p className="mt-0.5 text-[11px] text-tertiary">{d.author?.displayName || d.author?.username || 'A fan'}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <Link href={`/verse/${space.group.slug}/community`} className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        Join the conversation
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </section>
  );
}
