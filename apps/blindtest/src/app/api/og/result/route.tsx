import { ImageResponse } from 'next/og';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = searchParams.get('score') ?? '0';
  const total = searchParams.get('total') ?? '10';
  const points = searchParams.get('points') ?? '0';
  const mode = searchParams.get('mode') ?? 'Classic';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0D0D0F', color: '#E8E6E0', fontFamily: 'sans-serif',
      }}>
        <p style={{ fontSize: '16px', color: '#7A786E', margin: '0 0 8px' }}>{mode} mode</p>
        <p style={{ fontSize: '72px', fontWeight: 700, margin: 0 }}>{score}/{total}</p>
        <p style={{ fontSize: '24px', color: '#ED93B1', margin: '8px 0 0' }}>
          {parseInt(points).toLocaleString()} pts
        </p>
        <p style={{ fontSize: '20px', color: '#7A786E', margin: '32px 0 0' }}>Can you beat this?</p>
        <p style={{ fontSize: '16px', color: '#5A584E', margin: '8px 0 0' }}>kpopblindtest.com</p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
