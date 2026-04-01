import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getPinterestBoards } from '@/lib/pinterest-api';

export async function POST(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const boards = await getPinterestBoards();
    const adminDb = createServiceRoleClient();

    for (const board of boards) {
      await adminDb.from('pinterest_boards').upsert(
        {
          board_name: board.name,
          pinterest_board_id: board.id,
        },
        { onConflict: 'board_name' },
      );
    }

    return NextResponse.json({ synced: boards.length, boards });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync boards' },
      { status: 500 },
    );
  }
}
