import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getPublishedPage, getPageBody } from '@/lib/verse/pages/data';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { plainTextExcerpt } from '@/lib/verse/render-content';

import type { NextRequest } from 'next/server';

// V-PAGES step 4 - hover-preview + red-link data, one endpoint, PUBLISHED data
// only (the public client's RLS is the belt; explicit filters the suspenders).
//   ?group={slug}&wiki={pageSlug}          -> one wiki page preview | {missing:true}
//   ?group={slug}&exists={a,b,c}           -> {missing: [slugs...]} batch red-link check
//   ?group={slug}&entity={albums|members}&e={slug} -> one entity preview
// Draft pages return exactly what nonexistent pages return: {missing:true}. A
// draft is indistinguishable from absence by design (requirement 2's spirit).

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const groupSlug = String(q.get('group') ?? '').slice(0, 60);
  if (!/^[a-z0-9-]+$/.test(groupSlug)) return NextResponse.json({ error: 'bad group' }, { status: 400 });
  const db = createPublicReadClient();
  const { data: g } = await db.from('groups').select('id, name, fandom_name').eq('slug', groupSlug).maybeSingle();
  if (!g) return NextResponse.json({ error: 'no group' }, { status: 404 });
  const group = g as { id: number; name: string; fandom_name: string };
  const headers = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

  const exists = q.get('exists');
  if (exists) {
    const slugs = [...new Set(exists.split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]+$/.test(s)))].slice(0, 40);
    if (!slugs.length) return NextResponse.json({ missing: [] }, { headers });
    const { data } = await db.from('verse_pages').select('slug').eq('group_id', group.id).eq('status', 'published').in('slug', slugs);
    const live = new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
    return NextResponse.json({ missing: slugs.filter((s) => !live.has(s)) }, { headers });
  }

  const wikiSlug = q.get('wiki');
  if (wikiSlug && /^[a-z0-9-]+$/.test(wikiSlug)) {
    const page = await getPublishedPage(group.id, wikiSlug);
    if (!page) return NextResponse.json({ missing: true }, { headers });
    const body = await getPageBody(page.id);
    const def = getKind(KPOP_PAGE_REGISTRY, page.kind);
    return NextResponse.json({
      title: page.title, kind: def?.label ?? page.kind, fanWritten: !!def?.fanWritten,
      excerpt: body ? plainTextExcerpt(body, 140) : '',
    }, { headers });
  }

  const entityKind = q.get('entity');
  const entitySlug = q.get('e');
  if (entityKind === 'albums' && entitySlug) {
    const { data } = await db.from('albums').select('title, release_date, type').eq('group_id', group.id).limit(400);
    const hit = ((data ?? []) as { title: string; release_date: string | null; type: string }[])
      .find((a) => a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === entitySlug);
    if (!hit) return NextResponse.json({ missing: true }, { headers });
    return NextResponse.json({ title: hit.title, kind: 'Album', excerpt: [hit.release_date?.slice(0, 4), hit.type].filter(Boolean).join(' · ') }, { headers });
  }
  if (entityKind === 'members' && entitySlug) {
    const { data } = await db.from('idols').select('name, positions').eq('group_id', group.id).eq('active', true).limit(60);
    const hit = ((data ?? []) as { name: string; positions: string[] | null }[])
      .find((i) => i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === entitySlug);
    if (!hit) return NextResponse.json({ missing: true }, { headers });
    return NextResponse.json({ title: hit.name, kind: `${group.name} member`, excerpt: (hit.positions ?? []).slice(0, 3).join(' · ') }, { headers });
  }

  return NextResponse.json({ error: 'bad query' }, { status: 400 });
}
