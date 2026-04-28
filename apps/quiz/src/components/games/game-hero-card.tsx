import Link from 'next/link';

interface GameHeroCardProps {
  title: string;
  description: string;
  emoji: string;
  color: string;
  playersThisWeek: string;
  href: string;
}

export function GameHeroCard({ title, description, emoji, color, playersThisWeek, href }: GameHeroCardProps) {
  return (
    <Link href={href} style={{
      flex: 1, borderRadius: 14, overflow: 'hidden',
      background: '#fff', border: '1px solid #e8e6e0',
      cursor: 'pointer', textDecoration: 'none', color: 'inherit',
      display: 'block',
    }}>
      <div style={{
        height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${color}08, ${color}15)`,
      }}>
        <span style={{ fontSize: 28 }}>{emoji}</span>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 8, color: '#888780', margin: 0, marginTop: 3, lineHeight: 1.4 }}>{description}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 8, color: '#b4b2a9' }}>{playersThisWeek} played this week</span>
          <div style={{
            padding: '4px 10px', borderRadius: 6,
            background: color, color: '#fff',
            fontSize: 9, fontWeight: 600,
          }}>Play</div>
        </div>
      </div>
    </Link>
  );
}
