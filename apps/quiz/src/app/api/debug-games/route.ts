import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
    },
  };

  // Test 1: Cookie-based client (createServerClient)
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('games')
      .select('id, title, game_type, status')
      .eq('game_type', 'name_all_members')
      .eq('status', 'published')
      .limit(3);

    results.cookieClient = error
      ? { error: error.message, code: error.code, details: error.details }
      : { count: data?.length, titles: data?.map(g => g.title) };
  } catch (err) {
    results.cookieClient = { thrown: String(err) };
  }

  // Test 2: Service role client
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('games')
      .select('id, title, game_type, status')
      .eq('game_type', 'name_all_members')
      .eq('status', 'published')
      .limit(3);

    results.serviceClient = error
      ? { error: error.message, code: error.code, details: error.details }
      : { count: data?.length, titles: data?.map(g => g.title) };
  } catch (err) {
    results.serviceClient = { thrown: String(err) };
  }

  // Test 3: All games regardless of type
  try {
    const supabase = await createServerClient();
    const { count, error } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    results.totalGames = error ? { error: error.message } : { count };
  } catch (err) {
    results.totalGames = { thrown: String(err) };
  }

  return NextResponse.json(results);
}
