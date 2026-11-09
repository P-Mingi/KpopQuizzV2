import { createHash } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { isShareCode, LINK_COOKIE, LINK_COOKIE_MAX_AGE } from '@/lib/creators/link-plays';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest, NextResponse } from 'next/server';

/** The answer of a share-link click: the link is unknown, or known with the slug of its quiz (null when the quiz is gone). */
export type ShareClick = { found: false } | { found: true; slug: string | null };

/**
 * Count one click on a creator share link (dev_share_clicks row, click counters) and read the quiz it points to.
 * One implementation for the short link /s/{code} (O1 audit 03 P1-2: it answers the one redirect itself) and for
 * /api/share/click/{code} (kept for links already in the wild). Hashes only: no IP or user agent is stored.
 */
export async function recordShareClick(request: NextRequest, shareCode: string): Promise<ShareClick> {
  const referrer = request.headers.get('referer') || '';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  // Hash IP + UA for uniqueness (privacy-safe)
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const uaHash = createHash('sha256').update(ua).digest('hex').slice(0, 16);

  const supabase = createServiceRoleClient();

  // Find the share link
  const { data: link } = await supabase
    .from('dev_share_links')
    .select('*')
    .eq('share_code', shareCode)
    .single();

  if (!link) return { found: false };

  // Check if this is a unique click
  const { data: existing } = await supabase
    .from('dev_share_clicks')
    .select('id')
    .eq('share_link_id', link.id)
    .eq('ip_hash', ipHash)
    .limit(1);

  const isUnique = !existing || existing.length === 0;

  // Record the click
  await supabase.from('dev_share_clicks').insert({
    share_link_id: link.id,
    referrer: referrer.slice(0, 255),
    ip_hash: ipHash,
    user_agent_hash: uaHash,
  });

  // Update counts
  const newClickCount = (link.click_count as number) + 1;
  const newUniqueCount = (link.unique_click_count as number) + (isUnique ? 1 : 0);

  await supabase
    .from('dev_share_links')
    .update({
      click_count: newClickCount,
      unique_click_count: newUniqueCount,
    })
    .eq('id', link.id);

  // Find the quiz slug for redirect
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('slug')
    .eq('id', link.quiz_id)
    .single();

  return { found: true, slug: quiz?.slug ?? null };
}

/**
 * V12 (G8 request R1, AU3-003): remember which creator link this visitor came through, so the play route can
 * count "plays from your link". Flag off: no cookie, the response is today's.
 */
export function withShareCookie(res: NextResponse, shareCode: string, slug: string | null): NextResponse {
  if (isUxV12() && slug && isShareCode(shareCode)) {
    res.cookies.set(LINK_COOKIE, shareCode, { maxAge: LINK_COOKIE_MAX_AGE, httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  }
  return res;
}
