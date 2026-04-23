import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { createPinterestPin, createPinterestBoard } from '@/lib/pinterest-api';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { pin_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Fetch pin data
  const { data: pin, error: pinError } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .eq('id', body.pin_id)
    .single();

  if (pinError || !pin) {
    return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
  }

  // Resolve the board ID
  let { data: board } = await adminDb
    .from('pinterest_boards')
    .select('pinterest_board_id')
    .eq('board_name', pin.board)
    .single();

  if (!board) {
    // Auto-create the board on Pinterest
    const boardName = pin.board as string;
    const created = await createPinterestBoard(boardName);
    if (!created) {
      return NextResponse.json(
        { error: `Board "${boardName}" could not be created on Pinterest.` },
        { status: 500 },
      );
    }

    // Save the new board to our DB
    await adminDb.from('pinterest_boards').insert({
      pinterest_board_id: created.id,
      board_name: created.name,
    });

    board = { pinterest_board_id: created.id };
  }

  // Determine image URL: prefer image_public_url, then generated_image_url, then image_url
  const imageUrl = pin.image_public_url || pin.generated_image_url || pin.image_url;
  if (!imageUrl) {
    return NextResponse.json({ error: 'Pin has no image URL' }, { status: 400 });
  }

  const result = await createPinterestPin({
    title: pin.title,
    description: pin.description,
    link: pin.link_url || undefined,
    board_id: board.pinterest_board_id,
    image_url: imageUrl,
  });

  if (result.success) {
    await adminDb
      .from('pinterest_pins')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        pinterest_pin_id: result.pin_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.pin_id);

    return NextResponse.json({ success: true, pinterest_pin_id: result.pin_id });
  }

  // Mark as failed
  await adminDb
    .from('pinterest_pins')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.pin_id);

  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
