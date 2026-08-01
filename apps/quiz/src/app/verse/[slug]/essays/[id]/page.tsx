import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { RoleBadge } from '@/components/verse/roles/role-badge';
import { DiscussionThread } from '@/components/verse/discussion-thread';
import { EssayReactions } from '@/components/verse/essay-reactions';
import { getSpace } from '@/lib/verse/space';
import { getEssayPage, getRelatedEssays } from '@/lib/verse/essays';
import { createServerClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { renderTipTapJSON, extractHeadings, plainTextExcerpt } from '@/lib/verse/render-content';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';
import { jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const e = await getEssayPage(Number(id));
  if (!e || e.status !== 'featured') return { title: 'Essay', robots: { index: false, follow: false } };
  return {
    title: `${e.title} - ${e.author?.displayName || e.author?.username || 'a fan'}`,
    description: plainTextExcerpt(e.content, 155),
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/essays/${id}` },
  };
}

// V-ESSAYS-MAX step 3 - THE ESSAY PAGE on the editorial standard: cover, serif
// display title, author card + role badge, reading time, auto-TOC past 3 sections,
// the crawlable body (pull-quotes render from the constrained renderer), reactions,
// per-essay discussion, related essays (same series first). Article JSON-LD +
// indexable only when public (featured); drafts stay author/curator-private.
export default async function EssayDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<React.ReactElement> {
  const { slug, id } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const e = await getEssayPage(Number(id));
  if (!e || e.groupId !== space.group.id) notFound();

  if (e.status !== 'featured') {
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    const allowed = !!user && (user.id === e.authorId || await canCurateSpace(user.id, space.group.id));
    if (!allowed) notFound();
  }

  const html = renderTipTapJSON(e.content);
  const headings = extractHeadings(e.content);
  const name = e.author?.displayName || e.author?.username || 'a fan';
  const cover = e.cover as { assetPath?: string } | null;
  const coverUrl = cover?.assetPath ? spaceAssetUrl(cover.assetPath) : null;
  const related = e.status === 'featured' ? await getRelatedEssays(space.group.id, e.id, e.seriesId) : [];

  return (
    <article className="mx-auto max-w-3xl">
      {e.status === 'featured' ? jsonLdScript({
        '@context': 'https://schema.org', '@type': 'Article', headline: e.title,
        author: { '@type': 'Person', name }, datePublished: e.featuredAt ?? e.createdAt,
        about: space.group.name, isAccessibleForFree: true,
        mainEntityOfPage: `https://kpopquiz.org/verse/${slug}/essays/${e.id}`,
      }) : null}

      <div className="mb-4"><Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: 'Essays', href: `/verse/${slug}/essays` }, { label: e.title }]} /></div>

      {e.status !== 'featured' ? <p className="mb-3 inline-block rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>Preview: {e.status} (not public yet)</p> : null}

      {/* Cover block (policy assets only; typographic when none). */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="mb-5 max-h-72 w-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
      ) : null}

      {e.seriesTitle ? <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--verse-cta, var(--verse-accent))' }}>{e.seriesTitle}</p> : null}
      <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-[2.6rem]" style={{ color: 'var(--verse-ink)', fontFamily: 'Georgia, "Times New Roman", serif', textWrap: 'balance' } as React.CSSProperties}>{e.title}</h1>

      {/* Author card. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b pb-5" style={{ borderColor: 'var(--verse-line)' }}>
        {e.author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.author.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold" style={{ background: e.author?.avatarBg ?? 'var(--verse-soft-strong)', color: e.author?.avatarText ?? 'var(--verse-ink)' }}>{name.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="text-sm">
          {e.author?.username ? <Link href={`/u/${e.author.username}`} className="verse-link font-bold">{name}</Link> : <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{name}</span>}
        </span>
        <RoleBadge role={e.authorRole} />
        <span aria-hidden className="text-tertiary">·</span>
        <span className="text-sm text-tertiary tabular-nums">{e.readingMin} min read</span>
      </div>

      {/* Auto-TOC past 3 sections. */}
      {headings.length > 3 ? (
        <nav aria-label="Contents" className="my-6 rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-tertiary">Contents</p>
          <ol className="space-y-1 text-sm">
            {headings.map((h, i) => (
              <li key={`${h.id}-${i}`} className={h.level === 3 ? 'pl-4' : ''}><a href={`#${h.id}`} className="verse-link no-underline hover:underline">{h.text}</a></li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="verse-prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      {/* Reactions. */}
      {e.status === 'featured' ? <div className="mt-8 flex items-center gap-3 border-t pt-6" style={{ borderColor: 'var(--verse-line)' }}><EssayReactions essayId={e.id} groupSlug={slug} /></div> : null}

      {/* Related (same series first). */}
      {related.length ? (
        <section className="mt-10">
          <h2 className="v-section-title">More essays</h2>
          <div className="v-section-rule" aria-hidden />
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/verse/${slug}/essays/${r.id}`} className="block rounded-xl border p-3 no-underline hover:bg-[var(--verse-soft)]" style={{ borderColor: 'var(--verse-line)' }}>
                  <p className="font-bold leading-snug" style={{ color: 'var(--verse-ink)', fontFamily: 'Georgia, "Times New Roman", serif' }}>{r.title}</p>
                  <p className="mt-0.5 text-xs text-tertiary">by {r.author?.displayName || r.author?.username || 'a fan'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Per-essay discussion (existing rails). */}
      {e.status === 'featured' ? (
        <section className="mt-10 border-t pt-6" style={{ borderColor: 'var(--verse-line)' }}>
          <DiscussionThread entityType="essay" entityId={String(e.id)} groupId={space.group.id} />
        </section>
      ) : null}
    </article>
  );
}
