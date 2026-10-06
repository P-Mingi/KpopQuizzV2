import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { classifyJpeg } from '@/lib/moderation/nsfw';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { COMMUNITY_PHOTO_BUCKET, COMMUNITY_PHOTO_DIR } from '@/lib/ux-v1/p8/community-write';
import { isUxV12 } from '@/lib/ux-v12';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/photo (body: the JPEG bytes, Content-Type image/jpeg): the photo of a
// community thread or blog (owner, 2026-10-06). The editor shrinks the picture and turns it
// into a JPEG in the browser (which also drops its EXIF data) before sending it.
// Order: v12 on, signed in, size, rate (20 an hour), decode, NSFW check (lib/moderation/nsfw),
// and only then the upload to verse-space-assets/community/<user>/<uuid>.jpg. A refused photo
// is never stored; the thread and blog routes accept only a path stored here for the same
// account (community-write.ts ownPhotoPath), so no post can carry an unchecked picture.
// GET ?probe=1 times the model on a tiny built-in image (no write), on private builds only.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const PER_HOUR = 20;

/** A test-only verdict for the e2e (never a real NSFW picture): honoured only outside a
 *  production build, i.e. by `next dev`. */
function simulated(req: NextRequest): 'nsfw' | 'safe' | null {
  if (process.env.NODE_ENV === 'production') return null;
  const v = req.headers.get('x-nsfw-simulate');
  return v === 'nsfw' || v === 'safe' ? v : null;
}

async function underPhotoCap(userId: string): Promise<boolean> {
  const svc = createServiceRoleClient();
  const { data, error } = await svc.storage.from(COMMUNITY_PHOTO_BUCKET).list(`${COMMUNITY_PHOTO_DIR}/${userId}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return true; // an empty folder can answer an error: never block on the counter itself
  const since = Date.now() - 3600_000;
  return (data ?? []).filter((f) => f.created_at && Date.parse(f.created_at) >= since).length < PER_HOUR;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const t0 = Date.now();
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('image/jpeg')) return NextResponse.json({ error: 'bad_image' }, { status: 415 });
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  if (bytes.length < 200 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return NextResponse.json({ error: 'bad_image' }, { status: 415 });
  if (!(await underPhotoCap(user.id))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let verdict: { nsfw: boolean; ms: Record<string, number> };
  try {
    const r = await classifyJpeg(bytes);
    verdict = { nsfw: r.nsfw, ms: r.ms };
    const sim = simulated(req);
    if (sim) verdict = { ...verdict, nsfw: sim === 'nsfw' };
    if (verdict.nsfw) console.warn('[p8/photo] refused', JSON.stringify({ user: user.id, scores: r.scores, simulated: sim }));
  } catch (err) {
    if (err instanceof Error && err.message === 'bad_image') return NextResponse.json({ error: 'bad_image' }, { status: 415 });
    console.error('[p8/photo] check failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'check_failed' }, { status: 503 });
  }
  if (verdict.nsfw) return NextResponse.json({ error: 'nsfw_image' }, { status: 422 });

  const path = `${COMMUNITY_PHOTO_DIR}/${user.id}/${randomUUID()}.jpg`;
  const { error } = await createServiceRoleClient().storage.from(COMMUNITY_PHOTO_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (error) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, assetPath: path, url: spaceAssetUrl(path), ms: { ...verdict.ms, total: Date.now() - t0 } });
}

/** Private builds bake their own address into NEXT_PUBLIC_SITE_URL; the public build has kpopquiz.org. */
function privateBuild(): boolean {
  try {
    return !/(^|\.)kpopquiz\.org$/.test(new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kpopquiz.org').hostname);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12() || !privateBuild() || new URL(req.url).searchParams.get('probe') !== '1') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // A 64 x 64 grey JPEG made here: enough to run the model end to end, nothing stored.
  const jpeg = (await import('jpeg-js')).default;
  const w = 64;
  const rgba = new Uint8Array(w * w * 4).fill(128);
  const bytes = jpeg.encode({ data: rgba, width: w, height: w }, 80).data;
  const t0 = Date.now();
  const r = await classifyJpeg(new Uint8Array(bytes));
  return NextResponse.json({ ok: true, nsfw: r.nsfw, ms: { ...r.ms, total: Date.now() - t0 } });
}
