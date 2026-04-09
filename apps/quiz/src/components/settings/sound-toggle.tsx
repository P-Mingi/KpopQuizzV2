'use client';

import { useEffect, useState } from 'react';

import { isSoundEnabled, setSoundEnabled, playTap } from '@/lib/sounds';

/**
 * Toggle switch for the sound effects setting. Reads/writes the same
 * localStorage key used by `lib/sounds.ts`. Plays a short `playTap` when
 * enabling so the user hears a confirmation.
 */
export function SoundToggle(): React.ReactElement {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(isSoundEnabled());
    setMounted(true);
  }, []);

  function handleToggle(): void {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) playTap();
  }

  // Avoid flashing the wrong state on first render; render a static pill
  // until we've read the persisted value.
  if (!mounted) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-primary">Sound effects</p>
          <p className="text-xs text-ghost">Taps, chimes, and celebrations</p>
        </div>
        <div className="w-10 h-6 rounded-full bg-elevated" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-primary">Sound effects</p>
        <p className="text-xs text-ghost">Taps, chimes, and celebrations</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle sound effects"
        onClick={handleToggle}
        className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
          enabled ? 'bg-accent' : 'bg-elevated'
        }`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}
