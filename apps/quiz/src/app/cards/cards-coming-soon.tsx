import Link from 'next/link';

export function CardsComingSoon() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 480,
        textAlign: 'center',
      }}>
        {/* Card stack illustration */}
        <div style={{
          position: 'relative',
          width: 120,
          height: 160,
          margin: '0 auto 32px',
        }}>
          {/* Back card */}
          <div style={{
            position: 'absolute',
            width: 100,
            height: 140,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%) rotate(-8deg)',
            boxShadow: '0 4px 16px rgba(127, 119, 221, 0.25)',
          }} />
          {/* Middle card */}
          <div style={{
            position: 'absolute',
            width: 100,
            height: 140,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
            top: 4,
            left: '50%',
            transform: 'translateX(-50%) rotate(4deg)',
            boxShadow: '0 4px 16px rgba(212, 83, 126, 0.25)',
          }} />
          {/* Front card */}
          <div style={{
            position: 'absolute',
            width: 100,
            height: 140,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #EF9F27 0%, #D4830D 100%)',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            boxShadow: '0 6px 20px rgba(239, 159, 39, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 36 }}>?</span>
          </div>
        </div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: 12,
        }}>
          Fan Cards are coming!
        </h1>

        <p style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          marginBottom: 8,
        }}>
          Soon you'll be able to open packs and collect beautiful cards
          of your favorite idols. Build your ultimate collection, chase
          rare pulls, and show off your bias cards.
        </p>

        <p style={{
          fontSize: 13,
          color: 'var(--text-tertiary)',
          marginBottom: 32,
        }}>
          Play quizzes and earn Byeol now so you're ready to open packs on day one!
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            href="/games"
            style={{
              padding: '12px 28px',
              borderRadius: 9999,
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Play & earn Byeol
          </Link>
          <Link
            href="/"
            style={{
              padding: '12px 28px',
              borderRadius: 9999,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
