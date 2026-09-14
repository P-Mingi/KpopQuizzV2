'use client';

// TIERLIST phase 3: the custom-asset moderation queue. Same plain, dense admin
// rails as the member-review queue. Approve -> the asset may be used on a public
// list and embedded in the share card; Reject -> it stays out of any public list.
// Actions hit /api/admin/tier-list-assets/action (admin-gated).
import { useState } from 'react';

export interface PendingAsset {
  id: string; name: string; imageUrl: string | null; created: string; owner: string;
}

export function TierListAssetQueue({ initial }: { initial: PendingAsset[] }): React.ReactElement {
  const [rows, setRows] = useState<PendingAsset[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, type: 'approve' | 'reject') => {
    setBusy(id);
    try {
      const res = await fetch('/api/admin/tier-list-assets/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, asset_id: id }) });
      if (!res.ok) return;
      setRows((rs) => rs.filter((r) => r.id !== id));
    } finally { setBusy(null); }
  };

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, verticalAlign: 'middle' };
  const btn: React.CSSProperties = { padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer' };

  if (rows.length === 0) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Nothing to review. New custom uploads appear here.</p>;

  return (
    <div style={{ overflowX: 'auto' }} data-testid="tl-asset-queue">
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>{rows.length} awaiting review. Approve = usable on public lists and the share card; Reject = kept off public lists.</p>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
        <thead>
          <tr><th style={th}>Image</th><th style={th}>Name</th><th style={th}>Owner</th><th style={th}>Created</th><th style={th}>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`tl-asset-${r.id}`}>
              <td style={td}>
                {r.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.imageUrl} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} referrerPolicy="no-referrer" />
                  : <span style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{r.name.slice(0, 2)}</span>}
              </td>
              <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
              <td style={{ ...td, color: 'var(--text-tertiary)' }}>{r.owner}</td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>{r.created.slice(0, 10)}</td>
              <td style={td}>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'approve')} style={{ ...btn, color: 'color-mix(in srgb, green 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, green 40%, var(--border))' }}>Approve</button>
                  <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'reject')} style={btn}>Reject</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
