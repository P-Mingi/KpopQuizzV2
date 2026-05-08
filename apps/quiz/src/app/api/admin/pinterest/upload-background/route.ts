import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: Request): Promise<NextResponse> {
  const formData = await req.formData();
  const quizId = formData.get('quizId') as string;
  const file = formData.get('file') as File;
  if (!quizId || !file) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  // Validate
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'file too large (>10MB)' }, { status: 400 });
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'bad mime type' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const ext = file.name.split('.').pop();
  const filename = `${quizId}/bg-${Date.now()}.${ext}`;

  const { error } = await db.storage
    .from('quiz-backgrounds')
    .upload(filename, file, { contentType: file.type, upsert: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = db.storage.from('quiz-backgrounds').getPublicUrl(filename).data.publicUrl;

  await db.from('quizzes').update({
    pinterest_background_image_url: url,
    pinterest_background_uploaded_at: new Date().toISOString(),
  }).eq('id', quizId);

  // Invalidate existing cards (they need regeneration with new background)
  await db.from('quiz_pinterest_cards').update({
    generation_status: 'pending',
    updated_at: new Date().toISOString(),
  }).eq('quiz_id', quizId);

  return NextResponse.json({ ok: true, url });
}
