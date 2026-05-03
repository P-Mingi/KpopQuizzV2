'use client';

interface ByeolResultBlockProps {
  byeolEarned: number;
  wasFirstTime?: boolean;
  capReached?: boolean;
  earnedToday?: number;
  dailyCap?: number;
}

export function ByeolResultBlock({
  byeolEarned,
  wasFirstTime,
  capReached,
  earnedToday,
  dailyCap,
}: ByeolResultBlockProps) {
  // Layer 1: first time -> celebration
  if (wasFirstTime && byeolEarned > 0) {
    return (
      <div style={{
        marginTop: 12, padding: '12px 16px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(232,160,96,0.08), rgba(212,83,126,0.06))',
        border: '1px solid rgba(232,160,96,0.15)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#e8a060', margin: 0 }}>
          +{byeolEarned} <span style={{ fontSize: 14 }}>{'\uBCC4'}</span>
        </p>
        <p style={{ fontSize: 9, color: '#888780', margin: 0, marginTop: 2 }}>added to your wallet</p>
      </div>
    );
  }

  // Layer 1: replay - no reward
  if (wasFirstTime === false && byeolEarned === 0 && capReached === undefined) {
    return (
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(154,122,204,0.04)', border: '1px solid rgba(154,122,204,0.1)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9a7acc', margin: 0 }}>
          No {'\uBCC4'} this time
        </p>
        <p style={{ fontSize: 9, color: '#888780', margin: 0, marginTop: 3, lineHeight: 1.4 }}>
          You already earned for this one - try a new quiz to earn more!
        </p>
      </div>
    );
  }

  // Layer 2: daily cap reached
  if (capReached) {
    return (
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(232,160,96,0.04)', border: '1px solid rgba(232,160,96,0.12)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#e8a060', margin: 0 }}>
          Daily cap reached
        </p>
        <p style={{ fontSize: 9, color: '#888780', margin: 0, marginTop: 3 }}>
          You've earned {earnedToday}/{dailyCap} {'\uBCC4'} today - resets at midnight UTC
        </p>
      </div>
    );
  }

  // Layer 2: still earning, show progress
  if (byeolEarned > 0 && earnedToday !== undefined && dailyCap !== undefined) {
    return (
      <div style={{
        marginTop: 12, padding: '12px 16px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(232,160,96,0.08), rgba(212,83,126,0.06))',
        border: '1px solid rgba(232,160,96,0.15)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#e8a060', margin: 0 }}>
          +{byeolEarned} <span style={{ fontSize: 14 }}>{'\uBCC4'}</span>
        </p>
        <p style={{ fontSize: 9, color: '#888780', margin: 0, marginTop: 2 }}>
          {earnedToday}/{dailyCap} {'\uBCC4'} earned today
        </p>
        <div style={{
          marginTop: 6, height: 4, borderRadius: 2,
          background: 'rgba(232,160,96,0.15)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, (earnedToday / dailyCap) * 100)}%`,
            height: 4, background: '#e8a060',
          }} />
        </div>
      </div>
    );
  }

  return null;
}
