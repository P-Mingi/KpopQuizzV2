// Run O1, lane K1 (owner rule C2 of 2026-10-24): which source counts as "strong" for a fact.
//
// A load bearing fact needs 2 sources on 2 pages, one of them strong. Strong sources:
//   - wikidata and official, for every fact;
//   - a press source on www.oricon.co.jp, when the fact is a sales or ranking figure (SALES_FIELDS);
//   - a press source on www.animenewsnetwork.com, when the fact is an announcement: a date, a season, an adaptation
//     (ANNOUNCEMENT_FIELDS).
// Nothing else is relaxed: ANN on a copies fact, Oricon on a season fact, ANN on a director fact all stay weak.
// The decision reads the fact's `field`. Every field name found in docs/anime/data/facts/*.json is in exactly one of three
// groups below (a test pins it); a field that is in none of them (a new one) counts as OTHER, so it stays weak until a
// human files it. Staff, director, artist, publisher, magazine, award, episode counts, arc and chapter lists, character,
// theme and name facts are all OTHER on purpose.
//   SALES_FIELDS         copies in circulation, print runs, page views, views.
//   ANNOUNCEMENT_FIELDS  dates and seasons of an adaptation: anime start, end, run and season fields, TV runs, film, OVA and
//                        special releases, manga, novel and webtoon run or start dates, hiatus, announced spin-offs.
//   OTHER_FIELDS         everything else (listed below so that a new field cannot slip in unseen).

import { hostOf } from './text.mjs';

export const ORICON_HOST = 'www.oricon.co.jp';
export const ANN_HOST = 'www.animenewsnetwork.com';

export const SALES_FIELDS = [
  'copies', 'page_views', 'print_run', 'views',
];

export const ANNOUNCEMENT_FIELDS = [
  'anime_1999', 'anime_2011', 'anime_announced', 'anime_end', 'anime_run', 'anime_s1', 'anime_s1_premiere',
  'anime_s2', 'anime_s3', 'anime_s4', 'anime_seasons', 'anime_start', 'anime_tv', 'bonus_special', 'boruto_anime',
  'broadcast', 'broly_film', 'compilation_film', 'crystal_films', 'crystal_run', 'daima_tv_run', 'db_tv_run', 'dubs',
  'elbaph_anime', 'film', 'film_1997', 'film_release', 'films', 'final_films', 'hiatus', 'infinity_castle_film',
  'live_action', 'manga_hiatus', 'manga_run', 'manga_start', 'mugen_train_film', 'new_anime', 'novel_run',
  'official_site', 'ova', 'ova_1993', 'production_start', 'rebuild', 'recap_special', 'season_1', 'season_2',
  'season_3', 'season_4', 'season_one_end', 'season_three', 'season_two', 'sequel_webtoon', 'shorts', 'sibling_bond',
  'spin_offs', 'spinoff', 'start', 'streaming', 'super_hero_film', 'super_tv_run', 'tv_naruto', 'tv_shippuden',
  'tv_start', 'tybw', 'tybw_parts', 'us_film', 'webtoon_launch', 'webtoon_seasons', 'z_kai', 'z_tv_run',
];

export const OTHER_FIELDS = [
  'ability', 'age', 'akeboshi_endings', 'anime_award', 'anime_directors', 'anime_reboot', 'anime_s1_ending',
  'anime_size', 'anime_staff', 'anime_studio', 'anime_studios', 'anime_total', 'arc_1', 'arc_2', 'arc_3', 'arc_4',
  'arc_anime_only', 'arc_early', 'arc_late', 'arc_list', 'arc_manga_only', 'arc_ranges', 'arc_s1', 'arc_s2',
  'arc_s3', 'arc_s4', 'arc_s5', 'arc_s6', 'arc_s7', 'arc_s8', 'arc_split', 'arcs', 'arcs_a', 'arcs_b', 'arcs_boruto',
  'arcs_c', 'arcs_daima', 'arcs_db', 'arcs_part_one', 'arcs_part_two_a', 'arcs_part_two_b', 'arcs_part_two_c',
  'arcs_super', 'arcs_z', 'artist', 'author', 'authors', 'award', 'awards', 'awards_b', 'awards_sales', 'background',
  'blade', 'boar_mask', 'boruto_manga', 'broadcast_format', 'buzzword', 'catchphrase', 'chapters',
  'chapters_collected', 'character_designer', 'characters', 'characters_a', 'characters_arc1', 'characters_b',
  'characters_c', 'characters_core', 'characters_early', 'characters_late', 'characters_mid', 'characters_middle',
  'composer', 'composers', 'creator', 'creator_favourite', 'crew_roles', 'daima_story', 'debt', 'debut',
  'devil_fruit', 'director', 'domain_odds', 'ending_theme', 'english_dub', 'english_licence', 'english_release',
  'episodes', 'epithet', 'feeding', 'filler_season', 'first_shippuden_opening', 'fond_of', 'franchise_titles',
  'guinness', 'gurenge_award', 'habits', 'historical_basis', 'inspiration', 'juju_sanpo', 'korean_volumes',
  'last_volume', 'license', 'longest_season', 'magazine', 'manga', 'manga_2', 'manga_award', 'manga_size',
  'manga_volumes', 'mission', 'motivation', 'music_composers', 'name', 'name_meaning', 'name_native', 'name_origin',
  'name_pun', 'name_variant', 'namesake', 'naming', 'nickname', 'notebook_rule', 'novel', 'novel_chapters',
  'novel_history', 'occupation', 'op1_episodes', 'opening_theme', 'organization', 'origin', 'original_episode_split',
  'part_one_volumes', 'parts', 'parts_a', 'parts_b', 'planning', 'popularity', 'power', 'powers', 'premise',
  'prequel_manga', 'public_identity', 'publisher', 'publisher_na', 'quirks', 'record', 'regressions', 'reputation',
  'role', 'scarlet_eyes', 'season_three_break', 'sense_of_smell', 'serialization', 'setting', 'shinsu',
  'signature_song', 'specialty', 'spell', 'staff', 'staff_2003', 'staff_brotherhood', 'staff_s2', 'stands',
  'story_arcs', 'studio', 'studio_director', 'style', 'super_manga', 'super_manga_status', 'talent', 'technique',
  'terms', 'theme_ed', 'theme_op', 'themes', 'themes_2003', 'themes_brotherhood', 'themes_daima', 'themes_db',
  'themes_ed', 'themes_ed_1', 'themes_ed_2', 'themes_ed_a', 'themes_ed_b', 'themes_ed_part_one',
  'themes_ed_part_two_a', 'themes_ed_part_two_b', 'themes_op', 'themes_op_a', 'themes_op_b', 'themes_op_part_one',
  'themes_op_part_two', 'themes_s1', 'themes_s1_s2', 'themes_s2', 'themes_s3', 'themes_s3_s4', 'themes_s4',
  'themes_s5', 'themes_s6', 'themes_super', 'themes_z', 'thunder_breathing', 'titan_model', 'titan_name', 'title',
  'title_change', 'title_forms', 'title_native', 'title_origin', 'title_romaji', 'titles', 'trademark', 'treasure',
  'tv_episodes', 'us_debut', 'voice_cast', 'volumes',
];

const SALES = new Set(SALES_FIELDS);
const ANNOUNCEMENT = new Set(ANNOUNCEMENT_FIELDS);
const OTHER = new Set(OTHER_FIELDS);

/** 'sales' | 'announcement' | 'other' for a fact field; an unlisted field is 'other'. */
export function fieldGroup(field) {
  if (SALES.has(field)) return 'sales';
  if (ANNOUNCEMENT.has(field)) return 'announcement';
  return 'other';
}

/** True when the field name is filed in one of the three groups. */
export function isListedField(field) {
  return SALES.has(field) || ANNOUNCEMENT.has(field) || OTHER.has(field);
}

/** True when `source` (one entry of fact.sources) is a strong source for `fact` under rule C2. */
export function isStrongSource(source, fact) {
  if (!source || typeof source !== 'object') return false;
  if (source.source === 'wikidata' || source.source === 'official') return true;
  if (source.source !== 'press') return false;
  const host = hostOf(source.url ?? '');
  const group = fieldGroup(fact?.field);
  if (host === ORICON_HOST) return group === 'sales';
  if (host === ANN_HOST) return group === 'announcement';
  return false;
}

/** True when a load bearing fact has 2 sources and at least one of them is strong. */
export function meetsTwoSourceRule(fact) {
  const s = Array.isArray(fact?.sources) ? fact.sources : [];
  return s.length >= 2 && s.some((x) => isStrongSource(x, fact));
}
