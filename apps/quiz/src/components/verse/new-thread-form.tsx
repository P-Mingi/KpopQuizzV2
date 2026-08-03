'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// V-COMM-3 step 2 - start a thread. Any signed-in fan; behind the same moderation
// as comments (server-side). On success, routes to the new thread's permalink.
export function NewThreadForm({ groupId, groupSlug }: { groupId: number; groupSlug: string }): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ERRORS: Record<string, string> = {
    sign_in_required: 'sign-in', rate_limited: 'You are posting too fast. Give it a minute.',
    blocked_term: 'That contains a term we do not allow.', new_account_no_links: 'New accounts cannot post links yet.',
    too_long: 'Title is max 140 characters.',
  };

  async function submit(): Promise<void> {
    if (!title.trim() || busy) return;
    setBusy(true); setErr(null);
    const r = await fetch('/api/verse/threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, title, body }),
    });
    setBusy(false);
    if (r.status === 401) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return; }
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.slug) { router.push(`/verse/${groupSlug}/community/${d.slug}`); return; }
    setErr(ERRORS[d.error as string] ?? 'Could not start the thread.');
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full px-4 py-2 text-sm font-bold no-underline" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, #fff)' }}>
        Start a thread
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-tertiary" htmlFor="nt-title">Thread title</label>
      <input id="nt-title" autoFocus value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to talk about?" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--verse-ink)' }} />
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-tertiary" htmlFor="nt-body">Opening post <span className="font-normal normal-case">(optional)</span></label>
      <textarea id="nt-body" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Say more…" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--verse-ink)' }} />
      {err ? <p role="alert" className="mb-2 text-xs font-semibold" style={{ color: 'var(--verse-danger)' }}>{err}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={busy || !title.trim()} className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, #fff)' }}>{busy ? 'Posting…' : 'Post thread'}</button>
        <button type="button" onClick={() => { setOpen(false); setErr(null); }} className="rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Cancel</button>
      </div>
    </div>
  );
}
