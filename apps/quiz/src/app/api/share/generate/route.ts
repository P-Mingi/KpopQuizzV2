import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

function generateShareCode(): string {
  return randomBytes(6).toString('base64url').slice(0, 10);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { quizId, platform } = body as Record<string, unknown>;

  if (typeof quizId !== 'string' || typeof platform !== 'string') {
    return NextResponse.json({ error: 'quizId and platform are required' }, { status: 400 });
  }

  if (!['reddit', 'twitter', 'link'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check cooldown: one share reward per quiz per platform per 24h
  const { data: recent } = await supabase
    .from('dev_share_links')
    .select('id, share_code')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .eq('platform', platform)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json({ shareCode: recent[0].share_code, alreadyExists: true });
  }

  const shareCode = generateShareCode();

  const { error } = await supabase.from('dev_share_links').insert({
    user_id: user.id,
    quiz_id: quizId,
    share_code: shareCode,
    platform,
  });

  if (error) {
    console.error('Failed to create share link:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }

  return NextResponse.json({ shareCode });
}
