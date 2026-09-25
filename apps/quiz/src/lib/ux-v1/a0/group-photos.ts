// Group photos for the v11 UI (DESIGN-SPEC 16.8, 17.3): the site's own
// public/idols/<Group>.jpg files (736 to 1200 px wide), never the 480 px copies,
// never hot-linked. Keyed by groups.slug (as read on 2026-09-25: 33 visible groups
// have a group photo). A group without a photo gets the typographic cover.
// Member photos in the same folder are not group covers and are not listed here.

const GROUP_PHOTO_FILE: Record<string, string> = {
  'g-i-dle': '(G)I-DLE.jpg',
  '2ne1': '2NE1.jpg',
  '2pm': '2PM.jpg',
  aespa: 'Aespa.jpg',
  ateez: 'ATEEZ.jpg',
  babymonster: 'BABYMONSTER.jpg',
  bigbang: 'BIGBANG.jpg',
  blackpink: 'BLACKPINK.jpg',
  boynextdoor: 'BOYNEXTDOOR.jpg',
  bts: 'BTS.jpg',
  enhypen: 'ENHYPEN.jpg',
  exo: 'EXO.jpg',
  fx: 'f(x).jpg',
  'girls-generation': "Girls' Generation.jpg",
  got7: 'GOT7.jpg',
  itzy: 'ITZY.jpg',
  ive: 'IVE.jpg',
  kep1er: 'Kep1er.jpg',
  'le-sserafim': 'LE SSERAFIM.jpg',
  mamamoo: 'MAMAMOO.jpg',
  'nct-127': 'NCT 127.jpg',
  'nct-dream': 'NCT Dream.jpg',
  newjeans: 'NewJeans.jpg',
  nmixx: 'NMIXX.jpg',
  'red-velvet': 'Red Velvet.jpg',
  riize: 'RIIZE.jpg',
  seventeen: 'SEVENTEEN.jpg',
  shinee: 'SHINee.jpg',
  'stray-kids': 'Stray Kids.jpg',
  treasure: 'TREASURE.jpg',
  twice: 'TWICE.jpg',
  txt: 'TXT.jpg',
  'wonder-girls': 'Wonder Girls.jpg',
};

/** Public URL of a group's photo (encoded for spaces, quotes and parentheses), or null. */
export function groupPhotoUrl(groupSlug: string | null | undefined): string | null {
  if (!groupSlug) return null;
  const file = GROUP_PHOTO_FILE[groupSlug];
  return file ? `/idols/${encodeURIComponent(file)}` : null;
}

/** The slugs that have a group photo (for tests and the kit). */
export const GROUP_PHOTO_SLUGS: readonly string[] = Object.keys(GROUP_PHOTO_FILE);

// Crop variety so the same group photo never looks identical twice in one row
// (16.8): a stable hash of the title picks one of four focal points (prototype posFor).
const FOCAL = ['center 22%', '28% 30%', '72% 28%', 'center 38%'] as const;
export function photoFocal(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FOCAL[h % FOCAL.length] ?? 'center 25%';
}
