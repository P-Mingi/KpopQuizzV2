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

  let body: { pin_ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pin_ids } = body;
  if (!pin_ids?.length) {
    return NextResponse.json({ error: 'No pin_ids provided' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();
  const results: Array<{ pin_id: string; success: boolean; pinterest_pin_id?: string | undefined; error?: string | undefined }> = [];

  for (const pinId of pin_ids) {
    try {
      const { data: pin } = await adminDb
        .from('pinterest_pins')
        .select('*')
        .eq('id', pinId)
        .single();

      if (!pin) {
        results.push({ pin_id: pinId, success: false, error: 'Pin not found' });
        continue;
      }

      let { data: board } = await adminDb
        .from('pinterest_boards')
        .select('pinterest_board_id')
        .eq('board_name', pin.board)
        .single();

      if (!board) {
        const created = await createPinterestBoard(pin.board as string);
        if (!created) {
          results.push({ pin_id: pinId, success: false, error: `Board "${pin.board}" could not be created` });
          continue;
        }
        await adminDb.from('pinterest_boards').insert({ pinterest_board_id: created.id, board_name: created.name });
        board = { pinterest_board_id: created.id };
      }

      const imageUrl = pin.image_public_url || pin.generated_image_url || pin.image_url;
      if (!imageUrl) {
        results.push({ pin_id: pinId, success: false, error: 'No image URL' });
        continue;
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
          .eq('id', pinId);

        results.push({ pin_id: pinId, success: true, pinterest_pin_id: result.pin_id });
      } else {
        await adminDb
          .from('pinterest_pins')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', pinId);

        results.push({ pin_id: pinId, success: false, error: result.error });
      }

      // Rate limit: 2s between posts
      if (pin_ids.indexOf(pinId) < pin_ids.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      results.push({ pin_id: pinId, success: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  return NextResponse.json({ total: pin_ids.length, succeeded, results });
}
