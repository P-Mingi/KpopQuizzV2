import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { onQuizChanged } from '@/lib/seo/quiz-freshness';
import { SITE_ID } from '@/lib/site/registry';
import { forSite } from '@/lib/site/scope';
import { spoilerColumnsFor } from '@/lib/quiz/site-insert';

import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const adminDb = createServiceRoleClient();
  // Run O1: only a quiz of the build's site (a no-op on kpop with SITE_SCOPE off).
  const { data, error } = await forSite(adminDb
    .from('quizzes')
    .select('*, groups(id, name, slug)'))
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  return NextResponse.json({ quiz: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === 'string') update.title = body.title;
  if (typeof body.difficulty === 'string') update.difficulty = body.difficulty;
  if (typeof body.status === 'string') update.status = body.status;

  // Manual cover override - when present in the body, always wins.
  // Pass null/empty string to clear the cover and fall back to auto.
  const hasManualCover = Object.prototype.hasOwnProperty.call(body, 'cover_image_url');
  if (hasManualCover) {
    const raw = body.cover_image_url;
    if (raw === null || (typeof raw === 'string' && raw.trim().length === 0)) {
      update.cover_image_url = null;
    } else if (typeof raw === 'string') {
      update.cover_image_url = raw.trim();
    }
  }

  // Update questions (JSONB column)
  if (Array.isArray(body.questions)) {
    update.questions = body.questions;
    update.question_count = body.questions.length;

    // Run O1: the level of an anime quiz follows its questions' tags (computed here, never taken from the body).
    if (SITE_ID !== 'kpop') {
      const { data: own } = await forSite(adminDb.from('quizzes').select('group_id')).eq('id', id).maybeSingle();
      Object.assign(update, await spoilerColumnsFor(adminDb, (own as { group_id: number } | null)?.group_id ?? null, body.questions));
    }

    // Auto-update cover_image_url from first question - but only if the
    // admin didn't explicitly set or clear it in this PATCH.
    if (!hasManualCover) {
      const firstQ = body.questions[0] as Record<string, unknown> | undefined;
      if (firstQ) {
        if (typeof firstQ.image_url === 'string' && firstQ.image_url) {
          update.cover_image_url = firstQ.image_url;
        } else if (Array.isArray(firstQ.options)) {
          const firstOpt = firstQ.options[0] as Record<string, unknown> | undefined;
          if (firstOpt && typeof firstOpt.image_url === 'string' && firstOpt.image_url) {
            update.cover_image_url = firstOpt.image_url;
          }
        }
      }
    }
  }

  const { data: saved, error } = await forSite(adminDb.from('quizzes').update(update)).eq('id', id).select('slug, status, groups(slug)').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // SEO: the quiz page, its hub, /new and the sitemap reflect the change now (a removed
  // quiz 404s at once); IndexNow hears of it.
  if (saved) {
    const row = saved as { slug: string; status: string; groups: unknown };
    const g = Array.isArray(row.groups) ? row.groups[0] : row.groups;
    const groupSlug = g && typeof g === 'object' ? (g as { slug?: string }).slug ?? null : null;
    const change = row.status !== 'published' ? 'removed' : typeof body.status === 'string' ? 'published' : 'edited';
    onQuizChanged(change, row.slug, [groupSlug]);
  }

  return NextResponse.json({ success: true });
}
