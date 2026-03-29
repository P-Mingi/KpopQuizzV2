import { ImageResponse } from 'next/og';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getMasteryProgress } from '@/lib/progression';

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createServiceRoleClient();

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .single();

  if (!player) return new Response('Not found', { status: 404 });

  const { data: masteries } = await supabase
    .from('player_group_mastery')
    .select('*, groups!inner(name)')
    .eq('player_id', player.id)
    .order('mastery_xp', { ascending: false })
    .limit(3);

  const accuracy = Math.round(player.total_songs_correct / Math.max(player.total_songs_played, 1) * 100);

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#0D0D0F', color: '#E8E6E0', padding: '60px',
        fontFamily: 'sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#ED93B1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: '#0D0D0F',
          }}>
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '32px', fontWeight: 600, margin: 0 }}>{player.username}</p>
            <p style={{ fontSize: '18px', color: '#ED93B1', margin: '4px 0 0' }}>
              Level {player.level} - {player.xp.toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '48px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '36px', fontWeight: 600, margin: 0 }}>{player.total_songs_correct.toLocaleString()}</p>
            <p style={{ fontSize: '14px', color: '#7A786E', margin: 0 }}>songs guessed</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '36px', fontWeight: 600, margin: 0 }}>{accuracy}%</p>
            <p style={{ fontSize: '14px', color: '#7A786E', margin: 0 }}>accuracy</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '36px', fontWeight: 600, margin: 0 }}>{player.best_combo}x</p>
            <p style={{ fontSize: '14px', color: '#7A786E', margin: 0 }}>best combo</p>
          </div>
        </div>

        {/* Mastery bars */}
        {(masteries ?? []).map((m: Record<string, unknown>) => {
          const groups = m.groups as { name: string } | null;
          const xp = m.mastery_xp as number;
          const level = m.mastery_level as number;
          return (
            <div key={m.group_id as number} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, width: '140px' }}>{groups?.name ?? 'Unknown'}</span>
              <div style={{ flex: 1, height: '8px', background: '#1E1E24', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: '#ED93B1', width: `${getMasteryProgress(xp) * 100}%` }} />
              </div>
              <span style={{ fontSize: '14px', color: '#ED93B1', fontWeight: 600 }}>Lv.{level}</span>
            </div>
          );
        })}

        {/* Watermark */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#5A584E' }}>kpopblindtest.com</p>
          {player.current_streak > 0 && (
            <p style={{ fontSize: '14px', color: '#EF9F27' }}>{player.current_streak}-day streak</p>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
