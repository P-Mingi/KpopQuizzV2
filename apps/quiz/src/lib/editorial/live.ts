import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';
import { isUxV12 } from '@/lib/ux-v12';

// Is the public editorial store (editorial_posts, v12-g9-editorial.sql) there?
// Same probe as the P8 feature probe: a GET select limit 1 through the public
// client, cached 5 minutes, so applying the SQL turns the surfaces on within
// minutes. Flag off = false without any request.

async function probe(): Promise<boolean> {
  const { error, status } = await createPublicReadClient().from('editorial_posts').select('id').limit(1);
  if (!error) return true;
  if (isMissingTable(error, status)) return false;
  throw new Error(`editorial_posts probe: ${error.message}`); // never cache a blip as "not live"
}

const cachedProbe = unstable_cache(probe, ['v12:editorial:posts-live:v1'], { revalidate: 300, tags: ['editorial'] });

export async function getEditorialLive(): Promise<boolean> {
  if (!isUxV12()) return false;
  try { return await cachedProbe(); } catch { return false; }
}
