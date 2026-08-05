'use client';

// V-BUILDER-3 step 3 (L-047): the block-image MODERATION QUEUE. Internal admin utility -
// documented design-exemption (Cowork): plain, dense, bordered rows. One-click Hide (takedown,
// keeps the object) / Unhide, and Remove (deletes the storage object). Fail-closed everywhere:
// a hidden/removed image is served on no page. Actions call /api/verse/space-image.
import { useState } from 'react';

export interface QueueImage {
  id: number; url: string; space: string; spaceSlug: string; uploader: string;
  status: 'active' | 'hidden' | 'removed'; source: string | null; sourceUrl: string | null;
  created: string; mime: string | null; bytes: number | null;
}

export function SpaceImageQueue({ initial }: { initial: QueueImage[] }): React.ReactElement {
  const [rows, setRows] = useState<QueueImage[]>(initial);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (id: number, kind: 'hide' | 'unhide' | 'remove') => {
    setBusy(id);
    try {
      const res = kind === 'remove'
        ? await fetch(`/api/verse/space-image?id=${id}`, { method: 'DELETE' })
        : await fetch('/api/verse/space-image', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: kind }) });
      if (!res.ok) return;
      setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: kind === 'remove' ? 'removed' : kind === 'hide' ? 'hidden' : 'active' } : r));
    } finally { setBusy(null); }
  };

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, verticalAlign: 'middle' };
  const btn: React.CSSProperties = { padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>{rows.length} images. Hide = taken down everywhere (kept); Remove = deleted from storage.</p>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
        <thead>
          <tr>
            <th style={th}>Image</th><th style={th}>Space</th><th style={th}>Uploader</th>
            <th style={th}>Source</th><th style={th}>Date</th><th style={th}>Status</th><th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ opacity: r.status === 'removed' ? 0.45 : 1 }}>
              <td style={td}>
                {r.status === 'active'
                  ? <img src={r.url} alt="" width={48} height={48} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-primary)' }} />
                  : <span style={{ display: 'inline-flex', width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: 10 }}>{r.status === 'hidden' ? 'hidden' : 'gone'}</span>}
              </td>
              <td style={td}><a href={`/verse/${r.spaceSlug}`} style={{ color: 'var(--text-primary)' }}>{r.space}</a></td>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.uploader.slice(0, 8)}</td>
              <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.sourceUrl ?? ''}>
                {r.source === 'url' ? (r.sourceUrl ?? 'url') : 'upload'}
              </td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>{r.created.slice(0, 10)}</td>
              <td style={td}><StatusPill status={r.status} /></td>
              <td style={td}>
                {r.status === 'removed' ? <span style={{ color: 'var(--text-tertiary)' }}>-</span> : (
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    {r.status === 'active'
                      ? <button type="button" disabled={busy === r.id} onClick={() => act(r.id, 'hide')} style={btn}>Hide</button>
                      : <button type="button" disabled={busy === r.id} onClick={() => act(r.id, 'unhide')} style={btn}>Unhide</button>}
                    <button type="button" disabled={busy === r.id} onClick={() => { if (confirm('Remove this image from storage? This cannot be undone.')) void act(r.id, 'remove'); }}
                      style={{ ...btn, color: 'color-mix(in srgb, red 70%, var(--text-primary))', borderColor: 'color-mix(in srgb, red 40%, var(--border))' }}>Remove</button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }): React.ReactElement {
  const c = status === 'active' ? 'green' : status === 'hidden' ? 'orange' : 'red';
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 5, border: `1px solid color-mix(in srgb, ${c} 45%, var(--border))`, color: `color-mix(in srgb, ${c} 70%, var(--text-primary))` }}>{status}</span>;
}
