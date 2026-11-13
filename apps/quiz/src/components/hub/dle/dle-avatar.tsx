// Daily games step 4 (v2 section 7): the picture of an entity where a name is typed. A licensed 96 px file when dle_pool gives one, else a designed tile (series photo, or a pattern in the colours). Decorative: the name is beside it.
import type { DleGameDef } from '@/lib/dle/games';
import type { DlePublicEntity, DleValue } from '@/lib/dle/types';

// The gradients of the board's groups, then a stable pick by the group's name: the colours of a group never depend on the day.
const TINTS: readonly (readonly [string, string])[] = [
  ['#FFD7C2', '#F49AB8'], ['#DCCDF6', '#A68BE0'], ['#FFCACA', '#E46A70'], ['#DCE3EE', '#97A9C9'], ['#DFECF9', '#98BCE4'],
  ['#D5EFE2', '#79BFA0'], ['#FBE6B8', '#E0AC54'], ['#F7D2EC', '#CE82BC'],
];

export function tintOf(name: string): readonly [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** Up to two letters of a name: "J-Hope" JH, "Mina" MI, "NCT 127" NC. A name with no Latin letter keeps its first two characters. */
export function initialsOf(name: string): string {
  const latin = name.replace(/[^\p{L}\p{N}]/gu, '');
  return [...latin].slice(0, 2).join('').toUpperCase();
}

/** The first value of a column value, as text. */
export function firstValue(v: unknown): string {
  const x = Array.isArray(v) ? v[0] : v;
  return x === null || x === undefined ? '' : String(x);
}

/**
 * What stands next to a character's name and picks its quiz: the series of a game of one series ("One Piece"), else the first parent of the game's sub column (the group of an idol, the series of an
 * Otakudle character). "" when the value is missing.
 */
export function parentName(game: Pick<DleGameDef, 'series'>, subKey: string, attrs: Readonly<Record<string, DleValue>>): string {
  if (game.series) return game.series.name;
  const v = attrs[subKey];
  return v?.p?.[0] ?? firstValue(v?.v);
}

/**
 * What a tile or the result card draws behind a name when there is no licensed photo (lot 3 DLE, E3):
 *   art      the public path of the series photo already in place on the anime pages (the free photos of objects and places), or null
 *   preview  the owner's private preview image (lib/dle/preview.ts), or null. Never set for anyone else.
 */
export interface AvatarLook {
  readonly art?: string | null;
  readonly preview?: string | null;
}

interface AvatarProps {
  readonly entity: Pick<DlePublicEntity, 'name' | 'thumb'>;
  /** The name the colours follow (the group, or the series). */
  readonly tone: string;
  readonly size?: number;
  readonly radius?: number;
  readonly font?: number;
  readonly look?: AvatarLook | undefined;
}

/**
 * The small picture beside a name (a guess, a suggestion, yesterday's answer). Decorative: the name is beside it. In order: the licensed 96 px
 * file, the owner's private preview, the series photo with a tint of the colours, else a patterned tile in the colours with the initials (a small
 * tile only: the large card of the result sets the whole name in type, see dle-card.tsx).
 */
export function Avatar({ entity, tone, size, radius, font, look }: AvatarProps): React.ReactElement {
  const [a, b] = tintOf(tone || entity.name);
  const style = { width: size, height: size, borderRadius: radius, fontSize: font, '--dle-a': a, '--dle-b': b } as React.CSSProperties;
  // A plain img everywhere: the 96 px file made at upload, a bundled file, or the preview route (no Vercel image optimisation, no cache of the preview).
  const src = entity.thumb ?? look?.preview ?? null;
  const art = src ? null : look?.art ?? null;
  return (
    <span aria-hidden="true" className={`hub-dle-thumb${src ? '' : art ? ' hub-dle-thumb-art' : ' hub-dle-thumb-pat'}`} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" />
      ) : art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" width={size} height={size} loading="lazy" decoding="async" />
      ) : initialsOf(entity.name)}
    </span>
  );
}
