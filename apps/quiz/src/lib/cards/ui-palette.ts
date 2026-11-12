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

export function paletteFor(id: string): Palette {
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
