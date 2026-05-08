'use client';

import Link from 'next/link';

interface BattleErrorProps {
  reset: () => void;
}

export default function BattleError({ reset }: BattleErrorProps): React.ReactElement {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '32px 24px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#2c2c2a' }}>Something went wrong</p>
      <p style={{ fontSize: 13, color: '#888780' }}>
        An error occurred in Battle Rooms. Please try again.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: '#fff', border: '1px solid #e8e6e0',
            color: '#2c2c2a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link href="/battle" style={{
          padding: '10px 20px', borderRadius: 10,
          background: '#D4537E', color: '#fff',
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>
          Back to Battle hub
        </Link>
      </div>
    </div>
  );
}
