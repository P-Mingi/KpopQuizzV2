import type { GameCardData } from '@/lib/db/types';
import type { NameAllGame } from './name-all-card';

/**
 * Adapt a `GameCardData` row (whose `content` is a flexible JSONB blob)
 * into the `NameAllGame` shape consumed by the new <NameAllCard>.
 *
 * Handles both legacy `members` arrays and new `items` arrays in the JSONB.
 */
export function toNameAllGame(game: GameCardData): NameAllGame {
  const raw = game.content as unknown as Record<string, unknown>;

  // Normalize members[] (legacy) or items[] (new) into the unified items[] shape.
  const rawItems = (raw.items as Array<Record<string, unknown>> | undefined)
    ?? (raw.members as Array<Record<string, unknown>> | undefined)
    ?? [];

  const items: NameAllGame['data']['items'] = rawItems.map((it) => {
    const color = it.color as string | undefined;
    const aliases = (it.aliases as string[] | undefined) ?? [];
    const image_url = (it.image_url as string | undefined) ?? (it.photo_url as string | undefined);
    const out: NameAllGame['data']['items'][number] = {
      name: (it.name as string) ?? '',
      aliases,
    };
    if (color) out.color = color;
    if (image_url) out.image_url = image_url;
    return out;
  });

  const difficulty = ((raw.difficulty as string | undefined) ?? 'medium') as
    'easy' | 'medium' | 'hard';
  const timer_seconds = (raw.timer_seconds as number | undefined) ?? 60;

  // sub_type is not on GameCardData yet, so try to read it off the raw row
  // (if the query later selects it) and fall back to undefined.
  const sub_type = ((game as unknown as Record<string, unknown>).sub_type as string | null | undefined)
    ?? (raw.sub_type as string | null | undefined)
    ?? null;

  const data: NameAllGame['data'] = { items };
  const artist = raw.artist as string | undefined;
  const album = raw.album as string | undefined;
  if (artist) data.artist = artist;
  if (album) data.album = album;

  const result: NameAllGame = {
    id: game.id,
    slug: game.slug,
    title: game.title,
    game_type: game.game_type as NameAllGame['game_type'],
    sub_type,
    difficulty,
    timer_seconds,
    play_count: game.play_count,
    data,
  };

  if (game.group_name && game.display_color) {
    result.group = { name: game.group_name, display_color: game.display_color };
  }

  return result;
}
