'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PRESET_LIST, applyPreset } from '@/lib/verse/presentation/presets';
import { resolvePlacements } from '@/lib/verse/presentation/resolve';
import { BLOCK_REGISTRY, FRAME_STYLES } from '@/lib/verse/presentation/registry';
import { ALLOWED_TABS } from '@/lib/verse/presentation/types';

import type { Presentation, ModulePlacement, TabId } from '@/lib/verse/presentation/types';

type BP = 'mobile' | 'tablet' | 'desktop';
const BP_WIDTH: Record<BP, number> = { mobile: 390, tablet: 768, desktop: 1100 };
const TAB_LABELS: Record<string, string> = { home: 'Home', members: 'Members', discography: 'Discography', timeline: 'Timeline', quests: 'Quests', essays: 'Essays', community: 'Community', about: 'About', tours: 'Tours', shows: 'Shows', ost: 'OST', awards: 'Awards', photocards: 'Photocards', collectibles: 'Collectibles' };

// W-CUSTOM step 10 - the studio. Left: controls (preset, accent, frames, modules with
// reorder + toggle, tabs). Right: the server-rendered draft preview with a breakpoint
// switcher. Every change validates + autosaves the DRAFT (never live); errors show as
// plain sentences. Publish (confirm + before/after summary) copies draft -> live and
// writes a revision; Rollback restores the previous look.
export function StudioClient({ groupId, groupSlug, groupName, initialDraft, preview }: {
  groupId: number; groupSlug: string; groupName: string; initialDraft: Presentation; preview: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const [draft, setDraft] = useState<Presentation>(initialDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [bp, setBp] = useState<BP>('desktop');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (next: Presentation): Promise<void> => {
    setStatus('saving');
    const r = await fetch('/api/verse/presentation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ group_id: groupId, presentation: next }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErrors(d.errors ?? ['Could not save.']); setStatus('error'); return; }
    setErrors([]); setStatus('saved'); router.refresh();
  }, [groupId, router]);

  const update = useCallback((next: Presentation): void => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 450);
  }, [save]);

  const placements = resolvePlacements(draft);
  function setModules(mods: ModulePlacement[]): void { update({ ...draft, version: 1, modules: mods }); }
  function move(i: number, dir: -1 | 1): void {
    const zone = placements[i]!.zone;
    const zoneItems = placements.filter((m) => m.zone === zone);
    const idx = zoneItems.indexOf(placements[i]!);
    const swap = idx + dir;
    if (swap < 0 || swap >= zoneItems.length) return;
    [zoneItems[idx]!.order, zoneItems[swap]!.order] = [zoneItems[swap]!.order ?? swap, zoneItems[idx]!.order ?? idx];
    const reordered = zoneItems.map((m, k) => ({ ...m, order: k }));
    const other = placements.filter((m) => m.zone !== zone);
    setModules([...reordered, ...other]);
  }
  function toggle(type: string): void {
    setModules(placements.map((m) => (m.type === type ? { ...m, hidden: !m.hidden } : m)));
  }

  async function publish(): Promise<void> {
    const r = await fetch('/api/verse/presentation/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ group_id: groupId }) });
    const d = await r.json().catch(() => ({}));
    setConfirming(false);
    if (!r.ok) { setErrors(d.errors ?? ['Publish failed.']); return; }
    setStatus('saved'); router.refresh();
  }
  async function rollback(): Promise<void> {
    const r = await fetch('/api/verse/presentation/rollback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ group_id: groupId }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErrors([d.error ?? 'Nothing to roll back to.']); return; }
    setDraft((p) => ({ ...p })); router.refresh();
  }

  const label = 'text-[11px] font-bold uppercase tracking-wide text-tertiary';
  const field = 'rounded-lg border border-default bg-transparent px-2.5 py-1.5 text-sm';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
      {/* Controls */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Studio - {groupName}</h1>
          <span className="text-[11px] text-tertiary">{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Draft saved' : status === 'error' ? 'Not saved' : ''}</span>
        </div>

        {errors.length > 0 ? (
          <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: 'var(--danger, #d24)', color: 'var(--danger, #d24)' }}>
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        ) : null}

        <div>
          <p className={label}>Preset</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRESET_LIST.map((p) => (
              <button key={p.id} onClick={() => update(applyPreset(draft, p.id))} className="rounded-lg border border-default px-2 py-2 text-xs font-semibold"
                style={draft.preset === p.id ? { borderColor: p.swatch, color: p.swatch } : undefined}>
                <span className="mb-1 block h-3 w-full rounded" style={{ background: p.swatch }} />{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className={label}>Accent</p>
            <input type="color" value={draft.accent ?? '#7c5cfc'} onChange={(e) => update({ ...draft, version: 1, accent: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-default bg-transparent" aria-label="Accent color" />
          </div>
          <div className="flex-1">
            <p className={label}>Frame</p>
            <select value={draft.frames?.default ?? 'none'} onChange={(e) => update({ ...draft, version: 1, frames: { ...draft.frames, default: e.target.value as never } })} className={`${field} mt-1 w-full`} aria-label="Frame style">
              {FRAME_STYLES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className={label}>Modules (reorder + hide)</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {placements.map((m, i) => {
              const def = BLOCK_REGISTRY[m.type];
              return (
                <li key={`${m.type}-${i}`} className="flex items-center gap-2 rounded-lg border border-default px-2 py-1.5 text-sm">
                  <span className="w-10 text-[10px] uppercase text-ghost">{m.zone}</span>
                  <span className="flex-1 truncate">{def?.label ?? m.type}{def?.seoCritical ? <span className="ml-1 text-[10px] text-tertiary">core</span> : null}</span>
                  <button onClick={() => move(i, -1)} aria-label="Move up" className="px-1 text-tertiary">&uarr;</button>
                  <button onClick={() => move(i, 1)} aria-label="Move down" className="px-1 text-tertiary">&darr;</button>
                  <button onClick={() => toggle(m.type)} disabled={def?.seoCritical} aria-label={m.hidden ? 'Show' : 'Hide'} className="px-1 text-tertiary disabled:opacity-30">{m.hidden ? 'show' : 'hide'}</button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className={label}>Tabs (pick 3-7)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALLOWED_TABS.map((t) => {
              const on = (draft.tabs ?? []).includes(t) || (!draft.tabs && ['home', 'members', 'discography', 'timeline', 'community', 'about'].includes(t));
              return (
                <button key={t} onClick={() => {
                  const cur = draft.tabs ?? ['home', 'members', 'discography', 'timeline', 'community', 'about'] as TabId[];
                  const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
                  update({ ...draft, version: 1, tabs: next });
                }} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={on ? { borderColor: 'var(--brand)', color: 'var(--brand)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{TAB_LABELS[t]}</button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 border-t border-default pt-4">
          <button onClick={() => setConfirming(true)} className="flex-1 rounded-lg py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-btn)' }}>Publish</button>
          <button onClick={() => void rollback()} className="rounded-lg border border-default px-3 py-2 text-sm font-semibold">Roll back</button>
          <a href={`/verse/${groupSlug}`} className="rounded-lg border border-default px-3 py-2 text-sm font-semibold no-underline">View live</a>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className={label}>Preview</span>
          <div className="flex gap-1">
            {(['mobile', 'tablet', 'desktop'] as BP[]).map((b) => (
              <button key={b} onClick={() => setBp(b)} className="rounded-md border px-2 py-1 text-[11px] font-semibold" style={bp === b ? { borderColor: 'var(--brand)', color: 'var(--brand)' } : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{b}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-default bg-surface p-3">
          <div className="mx-auto transition-all" style={{ maxWidth: BP_WIDTH[bp] }}>
            {preview}
          </div>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button aria-label="Cancel" className="absolute inset-0 bg-black/40" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-base font-bold">Publish this look?</h2>
            <p className="mt-1 text-sm text-secondary">Your draft replaces the live space for everyone. You can roll back afterwards.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-lg border border-default p-2"><p className="font-bold text-tertiary">Now (live)</p><p>{initialDraft.preset ?? 'default'} - {resolvePlacements(initialDraft).filter((m) => !m.hidden).length} modules</p></div>
              <div className="rounded-lg border p-2" style={{ borderColor: 'var(--brand)' }}><p className="font-bold" style={{ color: 'var(--brand)' }}>After (draft)</p><p>{draft.preset ?? 'default'} - {placements.filter((m) => !m.hidden).length} modules</p></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} className="rounded-lg border border-default px-3 py-1.5 text-sm font-semibold">Cancel</button>
              <button onClick={() => void publish()} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white" style={{ background: 'var(--brand-btn)' }}>Publish</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
