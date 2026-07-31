// Full space read model, shared by the shell and every tab. Cookie-free +
// safeFetch-friendly. Min-gated: absent data yields empty arrays / nulls and the
// UI hides the module. No personal-life fields are ever selected.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { idolSlug, albumSlug } from './slug';
import { validatePresentation } from './presentation/validate';
import { EMPTY_PRESENTATION } from './presentation/types';

import type { Presentation } from './presentation/types';

export interface SpaceGroup {
  id: number; name: string; slug: string; fandom_name: string;
  display_color: string | null; text_color: string | null; logo_url: string | null;
  generation: string | null; inception_date: string | null; record_label: string | null;
  origin_country: string | null; official_website: string | null; quiz_count: number | null;
}
export interface SpaceConfig {
  welcome_line: string | null; est_year: number | null; sns_links: { label: string; url: string }[];
  former_members_shown: boolean; charter_text: string | null; is_launch: boolean;
}
export interface SpaceIdol {
  id: number; name: string; slug: string; name_hangul: string | null; positions: string[];
  photo_url: string | null; birth_date: string | null; nationality: string | null; unit_id: number | null; ord: number;
}
export interface SpaceUnit { id: number; name: string; slug: string | null; }
export interface SpaceAlbum {
  id: number; title: string; slug: string; release_date: string | null; type: string; region: string;
  mbid: string | null;
}
export interface SpaceComeback { title: string; release_date: string; kind: string; }

export interface SpaceStickerAsset { id: number; path: string }
export interface Space {
  group: SpaceGroup;
  config: SpaceConfig;
  presentation: Presentation;   // W-CUSTOM: validated LIVE presentation (empty = default look)
  stickerAssets: SpaceStickerAsset[]; // W-CUSTOM: active curator sticker uploads (asset:N refs)
  idols: SpaceIdol[];
  units: SpaceUnit[];
  albums: SpaceAlbum[];
  comeback: SpaceComeback | null;
  counts: { members: number; albums: number; tracks: number };
  surfaces: { quiz: boolean; blindtest: boolean; nameAll: boolean; personality: boolean };
}

const DEFAULT_CONFIG: SpaceConfig = {
  welcome_line: null, est_year: null, sns_links: [],
  former_members_shown: false, charter_text: null, is_launch: false,
};

// Cached per request so the layout (hero/tabs) and the page (tab body) share one
// fetch. ISR (revalidate) caches across requests on top of this.
export const getSpace = cache(async (slug: string): Promise<Space | null> => {
  const db = createPublicReadClient();
  const { data: group, error: groupErr } = await db
    .from('groups')
    .select('id, name, slug, fandom_name, display_color, text_color, logo_url, generation, inception_date, record_label, origin_country, official_website, quiz_count')
    .eq('slug', slug)
    .maybeSingle();
  // A query ERROR is not an absent row: returning null here would bake a 404
  // into the ISR cache for a real space (the V-POLISH phase-1 bake law).
  if (groupErr) throw new Error(`getSpace(${slug}): group lookup failed: ${JSON.stringify(groupErr)}`);
  if (!group) return null;
  const g = group as SpaceGroup;

  const results = await Promise.all([
    db.from('verse_spaces').select('welcome_line, est_year, sns_links, presentation, former_members_shown, charter_text, is_launch').eq('group_id', g.id).maybeSingle(),
    db.from('idols').select('id, name, name_hangul, positions, photo_url, birth_date, nationality, unit_id, ord').eq('group_id', g.id).eq('active', true).order('ord'),
    db.from('group_units').select('id, name, slug').eq('parent_group_id', g.id),
    db.from('albums').select('id, title, release_date, type, region, musicbrainz_mbid').eq('group_id', g.id).order('release_date', { ascending: false, nullsFirst: false }),
    db.from('comebacks').select('title, release_date, kind').eq('group_id', g.id).eq('active', true).gte('release_date', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)).order('release_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('games').select('id').eq('group_id', g.id).eq('game_type', 'name_all_members').eq('status', 'published').limit(1),
    db.from('personality_profiles').select('group_id').eq('group_id', g.id).eq('active', true).limit(1),
    // blind_test_songs keys by group_id (the old group_slug column is gone; the
    // stale filter errored under anon and silently hid the Blind test surface).
    db.from('blind_test_songs').select('id', { count: 'exact', head: true }).eq('group_id', g.id).eq('status', 'active').not('clip_chorus', 'is', null),
  ]);
  // RESILIENCE: a failed CORE query (config, idols, units, albums) must FAIL the
  // render, not silently degrade it: a degraded page (empty presentation, zero
  // members) would be ISR-cached for an hour and served as the truth. Throwing
  // keeps the previous good ISR version alive. The auxiliary game-surface counts
  // (comeback, games, personality, blindtest) degrade gracefully: their absence
  // only hides a min-gated link, which is honest; log so drift is visible.
  results.forEach((r, i) => {
    const err = (r as { error?: unknown }).error;
    if (!err) return;
    if (i <= 3) throw new Error(`getSpace(${slug}): core query[${i}] failed: ${JSON.stringify(err)}`);
    console.warn(`getSpace(${slug}): aux query[${i}] failed (surface hidden): ${JSON.stringify(err)}`);
  });
  const [
    { data: cfg }, { data: idols }, { data: units }, { data: albums },
    { data: comeback }, { data: nameAll }, { data: personality }, { count: btCount },
  ] = results;

  // W-CUSTOM: active curator sticker uploads for asset:N sticker refs (public read).
  const { data: assetRows } = await db.from('verse_space_assets').select('id, storage_path').eq('space_id', g.id).eq('kind', 'sticker').eq('status', 'active');
  const stickerAssets: SpaceStickerAsset[] = ((assetRows ?? []) as { id: number; storage_path: string }[]).map((a) => ({ id: a.id, path: a.storage_path }));

  const idolRows: SpaceIdol[] = ((idols ?? []) as never[]).map((r) => {
    const x = r as { id: number; name: string; name_hangul: string | null; positions: string[] | null; photo_url: string | null; birth_date: string | null; nationality: string | null; unit_id: number | null; ord: number };
    return { id: x.id, name: x.name, slug: idolSlug(x.name), name_hangul: x.name_hangul, positions: x.positions ?? [], photo_url: x.photo_url, birth_date: x.birth_date, nationality: x.nationality, unit_id: x.unit_id, ord: x.ord };
  });
  const albumRows: SpaceAlbum[] = ((albums ?? []) as never[]).map((r) => {
    const x = r as { id: number; title: string; release_date: string | null; type: string; region: string; musicbrainz_mbid: string | null };
    return { id: x.id, title: x.title, slug: albumSlug(x.title), release_date: x.release_date, type: x.type, region: x.region, mbid: x.musicbrainz_mbid ?? null };
  });

  // real track count for this group's albums (bounded second query, ids known)
  let tracks = 0;
  if (albumRows.length) {
    const { count } = await db.from('album_tracks').select('id', { count: 'exact', head: true }).in('album_id', albumRows.map((a) => a.id));
    tracks = count ?? 0;
  }

  const config: SpaceConfig = cfg ? {
    welcome_line: (cfg as SpaceConfig).welcome_line ?? null,
    est_year: (cfg as SpaceConfig).est_year ?? null,
    sns_links: Array.isArray((cfg as SpaceConfig).sns_links) ? (cfg as SpaceConfig).sns_links : [],
    former_members_shown: (cfg as SpaceConfig).former_members_shown ?? false,
    charter_text: (cfg as SpaceConfig).charter_text ?? null,
    is_launch: (cfg as SpaceConfig).is_launch ?? false,
  } : DEFAULT_CONFIG;

  // W-CUSTOM: validate the stored LIVE presentation. An empty {} (unconfigured) or
  // anything invalid falls back to the default look, so a bad row can never break a
  // public page.
  const rawPres = (cfg as { presentation?: unknown } | null)?.presentation;
  const isEmptyPres = !rawPres || (typeof rawPres === 'object' && Object.keys(rawPres as object).length === 0);
  const presentation: Presentation = isEmptyPres
    ? EMPTY_PRESENTATION
    : (validatePresentation(rawPres).value ?? EMPTY_PRESENTATION);

  return {
    group: g,
    config,
    presentation,
    stickerAssets,
    idols: idolRows,
    units: ((units ?? []) as SpaceUnit[]),
    albums: albumRows,
    comeback: (comeback as SpaceComeback | null) ?? null,
    counts: { members: idolRows.length, albums: albumRows.length, tracks },
    surfaces: {
      quiz: (g.quiz_count ?? 0) > 0,
      blindtest: (btCount ?? 0) >= 5,
      nameAll: (nameAll ?? []).length > 0,
      personality: (personality ?? []).length > 0,
    },
  };
});
