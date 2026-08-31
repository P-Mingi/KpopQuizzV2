import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnTo = searchParams.get('returnTo') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if profile exists
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, banned_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    // No profile yet - send to onboarding
    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(onboardingUrl);
  }

  // Check if user is banned
  if (profile.banned_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/banned', request.url));
  }

  // Profile exists - redirect to intended destination
  return NextResponse.redirect(new URL(returnTo, request.url));
}
