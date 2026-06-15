import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';

import type { Group } from '@/lib/db/types';

// Public catalog read - uses the cookie-free client so callers (home page,
// trivia hub, etc.) can stay static/ISR-cacheable.
export async function getAllGroups(): Promise<Group[]> {
  const supabase = createPublicReadClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('quiz_count', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch groups: ${error.message}`);
  return data as Group[];
}

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
