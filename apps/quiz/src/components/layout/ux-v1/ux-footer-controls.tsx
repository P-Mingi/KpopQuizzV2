'use client';

import { Icon } from '@/components/ux-v1/icon';
import { applyTheme, useEffectiveTheme } from '@/lib/ux-v1/a0/theme';


/** Footer theme switch (prototype: "Dark mode" / "Light mode"), the existing theme system. */
export function UxFooterTheme(): React.ReactElement {
  const dark = useEffectiveTheme() === 'dark';
  return (
    <button type="button" onClick={() => applyTheme(dark ? 'light' : 'dark')} suppressHydrationWarning>
      <Icon name={dark ? 'sun' : 'moon'} size="sm" />
      <span suppressHydrationWarning>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
