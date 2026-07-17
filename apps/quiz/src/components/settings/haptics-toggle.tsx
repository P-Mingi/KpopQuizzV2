'use client';

import { useEffect, useState } from 'react';

import { hapticsEnabled, setHapticsEnabled, haptic } from '@/lib/haptics';

// Toggle for the haptics setting (Workstream M, M1.13). Same pattern as
// SoundToggle, backed by the lib/haptics localStorage key. Fires a short vibrate
// on enable as confirmation (a no-op on devices without a motor).
export function HapticsToggle(): React.ReactElement {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(hapticsEnabled());
    setMounted(true);
  }, []);

  function handleToggle(): void {
    const next = !enabled;
    setEnabled(next);
    setHapticsEnabled(next);
    if (next) haptic('correct');
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-primary">Haptics</p>
          <p className="text-xs text-ghost">Subtle vibration on mobile</p>
        </div>
        <div className="w-10 h-6 rounded-full bg-elevated" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-primary">Haptics</p>
        <p className="text-xs text-ghost">Subtle vibration on mobile</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle haptics"
        onClick={handleToggle}
        className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-accent' : 'bg-elevated'}`}
      >
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}
