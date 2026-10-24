'use client';

// Run O1, lot (e), lane B7 (owner decision of 2026-10-24): the "Delete account" row of Settings on kpopquiz.org when
// NEXT_PUBLIC_NET_DELETION is on. The shared settings screen (components/profile/ux-v1/settings) loads this file with next/dynamic
// only in that case, so with the flag off no kpop page reaches it. It reuses the ConfirmSheet and the switch of the UX kit and
// calls the routes of lib/passport/deletion/account.ts: GET /api/passport/delete (is a deletion pending), POST /api/passport/delete
// (confirm with @username, fresh sign-in of 10 minutes, signed out everywhere, "deletion scheduled" email) and POST /api/passport/cancel.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ConfirmSheet } from '@/components/ux-v1/confirm-sheet';
import { UxSwitch } from '@/components/ux-v1/form';
import { useUxToast } from '@/components/ux-v1/toast';
import { COPY } from '@/copy/kpop/b7';
import { clearMe } from '@/lib/auth/use-me';
import { fmt } from '@/lib/passport-ui/fmt';
import { createBrowserClient } from '@/lib/supabase/client';

type Problem = 'confirm' | 'reauth' | 'server' | null;

/** `2026-10-28`: the UTC date of an ISO time. */
function day(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso.slice(0, 10) : t.toISOString().slice(0, 10);
}

export function AccountDeletion({ username }: { username: string }): React.ReactElement {
  const router = useRouter();
  const toast = useUxToast();
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/passport/delete', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const d = (await res.json()) as { pending?: boolean; runAfter?: string };
        if (!cancelled) setPending(d.pending === true && typeof d.runAfter === 'string' ? d.runAfter : null);
      } catch { /* no status: the row shows the delete action */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const close = useCallback((): void => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setRemove(false);
    setProblem(null);
  }, [busy]);

  const submit = async (): Promise<void> => {
    if (busy || typed !== `@${username}`) return;
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch('/api/passport/delete', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepQuizzes: !remove, confirm: typed }),
      });
      if (res.ok) {
        // The server ended every session; this tab forgets the member too.
        clearMe();
        try { await createBrowserClient().auth.signOut({ scope: 'local' }); } catch { /* already signed out */ }
        toast(COPY['delete.scheduledToast']);
        router.push('/');
        return;
      }
      setProblem(res.status === 403 ? 'reauth' : res.status === 400 ? 'confirm' : 'server');
    } catch {
      setProblem('server');
    } finally {
      setBusy(false);
    }
  };

  const signInAgain = async (): Promise<void> => {
    try { await createBrowserClient().auth.signOut({ scope: 'local' }); } catch { /* the session is cleared anyway */ }
    clearMe();
    router.push('/login?returnTo=/settings');
  };

  const cancel = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/passport/cancel', { method: 'POST', credentials: 'include' });
      if (!res.ok) { toast(COPY['delete.cancelError']); return; }
      setPending(null);
      toast(COPY['delete.cancelledToast']);
    } catch {
      toast(COPY['delete.cancelError']);
    } finally {
      setBusy(false);
    }
  };

  const message = problem === 'confirm' ? COPY['delete.errConfirm'] : problem === 'reauth' ? COPY['delete.errReauth'] : problem === 'server' ? COPY['delete.errServer'] : null;

  return (
    <>
      <div className="p10-srow">
        <span className="p10-srow-g">
          <b className="p10-danger">Delete account</b>
          <small>{pending ? fmt(COPY['delete.pendingHint'], { date: day(pending) }) : COPY['delete.rowHint']}</small>
        </span>
        {pending ? (
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void cancel(); }} disabled={busy} aria-busy={busy || undefined}>{COPY['delete.cancel']}</button>
        ) : (
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm p10-danger" onClick={() => setOpen(true)} aria-haspopup="dialog">Delete</button>
        )}
      </div>
      <ConfirmSheet
        open={open}
        title={COPY['delete.title']}
        body={<>{COPY['delete.body']}</>}
        confirmLabel={busy ? COPY['delete.working'] : COPY['delete.confirm']}
        cancelLabel={COPY['delete.keep']}
        confirmDisabled={busy || typed !== `@${username}`}
        onConfirm={() => { void submit(); }}
        onCancel={close}
        extra={(
          <div className="p10-delete-extra">
            <div className="ux-field">
              <label htmlFor="p10-del-confirm">{fmt(COPY['delete.typeLabel'], { username })}</label>
              <input className="ux-inp" id="p10-del-confirm" value={typed} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={(e) => { setTyped(e.target.value); setProblem(null); }} aria-invalid={problem === 'confirm' ? true : undefined} />
            </div>
            <div className="p10-srow">
              <span className="p10-srow-g"><b id="p10-del-remove">{COPY['delete.removeQuizzes']}</b><small>{COPY['delete.removeQuizzesHint']}</small></span>
              <UxSwitch checked={remove} label={COPY['delete.removeQuizzes']} onChange={setRemove} />
            </div>
            {message ? <p className="ux-err" role="alert">{message}</p> : null}
            {problem === 'reauth' ? <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void signInAgain(); }}>{COPY['delete.reauthButton']}</button> : null}
          </div>
        )}
      />
    </>
  );
}
