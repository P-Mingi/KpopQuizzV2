import { PersonCard } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';
import { QuizMyRank } from '@/components/quiz/quiz-my-rank';

import type { HallOfFameEntry } from '@/lib/db/queries/community';

// Per-quiz Hall of Fame (Workstream M, M1.19). Server-rendered (ISR-baked, public)
// so /q/[slug] stays static/ISR + crawlable. Top scorers as M1.12 PersonCards +
// their score; anonymous scorers show as "someone" (no card/link). Per-quiz ranks
// (#1..#N) are a bounded leaderboard, allowed. The personal "your standing" is a
// client island. Thin quiz -> Mascot invite, never an empty board.
const MIN_ENTRIES = 3;

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 24, maxWidth: 672,
};

export function QuizHallOfFame({ quizId, entries }: { quizId: string; entries: HallOfFameEntry[] }): React.ReactElement {
  const thin = entries.length < MIN_ENTRIES;

  return (
    <div style={card}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: '0 0 4px' }}>Hall of Fame</p>
      <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '0 0 12px' }}>Top scorers on this quiz.</p>

      {thin ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <Mascot variant="celebrate" size={56} />
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, lineHeight: 1.5 }}>Be the first to ace this quiz and claim the top spot.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, color: i < 3 ? 'var(--brand)' : 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {e.person ? (
                  <PersonCard person={e.person} compact showFollow={false} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-alt)', border: '1px solid var(--border)' }} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>someone</span>
                  </div>
                )}
              </div>
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>{e.score}/{e.total}</span>
            </div>
          ))}
        </div>
      )}

      {/* Your standing on this quiz (personal client island) */}
      <QuizMyRank quizId={quizId} />
    </div>
  );
}
