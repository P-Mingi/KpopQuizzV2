'use client';

import { useEffect, useState } from 'react';

// UX v1 /settings appearance control (System / Light / Dark). Reuses the EXISTING
// class-based theme system - it writes the same localStorage['theme'] key
// (absent = system) and toggles the same .light/.dark class on <html> the top-bar
// toggle uses, so the two stay in sync. No new theme system, no server write.
type Choice = 'system' | 'light' | 'dark';

function currentChoice(): Choice {
  try {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') return t;
  } catch { /* storage blocked */ }
  return 'system';
}

function apply(choice: Choice): void {
  const root = document.documentElement;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 280);
  }
  root.classList.remove('light', 'dark');
  try {
    if (choice === 'system') localStorage.removeItem('theme');
    else { root.classList.add(choice); localStorage.setItem('theme', choice); }
  } catch { /* storage blocked - still applies for this session */ }
  // System: follow the OS immediately for the live tab.
  if (choice === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) root.classList.add('dark');
  }
}

const OPTIONS: { key: Choice; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function UxAppearanceSetting(): React.ReactElement {
  const [choice, setChoice] = useState<Choice>('system');
  useEffect(() => { setChoice(currentChoice()); }, []);

  return (
    <div className="uxv1-appearance">
      <p className="uxv1-appearance-label">Appearance</p>
      <div className="uxv1-appearance-seg" role="group" aria-label="Appearance">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`uxv1-appearance-opt${choice === o.key ? ' is-active' : ''}`}
            aria-pressed={choice === o.key}
            onClick={() => { setChoice(o.key); apply(o.key); }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="uxv1-appearance-hint">System follows your device. Your choice is saved on this browser.</p>
    </div>
  );
}
