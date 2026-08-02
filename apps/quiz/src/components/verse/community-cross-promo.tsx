'use client';

import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { useEffect, useState } from 'react';

interface MySpace { slug: string; name: string; fandom: string | null; role: string; xp: number }

// V-COMM-3 step 4 - the community-hub cross-promo. A client island (the hub is a
// cached Play page; membership is personal): MEMBERS see a "Your spaces" strip
// linking back into their spaces; NON-members (or signed-out) see a "Claim a
// space" invite. One surface, role-branched.
export function CommunityCrossPromo(): React.ReactElement | null {
  const [spaces, setSpaces] = useState<MySpace[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/verse/my-spaces', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) setSpaces((d?.spaces as MySpace[]) ?? []); })
      .catch(() => { if (live) setSpaces([]); });
    return () => { live = false; };
  }, []);

  if (spaces === null) return null; // resolving; no layout flash

  if (spaces.length > 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <SectionHeader kicker="Your spaces" />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {spaces.map((s) => (
            <li key={s.slug}>
              <Link href={`/verse/${s.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: 'var(--txt1)', textDecoration: 'none' }}>
                {s.fandom || s.name}
                {s.role !== 'member' ? <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand)' }}>{s.role === 'space_admin' ? 'Admin' : s.role}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt1)', margin: 0 }}>Run your fandom&rsquo;s home.</p>
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '4px 0 10px' }}>Every space is fan-built and fan-run. Claim one, or join the fandoms you love.</p>
      <Link href="/verse" style={{ display: 'inline-block', background: 'var(--brand)', color: 'var(--brand-contrast, #fff)', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Explore spaces</Link>
    </div>
  );
}
