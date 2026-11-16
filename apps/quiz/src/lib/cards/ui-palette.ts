// Bunnyverse Cards, lane U: the colours of a card's art, drawn from the entity id (the catalog stores none). hsl() strings, no hex:
// the dark photocard needs a light accent (--a), a very dark ground (--b) and a pale highlight (--c).
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Palette { a: string; b: string; c: string; dot: string }

/** The colours of the prototype's example groups (docs/design/cards/kpopcards-prototype-v6.html), read only for the development fixture's ids ('idol:Qkc-<slug>-n', 'group:Qkc-<slug>')
 *  and the group names of its sections; the real catalog never has an id of that form, so every real card keeps the hashed palette below. */
const PROTO_PALETTES: Record<string, Palette & { name: string }> = {
  bts: { name: 'BTS', a: '#7C5CFF', b: '#160E3D', c: '#D9CCFF', dot: '#7C5CFF' },
  blackpink: { name: 'BLACKPINK', a: '#FF5C9E', b: '#1A0712', c: '#FFC6DC', dot: '#FF5C9E' },
  twice: { name: 'TWICE', a: '#FF9E7A', b: '#4E1029', c: '#FFE0D2', dot: '#FF9E7A' },
  seventeen: { name: 'SEVENTEEN', a: '#F2B3C1', b: '#22305A', c: '#C4D3FF', dot: '#F2B3C1' },
  straykids: { name: 'Stray Kids', a: '#FF5A36', b: '#140A0B', c: '#FFC2B0', dot: '#FF5A36' },
  ateez: { name: 'ATEEZ', a: '#F2B04A', b: '#241605', c: '#FFE8B8', dot: '#F2B04A' },
  aespa: { name: 'aespa', a: '#6FDBFF', b: '#22177A', c: '#D2F6FF', dot: '#6FDBFF' },
  itzy: { name: 'ITZY', a: '#FFD447', b: '#6A0F38', c: '#FFF3BC', dot: '#FFD447' },
  kep1er: { name: 'Kep1er', a: '#B48CFF', b: '#24104A', c: '#EADDFF', dot: '#B48CFF' },
  solo: { name: 'Soloists', a: '#FFC24B', b: '#2B1A04', c: '#FFF0C2', dot: '#FFC24B' },
};
const PROTO_BY_NAME = new Map(Object.values(PROTO_PALETTES).map((x) => [x.name, x] as const));

export function paletteFor(id: string): Palette {
  const m = /^(?:idol|group):Qkc-([a-z0-9]+)/.exec(id);
  const fx = m ? PROTO_PALETTES[m[1]!] : id.startsWith('group:') ? PROTO_BY_NAME.get(id.slice(6)) : undefined;
  if (fx) return { a: fx.a, b: fx.b, c: fx.c, dot: fx.dot };
  const h = hash(id) % 360;
  const h2 = (h + 250) % 360;
  return { a: `hsl(${h} 85% 66%)`, b: `hsl(${h2} 55% 11%)`, c: `hsl(${h} 100% 88%)`, dot: `hsl(${h} 70% 52%)` };
}

/** The letters of a monogram: 'Mira' -> 'MI', 'Kim Chaewon' -> 'KC', 'S.Coups' -> 'SC'. */
export function monogram(name: string): string {
  const parts = name.replace(/\./g, ' ').split(/[\s-]+/).filter(Boolean);
  const m = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : name.slice(0, 2);
  return m.toUpperCase();
}

/** The short word printed on the screen of an event card: the capitals of its words, or its first word. */
export function eventShort(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const caps = words.filter((w) => /^[A-Z0-9]/.test(w)).map((w) => w[0]!).join('');
  return (words.length > 1 && caps.length >= 2 ? caps : (words[0] ?? name)).toUpperCase().slice(0, 9);
}

/** The font size of a card name, as a share of the card width, by its length (the prototype's nf). */
export function nameSize(name: string): number {
  const l = name.length;
  return l <= 7 ? 13 : l <= 9 ? 11.5 : l <= 11 ? 10 : 8.6;
}
