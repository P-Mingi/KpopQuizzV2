'use client';

import { useEffect, useState } from 'react';

export function HomeHero() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats/live')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.online) setOnline(Math.max(d.online, 12 + Math.floor(Math.random() * 16))); })
      .catch(() => {});
  }, []);

  return (
    <section style={{ padding: '28px 0 20px', textAlign: 'center' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 10,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          {online ? `${online.toLocaleString()} fans playing now` : 'fans playing now'}
        </span>
      </div>
      <h1 style={{
        fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
        letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0,
      }}>
        K-pop quizzes <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--accent)' }}>made by fans</span>,
        <br />played by thousands.
      </h1>
      <p style={{
        marginTop: 12, fontSize: 14, color: 'var(--text-secondary)',
        maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
      }}>
        Trivia about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups.
        Test how well you really know them.
      </p>
    </section>
  );
}
