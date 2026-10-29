'use client';

import { useId, useRef, useState } from 'react';

import { PassportNotice } from '@/components/passport-ui/passport-notice';
import { Sheet } from '@/components/ux-v1/sheet';
import { currentAppPath, readTabVia, signInWithProvider } from '@/lib/passport-ui/signin-client';
import { signInWords } from '@/lib/passport-ui/words';
import { SITE_ID } from '@/lib/site/registry';
import { setPendingAction } from '@/lib/ux-v1/a0/pending-action';

import type { SignInRequest } from '@/components/ux-v1/sign-in-sheet';
import type { OAuthProvider } from '@/lib/passport-ui/signin-client';
import type { SignInWords } from '@/lib/passport-ui/words';

// Run O1, lot (b), P1 (rule 18): the sign-in sheet of a world site (anime, hub). It says the site's words. The shared sheet
// (ux-v1/sign-in-sheet) loads this file on the first open when the build is a world site; a kpop build never imports it, so the
// kpop client graph is the base one.
// Bunnyverse (owner, 2026-10-28): Google and Discord only, started on the server of the build (/auth/start, its basePath
// included), which sends the provider back to the build's exact /auth/callback; no email field.

const WORLD: SignInWords | undefined = signInWords(SITE_ID);

type Pending = OAuthProvider | null;

export function WorldSignInSheet({ open, request, onClose, inline, words = WORLD, notice = <PassportNotice /> }: { open: boolean; request: SignInRequest; onClose: () => void; inline?: boolean; words?: SignInWords | undefined; notice?: React.ReactNode }): React.ReactElement | null {
  const uid = useId().replace(/:/g, '');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  if (!words) return null;

  // An app path: the caller's, else this page without the basePath (the callback adds it back).
  const returnTo = (): string => request.returnTo ?? currentAppPath(words.basePath, window.location.pathname, window.location.search);
  const remember = (): void => { if (request.action) setPendingAction(request.action.id, request.action.payload); };

  const oauth = (provider: OAuthProvider): void => {
    setError(null);
    setPending(provider);
    remember();
    const out = signInWithProvider(SITE_ID, provider, returnTo(), { basePath: words.basePath, via: readTabVia() });
    if (out.kind === 'error') { setPending(null); setError(out.message); }
  };

  const close = (): void => { setPending(null); setError(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={request.title ?? words.title} width={440} initialFocus={firstRef} describedBy={`ux-signin-p-${uid}`} inline={inline}>
      <p className="ux-sh-p" id={`ux-signin-p-${uid}`}>{request.sub ?? words.body}</p>
      <div className="ux-authbs">
        <button ref={firstRef} type="button" className="ux-authb" onClick={() => { oauth('google'); }} disabled={pending !== null}>
          <span className="ux-authb-lg" aria-hidden="true" style={{ background: '#4285F4' }}>G</span>{words.google}
        </button>
        <button type="button" className="ux-authb" onClick={() => { oauth('discord'); }} disabled={pending !== null}>
          <span className="ux-authb-lg" aria-hidden="true" style={{ background: '#5865F2' }}>D</span>{words.discord}
        </button>
      </div>
      {error ? <p className="ux-err" role="alert">{error}</p> : null}
      <p className="ux-help">{words.network}</p>
      <p className="ux-help">{words.privacy}</p>
      {notice}
    </Sheet>
  );
}
