'use client';

import { useEffect, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';

// Bunnyverse: this build's base path, inlined by Next at build time.
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

interface State { available: boolean; hour?: number | null; confirmed?: boolean; pending?: boolean }

const pad = (n: number): string => String(n).padStart(2, '0');
/** The hour of the day on the player's clock to UTC and back (today's offset: good enough for a daily hour). */
const localToUtc = (h: number): number => new Date(new Date().setHours(h, 0, 0, 0)).getUTCHours();
const utcToLocal = (h: number): number => new Date(new Date().setUTCHours(h, 0, 0, 0)).getHours();

/**
 * Audit 01 P2-10: the daily quiz reminder by email. Shows nothing unless the server says it is available (flag on and the L27 table
 * there) and the player is signed in. Double opt-in, an hour the player chooses, "15 or older" ticked, one-click stop. No push here.
 */
export function DailyReminderSetting(): React.ReactElement | null {
  const [st, setSt] = useState<State | null>(null);
  const [hour, setHour] = useState(18);
  const [age15, setAge15] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${BASE_PATH}/api/reminders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((s: State) => { setSt(s); if (typeof s.hour === 'number') setHour(utcToLocal(s.hour)); })
      .catch(() => setSt({ available: false }));
  }, []);

  if (!st || !st.available) return null;

  const subscribe = async (): Promise<void> => {
    setBusy(true); setNote(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/reminders`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hour: localToUtc(hour), age15 }) });
      if (res.ok) { setSt({ available: true, pending: true, confirmed: false, hour: localToUtc(hour) }); setNote('Check your inbox: the reminder starts when you open the link in the email.'); }
      else setNote(res.status === 403 ? 'Reminders are for players aged 15 or older.' : 'We could not save the reminder. Try again later.');
    } finally { setBusy(false); }
  };
  const stop = async (): Promise<void> => {
    setBusy(true); setNote(null);
    try {
      await fetch(`${BASE_PATH}/api/reminders`, { method: 'DELETE', credentials: 'include' });
      setSt({ available: true, hour: null, confirmed: false, pending: false });
      setNote('Reminder stopped.');
    } finally { setBusy(false); }
  };

  return (
    <div className="p10-srow" data-testid="daily-reminder">
      <span className="p10-srow-g">
        <b id="p10-n-daily-reminder">Daily quiz reminder by email</b>
        <small>One email a day at the hour you choose, only if you have not played yet. No tracking. Stop it in one click.</small>
        {st.confirmed ? <small>On, at {pad(utcToLocal(st.hour ?? 0))}:00 your time.</small> : st.pending ? <small>Waiting for you to open the link in the confirmation email.</small> : null}
        {!st.confirmed ? (
          <>
            <label className="p10-srow-l"><span>Hour </span>
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Reminder hour, your time">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </select>
            </label>
            <label className="p10-srow-l"><input type="checkbox" checked={age15} onChange={(e) => setAge15(e.target.checked)} /> I am 15 or older</label>
          </>
        ) : null}
        {note ? <small role="status">{note}</small> : null}
      </span>
      {st.confirmed || st.pending
        ? <UxButton variant="ghost" size="sm" disabled={busy} onClick={() => { void stop(); }}>Stop</UxButton>
        : <UxButton size="sm" disabled={busy || !age15} onClick={() => { void subscribe(); }}>Send the confirmation</UxButton>}
    </div>
  );
}
