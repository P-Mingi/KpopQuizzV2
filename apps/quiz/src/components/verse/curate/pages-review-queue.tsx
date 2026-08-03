'use client';

import { useState } from 'react';
import { Byline } from '@/components/verse/primitives/byline';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// V-PAGES step 5 - the curator's page review queue. Approve publishes (the full
// gate runs server-side; errors surface inline), return sends back to draft.
export function PagesReviewQueue({ groupSlug, items }: {
  groupSlug: string;
  items: { id: number; slug: string; title: string; kind: string; created_by_name: string }[];
}): React.ReactElement | null {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string[]>>({});
  if (items.length === 0) return null;

  const act = async (id: number, action: 'publish' | 'return'): Promise<void> => {
    setBusy(id);
    const res = await fetch('/api/verse/pages/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: id, action }),
    });
    const out = (await res.json()) as { ok?: boolean; errors?: string[]; error?: string };
    setBusy(null);
    if (!out.ok) { setErrors((e) => ({ ...e, [id]: out.errors ?? [out.error ?? 'Failed'] })); return; }
    router.refresh();
  };

  return (
    <section className="verse-frame verse-frame-rounded" style={{ marginTop: '1.6rem' }}>
      <SectionHeader kicker={<>Pages awaiting review · {items.length}</>} as="h2" />
      <ul className="flex flex-col gap-3">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <Link href={`/verse/${groupSlug}/wiki/${p.slug}/edit`} className="text-sm font-bold no-underline hover:underline" style={{ color: 'var(--verse-ink)' }}>{p.title}</Link>
              <span className="ml-2 text-[11px] uppercase tracking-wide text-tertiary">{p.kind} · <Byline identity={{ displayName: p.created_by_name }} prefix="by" link={false} /></span>
              {errors[p.id] ? <p className="mt-1 text-[12px]" style={{ color: 'var(--verse-danger)' }} role="alert">{errors[p.id]!.join(' ')}</p> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy === p.id} onClick={() => void act(p.id, 'publish')}
                className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--verse-success)' }}>
                Publish
              </button>
              <button type="button" disabled={busy === p.id} onClick={() => void act(p.id, 'return')}
                className="inline-flex min-h-[44px] items-center rounded-xl border px-4 text-[13px] font-bold disabled:opacity-50" style={{ borderColor: 'var(--verse-line)', color: 'var(--text-primary)' }}>
                Return to draft
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
