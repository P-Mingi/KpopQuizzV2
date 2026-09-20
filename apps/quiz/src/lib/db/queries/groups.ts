import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';

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

// FREE-VIABILITY: getGroupBySlug is the group-row read behind EVERY /[group]-quiz
// and /q/[slug] render (generateMetadata + the page body both call it). It used
// the cookie client, which forced those routes DYNAMIC (per-request Postgres) and
// drove the /rest/v1/groups 6,746 reads in the 24h baseline. It is a pure public
// read (a group is the same for everyone), so it moves to the cookie-free client -
// which lets the routes serve ISR again - wrapped in unstable_cache so the row is
// read once per TTL per slug instead of once per render. RLS still applies (anon).
export const getGroupBySlug = unstable_cache(
  async (slug: string): Promise<Group | null> => {
    const supabase = createPublicReadClient();

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
  },
  ['db:groups:getGroupBySlug:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups'] },
);

export const getGroupByName = unstable_cache(
  async (name: string): Promise<Group | null> => {
    const supabase = createPublicReadClient();

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .ilike('name', name)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch group by name: ${error.message}`);
    return data as Group | null;
  },
  ['db:groups:getGroupByName:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups'] },
);
