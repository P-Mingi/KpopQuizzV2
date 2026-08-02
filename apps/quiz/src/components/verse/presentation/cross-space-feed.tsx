import Link from 'next/link';

import { getCrossSpaceFeed } from '@/lib/verse/feed';

import type { FeedKind } from '@/lib/verse/feed';

// V-COMM-3 step 3 - the cross-space feed on the shared Community hub. Verse events
// (new pages, essays, threads, comebacks) from spaces that OPTED IN, alongside the
// Play-world community events already on this page. Self-fetching + min-gated: it
// renders nothing until at least one opted-in space has activity, so it is never a
// fake or empty box.

const KIND_LABEL: Record<FeedKind, string> = { page: 'New page', essay: 'Essay', thread: 'Thread', comeback: 'Comeback' };

function ago(iso: string, nowMs: number): string {
  const d = nowMs - new Date(iso).getTime();
  if (d < 3600000) return `${Math.max(1, Math.round(d / 60000))}m`;
  if (d < 86400000) return `${Math.round(d / 3600000)}h`;
  if (d < 2592000000) return `${Math.round(d / 86400000)}d`;
  return new Date(iso).toISOString().slice(0, 10);
}

export async function CrossSpaceFeed(): Promise<React.ReactElement | null> {
  const items = await getCrossSpaceFeed(18);
  if (items.length === 0) return null; // min-gate: no opted-in activity
  const nowMs = Date.now();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', margin: 0 }}>Across the Verse</p>
        <Link href="/verse" style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', textDecoration: 'none' }}>All spaces</Link>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <li key={i}>
            <Link href={it.href} style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none' }}>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand)', minWidth: 62 }}>{KIND_LABEL[it.kind]}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--txt1)', lineHeight: 1.3 }}>
                {it.title}
                <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: 'var(--txt3)' }}>{it.groupName}</span>
              </span>
              <time dateTime={it.at} style={{ flexShrink: 0, fontSize: 12, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{ago(it.at, nowMs)}</time>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
