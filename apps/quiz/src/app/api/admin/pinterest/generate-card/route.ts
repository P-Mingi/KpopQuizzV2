import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: Request): Promise<NextResponse> {
  const { quizId, variant } = await req.json();
  if (!quizId || !['editorial', 'neon', 'y2k'].includes(variant)) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Mark generating
  await db.from('quiz_pinterest_cards').upsert(
    {
      quiz_id: quizId,
      variant,
      generation_status: 'generating',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'quiz_id,variant' },
  );

  try {
    // Fetch the rendered PNG from our own OG endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
    const res = await fetch(`${baseUrl}/api/og/quiz-card?quizId=${quizId}&variant=${variant}`);
    if (!res.ok) throw new Error(`OG render failed: ${res.status}`);
    const buffer = await res.arrayBuffer();

    // Upload to Storage (overwrites if exists)
    const filename = `${quizId}/${variant}.png`;
    const { error: upErr } = await db.storage
      .from('quiz-pinterest-cards')
      .upload(filename, buffer, { contentType: 'image/png', upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = db.storage.from('quiz-pinterest-cards').getPublicUrl(filename);
    const cardUrl = `${pub.publicUrl}?v=${Date.now()}`;

    // Update DB
    await db.from('quiz_pinterest_cards').update({
      card_image_url: cardUrl,
      generation_status: 'ready',
      generation_error: null,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('quiz_id', quizId).eq('variant', variant);

    return NextResponse.json({ ok: true, url: cardUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await db.from('quiz_pinterest_cards').update({
      generation_status: 'failed',
      generation_error: message,
      updated_at: new Date().toISOString(),
    }).eq('quiz_id', quizId).eq('variant', variant);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
