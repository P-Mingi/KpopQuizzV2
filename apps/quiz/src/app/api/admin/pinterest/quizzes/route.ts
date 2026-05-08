import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  let query = db
    .from('quizzes')
    .select(`
      id, title, slug, difficulty, question_count,
      pinterest_background_image_url, created_at,
      groups!inner(name, display_color),
      cards:quiz_pinterest_cards(id, variant, card_image_url, generation_status, pinterest_status, generated_at)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter === 'recent') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  }

  const { data } = await query;
  let result = data ?? [];

  if (filter === 'with_cards') {
    result = result.filter((q: Record<string, unknown>) => {
      const cards = (q.cards ?? []) as Array<{ generation_status: string }>;
      return cards.filter(c => c.generation_status === 'ready').length >= 3;
    });
  } else if (filter === 'missing') {
    result = result.filter((q: Record<string, unknown>) => {
      const cards = (q.cards ?? []) as Array<{ generation_status: string }>;
      return cards.filter(c => c.generation_status === 'ready').length < 3;
    });
  }

  // Flatten groups join for frontend convenience
  const mapped = result.map((q: Record<string, unknown>) => {
    const groups = q.groups as { name: string; display_color: string } | null;
    return {
      ...q,
      group_name: groups?.name ?? 'Unknown',
      display_color: groups?.display_color ?? '#D4537E',
    };
  });

  return NextResponse.json(mapped);
}
