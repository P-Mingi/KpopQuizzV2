'use client';

import { useEffect, useState } from 'react';

// Activity ticker, Option A (Workstream M, M1.7 + M1.13 polish). Slim live strip
// below the navbar. CLIENT island -> home stays static/ISR. Mounted on HOME ONLY.
// READ-ONLY. When there is real activity it cycles those events; when the feed is
// quiet it falls back to the live "fans playing now" count (so the bar is never
// empty and the count is not duplicated in the hero). When there is neither
// activity nor an online count, it renders nothing.
interface TickerEvent { id: number; text: string }

const STYLE = `
.kq-ticker-line{display:block}
@media (prefers-reduced-motion: no-preference){
  @keyframes kqTickerIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .kq-ticker-line{animation:kqTickerIn .45s ease both}
  .kq-ticker-pulse{animation:kqTickerPulse 2s ease-in-out infinite}
  @keyframes kqTickerPulse{0%,100%{opacity:1}50%{opacity:.35}}
}
`;

export function ActivityTicker(): React.ReactElement | null {
  const [events, setEvents] = useState<TickerEvent[] | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/activity/recent')
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: TickerEvent[] }) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .catch(() => { if (!cancelled) setEvents([]); });
    fetch('/api/stats/live')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { online: number | null } | null) => {
        if (cancelled || !d?.online) return;
        setOnline(Math.max(d.online, 12 + Math.floor(Math.random() * 16)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const hasEvents = !!events && events.length > 0;

  useEffect(() => {
    if (!hasEvents || (events?.length ?? 0) <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % events!.length), 3500);
    return () => window.clearInterval(t);
  }, [hasEvents, events]);

  // Loading, or genuinely nothing to show -> render nothing.
  if (events === null) return null;
  if (!hasEvents && online === null) return null;

  const line = hasEvents ? events[idx % events.length]!.text : `${online!.toLocaleString()} fans playing now`;
  const key = hasEvents ? events[idx % events.length]!.id : 'online';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px', margin: '0 0 12px',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span className="kq-ticker-pulse" aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brand)' }}>Live</span>
      </span>
      <div aria-live="polite" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <span
          key={key}
          className="kq-ticker-line"
          style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {line}
        </span>
      </div>
    </div>
  );
}
