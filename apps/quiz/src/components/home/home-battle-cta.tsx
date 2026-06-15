import Link from 'next/link';

// E7 - "Battle of the day" thin home strip. Date-seeded to a featured quiz so it
// is stable for the day; tapping starts a quiz-anchored 1v1 battle. Mirrors the
// blindtest CTA layout with a brand accent. Mobile-safe (single full-width row).
export function HomeBattleCta({ quizId, groupName }: { quizId?: string; groupName?: string }): React.ReactElement {
  const href = quizId ? `/battle?quiz=${quizId}` : '/battle';
  const sub = groupName ? `Beat a real ${groupName} fan, then challenge your friends` : 'Beat a real fan, then challenge your friends';
  return (
    <div className="home-cta-row">
      <Link href={href} className="bt-cta battle-cta" aria-label="Play a 1v1 K-pop battle">
        <span className="bt-cta-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l14 14M14 5l5-2-2 5M5 19l5 2-2-5" /><path d="M16 16l3 3M8 8 5 5" />
          </svg>
        </span>
        <span className="bt-cta-text">
          <span className="bt-cta-title">Battle of the day</span>
          <span className="bt-cta-sub">{sub}</span>
        </span>
        <span className="bt-cta-go">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          <span className="bt-cta-go-label">Battle</span>
        </span>
      </Link>
    </div>
  );
}
