import Link from 'next/link';

import { getSection } from '@/lib/verse/content';
import { renderTipTapJSON } from '@/lib/verse/render-content';
import { getEras } from '@/lib/verse/eras';
import { getPhotocards } from '@/lib/verse/photocards';
import { collectibleCount } from '@/lib/verse/collectibles';
import { photocardCount } from '@/lib/verse/photocards';
import { sceneCounts } from '@/lib/verse/entities';
import { SCENE_LIST } from '@/lib/verse/entity-types';
import { getDiscussions } from '@/lib/verse/discussions';
import { countMembers } from '@/lib/verse/membership';
import { IntroNudge } from './intro-nudge';

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
  const html = renderTipTapJSON(overview.content);
  if (!html) return <IntroNudge groupId={space.group.id} groupSlug={space.group.slug} groupName={space.group.name} />;
  return (
    <section className="v-module">
      <div
        className="verse-prose text-[1.0625rem] leading-relaxed text-secondary"
        style={{ maxWidth: 'var(--v-measure)' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
  const shown = eras.slice(0, 3);
  const years = (e: (typeof eras)[number]): string => {
    const a = e.periodStart?.slice(0, 4);
    const b = e.periodEnd?.slice(0, 4);
    if (a && b) return a === b ? a : `${a} to ${b}`;
    if (a) return `${a} to now`;
    return '';
  };
  return (
    <section className="v-module">
      <h2 className="v-eyebrow">The story so far</h2>
      <ol className="space-y-4" style={{ maxWidth: 'var(--v-measure)' }}>
        {shown.map((e) => (
          <li key={e.id}>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{e.name}</span>
              {years(e) ? <span className="text-[11.5px] uppercase tracking-wide text-tertiary">{years(e)}</span> : null}
            </div>
            {e.storyExcerpt ? <p className="mt-1 text-sm leading-relaxed text-secondary">{e.storyExcerpt}</p> : null}
          </li>
        ))}
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
  const [scenes, pcCount, colCount, eras] = await Promise.all([
    sceneCounts(group.id), photocardCount(group.id), collectibleCount(group.id), getEras(group.id),
  ]);
  const targets: { label: string; sub: string; href: string }[] = [];
  if (idols.length > 0) targets.push({ label: 'Members', sub: `${idols.length} profiles`, href: `/verse/${group.slug}/members` });
  if (albums.length > 0) targets.push({ label: 'Discography', sub: `${albums.length} releases`, href: `/verse/${group.slug}/discography` });
  if (eras.length > 0) targets.push({ label: 'Timeline', sub: `${eras.length} eras`, href: `/verse/${group.slug}/timeline` });
  for (const s of SCENE_LIST) {
    const n = scenes[s.kind] ?? 0;
    if (n > 0) targets.push({ label: s.label, sub: `${n} entries`, href: `/verse/${group.slug}/${s.seg}` });
  }
  if (pcCount > 0) targets.push({ label: 'Photocards', sub: `${pcCount} catalogued`, href: `/verse/${group.slug}/photocards` });
  if (colCount > 0) targets.push({ label: 'Collectibles', sub: `${colCount} items`, href: `/verse/${group.slug}/collectibles` });
  if (targets.length === 0) return null;
  return (
    <section className="v-module">
      <h2 className="v-eyebrow">Go deeper</h2>
      <div className="v-grid-cards">
        {targets.map((t) => (
          <Link key={t.href} href={t.href} className="group -mx-2 rounded-xl px-2 py-2.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
              <svg className="opacity-0 transition-opacity group-hover:opacity-100" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--verse-ink)" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="mt-0.5 block text-[13px] text-tertiary">{t.sub}</span>
          </Link>
        ))}
        <Link href={`/verse/${group.slug}/random`} className="group -mx-2 rounded-xl px-2 py-2.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
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
      <h2 className="v-eyebrow">Collections</h2>
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

/** 10. COMMUNITY - real activity only: member count + the latest voices. Hidden
 * when the space has neither members nor discussion. */
export async function CommunityModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const [members, discussions] = await Promise.all([
    countMembers(space.group.id),
    getDiscussions('group', String(space.group.id)),
  ]);
  if (members === 0 && discussions.length === 0) return null;
  const latest = [...discussions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  return (
    <section className="v-module">
      <h2 className="v-eyebrow">Community</h2>
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
