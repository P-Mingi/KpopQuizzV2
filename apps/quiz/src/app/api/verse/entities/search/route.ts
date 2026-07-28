import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';
import { idolSlug, albumSlug } from '@/lib/verse/slug';

import type { NextRequest } from 'next/server';

// W3.3 - entity search powering the @-mention picker. Returns idols / albums /
// groups matching the query with their canonical Verse URL. Public read.
export const dynamic = 'force-dynamic';

export interface EntityHit {
  type: 'idol' | 'album' | 'group';
  label: string;
  sub: string;
  href: string;
  photo: string | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 1) return NextResponse.json({ results: [] });
  const db = createPublicReadClient();
  const like = `%${q}%`;

  const [{ data: groups }, { data: idols }, { data: albums }] = await Promise.all([
    db.from('groups').select('name, slug').ilike('name', like).limit(4),
    db.from('idols').select('name, photo_url, groups(name, slug)').eq('active', true).ilike('name', like).limit(6),
    db.from('albums').select('title, groups(name, slug)').ilike('title', like).limit(4),
  ]);

  const gslug = (g: unknown): { name: string; slug: string } | null => {
    const v = Array.isArray(g) ? g[0] : g;
    return v && typeof v === 'object' && 'slug' in v ? (v as { name: string; slug: string }) : null;
  };

  const results: EntityHit[] = [];
  for (const g of (groups ?? []) as { name: string; slug: string }[]) {
    results.push({ type: 'group', label: g.name, sub: 'Group', href: `/verse/${g.slug}`, photo: null });
  }
  for (const i of (idols ?? []) as { name: string; photo_url: string | null; groups: unknown }[]) {
    const g = gslug(i.groups); if (!g) continue;
    results.push({ type: 'idol', label: i.name, sub: g.name, href: `/verse/${g.slug}/members/${idolSlug(i.name)}`, photo: i.photo_url });
  }
  for (const a of (albums ?? []) as { title: string; groups: unknown }[]) {
    const g = gslug(a.groups); if (!g) continue;
    results.push({ type: 'album', label: a.title, sub: `${g.name} album`, href: `/verse/${g.slug}/albums/${albumSlug(a.title)}`, photo: null });
  }
  return NextResponse.json({ results: results.slice(0, 10) });
}
