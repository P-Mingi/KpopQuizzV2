import { notFound } from 'next/navigation';
import Link from 'next/link';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { SUBJECT_KIND_LABEL } from '@/lib/tier-list/subject';
import {
  getListBySlug, resolveItems, getCreatorByline, getFandomConsensus,
  encodeStoredForOg, encodeStoredForRemix, type StoredList,
} from '@/lib/tier-list/db';
import { PublicEngage } from '@/components/tier-list/public-engage';
import { TierBoardView } from '@/components/tier-list/tier-board-view';

import type { Metadata } from 'next';

// A published tier list, at /tier-list/l/<slug>. Indexable static/ISR (mirrors the
// published quiz page): generateStaticParams over PUBLIC slugs, notFound() in
// generateMetadata for unknown/private slugs. On an ISR route that notFound() is a
// CACHEABLE 200 soft-404 (the accepted site-wide posture, L-219/L-220), not a hard
// 404. Self-canonical.
// UNLISTED lists render but are noindex and out of the sitemap. The ranking uses
// real photos; the fandom-agrees strip and the remix/make-your-own doors close the
// view -> make -> share loop.
export const revalidate = 3600;
const TOP_PRERENDER = 500;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const db = createPublicReadClient();
    const timeout = new Promise<{ slug: string }[]>((res) => setTimeout(() => res([]), 10_000));
    const query = (async () => {
      const { data } = await db.from('tier_lists').select('slug').eq('visibility', 'public').order('created_at', { ascending: false }).limit(TOP_PRERENDER);
      return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }));
    })();
    return await Promise.race([query, timeout]);
  } catch { return []; }
}

async function groupById(id: number | null): Promise<{ slug: string; name: string } | null> {
  if (id == null) return null;
  const groups = await safeFetch(getAllGroups(), [], '[tier-list] l groups');
  const g = (groups as Array<{ id: number; slug: string; name: string }>).find((x) => x.id === id);
  return g ? { slug: g.slug, name: g.name } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const list = await safeFetch(getListBySlug(slug), null, '[tier-list] l meta');
  if (!list) notFound();
  const group = await groupById(list.subjectGroupId);
  const subjectLabel = group ? `${group.name} ${SUBJECT_KIND_LABEL[list.subjectKind]}` : 'K-pop';
  const title = `${list.title} - a ${subjectLabel} tier list`;
  const description = `See how this ${subjectLabel} tier list ranks the set, compare it with where the fandom agrees, and make your own version. No sign-up to play.`;
  const ogD = await ogParam(list);
  return {
    title,
    description,
    alternates: { canonical: `/tier-list/l/${slug}` },
    robots: list.visibility === 'unlisted' ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `/tier-list/l/${slug}`, images: ogD ? [{ url: `/api/og/tier-list?d=${ogD}`, width: 1080, height: 1350 }] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: ogD ? [`/api/og/tier-list?d=${ogD}`] : undefined },
  };
}

async function ogParam(list: StoredList): Promise<string | null> {
  const itemMap = await resolveItems(list.subjectGroupId, list.subjectKind, [list.placements]);
  try { return encodeStoredForOg(list, itemMap); } catch { return null; }
}

export default async function PublicListPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const list = await safeFetch(getListBySlug(slug), null, '[tier-list] l page');
  if (!list) notFound();

  const itemMap = await resolveItems(list.subjectGroupId, list.subjectKind, [list.placements]);
  const byId = itemMap;
  const group = await groupById(list.subjectGroupId);
  const byline = await getCreatorByline(list.creatorId);
  const tierOrder = list.tiers.map((t) => t.label);

  // Where the fandom agrees (only for a subject with more than one public list).
  const consensus = group && list.subjectKind !== 'blank'
    ? await safeFetch(getFandomConsensus(list.subjectGroupId!, list.subjectKind, tierOrder), { consensus: [], items: {}, listCount: 0 }, '[tier-list] l consensus')
    : { consensus: [], items: {}, listCount: 0 };
  const showConsensus = consensus.listCount >= 2 && consensus.consensus.length > 0;

  const remixD = encodeStoredForRemix(list, itemMap);
  const subjectHref = group ? `/tier-list/subject/${group.slug}/${list.subjectKind}` : null;
  const makeHref = group ? `/tier-list/create?group=${group.slug}&kind=${list.subjectKind}` : '/tier-list/create';

  return (
    <div className="tl tl-wrap">
      <div className="tl-mut" style={{ marginBottom: 10 }}>
        <Link href="/tier-list" className="tl-crumb">Tier Lists</Link>
        {group && <> / <Link href={subjectHref!} className="tl-crumb">{group.name}</Link></>}
        {' / '}<span style={{ color: 'var(--txt1)' }}>{list.title}</span>
      </div>

      <div className="tl-betw" style={{ alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
        <div>
          {group && <div className="tl-kick">{group.name} · tier list</div>}
          <h1 className="tl-d1" style={{ fontSize: 36, margin: '6px 0 6px' }}>{list.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {byline?.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={byline.avatarUrl} alt="" width={26} height={26} style={{ borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              : <span className="tl-grouplogo" style={{ width: 26, height: 26, background: 'var(--surface-alt)', color: 'var(--txt3)', fontSize: 10 }}>{(byline?.name ?? 'Fan').slice(0, 2)}</span>}
            <span className="tl-mut">by {byline?.name ?? 'a fan'} · {list.views.toLocaleString()} views · {list.likes.toLocaleString()} likes</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PublicEngage slug={list.slug} initialLikes={list.likes} />
          <Link href={makeHref} className="tl-btn grad">Make your own version</Link>
        </div>
      </div>

      <div className="tl-public-grid">
        {/* The ranking */}
        <TierBoardView list={list} byId={byId} />

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {showConsensus && (
            <div className="tl-card" style={{ padding: 20 }} data-testid="tl-consensus">
              <div className="tl-h3">Where the fandom agrees</div>
              <p className="tl-mut" style={{ marginBottom: 12 }}>from {consensus.listCount.toLocaleString()} public lists that ranked this set</p>
              {consensus.consensus.slice(0, 8).map((c) => {
                const it = consensus.items[c.itemId];
                if (!it) return null;
                const tierColor = list.tiers.find((t) => t.label === c.tier)?.color ?? '#9E998F';
                const pct = Math.round(c.agreement * 100);
                return (
                  <div key={c.itemId} style={{ marginBottom: 10 }}>
                    <div className="tl-betw" style={{ marginBottom: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="tl-badge" style={{ background: tierColor }}>{c.tier}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</span>
                      </span>
                      <span className="tl-mut">{pct}% agree</span>
                    </div>
                    <div className="tl-bar"><span style={{ width: `${pct}%`, background: tierColor }} /></div>
                  </div>
                );
              })}
              {subjectHref && <Link href={subjectHref} className="tl-btn out sm" style={{ marginTop: 6 }}>See all {group?.name} lists</Link>}
            </div>
          )}

          <div className="tl-card" style={{ padding: 20 }}>
            <div className="tl-h3">Remix this</div>
            <p className="tl-mut" style={{ marginBottom: 12 }}>Start from this exact set and drag your own way.</p>
            <Link href={`/tier-list/new?d=${remixD}`} className="tl-btn pri" style={{ width: '100%', justifyContent: 'center' }} data-testid="tl-remix">Remix this list</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
