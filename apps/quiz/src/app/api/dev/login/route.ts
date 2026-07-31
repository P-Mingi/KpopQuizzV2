import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// DEV-ONLY local sign-in bypass for the owner's full-rights test account.
//
// SECURITY: this is a login bypass. It is hard-gated behind TWO conditions and returns
// 404 unless BOTH hold:
//   1. process.env.NODE_ENV !== 'production'  (never true in a production build)
//   2. process.env.DEV_LOGIN_ENABLED === 'true' (set only in gitignored .env.local)
// A production build serves 404 here even if the env flag were somehow set, because
// NODE_ENV is 'production'. NEVER set DEV_LOGIN_ENABLED in a deployed environment.
export const dynamic = 'force-dynamic';

function devLoginAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN_ENABLED === 'true';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!devLoginAllowed()) {
    return new NextResponse('Not found', { status: 404 });
  }

  // V-ROLES step 1 - ?as=contributor signs in the SECOND local test account
  // (contributor role, own XP) for two-account journey testing. Same double
  // gate as above; both emails are RFC-2606 non-deliverable and env-driven.
  // ?as=logout ends the session (for logged-out state testing).
  const who = req.nextUrl.searchParams.get('as');
  if (who === 'logout') {
    const supa = await createServerClient();
    await supa.auth.signOut();
    return NextResponse.redirect(new URL('/', req.url));
  }
  const email = who === 'contributor' ? process.env.DEV_LOGIN_CONTRIBUTOR_EMAIL : process.env.DEV_LOGIN_EMAIL;
  if (!email) return new NextResponse(who === 'contributor' ? 'DEV_LOGIN_CONTRIBUTOR_EMAIL is not set' : 'DEV_LOGIN_EMAIL is not set', { status: 500 });

  // Mint a one-time email OTP for the dev user with the service role (no email sent),
  // then verify it server-side to establish the session cookies via the SSR client.
  const svc = createServiceRoleClient();
  const { data, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return new NextResponse('Could not generate a dev session', { status: 500 });

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (verifyError) return new NextResponse(`Dev sign-in failed: ${verifyError.message}`, { status: 500 });

  return NextResponse.redirect(new URL('/', req.url));
}
