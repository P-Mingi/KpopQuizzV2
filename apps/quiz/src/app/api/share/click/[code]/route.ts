import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { isShareCode, LINK_COOKIE, LINK_COOKIE_MAX_AGE } from '@/lib/creators/link-plays';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code: shareCode } = await params;
  const referrer = request.headers.get('referer') || '';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

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

  if (!link) {
    return NextResponse.redirect(`${siteUrl}/`, { status: 302 });
  }

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

  const redirectUrl = quiz?.slug
    ? `${siteUrl}/q/${quiz.slug}`
    : `${siteUrl}/`;

  const res = NextResponse.redirect(redirectUrl, { status: 302 });
  // V12 (G8 request R1, AU3-003): remember which creator link this visitor came
  // through, so the play route can count "plays from your link". Flag off: no
  // cookie, the response is today's.
  if (isUxV12() && quiz?.slug && isShareCode(shareCode)) {
    res.cookies.set(LINK_COOKIE, shareCode, { maxAge: LINK_COOKIE_MAX_AGE, httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  }
  return res;
}
