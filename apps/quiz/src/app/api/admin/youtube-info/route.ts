import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { parseYouTubeTitle } from '@/lib/youtube';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const videoId = request.nextUrl.searchParams.get('id');
  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const data = await res.json();
    const parsed = parseYouTubeTitle(data.title);

    return NextResponse.json({
      raw_title: data.title,
      title: parsed.title,
      artist: parsed.artist,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
