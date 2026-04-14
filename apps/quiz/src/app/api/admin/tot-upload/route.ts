import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const itemId = formData.get('item_id') as string | null;

  if (!file || !itemId) {
    return NextResponse.json({ error: 'Missing file or item_id' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `tot/${itemId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminDb.storage
    .from('quiz-images')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = adminDb.storage
    .from('quiz-images')
    .getPublicUrl(filename);

  // Update the item row with the new image URL
  const { error: updateError } = await adminDb
    .from('tot_items')
    .update({ image_url: publicUrl })
    .eq('id', itemId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}
