'use client';

import { useEffect, useState } from 'react';

import { NOTIFICATION_CATEGORIES } from '@/lib/notification-types';

// O0 item 4: the Notifications settings section. Five category toggles (the 10
// live types grouped), default everything on (absent category = on). Writes
// through /api/notifications/prefs; the mig-122 trigger enforces at send time.
export function NotificationPrefs(): React.ReactElement {
  const [cats, setCats] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/notifications/prefs');
        if (r.ok) { const d = (await r.json()) as { categories?: Record<string, boolean> }; setCats(d.categories ?? {}); }
      } catch { /* keep defaults (all on) */ } finally { setLoaded(true); }
    })();
  }, []);

  const isOn = (key: string): boolean => cats[key] !== false; // absent or true => on

  async function toggle(key: string): Promise<void> {
    const next = !isOn(key);
    setCats((p) => ({ ...p, [key]: next })); // optimistic
    setSaving(key);
    try {
      const r = await fetch('/api/notifications/prefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories: { [key]: next } }),
      });
      if (!r.ok) setCats((p) => ({ ...p, [key]: !next })); // revert on failure
    } catch {
      setCats((p) => ({ ...p, [key]: !next }));
    } finally { setSaving(null); }
  }

  return (
    <div className="flex flex-col">
      {NOTIFICATION_CATEGORIES.map((c) => {
        const on = isOn(c.key);
        return (
          <div key={c.key} className="flex items-center justify-between py-2 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{c.label}</p>
              <p className="text-xs text-ghost">{c.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`${c.label} notifications`}
              onClick={() => void toggle(c.key)}
              disabled={saving === c.key || !loaded}
              className={`shrink-0 relative w-10 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${on ? 'bg-accent' : 'bg-elevated'}`}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
