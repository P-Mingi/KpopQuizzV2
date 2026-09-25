'use client';

import { useEffect, useState } from 'react';

import { Segmented } from '@/components/ux-v1/segmented';
import { applyTheme, storedTheme } from '@/lib/ux-v1/a0/theme';

import type { ThemeChoice } from '@/lib/ux-v1/a0/theme';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Settings > Appearance (DESIGN-SPEC 16.7: System / Light / Dark). The EXISTING
 * class-based theme system (localStorage['theme'], html.light / html.dark), no new
 * system, no server write. Rendered by /settings when the flag is on.
 */
export function UxAppearanceSetting(): React.ReactElement {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  useEffect(() => { setChoice(storedTheme()); }, []);
  return (
    <div className="ux-field" style={{ marginTop: 0 }}>
      <p className="ux-flabel">Appearance</p>
      <Segmented
        label="Appearance"
        options={OPTIONS}
        value={choice}
        onChange={(v) => { setChoice(v); applyTheme(v); }}
      />
      <p className="ux-help">System follows your device. Your choice is saved on this browser.</p>
    </div>
  );
}
