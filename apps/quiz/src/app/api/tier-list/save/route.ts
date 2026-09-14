import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { setAnonCookie, readAnonCookie } from '@/lib/anon-claim';
import { resolveAnonId } from '@/lib/tier-list/engage';
import { slugify, makeUniqueSlug } from '@/lib/tier-list/slug';
import { sanitizeBoard, customAssetIds, publishGate } from '@/lib/tier-list/publish';
import { parseKind } from '@/lib/tier-list/subject';

import type { NextRequest } from 'next/server';
import type { Placements, Tier, Visibility } from '@/lib/tier-list/types';

export const runtime = 'nodejs';

// Save / publish a tier list (migration 146). A signed-in creator writes their own
// rows through the cookie client (creator RLS); a logged-out guest may save a
// PRIVATE or UNLISTED board via the service role with an anon_id (like plays), but
// a PUBLIC list requires a signed-in creator (146 constraint). Every board is
// sanitised (exactly-once, capped) before it is written, and a PUBLIC list may
// only use APPROVED custom assets. On success the slug page + indexes revalidate.

interface Body {
  slug?: string;
  title?: string;
  subjectGroupId?: number | null;
  subjectKind?: string;
  tiers?: Tier[];
  placements?: Placements;
  visibility?: Visibility;
  anonId?: string | null;
}

const VIS: Visibility[] = ['public', 'unlisted', 'private'];

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const visibility: Visibility = VIS.includes(body.visibility as Visibility) ? (body.visibility as Visibility) : 'private';
  const sanitized = sanitizeBoard({
    title: body.title ?? '', tiers: body.tiers ?? [], placements: body.placements ?? {}, visibility,
  });
  if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });
  const { title, tiers, placements } = sanitized.board;

  const subjectKind = parseKind(body.subjectKind);
  const subjectGroupId = typeof body.subjectGroupId === 'number' ? body.subjectGroupId : null;

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  const admin = createServiceRoleClient();

  // Moderation gate: a public list may only use approved custom assets.
  const refAssetIds = customAssetIds(placements);
  const assetStatuses: Record<string, 'pending' | 'approved' | 'rejected'> = {};
  if (refAssetIds.length > 0) {
    const { data } = await admin.from('tier_list_assets').select('id,status').in('id', refAssetIds);
    for (const a of (data ?? []) as { id: string; status: 'pending' | 'approved' | 'rejected' }[]) assetStatuses[a.id] = a.status;
  }
  const gate = publishGate({ visibility, userId: user?.id ?? null, referencedAssetIds: refAssetIds, assetStatuses });
  if (!gate.ok) return NextResponse.json({ error: gate.error, needsAuth: gate.status === 401 }, { status: gate.status });

  // Identity from the httpOnly cookie, not the request body: the cookie wins, the
  // body may only mint a first id when no cookie exists (never override it), so a
  // caller cannot assert someone else's anon id on the ownership check below.
  const { anonId, mintCookie } = resolveAnonId(readAnonCookie(req), body.anonId);

  // --- Update an existing list (owner only) ---
  if (body.slug) {
    const { data: existing } = await admin.from('tier_lists').select('id,creator_id,anon_id,slug').eq('slug', body.slug).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const owns = (user && existing.creator_id === user.id) || (!user && anonId && existing.anon_id === anonId && existing.creator_id === null);
    if (!owns) return NextResponse.json({ error: 'You do not own this list.' }, { status: 403 });
    const patch = { title, tiers, placements, visibility, subject_group_id: subjectGroupId, subject_kind: subjectKind, updated_at: new Date().toISOString() };
    const { error } = await admin.from('tier_lists').update(patch).eq('id', existing.id);
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
    revalidateFor(existing.slug);
    return NextResponse.json({ slug: existing.slug, url: viewUrl(req, existing.slug, visibility), visibility });
  }

  // --- Create a new list with a unique slug ---
  const base = slugify(title);
  const { data: taken } = await admin.from('tier_lists').select('slug').like('slug', `${base}%`).limit(200);
  const slug = makeUniqueSlug(title, new Set((taken ?? []).map((r: { slug: string }) => r.slug)));

  const row = {
    slug, title, tiers, placements, visibility,
    subject_group_id: subjectGroupId, subject_kind: subjectKind,
    creator_id: user?.id ?? null, anon_id: user ? null : anonId,
  };
  // Creator rows go through the cookie client (creator RLS); anon rows through the
  // service role (RLS grants no anon insert, exactly like plays).
  const writer = user ? supa : admin;
  const { error } = await writer.from('tier_lists').insert(row);
  if (error) {
    // Unique-slug race: retry once with a fresh suffix.
    if ((error as { code?: string }).code === '23505') {
      const retry = `${base.slice(0, 55)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error: e2 } = await writer.from('tier_lists').insert({ ...row, slug: retry });
      if (e2) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
      const res = NextResponse.json({ slug: retry, url: viewUrl(req, retry, visibility), visibility });
      if (!user && anonId && mintCookie) setAnonCookie(res, anonId);
      revalidateFor(retry);
      return res;
    }
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }

  const res = NextResponse.json({ slug, url: viewUrl(req, slug, visibility), visibility });
  if (!user && anonId && mintCookie) setAnonCookie(res, anonId);
  revalidateFor(slug);
  return res;
}

// The link handed back to the owner. A PRIVATE list is not readable on the public
// ISR page (RLS hides it there), so its owner link is the dynamic owner-view route;
// public and unlisted lists resolve on the public page.
function viewUrl(req: NextRequest, slug: string, visibility: Visibility): string {
  const path = visibility === 'private' ? `/tier-list/mine/${slug}` : `/tier-list/l/${slug}`;
  return `${req.nextUrl.origin}${path}`;
}

// Refresh the new/updated page render, the hub, and the sitemap immediately. The
// cached data reads (slugs, subject lists, consensus) carry a 300s revalidate, so
// a newly published list also surfaces in those within five minutes.
function revalidateFor(slug: string): void {
  revalidatePath(`/tier-list/l/${slug}`);
  revalidatePath('/tier-list');
  revalidatePath('/sitemap.xml');
}
