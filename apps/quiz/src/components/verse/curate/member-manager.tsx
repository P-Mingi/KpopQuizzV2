'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleBadge } from '@/components/verse/roles/role-badge';
import { isStaleCurator, inactiveDays } from '@/lib/verse/decay-policy';

interface Prof { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null }
interface Row { user_id: string; role: string; status: string; joined_at: string; last_contrib_date: string | null; contrib_xp?: number; pending_suggestions?: number; profile: Prof | null }
interface LogRow { id: number; at: string; actor: string; target: string; from: string | null; to: string | null; reason: string }

const ROLES = ['member', 'contributor', 'curator', 'space_admin'];

/** W4.3 + V-ROLES step 4 - THE ROLES PANEL: members with role, XP, join date and
 * pending-suggestion count; promote/demote with a MANDATORY reason; the role log
 * (who changed whom, when, why) on the revisions rail; block/unblock and the
 * charter link in the same panel. One surface, no scattered controls. */
export function MemberManager({ groupId, groupSlug, isSpaceAdmin }: { groupId: number; groupSlug?: string; isSpaceAdmin: boolean }): React.ReactElement {
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<LogRow[] | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [busy, setBusy] = useState(false);
  // Staged role picks: the select never acts on change (keyboard users arrow
  // through options); the change happens on the explicit Apply press.
  const [staged, setStaged] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/verse/members?group_id=${groupId}`);
    if (res.ok) setRows((await res.json()).members ?? []);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);

  const loadLog = useCallback(async () => {
    const res = await fetch(`/api/verse/members?group_id=${groupId}&log=1`);
    if (res.ok) setLog((await res.json()).log ?? []);
  }, [groupId]);
  useEffect(() => { if (showLog && log === null) void loadLog(); }, [showLog, log, loadLog]);

  async function post(target_user_id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch('/api/verse/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, target_user_id, action, ...extra }) });
    setBusy(false);
    if (res.ok) { void load(); setLog(null); } else {
      const out = await res.json();
      alert(out.message ?? out.error ?? 'error');
      void load(); // reset any optimistic select state
    }
  }

  function applyRole(target: string, name: string, role: string): void {
    // Mandatory reason: the role log is only as honest as its entries.
    const reason = window.prompt(`Why is ${name} becoming ${role.replace('_', ' ')}? (required, logged)`);
    if (reason === null) return;
    setStaged((s) => { const n = { ...s }; delete n[target]; return n; });
    void post(target, 'set_role', { role, reason });
  }

  const roleOptions = isSpaceAdmin ? ROLES : ['member', 'contributor'];

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-sm text-tertiary">No members yet. Fans appear here once they join.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const name = r.profile?.display_name || r.profile?.username || 'Fan';
            const canRoleEdit = isSpaceAdmin || (r.role === 'member' || r.role === 'contributor');
            return (
              <li key={r.user_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
                <UserAvatar username={r.profile?.username ?? name} avatarUrl={r.profile?.avatar_url ?? null} bgColor={r.profile?.avatar_bg ?? '#6b7280'} textColor={r.profile?.avatar_text ?? '#ffffff'} size={26} />
                <span className="font-semibold">{name}</span>
                <RoleBadge role={r.role} />
                <span className="text-[11px] tabular-nums text-tertiary" title="Space XP">{r.contrib_xp ?? 0} XP</span>
                <span className="text-[11px] text-tertiary" title="Joined">since {r.joined_at?.slice(0, 10)}</span>
                {(r.pending_suggestions ?? 0) > 0 ? <span className="rounded-full px-2 py-px text-[10px] font-bold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{r.pending_suggestions} pending</span> : null}
                {r.status === 'blocked' ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--bg-danger)', color: 'var(--text-danger)' }}>blocked</span> : null}
                {r.status === 'active' && isStaleCurator(r) ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-tertiary" style={{ border: '1px solid var(--border)' }}>inactive {inactiveDays(r)}d<span className="sr-only">, decays to contributor if inactivity continues</span></span> : null}
                <div className="ml-auto flex items-center gap-2">
                  {r.status === 'active' && canRoleEdit ? (
                    <>
                      <select value={staged[r.user_id] ?? r.role} disabled={busy} onChange={(e) => setStaged((s) => ({ ...s, [r.user_id]: e.target.value }))} className="v-tap rounded-lg border border-default bg-transparent px-2 py-1 text-xs" aria-label={`Role for ${name}`}>
                        {roleOptions.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                      </select>
                      {staged[r.user_id] && staged[r.user_id] !== r.role ? (
                        <button type="button" onClick={() => applyRole(r.user_id, name, staged[r.user_id]!)} disabled={busy}
                          className="v-tap rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text, #fff)' }}>
                          Apply
                        </button>
                      ) : null}
                    </>
                  ) : <span className="text-xs text-tertiary">{r.role.replace('_', ' ')}</span>}
                  {/* Blocking staff is a space-admin power (the API 403s otherwise); no dead buttons. */}
                  {r.status === 'active'
                    ? (isSpaceAdmin || (r.role !== 'curator' && r.role !== 'space_admin')
                      ? <button type="button" onClick={() => { if (confirm(`Block ${name} from this space?`)) void post(r.user_id, 'block'); }} disabled={busy} className="v-tap rounded border border-default px-2 py-0.5 text-xs text-secondary">Block</button>
                      : null)
                    : <button type="button" onClick={() => void post(r.user_id, 'unblock')} disabled={busy} className="v-tap rounded border border-default px-2 py-0.5 text-xs">Unblock</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setShowLog((s) => !s)} aria-expanded={showLog} className="v-tap inline-flex min-h-[36px] items-center rounded-lg border border-default px-3 text-xs font-semibold text-secondary">
          {showLog ? 'Hide the role log' : 'Role log'}
        </button>
        {groupSlug ? (
          <Link href={`/verse/${groupSlug}/about`} className="v-tap inline-flex min-h-[36px] items-center rounded-lg border border-default px-3 text-xs font-semibold text-secondary no-underline">Space charter</Link>
        ) : null}
      </div>

      {showLog ? (
        log === null ? <p className="mt-2 text-xs text-tertiary">Loading the log...</p>
        : log.length === 0 ? <p className="mt-2 text-xs text-tertiary">No role changes logged yet.</p>
        : (
          <ul className="mt-2 space-y-1.5">
            {log.map((l) => (
              <li key={l.id} className="rounded-lg border border-default px-3 py-2 text-xs">
                <span className="font-semibold text-primary">{l.actor}</span>
                <span className="text-secondary"> made </span>
                <span className="font-semibold text-primary">{l.target}</span>
                <span className="text-secondary"> {l.from ? `${l.from.replace('_', ' ')} to ` : ''}{(l.to ?? '').replace('_', ' ')}</span>
                <span className="text-tertiary"> · {l.at.slice(0, 10)}</span>
                {l.reason ? <p className="mt-0.5 text-tertiary">&ldquo;{l.reason}&rdquo;</p> : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
