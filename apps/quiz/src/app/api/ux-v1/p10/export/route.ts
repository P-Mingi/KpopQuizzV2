import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { UX_V1 } from '@/lib/ux-v1';

// UX v11 (P10): Settings > Account > "Download your data". READ ONLY: the signed-in
// user's own rows through their own session (RLS), paginated past the 1000-row
// cap, returned as a JSON attachment. Flag off: 404. No service role, no writes.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFILE_COLUMNS = 'username, display_name, bio, avatar_url, header_url, created_at, xp, ult_groups, bias, stan_since, profile_theme, name_accent, name_font, pinned_badge_id, avatar_kind, avatar_ref, quizzes_played, blindtests_played, daily_streak, daily_streak_longest, total_quizzes_created, total_plays_received, total_likes_received, follower_count, following_count';

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to download your data.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  const soft = async <T,>(p: () => Promise<T>, fallback: T): Promise<T> => { try { return await p(); } catch { return fallback; } };

  const [profile, badges, plays, blindtests, quizzes, comments, prefs] = await Promise.all([
    soft(async () => (await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()).data, null),
    soft(async () => (await supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id)).data ?? [], [] as unknown[]),
    soft(() => fetchAllRows<unknown>(() => supabase.from('plays').select('quiz_id, score, total_questions, time_taken_seconds, created_at').eq('player_id', user.id).order('created_at', { ascending: true })), [] as unknown[]),
    soft(() => fetchAllRows<unknown>(() => supabase.from('blind_test_plays').select('mode_id, score, total, created_at').eq('player_id', user.id).order('created_at', { ascending: true })), [] as unknown[]),
    soft(() => fetchAllRows<unknown>(() => supabase.from('quizzes').select('id, title, slug, status, quiz_type, difficulty, language, play_count, like_count, created_at').eq('creator_id', user.id).order('created_at', { ascending: true })), [] as unknown[]),
    soft(() => fetchAllRows<unknown>(() => supabase.from('quiz_comments').select('quiz_id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: true })), [] as unknown[]),
    soft(async () => (await supabase.from('notification_prefs').select('categories, quiz_mutes').eq('user_id', user.id).maybeSingle()).data, null),
  ]);

  const body = JSON.stringify({
    exported_at: new Date().toISOString(),
    site: 'https://kpopquiz.org',
    account: { email: user.email ?? null, created_at: user.created_at, sign_in: user.app_metadata?.provider ?? null },
    profile,
    badges,
    quiz_plays: plays,
    blindtest_plays: blindtests,
    quizzes_created: quizzes,
    comments,
    notification_settings: prefs,
  }, null, 2);

  const name = `kpopquiz-${(profile as { username?: string } | null)?.username ?? 'data'}.json`.replace(/[^a-z0-9._-]/gi, '_');
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
