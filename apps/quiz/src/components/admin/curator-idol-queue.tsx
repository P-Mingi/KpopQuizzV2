'use client';

// V-BUILDER-3 step 4 (governance L-068): the curator-created MEMBER review queue. Same plain,
// dense admin rails as the space-images queue. Approve -> the member goes live (active=true,
// needs_review=false, via idol_activate, which refuses a detached row). Keep hidden -> reviewed
// out of the queue, still unpublished, NOT deleted (idol_keep_hidden). Actions hit
// /api/admin/verse/action (admin-gated).
import { useState } from 'react';

export interface PendingIdol {
  id: number; name: string; nameHangul: string | null; photoUrl: string | null;
  created: string; space: string; spaceSlug: string; memberSlug: string;
}

export function CuratorIdolQueue({ initial }: { initial: PendingIdol[] }): React.ReactElement {
  const [rows, setRows] = useState<PendingIdol[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (id: number, type: 'idol_activate' | 'idol_keep_hidden') => {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/verse/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, idol_id: id }) });
      if (!res.ok) return;
      setRows((rs) => rs.filter((r) => r.id !== id));
    } finally { setBusy(null); }
  };

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, verticalAlign: 'middle' };
  const btn: React.CSSProperties = { padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer' };

  if (rows.length === 0) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Nothing to review. New fan-created members appear here.</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>{rows.length} awaiting review. Approve = publish the member page; Keep hidden = leave it unpublished (not a delete).</p>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
        <thead>
          <tr><th style={th}>Member</th><th style={th}>Space</th><th style={th}>Created</th><th style={th}>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {r.photoUrl
                    ? <img src={r.photoUrl} alt="" width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} />
                    : <span style={{ display: 'inline-flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 5, border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{r.name.slice(0, 2)}</span>}
                  <span><span style={{ fontWeight: 600 }}>{r.name}</span>{r.nameHangul ? <span style={{ color: 'var(--text-tertiary)' }}> · {r.nameHangul}</span> : null}</span>
                </span>
              </td>
              <td style={td}>{r.spaceSlug ? <a href={`/verse/${r.spaceSlug}`} style={{ color: 'var(--text-primary)' }}>{r.space}</a> : r.space}</td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>{r.created.slice(0, 10)}</td>
              <td style={td}>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'idol_activate')} style={{ ...btn, color: 'color-mix(in srgb, green 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, green 40%, var(--border))' }}>Approve</button>
                  <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'idol_keep_hidden')} style={btn}>Keep hidden</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
