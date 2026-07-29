'use client';

import { useCallback, useEffect, useState } from 'react';

import { UserAvatar } from '@/components/ui/user-avatar';
import { isStaleCurator, inactiveDays } from '@/lib/verse/decay-policy';

interface Prof { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null }
interface Row { user_id: string; role: string; status: string; joined_at: string; last_contrib_date: string | null; profile: Prof | null }

const ROLES = ['member', 'contributor', 'curator', 'space_admin'];

/** W4.3 - curator member management: change roles, block / unblock. Only space_admins
 * (or global admins) see the curator/space_admin role options. */
export function MemberManager({ groupId, isSpaceAdmin }: { groupId: number; isSpaceAdmin: boolean }): React.ReactElement {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/verse/members?group_id=${groupId}`);
    if (res.ok) setRows((await res.json()).members ?? []);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);

  async function post(target_user_id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch('/api/verse/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, target_user_id, action, ...extra }) });
    setBusy(false);
    if (res.ok) load(); else alert((await res.json()).error ?? 'error');
  }

  const roleOptions = isSpaceAdmin ? ROLES : ['member', 'contributor'];

  if (rows.length === 0) return <p className="text-sm text-tertiary">No members yet. Fans appear here once they join.</p>;

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const name = r.profile?.display_name || r.profile?.username || 'Fan';
        const canRoleEdit = isSpaceAdmin || (r.role === 'member' || r.role === 'contributor');
        return (
          <li key={r.user_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
            <UserAvatar username={r.profile?.username ?? name} avatarUrl={r.profile?.avatar_url ?? null} bgColor={r.profile?.avatar_bg ?? '#6b7280'} textColor={r.profile?.avatar_text ?? '#ffffff'} size={26} />
            <span className="font-semibold">{name}</span>
            {r.status === 'blocked' ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--bg-danger)', color: 'var(--text-danger)' }}>blocked</span> : null}
            {r.status === 'active' && isStaleCurator(r) ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-tertiary" style={{ border: '1px solid var(--border)' }} title="Inactive curator; decays to contributor if inactivity continues">inactive {inactiveDays(r)}d</span> : null}
            <div className="ml-auto flex items-center gap-2">
              {r.status === 'active' && canRoleEdit ? (
                <select value={r.role} disabled={busy} onChange={(e) => post(r.user_id, 'set_role', { role: e.target.value })} className="rounded-lg border border-default bg-transparent px-2 py-1 text-xs">
                  {roleOptions.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
              ) : <span className="text-xs text-tertiary">{r.role.replace('_', ' ')}</span>}
              {r.status === 'active'
                ? <button onClick={() => { if (confirm(`Block ${name} from this space?`)) post(r.user_id, 'block'); }} disabled={busy} className="rounded border border-default px-2 py-0.5 text-xs text-secondary">Block</button>
                : <button onClick={() => post(r.user_id, 'unblock')} disabled={busy} className="rounded border border-default px-2 py-0.5 text-xs">Unblock</button>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
