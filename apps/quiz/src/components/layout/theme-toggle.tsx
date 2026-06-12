'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getEffective(): Theme {
  if (typeof document === 'undefined') return 'light';
  const c = document.documentElement.classList;
  if (c.contains('dark')) return 'dark';
  if (c.contains('light')) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 280);
  }
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // private mode / storage blocked - theme still applies for this session
  }
  const color = theme === 'dark' ? '#141210' : '#FAF8F5';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

const SUN = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MOON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export function ThemeToggle({ className }: { className?: string }): React.ReactElement {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setTheme(getEffective());
    sync();
    setMounted(true);
    // Observe the <html> class so every toggle (nav + footer) stays in sync,
    // whoever flipped it - more robust than a cross-component event with the
    // Suspense-streamed nav.
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', sync);
    };
  }, []);

  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
      }}
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title="Toggle theme"
    >
      <span className="theme-toggle-icon" aria-hidden="true">{isDark ? MOON : SUN}</span>
    </button>
  );
}
