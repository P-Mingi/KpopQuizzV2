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
  // V-MODES step 5 - role personas for the matrix: ?as=member|contributor|curator
  // all use the SECOND test account; member/curator additionally set that
  // account's space_members role for ?group=<slug> before signing in (dev-only
  // route, double-gated above; restore with ?as=contributor&group=<slug>).
  const secondAccount = who === 'contributor' || who === 'member' || who === 'curator';
  const email = secondAccount ? process.env.DEV_LOGIN_CONTRIBUTOR_EMAIL : process.env.DEV_LOGIN_EMAIL;
  if (!email) return new NextResponse(secondAccount ? 'DEV_LOGIN_CONTRIBUTOR_EMAIL is not set' : 'DEV_LOGIN_EMAIL is not set', { status: 500 });

  // Mint a one-time email OTP for the dev user with the service role (no email sent),
  // then verify it server-side to establish the session cookies via the SSR client.
  const svc = createServiceRoleClient();
  const { data, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return new NextResponse('Could not generate a dev session', { status: 500 });

  const groupSlug = req.nextUrl.searchParams.get('group');
  const userId = data?.user?.id;
  if (secondAccount && groupSlug && userId) {
    const { data: g } = await svc.from('groups').select('id').eq('slug', groupSlug).maybeSingle();
    const gid = (g as { id: number } | null)?.id;
    if (gid) await svc.from('space_members').update({ role: who }).eq('group_id', gid).eq('user_id', userId);
  }

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (verifyError) return new NextResponse(`Dev sign-in failed: ${verifyError.message}`, { status: 500 });

  return NextResponse.redirect(new URL('/', req.url));
}
