'use client';

import { useId, useRef, useState } from 'react';

import { PassportNotice } from '@/components/passport-ui/passport-notice';
import { Icon } from '@/components/ux-v1/icon';
import { Sheet } from '@/components/ux-v1/sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { emailRedirect, readTabVia, signInWithGoogle } from '@/lib/passport-ui/signin-client';
import { fmt } from '@/lib/passport-ui/fmt';
import { signInWords } from '@/lib/passport-ui/words';
import { SITE_ID } from '@/lib/site/registry';
import { setPendingAction } from '@/lib/ux-v1/a0/pending-action';

import type { SignInRequest } from '@/components/ux-v1/sign-in-sheet';
import type { SignInWords } from '@/lib/passport-ui/words';

// Run O1, lot (b), P1 (rule 18): the sign-in sheet of a world site (anime, hub). It says the site's words, offers Google and the
// email link only, and lands through /auth/confirm and /api/passport/after-signin. The shared sheet (ux-v1/sign-in-sheet) loads this
// file on the first open when the build is a world site; a kpop build never imports it, so the kpop client graph is the base one.

const WORLD: SignInWords | undefined = signInWords(SITE_ID);

// The Supabase browser client (~220 KB) is loaded on the click, not with the page.
async function supabase(): Promise<ReturnType<typeof import('@/lib/supabase/client').createBrowserClient>> {
  const { createBrowserClient } = await import('@/lib/supabase/client');
  return createBrowserClient();
}

type Pending = 'google' | 'email' | null;

export function WorldSignInSheet({ open, request, onClose, inline, words = WORLD, notice = <PassportNotice /> }: { open: boolean; request: SignInRequest; onClose: () => void; inline?: boolean; words?: SignInWords | undefined; notice?: React.ReactNode }): React.ReactElement | null {
  const toast = useUxToast();
  const uid = useId().replace(/:/g, '');
  const [pending, setPending] = useState<Pending>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  if (!words) return null;

  const returnTo = (): string => request.returnTo ?? `${window.location.pathname}${window.location.search}`;
  const remember = (): void => { if (request.action) setPendingAction(request.action.id, request.action.payload); };

  // Google by ID token, then the passport's after-sign-in step; the redirect flow is the fallback.
  const google = async (): Promise<void> => {
    setError(null);
    setPending('google');
    remember();
    const out = await signInWithGoogle(await supabase(), SITE_ID, returnTo(), { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, origin: window.location.origin, via: readTabVia() });
    if (out.kind === 'go') { window.location.assign(out.to); return; }
    if (out.kind === 'error') { setPending(null); setError(out.message); }
  };

  const magicLink = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setPending('email');
    remember();
    const redirectTo = emailRedirect(window.location.origin, words.emailLanding, returnTo());
    const { error: err } = await (await supabase()).auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setPending(null);
    if (err) { setError(err.message); return; }
    onClose();
    toast(fmt(words.sent, { email }));
  };

  const close = (): void => { setPending(null); setError(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={request.title ?? words.title} width={440} initialFocus={firstRef} describedBy={`ux-signin-p-${uid}`} inline={inline}>
      <p className="ux-sh-p" id={`ux-signin-p-${uid}`}>{request.sub ?? words.body}</p>
      <div className="ux-authbs">
        <button ref={firstRef} type="button" className="ux-authb" onClick={() => { void google(); }} disabled={pending !== null}>
          <span className="ux-authb-lg" aria-hidden="true" style={{ background: '#4285F4' }}>G</span>{words.google}
        </button>
      </div>
      <div className="ux-or">{words.emailDivider}</div>
      <form onSubmit={(e) => { void magicLink(e); }}>
        <label className="ux-sr" htmlFor={`ux-signin-email-${uid}`}>{words.emailLabel}</label>
        <input
          className="ux-inp"
          id={`ux-signin-email-${uid}`}
          type="email"
          autoComplete="email"
          placeholder={words.emailPlaceholder}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="ux-btn ux-btn-ghost ux-btn-lg ux-btn-block" style={{ marginTop: 10 }} type="submit" disabled={pending !== null}>
          <Icon name="mail" />{pending === 'email' ? words.sending : words.emailCta}
        </button>
      </form>
      {error ? <p className="ux-err" role="alert">{error}</p> : null}
      <p className="ux-help">{words.network}</p>
      <p className="ux-help">{words.privacy}</p>
      {notice}
    </Sheet>
  );
}
