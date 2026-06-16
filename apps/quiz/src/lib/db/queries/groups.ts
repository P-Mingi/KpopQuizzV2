import { unstable_cache } from 'next/cache';

import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';

import type { Group } from '@/lib/db/types';

// Public catalog read - uses the cookie-free client so callers (home page,
// trivia hub, etc.) can stay static/ISR-cacheable. Wrapped in unstable_cache
// because the same response is requested from many pages (home, /create,
// /quizzes, /battle, sitemap) and groups change rarely - this turns those
// repeats into a single hot in-memory hit instead of repeated REST calls
// under the crawl wave.
const TTL_SECONDS = 600;

const fetchAllGroups = async (): Promise<Group[]> => {
  const supabase = createPublicReadClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('quiz_count', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch groups: ${error.message}`);
  return data as Group[];
};

export const getAllGroups = unstable_cache(
  fetchAllGroups,
  ['db:groups:getAllGroups:v1'],
  { revalidate: TTL_SECONDS, tags: ['groups'] },
);

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch group: ${error.message}`);
  }

  return data as Group;
}

export async function getGroupByName(name: string): Promise<Group | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .ilike('name', name)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch group by name: ${error.message}`);
  return data as Group | null;
}
