'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { RoleBadge } from '@/components/verse/roles/role-badge';

import { UserAvatar } from '@/components/ui/user-avatar';

interface Author { username: string | null; displayName: string | null; avatarUrl: string | null; avatarBg: string | null; avatarText: string | null; role?: string | null; href?: string | null }
interface Comment { id: number; author: Author | null; authorId: string; body: string; createdAt: string; mine?: boolean; replies: Comment[] }

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** W4.6 - per-page discussion (talk page) with one-level replies. Any signed-in user can
 * comment; authors can delete their own; curators moderate via the API. */
export function DiscussionThread({ entityType, entityId, groupId, threadId, initialComments }: { entityType: string; entityId: string; groupId?: number; threadId?: number; initialComments?: Comment[] }): React.ReactElement {
  // Seed from a server render (thread pages pass initialComments) so the replies
  // are in the crawlable HTML, not JS-only; the mount effect still refetches for
  // the live view (mine flags, freshest ordering).
  const [comments, setComments] = useState<Comment[]>(initialComments ?? []);
  const [signedIn, setSignedIn] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = threadId ? `thread_id=${threadId}` : `entity_type=${entityType}&entity_id=${entityId}`;
    const r = await fetch(`/api/verse/discussions?${q}${groupId ? `&group_id=${groupId}` : ''}`);
    if (r.ok) { const d = await r.json(); setComments(d.comments ?? []); setSignedIn(!!d.signedIn); }
  }, [entityType, entityId, groupId, threadId]);

  useEffect(() => { load(); }, [load]);

  async function post(bodyText: string, parentId: number | null) {
    if (!bodyText.trim()) return;
    setBusy(true);
    const payload = threadId ? { thread_id: threadId, body: bodyText, parent_id: parentId } : { entity_type: entityType, entity_id: entityId, body: bodyText, parent_id: parentId };
    const r = await fetch('/api/verse/discussions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setBusy(false);
    if (r.status === 401) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return; }
    if (r.ok) { setDraft(''); setReplyDraft(''); setReplyTo(null); load(); } else alert((await r.json()).error ?? 'error');
  }

  async function del(id: number) {
    if (!confirm('Delete this comment?')) return;
    const r = await fetch('/api/verse/discussions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) load();
  }

  async function report(id: number) {
    if (!confirm('Report this comment to the curators?')) return;
    const r = await fetch('/api/verse/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_type: 'comment', target_id: id }) });
    if (r.ok) alert('Reported. Curators will review it.'); else if (r.status === 401) window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  }

  const Row = ({ c, isReply }: { c: Comment; isReply?: boolean }): React.ReactElement => {
    const name = c.author?.displayName || c.author?.username || 'Fan';
    return (
      <div className={isReply ? 'ml-9 mt-2' : ''}>
        <div className="flex items-start gap-2.5">
          <UserAvatar username={c.author?.username ?? name} avatarUrl={c.author?.avatarUrl ?? null} bgColor={c.author?.avatarBg ?? '#6b7280'} textColor={c.author?.avatarText ?? '#ffffff'} size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-xs">{c.author?.href ? <Link href={c.author.href} className="font-bold text-primary no-underline hover:underline">{name}</Link> : <span className="font-bold text-primary">{name}</span>} <RoleBadge role={c.author?.role} /> <span className="text-tertiary" suppressHydrationWarning>{ago(c.createdAt)}</span></p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-secondary">{c.body}</p>
            <div className="mt-1 flex gap-3 text-xs">
              {!isReply && signedIn ? <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyDraft(''); }} className="font-semibold text-tertiary hover:text-secondary">Reply</button> : null}
              {c.mine ? <button onClick={() => del(c.id)} className="text-tertiary hover:text-secondary">Delete</button> : signedIn ? <button onClick={() => report(c.id)} className="text-tertiary hover:text-secondary">Report</button> : null}
            </div>
            {replyTo === c.id ? (
              <div className="mt-2 flex gap-2">
                <input value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="Reply…" aria-label="Write a reply" className="flex-1 rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm" />
                <button onClick={() => post(replyDraft, c.id)} disabled={busy} className="rounded-lg bg-primary px-3 text-sm font-semibold text-inverse disabled:opacity-50">Send</button>
              </div>
            ) : null}
            {c.replies.map((r) => <Row key={r.id} c={r} isReply />)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-2">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Discussion{comments.length ? ` (${comments.length})` : ''}</h2>
      <div className="mb-4 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) post(draft, null); }} placeholder={signedIn ? 'Add to the discussion…' : 'Sign in to comment…'} aria-label="Add to the discussion" className="flex-1 rounded-lg border border-default bg-transparent px-3 py-2 text-sm" />
        <button onClick={() => post(draft, null)} disabled={busy} className="rounded-lg bg-primary px-4 text-sm font-semibold text-inverse disabled:opacity-50">Post</button>
      </div>
      {comments.length === 0 ? <p className="text-sm text-tertiary">No comments yet. Start the conversation.</p> : <div className="space-y-4">{comments.map((c) => <Row key={c.id} c={c} />)}</div>}
    </section>
  );
}
