'use client';

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';

import { setPendingAction } from '@/lib/ux-v1/a0/pending-action';
import { emailRedirect, readTabVia, signInWithGoogle } from '@/lib/passport-ui/signin-client';
import { fmt } from '@/lib/passport-ui/fmt';
import { signInWords } from '@/lib/passport-ui/words';
import { SITE_ID } from '@/lib/site/registry';

import type { SignInWords } from '@/lib/passport-ui/words';

// The Supabase browser client (~220 KB) is loaded on the click, not with the page.
async function supabase(): Promise<ReturnType<typeof import('@/lib/supabase/client').createBrowserClient>> {
  const { createBrowserClient } = await import('@/lib/supabase/client');
  return createBrowserClient();
}

import { Icon } from './icon';
import { Sheet } from './sheet';
import { useUxToast } from './toast';

export interface SignInRequest {
  /** Title from context: "Save your 7/8", "Sign in to publish", "Sign in to reply". */
  title?: string;
  sub?: string;
  /** The action to continue after sign-in (16.6). Stored before leaving; the page
   *  resumes it with takePendingAction(id) from lib/ux-v1/a0/pending-action. */
  action?: { id: string; payload?: unknown };
  /** Where /auth/callback sends the fan back (default: this page). */
  returnTo?: string;
}

const DEFAULT_TITLE = 'Sign in to KpopQuiz';
const DEFAULT_SUB = 'Keep your scores, streak and badges. No password needed.';

// Run O1, lot (b), P1 (rule 18): on anime and hub the same sheet says the site's words, offers Google and the email link
// only, and lands through /auth/confirm and /api/passport/after-signin. On kpop this is undefined and nothing below changes.
const WORLD: SignInWords | undefined = signInWords(SITE_ID);

const Ctx = createContext<(req?: SignInRequest) => void>(() => {});

/** Opens the shared sign-in sheet. Guests only; the page decides when to ask. */
export function useSignIn(): (req?: SignInRequest) => void { return useContext(Ctx); }

/** Mounted once by the shell (UxProviders). */
export function SignInProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [req, setReq] = useState<SignInRequest | null>(null);
  const open = useCallback((r?: SignInRequest) => setReq(r ?? {}), []);
  const close = useCallback(() => setReq(null), []);
  const value = useMemo(() => open, [open]);
  return (
    <Ctx value={value}>
      {children}
      <SignInSheet open={req !== null} request={req ?? {}} onClose={close} />
    </Ctx>
  );
}

type Pending = 'google' | 'discord' | 'email' | null;

/**
 * Sign-in sheet (DESIGN-SPEC 16.6): title from context, Continue with Google,
 * Continue with Discord, or email + "Email me a sign-in link". No password
 * anywhere. Uses the SAME Supabase calls and /auth/callback?returnTo= as /login
 * (auth logic untouched, data-safety rule 4); only the caller is new.
 */
export function SignInSheet({ open, request, onClose, inline, words = WORLD }: { open: boolean; request: SignInRequest; onClose: () => void; inline?: boolean; words?: SignInWords | undefined }): React.ReactElement | null {
  const toast = useUxToast();
  const uid = useId().replace(/:/g, '');
  const [pending, setPending] = useState<Pending>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  const returnTo = (): string => request.returnTo ?? `${window.location.pathname}${window.location.search}`;
  const callbackUrl = (): string => `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?returnTo=${encodeURIComponent(returnTo())}`;
  const remember = (): void => { if (request.action) setPendingAction(request.action.id, request.action.payload); };

  // A world site: Google by ID token, then the passport's after-sign-in step; the redirect flow is the fallback.
  const worldGoogle = async (): Promise<void> => {
    setError(null);
    setPending('google');
    remember();
    const out = await signInWithGoogle(await supabase(), SITE_ID, returnTo(), { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, origin: window.location.origin, via: readTabVia() });
    if (out.kind === 'go') { window.location.assign(out.to); return; }
    if (out.kind === 'error') { setPending(null); setError(out.message); }
  };

  const oauth = async (provider: 'google' | 'discord'): Promise<void> => {
    setError(null);
    setPending(provider);
    remember();
    const { error: err } = await (await supabase()).auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } });
    if (err) { setPending(null); setError(err.message); }
  };

  const magicLink = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email || pending) return;
    setError(null);
    setPending('email');
    remember();
    const redirectTo = words ? emailRedirect(window.location.origin, words.emailLanding, returnTo()) : callbackUrl();
    const { error: err } = await (await supabase()).auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setPending(null);
    if (err) { setError(err.message); return; }
    onClose();
    toast(words ? fmt(words.sent, { email }) : `Link sent to ${email}. Open it on this device and you continue right here, draft kept.`);
  };

  const close = (): void => { setPending(null); setError(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={request.title ?? (words ? words.title : DEFAULT_TITLE)} width={440} initialFocus={firstRef} describedBy={`ux-signin-p-${uid}`} inline={inline}>
      <p className="ux-sh-p" id={`ux-signin-p-${uid}`}>{request.sub ?? (words ? words.body : DEFAULT_SUB)}</p>
      <div className="ux-authbs">
        <button ref={firstRef} type="button" className="ux-authb" onClick={() => { void (words ? worldGoogle() : oauth('google')); }} disabled={pending !== null}>
          <span className="ux-authb-lg" aria-hidden="true" style={{ background: '#4285F4' }}>G</span>{words ? words.google : 'Continue with Google'}
        </button>
        {words ? null : (
          <button type="button" className="ux-authb" onClick={() => { void oauth('discord'); }} disabled={pending !== null}>
            <span className="ux-authb-lg" aria-hidden="true" style={{ background: '#5865F2' }}>D</span>Continue with Discord
          </button>
        )}
      </div>
      <div className="ux-or">{words ? words.emailDivider : 'or'}</div>
      <form onSubmit={(e) => { void magicLink(e); }}>
        <label className="ux-sr" htmlFor={`ux-signin-email-${uid}`}>{words ? words.emailLabel : 'Email'}</label>
        <input
          className="ux-inp"
          id={`ux-signin-email-${uid}`}
          type="email"
          autoComplete="email"
          placeholder={words ? words.emailPlaceholder : 'you@example.com'}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="ux-btn ux-btn-ghost ux-btn-lg ux-btn-block" style={{ marginTop: 10 }} type="submit" disabled={pending !== null}>
          <Icon name="mail" />{pending === 'email' ? (words ? words.sending : 'Sending the link...') : (words ? words.emailCta : 'Email me a sign-in link')}
        </button>
      </form>
      {error ? <p className="ux-err" role="alert">{error}</p> : null}
      {words ? (
        <>
          <p className="ux-help">{words.network}</p>
          <p className="ux-help">{words.privacy}</p>
        </>
      ) : <p className="ux-help">New here? The same buttons create your passport. We never post for you.</p>}
    </Sheet>
  );
}
