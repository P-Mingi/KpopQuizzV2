import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { awardByeol } from '@/lib/byeol';

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

  // Check if reward threshold reached (3 unique clicks)
  if (newUniqueCount >= 3 && !link.reward_awarded) {
    let rewardAmount = 30; // base share reward

    const referrerDomain = referrer.toLowerCase();
    if (referrerDomain.includes('reddit.com') || referrerDomain.includes('redd.it')) {
      rewardAmount = 60;
    } else if (referrerDomain.includes('t.co') || referrerDomain.includes('twitter.com') || referrerDomain.includes('x.com')) {
      rewardAmount = 40;
    }

    await awardByeol(
      link.user_id as string,
      rewardAmount,
      `share_${link.platform}`,
      link.quiz_id as string,
    );

    await supabase
      .from('dev_share_links')
      .update({
        reward_awarded: true,
        reward_amount: rewardAmount,
        reward_awarded_at: new Date().toISOString(),
      })
      .eq('id', link.id);
  }

  // Find the quiz slug for redirect
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('slug')
    .eq('id', link.quiz_id)
    .single();

  const redirectUrl = quiz?.slug
    ? `${siteUrl}/q/${quiz.slug}`
    : `${siteUrl}/`;

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
