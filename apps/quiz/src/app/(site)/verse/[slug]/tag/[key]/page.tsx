import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getSpace } from '@/lib/verse/space';
import { createPublicReadClient } from '@/lib/supabase/server';
import { verseHidden } from '@/lib/verse/visibility';
import { getTag, pagesForTag, relatedTags } from '@/lib/verse/tree/tags';

import type { Metadata } from 'next';

// V-FOUNDATION F1 Phase F - the tag INDEX page (locked prototype screen 05). One H1 (the
// tag label); the description is curator-editable; the list of pages is a QUERY, generated,
// never hand-maintained (C7). Min-gate + C5: an empty tag index is noindex (no dead index).
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; key: string }> }): Promise<Metadata> {
  const { slug, key } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Not found', robots: { index: false, follow: false } };
  const db = createPublicReadClient();
  const tag = await getTag(db, space.group.id, key);
  if (!tag) return { title: 'Not found', robots: { index: false, follow: false } };
  const pages = await pagesForTag(db, space.group.id, tag.id);
  const indexable = !verseHidden() && pages.length > 0;
  return {
    title: `${tag.label} · ${space.group.fandom_name}`,
    alternates: { canonical: `/verse/${slug}/tag/${key}` },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string; key: string }> }): Promise<React.ReactElement> {
  const { slug, key } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const db = createPublicReadClient();
  const tag = await getTag(db, space.group.id, key);
  if (!tag) notFound();

  const [pages, related] = await Promise.all([
    pagesForTag(db, space.group.id, tag.id),
    relatedTags(db, space.group.id, tag.id),
  ]);

  return (
    <div className="verse-page verse-scope vtag">
      <nav className="vdoc-crumb" aria-label="Breadcrumb">
        <Link href={`/verse/${slug}`}>{space.group.fandom_name}</Link><span className="sep">/</span>
        <span>Tags</span><span className="sep">/</span>{tag.label}
      </nav>
      <h1 className="vtag-title">{tag.label}</h1>
      {tag.description ? <p className="vtag-desc">{tag.description}</p> : null}
      <div className="vtag-meta">
        <span className="vdoc-chip data">auto index</span>
        <span className="vdoc-chip">{pages.length} page{pages.length === 1 ? '' : 's'}</span>
        <span className="vdoc-chip">{tag.kind === 'auto' ? 'auto tag' : 'controlled tag'}</span>
      </div>

      {pages.length > 0 ? (
        <div className="vtag-grid">
          {pages.map((p) => (
            <Link key={p.slug} className="vtag-card" href={`/verse/${slug}/${p.slug}`}>
              <i aria-hidden="true" />
              <span><b>{p.title}</b><span className="k">{p.entity_kind ?? p.type}</span></span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="vtag-empty">No pages carry this tag yet.</p>
      )}

      {related.length > 0 ? (
        <div className="vtag-related">
          <span className="vtag-relh">Related tags</span>
          {related.map((r) => <Link key={r.key} className="vdoc-chip" href={`/verse/${slug}/tag/${r.key}`}>{r.label}</Link>)}
        </div>
      ) : null}
    </div>
  );
}
