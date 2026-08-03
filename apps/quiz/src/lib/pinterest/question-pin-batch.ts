// V-PIN-Q batch helpers: question selection, group-hub links, and the Pinterest
// CSV (schema copied verbatim from api/admin/pinterest/export-csv so the bulk
// upload format is byte-identical). NO answer in any copy. NO em dashes.

// Public marketing links ALWAYS point to the live domain, never the dev env a
// generator happens to run in. Fixed on purpose.
const SITE_URL = 'https://kpopquiz.org';

// --- CSV schema (identical to export-csv/route.ts) ---
export const PINTEREST_COLUMNS = [
  'Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords',
] as const;

// Per-group boards (from export-csv). Falls back to the general board.
export const BOARDS_BY_GROUP: Record<string, string> = {
  'BTS': 'BTS Quizzes', 'BLACKPINK': 'BLACKPINK Quizzes', 'Stray Kids': 'Stray Kids Quizzes',
  'aespa': 'aespa Quizzes', 'TWICE': 'TWICE Quizzes', 'NewJeans': 'NewJeans Quizzes',
  'SEVENTEEN': 'SEVENTEEN Quizzes', 'IVE': 'IVE Quizzes', 'EXO': 'EXO Quizzes',
  'LE SSERAFIM': 'LE SSERAFIM Quizzes', 'NCT': 'NCT Quizzes', 'Red Velvet': 'Red Velvet Quizzes',
  'ATEEZ': 'ATEEZ Quizzes', 'ENHYPEN': 'ENHYPEN Quizzes', 'TXT': 'TXT Quizzes',
  'ITZY': 'ITZY Quizzes', '(G)I-DLE': '(G)I-DLE Quizzes',
};

export function clean(s: string | null | undefined, maxLen?: number): string {
  if (!s) return '';
  let out = String(s).replace(/[\r\n\t]+/g, ' ').replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1') // tidy source artifacts like "is this ?" -> "is this?"
    .trim();
  if (maxLen) out = out.slice(0, maxLen);
  return out;
}
export function csvQuote(val: string): string {
  return '"' + val.replace(/"/g, '""') + '"';
}
export function toCSV(rows: Record<string, string>[]): string {
  const header = PINTEREST_COLUMNS.map(csvQuote).join(',');
  const lines = rows.map((row) => PINTEREST_COLUMNS.map((c) => csvQuote(row[c] ?? '')).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}

/** Drip schedule: `perDay` pins/day, starting tomorrow 08:00 UTC, spread over the
 * day. Same shape as export-csv getScheduledDate. */
export function scheduledDate(index: number, perDay: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  now.setUTCHours(8, 0, 0, 0);
  const dayOffset = Math.floor(index / perDay);
  const slot = index % perDay;
  const hourSpacing = Math.max(1, Math.floor(14 / perDay));
  const d = new Date(now.getTime() + dayOffset * 86400000 + slot * hourSpacing * 3600000);
  return d.toISOString().slice(0, 19);
}

// --- em-dash guard: strip any that slip in (house rule), never ship one ---
export function noDash(s: string): string {
  return s.replace(/[—–]/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- "General K-pop" is a catch-all bucket, not a single group: those pins fall
// back to the home page (locked decision 2). Everything else links to its hub. ---
const CATCHALL = new Set(['general-kpop', 'general-k-pop', 'kpop', 'k-pop']);

export function hubUrlFor(groupSlug: string | null, campaign: string): { url: string; isHome: boolean } {
  const home = !groupSlug || CATCHALL.has(groupSlug.toLowerCase());
  const base = home ? SITE_URL : `${SITE_URL}/${groupSlug}-quiz`;
  return { url: `${base}?utm_source=pinterest&utm_medium=pin&utm_campaign=${campaign}`, isHome: home };
}

export function boardFor(groupName: string | null, isHome: boolean): string {
  if (isHome || !groupName) return 'K-pop Quizzes';
  return BOARDS_BY_GROUP[groupName] || 'K-pop Quizzes';
}

// --- media-dependent questions cannot live on a static text pin: exclude. ---
const MEDIA_RE = /\b(this (photo|picture|image|gif|screenshot|outfit|hairstyle|logo)|pictured|shown (above|here|below)|who is this|which idol is this|name this (idol|member|face)|listen|audio|sound clip|from the (intro|beat|melody|clip)|the clip)\b/i;

export function isMediaDependent(questionText: string): boolean {
  return MEDIA_RE.test(questionText);
}

// The pins use DM Sans (Latin). Text with Hangul/CJK/emoji/box-drawing glyphs
// renders as tofu (Satori then tries and fails to fetch a dynamic font), so any
// question/option/clue outside a renderable Latin set is excluded from the batch.
const RENDERABLE_RE = /^[\x20-\x7E -ɏ‘’“”–—…]*$/;
export function isRenderable(text: string): boolean {
  return RENDERABLE_RE.test(text);
}

// --- copy generators. Varied by index so hundreds of pins are not identical.
// The ANSWER is never referenced. NO em dashes (noDash guards). ---
const TITLE_FORMS = [
  (g: string) => `How well do you know ${g}?`,
  (g: string) => `${g} quiz: can you get this one right?`,
  (g: string) => `Only real ${g} fans get this`,
  (g: string) => `Test your ${g} knowledge`,
  (g: string) => `${g} trivia: do you know the answer?`,
  (g: string) => `Can you pass this ${g} question?`,
];
const TITLE_FORMS_HOME = [
  () => 'How well do you know K-pop?',
  () => 'K-pop quiz: can you get this right?',
  () => 'Only real K-pop fans get this',
  () => 'Test your K-pop knowledge',
  () => 'K-pop trivia: do you know the answer?',
];

export function titleFor(groupName: string | null, isHome: boolean, index: number): string {
  const g = groupName || 'K-pop';
  const t = isHome || !groupName ? TITLE_FORMS_HOME[index % TITLE_FORMS_HOME.length]!() : TITLE_FORMS[index % TITLE_FORMS.length]!(g);
  return noDash(clean(t, 100));
}

export function descriptionFor(groupName: string | null, isHome: boolean): string {
  const g = groupName && !isHome ? groupName : 'K-pop';
  const body = `A ${g} question for real fans. Think you know the answer? Tap through and play the full free quiz on kpopquiz.org to find out. Hundreds of fan-made K-pop quizzes, no signup, always free.`;
  return noDash(clean(body, 500));
}

export function keywordsFor(groupName: string | null, isHome: boolean): string {
  const g = (groupName && !isHome ? groupName : 'kpop').toLowerCase();
  const kws = [g, 'kpop quiz', 'kpop trivia', `${g} quiz`, `${g} fan`, 'kpop game', 'kpop challenge'];
  return noDash(clean([...new Set(kws)].join(', '), 200));
}
