'use client';

import { useEffect, useState } from 'react';
import { WidgetShell } from '@/components/verse/primitives/widget-shell';
import Link from 'next/link';

interface MySpace { slug: string; name: string; fandom: string; role: string; xp: number }

// V-POLISH step 8 - the signed-in strip under the V-HOME hero. The ISR shell is
// identical for everyone; this small client layer greets members with their own
// spaces. Renders nothing for anonymous visitors and while loading (no shift:
// the strip mounts below the hero, pushing only content that follows it).
export function MySpacesStrip(): React.ReactElement | null {
  const [spaces, setSpaces] = useState<MySpace[] | null>(null);
  useEffect(() => {
    let on = true;
    fetch('/api/verse/my-spaces')
      .then((r) => (r.ok ? r.json() : { spaces: [] }))
      .then((d) => { if (on) setSpaces(d.spaces ?? []); })
      .catch(() => { if (on) setSpaces([]); });
    return () => { on = false; };
  }, []);
  if (!spaces || spaces.length === 0) return null;
  return (
    <WidgetShell framed eyebrow="Your spaces" as="h2" aria="Your spaces" wrapClassName="mb-10">
      <div className="flex flex-wrap gap-2.5">
        {spaces.map((s) => (
          <Link key={s.slug} href={`/verse/${s.slug}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-bold no-underline" style={{ borderColor: 'var(--v-hairline)', color: 'var(--text-primary)' }}>
            {s.fandom}
            <span className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{s.role.replace('_', ' ')} · {s.xp} XP</span>
          </Link>
        ))}
      </div>
    </WidgetShell>
  );
}
