// Daily games step 4 (v2 section 7): the picture of an entity where a name is typed. A licensed 96 px file when dle_pool gives one, else the initials on a gradient of the group's colours. Decorative: the name is beside it.
import type { DlePublicEntity } from '@/lib/dle/types';

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

interface AvatarProps {
  readonly entity: Pick<DlePublicEntity, 'name' | 'thumb'>;
  /** The name the gradient follows (the group). */
  readonly tone: string;
  readonly size?: number;
  readonly radius?: number;
  readonly font?: number;
  /** Fills its frame with large initials: the result screen without a licensed photo. */
  readonly fill?: boolean;
}

export function Avatar({ entity, tone, size, radius, font, fill }: AvatarProps): React.ReactElement {
  const [a, b] = tintOf(tone || entity.name);
  const style: React.CSSProperties = fill
    ? { background: `linear-gradient(165deg, ${a} 0%, ${b} 100%)` }
    : { width: size, height: size, borderRadius: radius, fontSize: font, background: `linear-gradient(165deg, ${a} 0%, ${b} 100%)` };
  return (
    <span aria-hidden="true" className={fill ? 'hub-dle-thumb hub-dle-thumb-fill' : 'hub-dle-thumb'} style={style}>
      {entity.thumb && !fill ? (
        // A plain img: the 96 px file made at upload (no Vercel image optimisation).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entity.thumb} alt="" width={size} height={size} loading="lazy" decoding="async" />
      ) : initialsOf(entity.name)}
    </span>
  );
}
