// The cluster owners of kpopquiz.org: which URL owns which search intent (rulebook
// .claude/skills/kpopquiz-seo/SKILL.md section 1). docs/seo/TARGETS.md is the source of
// truth; it is not on main yet (SEO Mission 2 creates it), so this table starts from the
// rulebook's v1 table. targets.test.ts compares it with docs/seo/TARGETS.md whenever that
// file exists, and fails on any difference in the live URLs: change both in the same PR.
//
// Read by /llms.txt (SEO Mission 3, part F.4). Only the live rows with a real URL are listed
// there; a planned page is never advertised before it exists.

export interface TargetCluster {
  cluster: string;
  /** The page path, or a pattern with {group} for a per-group page type. */
  url: string;
  /** Plain-words intent, used as the llms.txt line. */
  intent: string;
  /** Anchor text for the llms.txt link. */
  label: string;
  status: 'live' | 'planned';
}

export const TARGET_CLUSTERS: readonly TargetCluster[] = [
  { cluster: 'kpop quiz', url: '/', intent: 'play K-pop quizzes made by fans', label: 'K-pop quizzes', status: 'live' },
  { cluster: 'bts quiz', url: '/bts-quiz', intent: 'play BTS quizzes', label: 'BTS quiz', status: 'live' },
  { cluster: 'bts army test', url: '/q/bts-army-level-test', intent: 'test BTS knowledge level', label: 'BTS ARMY test', status: 'planned' },
  { cluster: 'bts trivia', url: '/bts-trivia', intent: 'read BTS facts and questions', label: 'BTS trivia', status: 'live' },
  { cluster: 'kpop games', url: '/kpop-games', intent: 'find and play free K-pop games', label: 'K-pop games', status: 'planned' },
  { cluster: 'kpop generations', url: '/articles/kpop-generations-explained', intent: 'learn the K-pop generations', label: 'K-pop generations explained', status: 'live' },
  { cluster: 'kpop trivia', url: '/trivia', intent: 'read K-pop facts and questions', label: 'K-pop trivia', status: 'live' },
  { cluster: 'kpop test', url: '/kpop-test', intent: 'test K-pop knowledge', label: 'K-pop test', status: 'planned' },
  { cluster: 'blind test kpop', url: '/blindtest', intent: 'play a K-pop blind test, guessing songs from short clips', label: 'K-pop blind test', status: 'live' },
  { cluster: 'guess the kpop song', url: '/guess-the-kpop-song', intent: 'guess K-pop songs from clips', label: 'Guess the K-pop song', status: 'live' },
  { cluster: 'which {group} member are you', url: '/which-{group}-member-are-you', intent: 'take a member personality quiz', label: 'Which member are you', status: 'live' },
  { cluster: 'name them all', url: '/name-them-all', intent: 'name every member against the clock', label: 'Name them all', status: 'planned' },
  { cluster: 'kpop groups a-z', url: '/groups', intent: 'browse K-pop groups', label: 'K-pop groups A to Z', status: 'live' },
  { cluster: '{group} quiz', url: '/{group}-quiz', intent: 'play quizzes about that group, with its games and facts', label: 'Group quiz hubs', status: 'live' },
  { cluster: 'kuis bts', url: '/id/kuis-bts', intent: 'play BTS quizzes in Indonesian', label: 'Kuis BTS', status: 'planned' },
  // General K-pop theme pages (SEO strategy of 2026-10-27, phase 1; lib/hubs/general-themes.ts).
  { cluster: 'kpop history quiz', url: '/kpop-history-quiz', intent: 'play K-pop history quizzes across groups', label: 'K-pop history quiz', status: 'live' },
  { cluster: 'kpop debut quiz', url: '/kpop-debut-quiz', intent: 'play K-pop debut quizzes across groups', label: 'K-pop debut quiz', status: 'live' },
  { cluster: 'kpop company quiz', url: '/kpop-company-quiz', intent: 'play K-pop company quizzes across groups', label: 'K-pop company quiz', status: 'live' },
  { cluster: 'kpop fandom quiz', url: '/kpop-fandom-quiz', intent: 'play K-pop fandom quizzes across groups', label: 'K-pop fandom quiz', status: 'live' },
  { cluster: 'kpop discography quiz', url: '/kpop-discography-quiz', intent: 'play K-pop discography quizzes across groups', label: 'K-pop discography quiz', status: 'live' },
  { cluster: 'kpop dance quiz', url: '/kpop-dance-quiz', intent: 'play K-pop dance quizzes across groups', label: 'K-pop dance quiz', status: 'live' },
  { cluster: 'kpop awards quiz', url: '/kpop-awards-quiz', intent: 'play K-pop awards quizzes across groups', label: 'K-pop awards quiz', status: 'live' },
  { cluster: 'kpop drama and variety quiz', url: '/kpop-drama-variety-quiz', intent: 'play K-pop drama and variety quizzes across groups', label: 'K-pop drama and variety quiz', status: 'live' },
  { cluster: 'kpop idol quiz', url: '/kpop-idol-quiz', intent: 'play K-pop idol quizzes across groups', label: 'K-pop idol quiz', status: 'live' },
  { cluster: 'kpop groups quiz', url: '/kpop-groups-quiz', intent: 'play K-pop groups quizzes across groups', label: 'K-pop groups quiz', status: 'live' },
];

export interface ParsedTarget {
  cluster: string;
  url: string;
  status: string;
}

/**
 * The rows of TARGETS.md's table (columns found by header name: Cluster, URL, Status).
 * A URL cell that is not a path (for example "section ... of /{group}-quiz") is kept as is;
 * callers decide what counts as a page.
 */
export function parseTargetsMarkdown(md: string): ParsedTarget[] {
  const lines = md.split('\n').map((l) => l.trim());
  const headerAt = lines.findIndex((l) => l.startsWith('|') && /\|\s*Cluster\s*\|/i.test(l) && /\|\s*URL\s*\|/i.test(l));
  if (headerAt < 0) return [];
  const cells = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());
  const header = cells(lines[headerAt]!).map((h) => h.toLowerCase());
  const col = (name: string): number => header.indexOf(name);
  const [ci, ui, si] = [col('cluster'), col('url'), col('status')];
  if (ci < 0 || ui < 0 || si < 0) return [];
  const rows: ParsedTarget[] = [];
  for (const line of lines.slice(headerAt + 2)) {
    if (!line.startsWith('|')) break;
    const c = cells(line);
    rows.push({ cluster: c[ci] ?? '', url: c[ui] ?? '', status: (c[si] ?? '').toLowerCase() });
  }
  return rows;
}

/** A row that owns a page of its own (a path), live today. */
export const isLivePage = (t: { url: string; status: string }): boolean => t.url.startsWith('/') && /^live\b/.test(t.status);
