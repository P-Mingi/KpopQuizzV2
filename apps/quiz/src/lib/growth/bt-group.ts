// V12 (owner, 2026-10-13): the group blindtest page, /blindtest/group-<slug>, as an
// indexable page with real content (SEO: the v11 page held 20 to 30 words, the kind
// Google crawls and leaves out of its index). Everything here is a real row: the
// group's playable songs (the same clean pool generate draws a round from), their
// album and year, and the other pages that exist for the group. Server only.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { whichMemberPath } from '@/lib/personality/view';
import { createPublicReadClient } from '@/lib/supabase/server';
import { forSite } from '@/lib/site/scope';

export interface GroupTrack { title: string; album: string | null; year: number | null }

/** Songs listed on the page: the group's best known first (Deezer rank). */
export const GROUP_TRACKS_SHOWN = 30;

async function readGroupTracks(slug: string): Promise<GroupTrack[]> {
  const db = createPublicReadClient();
  const { data: g, error: ge } = await forSite(db.from('groups').select('id')).eq('slug', slug).maybeSingle();
  if (ge) throw new Error(`[bt group] ${ge.message}`);
  const id = (g as { id: number } | null)?.id;
  if (!id) return [];
  // The pool generate plays (lib/blind-test-playlists.ts cleanSongs): active, no remix,
  // instrumental or karaoke version.
  const { data, error } = await forSite(db.from('songs').select('title, album_name, year, deezer_rank'))
    .eq('group_id', id).eq('status', 'active')
    .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%')
    .order('deezer_rank', { ascending: false, nullsFirst: false })
    .limit(GROUP_TRACKS_SHOWN * 2);
  if (error) throw new Error(`[bt group] ${error.message}`);
  const seen = new Set<string>();
  const out: GroupTrack[] = [];
  for (const r of (data ?? []) as Array<{ title: string | null; album_name: string | null; year: number | null }>) {
    const title = r.title?.trim();
    if (!title) continue;
    const key = title.toLowerCase(); // two versions of one song are listed once
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, album: r.album_name?.trim() || null, year: Number.isInteger(r.year) && (r.year as number) > 1990 ? r.year : null });
    if (out.length >= GROUP_TRACKS_SHOWN) break;
  }
  return out;
}

export const getGroupTracks = unstable_cache(readGroupTracks, ['ux12:bt-group:tracks:v1'], { revalidate: CACHE_TTL.stats, tags: ['blindtest'] });

/** Title, H1, lead and description of a group blindtest page, from the group's real name and song count. */
export function groupBlindtestCopy(name: string, songs: number): { title: string; h1: string; lead: string; description: string } {
  const n = songs.toLocaleString('en-US');
  return {
    title: `${name} Blind Test: Guess the Song`,
    h1: `${name} blind test`,
    lead: `${n} ${name} songs, ten-second clips. Ten rounds: name each song before the clip ends.`,
    description: `Guess the ${name} song from a ten-second clip: ${n} songs in the pool, ten rounds a game. Free, no sign-up, and you can play it live with friends.`,
  };
}

/** The group's other pages that exist (links only to pages that answer 200). */
export function groupPages(slug: string, name: string, wmaSlugs: readonly string[]): Array<{ href: string; label: string }> {
  const out = [{ href: `/${slug}-quiz`, label: `${name} quizzes` }];
  if ((NAME_ALL_GROUPS as readonly string[]).includes(slug)) out.push({ href: prettyPath(slug), label: `Name all ${name} members` });
  if (wmaSlugs.includes(slug)) out.push({ href: whichMemberPath(slug), label: `Which ${name} member are you?` });
  return out;
}
