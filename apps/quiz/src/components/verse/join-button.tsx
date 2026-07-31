'use client';

import { useEffect, useState } from 'react';

import { useReaderLens } from '@/components/verse/reader-lens';

interface Props { groupId: number; groupSlug: string; fandomName: string; }

interface Status { signedIn: boolean; member: boolean; role: string; blocked?: boolean; memberCount?: number }

const ROLE_LABEL: Record<string, string> = { member: 'Member', contributor: 'Contributor', curator: 'Curator', space_admin: 'Space admin' };

/** W4.2 - join / leave a space. Client island so space pages stay ISR. Reflects the
 * caller's membership + role; role holders (curator/space_admin) cannot leave here. */
export function JoinButton({ groupId, groupSlug, fandomName }: Props): React.ReactElement {
  const { lensRef, lensed } = useReaderLens();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/membership?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then(setSt).catch(() => setSt({ signedIn: false, member: false, role: 'visitor' }));
  }, [groupId]);

  async function act(action: 'join' | 'leave') {
    setBusy(true);
    const res = await fetch('/api/verse/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action }) });
    setBusy(false);
    if (res.ok) { const d = await res.json(); setSt((s) => ({ signedIn: true, member: d.member, role: d.role, blocked: s?.blocked ?? false, memberCount: d.memberCount ?? s?.memberCount })); }
  }

  const primary = 'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold no-underline transition-transform hover:-translate-y-0.5';
  const primaryStyle = { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' } as React.CSSProperties;

  // Loading, signed-out, or under the studio's reader lens (which must show
  // the logged-out truth): the login CTA.
  if (!st || !st.signedIn || lensed) {
    return <a ref={lensRef as React.RefObject<HTMLAnchorElement>} href={`/login?returnTo=${encodeURIComponent(`/verse/${groupSlug}`)}`} className={primary} style={primaryStyle}>Join {fandomName}</a>;
  }

  if (st.blocked) {
    return <span className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>Blocked from this space</span>;
  }

  if (!st.member) {
    return <button onClick={() => act('join')} disabled={busy} className={primary} style={primaryStyle}>{busy ? 'Joining…' : `Join ${fandomName}`}</button>;
  }

  const roleLabel = ROLE_LABEL[st.role] ?? 'Member';
  const canLeave = st.role === 'member' || st.role === 'contributor';
  // V-POLISH-2 C4 - the LIGHT-UP: membership wears the fandom's accent (the
  // contrast-clamped CTA pair), lightstick culture as UI. Count tick when the
  // API reports it.
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold" style={primaryStyle}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>{roleLabel}
        {typeof st.memberCount === 'number' ? <span className="text-[11px] font-semibold tabular-nums" style={{ opacity: 0.85 }}>· {st.memberCount.toLocaleString('en-US')}</span> : null}
      </span>
      {canLeave ? <button onClick={() => act('leave')} disabled={busy} className="text-xs text-tertiary hover:text-secondary">Leave</button> : null}
    </span>
  );
}
