import Link from 'next/link';

import { PersonCard } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';

import type { FeedEvent } from '@/lib/db/queries/community';

// F1.1 - Happening now. The page's heartbeat: the full-feed form of the home
// ticker, same activity_events table, zero new writes. Baked at ISR; the coarse
// time-ago ("1h", "2d") is rendered server-side so the section stays static and
// stays honest at revalidate 300.
//
// Liveness gate lives here: with fewer than MIN_LIVE events in the last 48h the
// feed hides and a quiet-hours state shows instead. The feed is NEVER padded
// with filler rows.
const MIN_LIVE = 4;

export function HappeningNow({ events, recentCount }: { events: FeedEvent[]; recentCount: number }): React.ReactElement {
  const live = recentCount >= MIN_LIVE && events.length > 0;

  if (!live) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '22px 16px' }}>
        <p style={seclab}>Happening now</p>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 8px' }}>
          <Mascot variant="sleep" size={56} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '0 auto 12px', maxWidth: 260 }}>
          The fandom is napping. Play something and wake it up.
        </p>
        <Link href="/quizzes" className="btn-outline" style={{ textDecoration: 'none' }}>
          Browse quizzes
        </Link>
      </div>
    );
  }

  return (
    <div style={card}>
      <p style={{ ...seclab, marginBottom: 4 }}>Happening now</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((e) => (
          <FeedRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function FeedRow({ event }: { event: FeedEvent }): React.ReactElement {
  // Two sibling links, never nested: the identity links to the person's profile
  // (PersonCard owns that anchor) and the phrase links to what they did. The
  // spec's "whole row is one Link" would nest an <a> inside PersonCard's <a>,
  // which is invalid HTML and breaks hydration, so the row is split into these
  // two distinct destinations instead. Follow is off here: the row is about the
  // activity, not about following.
  const phrase = event.href ? (
    <Link href={event.href} style={phraseLink}>
      <span style={phraseText}>{event.phrase}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--txt3)', flexShrink: 0 }} aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  ) : (
    // streak_milestone and anything without a meaningful destination is not linked.
    <span style={phraseText}>{event.phrase}</span>
  );

  return (
    <div style={rowStyle}>
      <div style={headStyle}>
        {event.person ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <PersonCard person={event.person} compact showFollow={false} />
          </div>
        ) : (
          // Anonymous events carry no identity: no PersonCard, no fake avatar.
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt2)' }}>Someone</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--txt3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{event.ago}</span>
      </div>
      {phrase}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 0',
  borderTop: '1px solid var(--border)',
};
const headStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
};
const phraseLink: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none',
};
const phraseText: React.CSSProperties = {
  fontSize: 12.5, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};
