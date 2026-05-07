import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const supabase = await createServerClient();

  const { data: room } = await supabase
    .from('battle_rooms')
    .select('id, status')
    .eq('code', code)
    .neq('status', 'closed')
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ exists: false });
  }

  const { count } = await supabase
    .from('battle_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .is('left_at', null);

  return NextResponse.json({
    exists: true,
    full: (count ?? 0) >= 8,
  });
}
