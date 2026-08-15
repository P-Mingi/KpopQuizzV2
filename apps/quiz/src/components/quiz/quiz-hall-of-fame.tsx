import { PersonCard } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';
import { QuizMyRank } from '@/components/quiz/quiz-my-rank';

import type { HallOfFameEntry } from '@/lib/db/queries/community';

// Per-quiz Hall of Fame (Workstream M, M1.19, M1.13 polish). Server-rendered
// (ISR-baked, public, crawlable) so /q/[slug] stays static/ISR. Top scorers as
// M1.12 PersonCards + score + completion time (fastest time wins ties);
// anonymous scorers show as "someone". The top 5 show by default; the rest sit in
// a native <details> (no client island, still crawlable) so the card stays short.
const MIN_ENTRIES = 3;
const TOP_VISIBLE = 5;

function fmtTime(s: number | null): string | null {
  if (s === null || s < 0) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 24, maxWidth: 672,
};

function Row({ entry, rank, divider, isClues, openRunBattleId }: { entry: HallOfFameEntry; rank: number; divider: boolean; isClues: boolean; openRunBattleId: string | null }): React.ReactElement {
  const time = fmtTime(entry.timeSeconds);
  // guess_from_clues scores up to 3 points/question, so the denominator is total * 3.
  const displayTotal = entry.total * (isClues ? 3 : 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: divider ? '1px solid var(--border)' : 'none' }}>
      <span style={{ width: 22, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, color: rank <= 3 ? 'var(--brand)' : 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {entry.person ? (
          <PersonCard person={entry.person} compact showFollow={false} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-alt)', border: '1px solid var(--border)' }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>someone</span>
          </div>
        )}
      </div>
      {/* W2b C2 - a quiet "beat this run" ONLY where this player has left a real
          unbeaten run on this quiz. Where none exists there is no action at all: no
          disabled tease, no substitute, no redirect to a random battle. */}
      {openRunBattleId && (
        <a
          className="beat-run"
          href={`/battle?b=${openRunBattleId}&utm_source=hall&utm_medium=internal&utm_campaign=beat_this_run`}
          aria-label="Beat this run"
        >
          Beat this run
        </a>
      )}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{entry.score}/{displayTotal}</div>
        {time && <div style={{ fontSize: 11, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{time}</div>}
      </div>
    </div>
  );
}

export function QuizHallOfFame({ quizId, entries, isClues = false, openRuns = [] }: { quizId: string; entries: HallOfFameEntry[]; isClues?: boolean; openRuns?: Array<[string, string]> }): React.ReactElement {
  // Matched in memory from ONE page-level query, never a per-row lookup.
  const openRunners = new Map(openRuns);
  const thin = entries.length < MIN_ENTRIES;
  const top = entries.slice(0, TOP_VISIBLE);
  const rest = entries.slice(TOP_VISIBLE);

  return (
    <div style={card}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: '0 0 4px' }}>Hall of Fame</p>
      <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '0 0 10px' }}>Top scorers on this quiz. Fastest time wins ties.</p>

      {thin ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <Mascot variant="celebrate" size={56} />
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, lineHeight: 1.5 }}>Be the first to ace this quiz and claim the top spot.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {top.map((e, i) => <Row key={i} entry={e} rank={i + 1} divider={i > 0} isClues={isClues} openRunBattleId={e.person ? openRunners.get(e.person.username) ?? null : null} />)}
          </div>

          {rest.length > 0 && (
            <details className="kq-hof-more">
              <summary style={{
                listStyle: 'none', cursor: 'pointer', marginTop: 10, padding: '7px 0',
                fontSize: 12, fontWeight: 700, color: 'var(--brand)', textAlign: 'center',
                borderTop: '1px solid var(--border)',
              }}>
                Show all {entries.length}
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rest.map((e, i) => <Row key={i} entry={e} rank={i + 1 + TOP_VISIBLE} divider={i > 0} isClues={isClues} openRunBattleId={e.person ? openRunners.get(e.person.username) ?? null : null} />)}
              </div>
            </details>
          )}
        </>
      )}

      {/* Your standing on this quiz (personal client island) */}
      <QuizMyRank quizId={quizId} isClues={isClues} />
    </div>
  );
}
