import { notFound, permanentRedirect } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { getPublishedPage, resolvePageAlias, resolveWikiSlug, getPageBody, pageAttribution, listPublishedPages, whatLinksHere, pageAncestors, SYSTEM_AUTHOR_DISPLAY } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { WikiInfobox, WikiBody, TrustFooter, RelatedExits, FanWrittenBadge } from '@/components/verse/pages/wiki-leaf';
import { LinkPreviews } from '@/components/verse/pages/link-previews';
import { RoleAffordance } from '@/components/verse/roles/role-affordance';
import Link from 'next/link';
import { createPublicReadClient } from '@/lib/supabase/server';
import { wikiArticleLd, breadcrumbLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { Metadata } from 'next';

export const revalidate = 3600;

// V-PAGES step 3 - the wiki leaf. Resolution order is REQUIREMENT 1 (logged at
// step 1): live slug first, alias 301 second, 404 last (resolveWikiSlug is the
// unit-proven order). RLS + explicit filters keep drafts unreachable here.

async function resolve(spaceSlug: string, pageSlug: string) {
  const space = await getSpace(spaceSlug);
  if (!space) return null;
  const [live, aliasTo] = await Promise.all([
    getPublishedPage(space.group.id, pageSlug),
    resolvePageAlias(space.group.id, pageSlug),
  ]);
  return { space, resolution: resolveWikiSlug(live, aliasTo) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const r = await resolve(slug, pageSlug);
  if (!r || r.resolution.kind !== 'page') return { title: 'Wiki' };
  const page = r.resolution.page;
  const def = getKind(KPOP_PAGE_REGISTRY, page.kind);
  const title = `${page.title} · ${r.space.group.name} Verse`;
  const description = `${def?.label ?? 'Page'} in the ${r.space.group.fandom_name} home on KpopVerse. Fan-built and sourced.`;
  return {
    title: { absolute: title },
    description,
    // Thin-page protection: stubs stay out of the index (and out of the sitemap).
    ...(page.is_stub ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `https://kpopquiz.org/verse/${r.space.group.slug}/wiki/${page.slug}` },
    openGraph: { title, description, url: `https://kpopquiz.org/verse/${r.space.group.slug}/wiki/${page.slug}`, type: 'article', siteName: 'KpopVerse', images: [{ url: `/api/og/verse/${r.space.group.slug}`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function WikiLeafPage({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<React.ReactElement> {
  const { slug, pageSlug } = await params;
  const r = await resolve(slug, pageSlug);
  if (!r) notFound();
  if (r.resolution.kind === 'redirect') permanentRedirect(`/verse/${slug}/wiki/${r.resolution.to}`);
  if (r.resolution.kind === 'missing') notFound();
  const { space } = r;
  const page = r.resolution.page;
  const def = getKind(KPOP_PAGE_REGISTRY, page.kind);

  const [body, attribution, siblings, links, ancestors] = await Promise.all([
    getPageBody(page.id),
    pageAttribution(page.id),
    listPublishedPages(space.group.id),
    whatLinksHere(space.group.id, page.id),
    pageAncestors(page),
  ]);

  // Starter display name: system-account content is credited as the platform
  // (owner directive: never the private dev identity); everyone else resolves
  // through profiles, falling back to "a fan" honestly.
  let starterName = SYSTEM_AUTHOR_DISPLAY[page.created_by];
  if (!starterName) {
    const db = createPublicReadClient();
    const { data: prof } = await db.from('profiles').select('username, display_name').eq('id', page.created_by).maybeSingle();
    starterName = (prof as { username?: string; display_name?: string | null } | null)?.display_name
      ?? (prof as { username?: string } | null)?.username ?? 'a fan';
  }

  // Related exits: same-kind siblings first, then what-links-here pages; 6-8 max.
  const related = [
    ...siblings.filter((p) => p.id !== page.id && p.kind === page.kind).slice(0, 4)
      .map((p) => ({ href: `/verse/${space.group.slug}/wiki/${p.slug}`, label: p.title, sub: def?.label })),
    ...links.filter((l) => l.page).slice(0, 4)
      .map((l) => ({ href: `/verse/${space.group.slug}/wiki/${l.page!.slug}`, label: l.page!.title, sub: 'Links here' })),
  ];

  const crumbs = [
    { label: 'Verse', href: '/verse' },
    { label: space.group.fandom_name, href: `/verse/${space.group.slug}` },
    { label: 'Wiki', href: `/verse/${space.group.slug}/wiki` },
    ...ancestors.map((a) => ({ label: a.title, href: `/verse/${space.group.slug}/wiki/${a.slug}` })),
    { label: page.title },
  ];

  return (
    <div>
      {jsonLdScript(wikiArticleLd({
        title: page.title, groupSlug: space.group.slug, pageSlug: page.slug, groupName: space.group.name,
        publishedAt: page.published_at, updatedAt: page.updated_at, maintainers: attribution.maintainers, fanWritten: !!def?.fanWritten,
      }))}
      {jsonLdScript(breadcrumbLd(crumbs.filter((c) => c.href).map((c) => ({ name: c.label, url: `https://kpopquiz.org${c.href}` }))))}
      {/* Rabbit-hole enhancement: hover previews + red-link handling (create
          affordance for contributors, plain text for visitors). */}
      <LinkPreviews groupSlug={space.group.slug} />

      <div className="mb-6"><Breadcrumbs items={crumbs} /></div>

      <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3 lg:gap-x-16">
        <div className="lg:col-span-2">
          <header className="v-module">
            <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>{def?.label ?? page.kind}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>{page.title}</h1>
              {def?.fanWritten ? <FanWrittenBadge /> : null}
            </div>
            {/* V-ROLES step 2: the shared affordance truth. Contributors get Edit;
                everyone else gets the working path (discussion) + the explanation. */}
            <div className="mt-3">
              <RoleAffordance
                groupSlug={space.group.slug}
                owner={page.created_by}
                compact
                edit={
                  <Link href={`/verse/${space.group.slug}/wiki/${page.slug}/edit`} className="inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
                    Edit this page
                  </Link>
                }
                suggest={
                  <Link href={`/verse/${space.group.slug}/community`} className="inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-semibold text-secondary no-underline" style={{ borderColor: 'var(--verse-line)' }}>
                    Suggest changes in the discussion
                  </Link>
                }
              />
            </div>
          </header>

          {body ? (
            <div className="v-module" style={{ maxWidth: 'var(--v-measure)' }}>
              <WikiBody doc={body} />
            </div>
          ) : (
            <p className="v-module text-sm text-tertiary">This page has no published text yet.</p>
          )}

          <RelatedExits groupSlug={space.group.slug} items={related} />
          <TrustFooter page={page} groupSlug={space.group.slug} maintainers={attribution.maintainers} starterName={starterName} />
        </div>

        <aside className="lg:col-span-1">
          <WikiInfobox page={page} />
        </aside>
      </div>
    </div>
  );
}
