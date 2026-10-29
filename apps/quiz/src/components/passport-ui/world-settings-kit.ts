// Run O1, lot (b), P1 (rule 18): what the shared settings screen (components/profile/ux-v1/settings) needs on a world site and
// never on kpop. The screen loads this file with import() only when it gets a `world` prop, so no kpop page reaches it: the
// membership reads, the dirty and problem checks of the world form, and the writes of the save (membership patch, shared
// profile flair, followed series, oshi, in that order).

import { createBrowserClient } from '@/lib/supabase/client';
import { fmt } from '@/lib/passport-ui/fmt';
import { clearOshi, pickOshi } from '@/lib/passport-ui/oshi';
import {
  WORLD_MEMBERSHIP_SELECT, WORLD_PROFILE_SELECT, hasWrites, seriesRows, worldFormFromRows, worldProblems, worldWrites,
} from '@/lib/passport-ui/settings-world';

import type { User } from '@supabase/supabase-js';
import type { OshiPick } from '@/components/passport-ui/settings-world';
import type { Loaded } from '@/components/profile/ux-v1/settings';
import type { SettingsWorld, WorldMembershipRow, WorldProfileRow, WorldWrites } from '@/lib/passport-ui/settings-world';
import type { ProfileForm } from '@/lib/ux-v1/p10/settings-model';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export { hasWrites, worldProblems, worldWrites };

/** The reads of a world site's settings: the shared profile's identity and the membership of this site; never the kpop presentation. */
export async function loadWorldSettings(user: User, world: SettingsWorld): Promise<{ data: Loaded; form: ProfileForm } | null> {
  const supabase = createBrowserClient();
  const [{ data: prow }, { data: mrow }, { data: groups }, { data: badges }, { data: favs }] = await Promise.all([
    supabase.from('profiles').select(WORLD_PROFILE_SELECT).eq('id', user.id).single(),
    supabase.from('world_memberships').select(WORLD_MEMBERSHIP_SELECT).eq('user_id', user.id).eq('site_id', world.site).maybeSingle(),
    supabase.from('groups').select('id, slug, name').eq('site_id', world.site).order('name'),
    supabase.from('user_badges').select('badge_definitions!inner(id, name, site_id)').eq('user_id', user.id).eq('badge_definitions.site_id', world.site),
    supabase.from('favourites').select('entity_id, rank').eq('user_id', user.id).eq('site_id', world.site).eq('slot', 'topic').order('rank', { ascending: true }),
  ]);
  if (!prow) return null;
  const pr = prow as unknown as WorldProfileRow;
  const mr = (mrow as unknown as WorldMembershipRow | null) ?? null;
  const earned = ((badges ?? []) as Array<{ badge_definitions: { id: string; name: string } | Array<{ id: string; name: string }> }>)
    .map((b) => (Array.isArray(b.badge_definitions) ? b.badge_definitions[0] : b.badge_definitions))
    .filter((b): b is { id: string; name: string } => Boolean(b));
  const slugs = ((favs ?? []) as Array<{ entity_id: string | null }>).map((f) => f.entity_id).filter((x): x is string => typeof x === 'string' && x !== '');
  const wf = worldFormFromRows(pr, mr, slugs);
  return {
    form: wf,
    data: {
      row: { ...wf, ult_groups: wf.ult_groups, bias: wf.bias || null, stan_since: wf.stan_since ? Number(wf.stan_since) : null, xp: mr?.xp ?? 0, avatar_bg: pr.avatar_bg, avatar_text: pr.avatar_text, header_url: mr?.header_url ?? null, display_name: wf.display_name, avatar_url: wf.avatar_url || null, bio: wf.bio || null, profile_theme: wf.profile_theme, name_accent: wf.name_accent, name_font: wf.name_font, avatar_kind: wf.avatar_kind, avatar_ref: wf.avatar_ref, pinned_badge_id: wf.pinned_badge_id },
      groups: (groups ?? []) as Loaded['groups'],
      earned,
      provider: (user.app_metadata?.provider as string | undefined) ?? user.identities?.[0]?.provider ?? null,
    },
  };
}

/** The writes of the save bar on a world site. Answers the message to show when one failed, null when all went through. */
export async function saveWorldSettings(args: {
  world: SettingsWorld;
  writes: WorldWrites;
  data: Loaded;
  oshiPick: OshiPick | null;
}): Promise<string | null> {
  const { world, writes, data, oshiPick } = args;
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Sign in again to save.';
  if (Object.keys(writes.membership).length > 0) {
    await supabase.rpc('ensure_membership', { p_site: world.site, p_via: 'signup', p_via_code: null });
    const { error } = await supabase.rpc('update_my_membership', { p_site: world.site, p_patch: writes.membership });
    if (error) return 'We could not save your changes.';
  }
  if (Object.keys(writes.profile).length > 0) {
    const res = await fetch(`${BASE_PATH}/api/auth/update-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(writes.profile), credentials: 'include' });
    if (!res.ok) return 'We could not save your changes.';
  }
  if (writes.series) {
    const names = new Map(data.groups.map((g) => [g.slug, g.name]));
    const rows = seriesRows(user.id, world.site, writes.series.map((slug) => ({ slug, name: names.get(slug) ?? slug })));
    if (rows.length > 0) {
      const { error } = await supabase.from('favourites').upsert(rows, { onConflict: 'user_id,site_id,slot,rank' });
      if (error) return 'We could not save your series.';
    }
    const { error: cut } = await supabase.from('favourites').delete().eq('user_id', user.id).eq('site_id', world.site).eq('slot', 'topic').gte('rank', rows.length);
    if (cut) return 'We could not save your series.';
  }
  if (oshiPick) {
    const done = oshiPick.character
      ? await pickOshi(supabase, { userId: user.id, groupId: oshiPick.groupId, character: oshiPick.character, progress: oshiPick.progress })
      : await clearOshi(supabase, { userId: user.id, groupId: oshiPick.groupId });
    if (!done.ok) {
      return done.reason === 'spoiler' ? fmt(world.words.oshiRefused, { name: data.groups.find((g) => g.id === oshiPick.groupId)?.name ?? '' }) : 'We could not save your oshi.';
    }
  }
  return null;
}
