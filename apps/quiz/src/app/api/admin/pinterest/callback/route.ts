import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const credentials = Buffer.from(
    `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`,
  ).toString('base64');

  const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.PINTEREST_REDIRECT_URI!,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return NextResponse.json(
      { error: 'Failed to get tokens', details: tokens },
      { status: 400 },
    );
  }

  const adminDb = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Remove any existing tokens (single-account model)
  await adminDb.from('pinterest_auth').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  await adminDb.from('pinterest_auth').insert({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_at: expiresAt,
    scope: tokens.scope,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
  return NextResponse.redirect(`${siteUrl}/admin/pinterest?auth=success`);
}
