// quizData.js — reads the daily quiz from the QUIZ project's Supabase using its
// public anon key (same values the web app exposes as NEXT_PUBLIC_SUPABASE_*).
// Read-only: published quizzes only.

import { createClient } from '@supabase/supabase-js';

let _client;
function db() {
  if (!_client) {
    // Prefer the explicit QUIZ_* names; fall back to the web app's NEXT_PUBLIC_*
    // (anon key only — the bot never needs the service-role key).
    const url = process.env.QUIZ_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.QUIZ_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing QUIZ_SUPABASE_URL / QUIZ_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.');
    }
    _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _client;
}

const SELECT = 'slug, title, quiz_type, questions';

// Today's Quiz-of-the-Day, matching the web app's date logic (UTC YYYY-MM-DD).
// Falls back to the most recent QOTD if today's row isn't found (timezone /
// publish-timing safety).
export async function getTodaysQuiz() {
  const today = new Date().toISOString().split('T')[0];
  const exact = await db().from('quizzes').select(SELECT)
    .eq('status', 'published').eq('is_quiz_of_the_day', true)
    .eq('quiz_of_the_day_date', today).maybeSingle();
  if (exact.error) throw exact.error;
  if (exact.data) return exact.data;

  const latest = await db().from('quizzes').select(SELECT)
    .eq('status', 'published').eq('is_quiz_of_the_day', true)
    .order('quiz_of_the_day_date', { ascending: false }).limit(1);
  if (latest.error) throw latest.error;
  return latest.data?.[0] || null;
}

export async function getQuizBySlug(slug) {
  const { data, error } = await db().from('quizzes').select(SELECT)
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}
