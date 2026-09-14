import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getAllGroups } from '@/lib/db/queries/groups';
import { createPublicReadClient } from '@/lib/supabase/server';
import { safeFetch } from '@/lib/error-handling';
import { SUBJECT_KIND_LABEL, parseKind } from '@/lib/tier-list/subject';
import { DEFAULT_TIERS } from '@/lib/tier-list/defaults';
import { getPublicListsForSubject, getPublicSubjects, getFandomConsensus } from '@/lib/tier-list/db';

import type { Metadata } from 'next';
import type { TierListItem } from '@/lib/tier-list/types';

// The community page for one subject (group + what-to-rank): every PUBLIC list of
// that subject + "where the fandom agrees". Indexable static/ISR, self-canonical,
// in the sitemap; an unknown subject or one with no public lists returns 404.
export const revalidate = 3600;

const CANON = DEFAULT_TIERS.map((t) => t.label);
const COLOR: Record<string, string> = Object.fromEntries(DEFAULT_TIERS.map((t) => [t.label, t.color]));

// Cookie-free group-by-slug (getGroupBySlug uses the cookie client, which is a
// dynamic API and would break this static/ISR route with DYNAMIC_SERVER_USAGE).
async function groupBySlug(slug: string): Promise<{ id: number; slug: string; name: string } | null> {
  const groups = await safeFetch(getAllGroups(), [], '[tier-list] subject group');
  return (groups as Array<{ id: number; slug: string; name: string }>).find((g) => g.slug === slug) ?? null;
}

export async function generateStaticParams(): Promise<{ group: string; kind: string }[]> {
  try {
    const [subjects, groups] = await Promise.all([getPublicSubjects(), getAllGroups()]);
    const idToSlug = new Map((groups as Array<{ id: number; slug: string }>).map((g) => [g.id, g.slug]));
    const out: { group: string; kind: string }[] = [];
    for (const s of subjects) {
      const g = idToSlug.get(s.groupId);
      if (g && s.kind !== 'blank') out.push({ group: g, kind: s.kind });
    }
    return out;
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ group: string; kind: string }> }): Promise<Metadata> {
  const { group: groupSlug, kind: kindRaw } = await params;
  const kind = parseKind(kindRaw);
  const group = kind !== 'blank' ? await groupBySlug(groupSlug) : null;
  if (!group) notFound();
  const label = `${group.name} ${SUBJECT_KIND_LABEL[kind]}`;
  const title = `${label} tier lists - the fandom's rankings`;
  const description = `Every public ${label} tier list in one place, plus where the fandom agrees. Compare rankings and make your own. No sign-up to play.`;
  return { title, description, alternates: { canonical: `/tier-list/subject/${group.slug}/${kind}` } };
}

function Face({ item, caption }: { item: TierListItem; caption?: string }) {
  const ini = (() => { const p = item.name.trim().split(/\s+/); return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || item.name.slice(0, 2).toUpperCase(); })();
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="tl-face tl-face-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.image_url ? <img src={item.image_url} alt="" referrerPolicy="no-referrer" /> : <span className="tl-ini">{ini}</span>}
        <span className="tl-nm">{item.name}</span>
      </div>
      {caption && <div className="tl-mut" style={{ marginTop: 4 }}>{caption}</div>}
    </div>
  );
}

export default async function SubjectPage({ params }: { params: Promise<{ group: string; kind: string }> }): Promise<React.ReactElement> {
  const { group: groupSlug, kind: kindRaw } = await params;
  const kind = parseKind(kindRaw);
  if (kind === 'blank') notFound();
  const group = await groupBySlug(groupSlug);
  if (!group) notFound();

  const lists = await safeFetch(getPublicListsForSubject(group.id, kind), [], '[tier-list] subject lists');
  if (lists.length === 0) notFound();

  const { consensus, items, listCount } = await safeFetch(
    getFandomConsensus(group.id, kind, CANON), { consensus: [], items: {}, listCount: 0 }, '[tier-list] subject consensus',
  );
  const showConsensus = listCount >= 2 && consensus.length > 0;

  // Group the consensus into tier rows for a board-style render.
  const labelsInUse = [...CANON, ...consensus.map((c) => c.tier).filter((l) => !CANON.includes(l))];
  const seenLabel = new Set<string>();
  const rows = labelsInUse.filter((l) => (seenLabel.has(l) ? false : (seenLabel.add(l), true)))
    .map((label) => ({ label, color: COLOR[label] ?? '#9E998F', items: consensus.filter((c) => c.tier === label) }))
    .filter((r) => r.items.length > 0);

  // Resolve creator names for the list cards.
  const creatorIds = [...new Set(lists.map((l) => l.creatorId).filter(Boolean))] as string[];
  const nameById = new Map<string, string>();
  if (creatorIds.length) {
    const { data } = await createPublicReadClient().from('profiles').select('id,username,display_name').in('id', creatorIds);
    for (const p of (data ?? []) as Array<{ id: string; username: string | null; display_name: string | null }>) nameById.set(p.id, p.display_name || p.username || 'a fan');
  }

  const label = `${group.name} ${SUBJECT_KIND_LABEL[kind]}`;

  return (
    <div className="tl tl-wrap">
      <div className="tl-mut" style={{ marginBottom: 10 }}>
        <Link href="/tier-list" className="tl-crumb">Tier Lists</Link> / <span style={{ color: 'var(--txt1)' }}>{group.name}</span>
      </div>
      <div className="tl-kick">{group.name} · community</div>
      <h1 className="tl-d1" style={{ fontSize: 38 }}>{label} tier lists</h1>
      <p className="tl-sub" style={{ marginBottom: 20 }}>{listCount.toLocaleString()} public {listCount === 1 ? 'list ranks' : 'lists rank'} this set. See where the fandom agrees, or make your own.</p>

      {showConsensus && (
        <div className="tl-card" style={{ padding: 20, marginBottom: 24 }} data-testid="tl-consensus">
          <div className="tl-h3">Where the fandom agrees</div>
          <p className="tl-mut" style={{ marginBottom: 14 }}>The consensus tier for each pick across {listCount.toLocaleString()} public lists.</p>
          <div className="tl-board">
            {rows.map((r) => (
              <div className="tl-tier" key={r.label}>
                <div className="tl-tlabel" style={{ background: r.color }}>{r.label}</div>
                <div className="tl-tstrip" style={{ gap: 14 }}>
                  {r.items.map((c) => {
                    const it = items[c.itemId];
                    return it ? <Face key={c.itemId} item={it} caption={`${Math.round(c.agreement * 100)}%`} /> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tl-betw" style={{ margin: '8px 0 12px' }}>
        <h2 className="tl-d2" style={{ margin: 0 }}>Community lists</h2>
        <Link href={`/tier-list/create?group=${group.slug}&kind=${kind}`} className="tl-btn grad">Make your own version</Link>
      </div>
      <div className="tl-g4" data-testid="tl-community-lists">
        {lists.map((l) => (
          <Link key={l.id} href={`/tier-list/l/${l.slug}`} className="tl-card" style={{ padding: 16, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="tl-h3" style={{ margin: 0, fontSize: 15 }}>{l.title}</span>
            <span className="tl-mut">by {l.creatorId ? (nameById.get(l.creatorId) ?? 'a fan') : 'a fan'} · {l.likes.toLocaleString()} likes</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
