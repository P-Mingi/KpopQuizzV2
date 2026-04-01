import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createPinterestPin } from '@/lib/pinterest-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = createServiceRoleClient();

  // Find pins that are due to be posted
  const { data: duePins } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(5);

  if (!duePins || duePins.length === 0) {
    return NextResponse.json({ message: 'No pins to post' });
  }

  const results: Array<{ id: string; success: boolean; error?: string | undefined }> = [];

  for (const pin of duePins) {
    try {
      // Resolve board
      const { data: board } = await adminDb
        .from('pinterest_boards')
        .select('pinterest_board_id')
        .eq('board_name', pin.board)
        .single();

      if (!board) {
        results.push({ id: pin.id, success: false, error: `Board "${pin.board}" not found` });
        continue;
      }

      const imageUrl = pin.image_public_url || pin.generated_image_url || pin.image_url;
      if (!imageUrl) {
        results.push({ id: pin.id, success: false, error: 'No image URL' });
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
          .eq('id', pin.id);

        results.push({ id: pin.id, success: true });
      } else {
        await adminDb
          .from('pinterest_pins')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', pin.id);

        results.push({ id: pin.id, success: false, error: result.error });
      }

      // Rate limit between posts
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      results.push({ id: pin.id, success: false, error: String(err) });
    }
  }

  return NextResponse.json({ posted: results.filter((r) => r.success).length, results });
}
