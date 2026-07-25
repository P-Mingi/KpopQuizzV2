import Link from 'next/link';

import type { PulsePayload } from '@/lib/pulse/compute';

// Workstream T0: the shared renderer for one monthly Pulse report. Pure and
// presentational so both the public /data/pulse/[month] page and the admin
// "regenerate" preview render the exact same thing from a PulsePayload. Every
// number here is first-party and traceable to computePulse(); thin sections
// (debate below the vote gate, blind-test recognition) arrive already nulled
// and simply do not render.

function formatDay(iso: string): string {
  // Accepts an ISO timestamp or a 'YYYY-MM-DD' date; renders "July 1, 2026".
  const d = iso.length <= 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function IconCrown(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 18h20l-2-9-5 4-3-8-3 8-5-4z" />
    </svg>
  );
}

function IconPlay(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconSwords(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" />
    </svg>
  );
}

function IconChat(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTrend(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconQuote(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

export function PulseReportView({ payload }: { payload: PulsePayload }): React.ReactElement {
  const asOf = formatDay(payload.generatedAt);
  const { community } = payload;

  const communityCards: Array<{ label: string; value: number; accent: string }> = [
    { label: 'Quiz plays', value: community.plays, accent: 'var(--brand)' },
    { label: 'Quizzes created', value: community.quizzesCreated, accent: '#7c5cfc' },
    { label: 'New fans', value: community.newFans, accent: '#10b981' },
  ];

  return (
    <div className="pulse-report">
      {/* Methodology + as-of, stamped up front so the whole page reads as dated. */}
      <p className="pulse-method">
        Every figure below is measured first-party from real plays and votes on kpopquiz.org
        over {payload.monthLabel} (UTC), as of {asOf}. Sections with too little data to be
        meaningful this month are hidden rather than shown thin.
      </p>

      {/* 1. Fandom of the month */}
      {payload.fandom && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <span className="pulse-section-icon" style={{ color: 'var(--brand)' }}><IconCrown /></span>
            <h2 className="pulse-section-title">Fandom of the month</h2>
          </div>
          <div className="pulse-hero">
            <div className="pulse-hero-num">
              <span className="pulse-hero-value">{payload.fandom.plays.toLocaleString('en-US')}</span>
              <span className="pulse-hero-unit">plays</span>
            </div>
            <p className="pulse-hero-text">
              <Link href={`/${payload.fandom.slug}-quiz`} className="pulse-hero-name">{payload.fandom.name}</Link>{' '}
              was {payload.monthLabel}&apos;s most-played fandom.
            </p>
          </div>
        </section>
      )}

      {/* 2. Most-played quizzes */}
      {payload.mostPlayed.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <span className="pulse-section-icon" style={{ color: '#7c5cfc' }}><IconPlay /></span>
            <h2 className="pulse-section-title">Most-played quizzes</h2>
          </div>
          <p className="pulse-section-desc">The top {payload.mostPlayed.length} quizzes by real plays in {payload.monthLabel}.</p>
          <div className="pulse-table-wrap">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th className="pulse-th pulse-th-rank">#</th>
                  <th className="pulse-th">Quiz</th>
                  <th className="pulse-th pulse-th-num">Plays</th>
                </tr>
              </thead>
              <tbody>
                {payload.mostPlayed.map((q, i) => (
                  <tr key={q.slug} className="pulse-tr">
                    <td className="pulse-td pulse-td-rank">
                      <span className={`pulse-rank ${i < 3 ? `pulse-rank-top pulse-rank-${i + 1}` : ''}`}>{i + 1}</span>
                    </td>
                    <td className="pulse-td">
                      <Link href={`/q/${q.slug}`} className="pulse-quiz-link">{q.title}</Link>
                      <span className="pulse-quiz-group">{q.group}</span>
                    </td>
                    <td className="pulse-td pulse-td-num">{q.plays.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. Duel verdict of the month */}
      {payload.duel && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <span className="pulse-section-icon" style={{ color: '#f59e0b' }}><IconSwords /></span>
            <h2 className="pulse-section-title">Duel verdict of the month</h2>
          </div>
          <div className="pulse-verdict">
            <span className="pulse-verdict-q">{payload.duel.prompt}</span>
            <span className="pulse-verdict-winner">Fans crowned <strong>{payload.duel.winner}</strong></span>
            <span className="pulse-verdict-votes">{payload.duel.votes.toLocaleString('en-US')} votes in {payload.monthLabel}</span>
          </div>
        </section>
      )}

      {/* 4. Debate verdict (gated: only present when it cleared the vote threshold) */}
      {payload.debate && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <span className="pulse-section-icon" style={{ color: '#f472b6' }}><IconChat /></span>
            <h2 className="pulse-section-title">Debate of the month</h2>
          </div>
          <p className="pulse-section-desc">
            &ldquo;{payload.debate.prompt}&rdquo; drew {payload.debate.totalVotes.toLocaleString('en-US')} votes on {formatDay(payload.debate.date)}.
          </p>
          <div className="pulse-splits">
            {payload.debate.splits.map((s) => (
              <div key={s.side} className="pulse-split">
                <div className="pulse-split-head">
                  <span className="pulse-split-side">{s.side}</span>
                  <span className="pulse-split-pct">{s.pct}%</span>
                </div>
                <div className="pulse-split-bar"><span className="pulse-split-fill" style={{ width: `${s.pct}%` }} /></div>
                <span className="pulse-split-count">{s.count.toLocaleString('en-US')} votes</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Community growth */}
      <section className="pulse-section">
        <div className="pulse-section-head">
          <span className="pulse-section-icon" style={{ color: '#10b981' }}><IconTrend /></span>
          <h2 className="pulse-section-title">Community growth</h2>
        </div>
        <p className="pulse-section-desc">Honest monthly totals for {payload.monthLabel}, not cumulative all-time counts.</p>
        <div className="pulse-cards">
          {communityCards.map((c) => (
            <div key={c.label} className="pulse-card">
              <span className="pulse-card-value" style={{ color: c.accent }}>{c.value.toLocaleString('en-US')}</span>
              <span className="pulse-card-label">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Context corner (owner-curated external citations) */}
      {payload.citations.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <span className="pulse-section-icon" style={{ color: 'var(--txt2)' }}><IconQuote /></span>
            <h2 className="pulse-section-title">Context corner</h2>
          </div>
          <p className="pulse-section-desc">Wider K-pop numbers for context, each dated and linked to its source. Curated, not scraped.</p>
          <ul className="pulse-cites">
            {payload.citations.map((c, i) => (
              <li key={i} className="pulse-cite">
                <p className="pulse-cite-claim">{c.claim}</p>
                <span className="pulse-cite-meta">
                  <a href={c.url} target="_blank" rel="nofollow noopener noreferrer" className="pulse-cite-src">{c.source}</a>
                  {' · as of '}{formatDay(c.as_of_date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The polite backlink ask. */}
      <p className="pulse-cite-foot">
        This report is free to cite with a link to{' '}
        <Link href={`/data/pulse/${payload.month}`} className="pulse-cite-foot-link">kpopquiz.org/data/pulse/{payload.month}</Link>.
        Figures are first-party and stamped with the month they were measured.
      </p>
    </div>
  );
}
