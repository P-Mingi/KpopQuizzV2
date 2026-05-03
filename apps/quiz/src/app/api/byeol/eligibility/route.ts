import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ is_eligible: true, reason: 'guest' });

  const contentType = req.nextUrl.searchParams.get('type');
  const contentId = req.nextUrl.searchParams.get('id');

  if (!contentType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('check_byeol_eligibility', {
    p_user_id: user.id,
    p_content_type: contentType,
    p_content_id: contentId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(result ?? { is_eligible: true });
}
