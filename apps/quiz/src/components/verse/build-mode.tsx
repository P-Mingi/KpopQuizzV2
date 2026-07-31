'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// V-MODES step 1 - ONE role-aware toggle (locked Q2). Readers never see it;
// signed-in members with any build-relevant right (member+ per Q1: quests)
// can flip the builder layer on. OFF on every visit, remembered per session
// only (sessionStorage, per space), so nobody lands in an editing surface by
// surprise. When ON, the chrome takes the editing accent: a thin CTA-color
// top rule plus the toggle's own filled state, so the mode is always legible.

export type BuildRole = 'visitor' | 'member' | 'contributor' | 'curator' | 'space_admin';

interface BuildModeState {
  role: BuildRole;
  /** Signed-in with any build-relevant right (member or above). */
  canBuild: boolean;
  on: boolean;
  toggle: () => void;
}

const BuildModeContext = createContext<BuildModeState>({ role: 'visitor', canBuild: false, on: false, toggle: () => {} });

export function useBuildMode(): BuildModeState {
  return useContext(BuildModeContext);
}

const keyFor = (slug: string): string => `verse-build-mode:${slug}`;

export function BuildModeProvider({ groupId, slug, children }: {
  groupId: number; slug: string; children: React.ReactNode;
}): React.ReactElement {
  const [role, setRole] = useState<BuildRole>('visitor');
  const [on, setOn] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/membership?group_id=${groupId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const r = (d?.role ?? 'visitor') as BuildRole;
        setRole(r);
        // Session memory applies only while the right holds; visitors never restore.
        if (r !== 'visitor' && sessionStorage.getItem(keyFor(slug)) === 'on') setOn(true);
      })
      .catch(() => {});
  }, [groupId, slug]);

  const canBuild = role !== 'visitor';
  const toggle = (): void => {
    setOn((prev) => {
      const next = !prev;
      try { sessionStorage.setItem(keyFor(slug), next ? 'on' : 'off'); } catch { /* private mode */ }
      return next;
    });
  };
  const active = canBuild && on;

  return (
    <BuildModeContext.Provider value={{ role, canBuild, on: active, toggle }}>
      <div data-build-mode={active ? 'on' : 'off'} className="contents">
        {/* The editing accent: a thin top rule in the CTA color, only in Build mode. */}
        {active ? <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px]" style={{ background: 'var(--verse-cta, var(--verse-accent))' }} /> : null}
        {/* Announced state change for screen readers; the button itself carries aria-pressed. */}
        <span role="status" className="sr-only">{canBuild ? (active ? 'Build mode is on' : 'Build mode is off') : ''}</span>
        {children}
      </div>
    </BuildModeContext.Provider>
  );
}

export function BuildModeToggle(): React.ReactElement | null {
  const { canBuild, on, toggle } = useBuildMode();
  if (!canBuild) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className="v-tap inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-colors"
      style={on
        ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))', borderColor: 'transparent' }
        : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)', background: 'transparent' }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      Build
      <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-80">{on ? 'On' : 'Off'}</span>
    </button>
  );
}
