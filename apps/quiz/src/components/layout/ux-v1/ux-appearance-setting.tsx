'use client';

import { useSyncExternalStore } from 'react';

import { Segmented } from '@/components/ux-v1/segmented';
import { applyTheme, storedTheme } from '@/lib/ux-v1/a0/theme';

import type { ThemeChoice } from '@/lib/ux-v1/a0/theme';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// The stored choice follows the <html> class (every toggle changes it) and other tabs.
function subscribe(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', onChange);
  return () => { obs.disconnect(); window.removeEventListener('storage', onChange); };
}

/**
 * Settings > Appearance (DESIGN-SPEC 16.7: System / Light / Dark). The EXISTING
 * class-based theme system (localStorage['theme'], html.light / html.dark), no new
 * system, no server write. Rendered by /settings when the flag is on.
 */
export function UxAppearanceSetting(): React.ReactElement {
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, storedTheme, () => 'system');
  return (
    <div className="ux-field" style={{ marginTop: 0 }}>
      <p className="ux-flabel">Appearance</p>
      <Segmented label="Appearance" options={OPTIONS} value={choice} onChange={(v) => applyTheme(v)} />
      <p className="ux-help">System follows your device. Your choice is saved on this browser.</p>
    </div>
  );
}
