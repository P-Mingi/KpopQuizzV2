import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from('battle_players')
    .select('joined_at, battle_rooms!inner(id, code, status, host_user_id)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return NextResponse.json([]);

  const formatted = data.map((row: Record<string, unknown>) => {
    const room = row.battle_rooms as Record<string, unknown> | null;
    return {
      code: room?.code ?? '',
      host: 'Host',
      lastPlayed: timeAgo(row.joined_at as string),
      players: 0,
    };
  });

  return NextResponse.json(formatted);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
