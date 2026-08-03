'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { PageKindDef } from '@/lib/verse/pages/kinds';

// V-PAGES step 5 - kind picker + create form. Honest descriptions straight from
// the registry; the slug auto-follows the title (editable); server verdicts
// render inline. On success: straight into the editor.

const slugify = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export function NewPageForm({ groupId, groupSlug, kinds }: {
  groupId: number; groupSlug: string; kinds: PageKindDef[];
}): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const [kind, setKind] = useState<string>(kinds[0]?.kind ?? 'general');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState(params.get('slug') ?? '');
  const [slugTouched, setSlugTouched] = useState(!!params.get('slug'));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const create = async (): Promise<void> => {
    setBusy(true);
    setErrors([]);
    const res = await fetch('/api/verse/pages/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, kind, title, slug: slug || slugify(title) }),
    });
    const out = (await res.json()) as { ok?: boolean; errors?: string[]; error?: string; slug?: string };
    setBusy(false);
    if (!out.ok) { setErrors(out.errors ?? [out.error ?? 'Could not create the page.']); return; }
    router.push(`/verse/${groupSlug}/wiki/${out.slug}/edit`);
  };

  return (
    <div style={{ maxWidth: '46rem' }}>
      <fieldset className="mb-6">
        <legend className="v-eyebrow" style={{ marginBottom: '0.9rem' }}>What kind of page?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {kinds.map((k) => (
            <label key={k.kind} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors"
              style={{ borderColor: kind === k.kind ? 'var(--verse-accent)' : 'var(--verse-line)', background: kind === k.kind ? 'var(--verse-soft)' : 'transparent' }}>
              <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="mt-1" />
              <span>
                <span className="block text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{k.label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-tertiary">{k.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary" htmlFor="np-title">Title</label>
      <input id="np-title" className="mb-3 w-full rounded-lg border px-3 py-2 text-base font-bold outline-none"
        style={{ borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="e.g. ARMY Bomb" />

      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary" htmlFor="np-slug">URL slug</label>
      <div className="mb-4 flex items-center gap-1 text-sm text-tertiary">
        <span className="hidden sm:inline">/verse/{groupSlug}/wiki/</span>
        <input id="np-slug" className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm outline-none"
          style={{ borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
      </div>

      {errors.length > 0 ? (
        <ul className="mb-4 space-y-1 text-sm" style={{ color: 'var(--verse-danger)' }} role="alert">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      ) : null}

      <button type="button" disabled={busy || !title.trim()} onClick={() => void create()}
        className="inline-flex min-h-[44px] items-center rounded-xl px-6 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, #fff)' }}>
        {busy ? 'Creating...' : 'Create the draft'}
      </button>
      <p className="mt-3 text-[12px] text-tertiary">Pages start as drafts. A curator reviews before anything goes live.</p>
    </div>
  );
}
