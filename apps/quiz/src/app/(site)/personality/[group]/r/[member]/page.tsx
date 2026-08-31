import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getPersonalityGroupBySlug } from '@/lib/personality/data';

import type { Metadata } from 'next';

// Workstream P: shareable result permalink. The member + match % live in the URL
// (/which-{group}-member-are-you/r/{member-slug}?p=87), so no per-run storage is
// needed. Renders that member's card + a "find out yours" CTA (the BuzzFeed loop).
export const revalidate = 3600;

function clampPct(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 88;
  return Math.max(55, Math.min(100, Math.round(n)));
}

function memberPhoto(url: string | null): string | undefined {
  return url ? encodeURI(url) : undefined;
}

interface Params { group: string; member: string }

async function resolve(slug: string, memberSlug: string) {
  const data = await getPersonalityGroupBySlug(slug);
  if (!data) return null;
  const profile = data.profiles.find((p) => p.member_slug === memberSlug);
  if (!profile) return null;
  return { group: data.group, profile };
}

export async function generateMetadata(
  { params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ p?: string }> },
): Promise<Metadata> {
  const { group: slug, member } = await params;
  const { p } = await searchParams;
  const r = await resolve(slug, member);
  if (!r) return { title: 'Personality quiz', robots: { index: false, follow: true } };
  const pct = clampPct(p);
  const canonical = `/which-${slug}-member-are-you/r/${member}`;
  const ogUrl = `/api/og/personality?group=${encodeURIComponent(r.group.name)}&member=${encodeURIComponent(r.profile.member_name)}&pct=${pct}&accent=${encodeURIComponent(r.group.display_color)}&photo=${encodeURIComponent(r.profile.photo_url ?? '')}`;
  return {
    title: `I got ${r.profile.member_name} | Which ${r.group.name} Member Are You?`,
    description: `Someone matched ${r.profile.member_name} at ${pct}%. Take the ${r.group.name} personality quiz and find out which member you are.`,
    alternates: { canonical },
    openGraph: {
      title: `I got ${r.profile.member_name} (${pct}% match)`,
      description: `Which ${r.group.name} member are you? Find out yours.`,
      url: canonical,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${r.profile.member_name} result card` }],
    },
    twitter: { card: 'summary_large_image', images: [ogUrl] },
  };
}

export default async function PersonalityPermalink(
  { params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ p?: string }> },
): Promise<React.ReactElement> {
  const { group: slug, member } = await params;
  const { p } = await searchParams;
  const r = await resolve(slug, member);
  if (!r) notFound();
  const pct = clampPct(p);
  const { group, profile: m } = r;
  const accent = group.display_color || '#E8457A';
  const onAccent = group.text_color || '#FFFFFF';

  return (
    <div className="pq" style={{ ['--pq-accent' as string]: accent, ['--pq-on' as string]: onAccent }}>
      <div className="pq-result">
        <p className="pq-eyebrow" style={{ textAlign: 'center', marginBottom: 10 }}>Which {group.name} member are you?</p>
        <div className="pq-card">
          <div className="pq-card-photo">
            {m.photo_url
              ? <img src={memberPhoto(m.photo_url)} alt={m.member_name} />
              : <span className="pq-face-empty" style={{ background: accent, width: '100%', height: '100%' }} />}
            <span className="pq-card-badge">{pct}% match</span>
          </div>
          <div className="pq-card-body">
            <p className="pq-card-kicker">They got</p>
            <p className="pq-card-name">{m.member_name}</p>
            <ul className="pq-traits">
              {m.trait_lines.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
        <div className="pq-cta">
          <Link href={`/which-${group.slug}-member-are-you`} className="pq-start" style={{ display: 'block', textAlign: 'center', lineHeight: '54px', textDecoration: 'none' }}>
            Find out which {group.name} member you are
          </Link>
        </div>
      </div>
    </div>
  );
}
