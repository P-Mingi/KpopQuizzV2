// The query clusters of docs/seo/TARGETS.md, read as data (SEO Mission 3, part C), and the
// rule that puts a search query in a cluster. Used by the Monday e-mail (cannibalisation, new
// queries without a target page) and by /admin/seo/import (the Copilot query families).
//
// TARGETS.md is a Markdown table with at least the columns Cluster, Queries and URL
// (Mission 2, part A). Queries are comma separated; "{group}" stands for any group and a lone
// capital "X" for any word ("what gen is X").
//
// How a query finds its cluster (the highest score wins, ties go to the earlier row):
//   exact      the normalized query equals one of the cluster's queries          1000
//   words      every word of one of the cluster's queries is in the query        100 + words
//   template   every fixed word of a "{group}" or "X" query is in the query,
//              plus at least one other word                                      10 + words
// Words are compared lower case, without accents and punctuation, "k-pop" and "k pop" as
// "kpop", "gen" as "generation", and with a final "s" dropped from words longer than 3 letters
// ("generations" = "generation", "gens" = "gen" = "generation").
// So "kpop generations timeline" goes to "kpop generations", "bts army test" to
// "bts army test" (3 words) rather than "bts quiz" ("bts test", 2 words), and
// "stray kids games online" to "{group} games".

export interface TargetCluster {
  cluster: string;
  queries: string[];
  url: string;
  status: string;
}

/** The cluster rows of TARGETS.md. Empty when no table with Cluster, Queries and URL is found. */
export function parseTargets(markdown: string): TargetCluster[] {
  const lines = markdown.split(/\r?\n/);
  const out: TargetCluster[] = [];
  let cols: { cluster: number; queries: number; url: number; status: number } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      cols = null;
      continue;
    }
    const cells = splitRow(line);
    if (!cols) {
      const lower = cells.map((c) => c.toLowerCase());
      const cluster = lower.indexOf('cluster');
      const queries = lower.indexOf('queries');
      const url = lower.indexOf('url');
      if (cluster >= 0 && queries >= 0 && url >= 0) cols = { cluster, queries, url, status: lower.indexOf('status') };
      continue;
    }
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // the |---| line
    const cluster = cells[cols.cluster] ?? '';
    const url = (cells[cols.url] ?? '').replace(/`/g, '').trim();
    const queries = (cells[cols.queries] ?? '').split(',').map((q) => q.replace(/`/g, '').trim()).filter(Boolean);
    if (!cluster || queries.length === 0) continue;
    out.push({ cluster, queries, url, status: cols.status >= 0 ? (cells[cols.status] ?? '') : '' });
  }
  return out;
}

function splitRow(line: string): string[] {
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

/** Lower case, no accents, no punctuation, single spaces, "k-pop" as "kpop". */
export function normalizeQuery(q: string): string {
  return q
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/k-pop/g, 'kpop')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bk pop\b/g, 'kpop');
}

// "gen" is how fans write "generation" ("what gen is bts", "1st gen kpop").
const SYNONYMS: Record<string, string> = { gen: 'generation' };
const stem = (w: string): string => {
  const s = w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
  return SYNONYMS[s] ?? s;
};

function words(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean).map(stem);
}

interface Pattern {
  index: number;
  exact: string;
  fixed: string[];
  template: boolean;
}

function patternsOf(clusters: TargetCluster[]): Pattern[] {
  const out: Pattern[] = [];
  clusters.forEach((c, index) => {
    for (const q of c.queries) {
      const template = /\{[^}]+\}/.test(q) || /(^|\s)X(\s|$)/.test(q);
      const cleaned = q.replace(/\{[^}]+\}/g, ' ').replace(/(^|\s)X(?=\s|$)/g, ' ');
      const normalized = normalizeQuery(cleaned);
      const fixed = words(normalized);
      if (fixed.length === 0) continue;
      out.push({ index, exact: template ? '' : normalizeQuery(q), fixed, template });
    }
  });
  return out;
}

export interface ClusterMatch {
  cluster: TargetCluster;
  how: 'exact' | 'words' | 'template';
}

/** A matcher over the clusters, built once for many queries. */
export function clusterMatcher(clusters: TargetCluster[]): (query: string) => ClusterMatch | null {
  const patterns = patternsOf(clusters);
  return (query: string) => {
    const normalized = normalizeQuery(query);
    if (!normalized) return null;
    const qWords = words(normalized);
    const set = new Set(qWords);
    let best: { score: number; index: number; how: ClusterMatch['how'] } | null = null;
    for (const p of patterns) {
      let score = 0;
      let how: ClusterMatch['how'] = 'words';
      if (!p.template && p.exact === normalized) {
        score = 1000;
        how = 'exact';
      } else if (p.fixed.every((w) => set.has(w))) {
        if (p.template) {
          if (qWords.length <= p.fixed.length) continue; // "{group}" must stand for something
          score = 10 + p.fixed.length;
          how = 'template';
        } else {
          score = 100 + p.fixed.length;
        }
      } else {
        continue;
      }
      if (!best || score > best.score || (score === best.score && p.index < best.index)) best = { score, index: p.index, how };
    }
    return best ? { cluster: clusters[best.index]!, how: best.how } : null;
  };
}

/**
 * The cluster list of the rulebook (.claude/skills/kpopquiz-seo/SKILL.md, section 1, v1 of
 * 2026-10-14), which TARGETS.md was created from. Only /admin/seo/import falls back to it, and
 * says so on the page, when TARGETS.md cannot be read; the e-mail never does.
 */
export const RULEBOOK_V1_CLUSTERS: TargetCluster[] = [
  { cluster: 'kpop quiz', queries: ['kpop quiz', 'quiz kpop'], url: '/', status: 'live' },
  { cluster: 'bts quiz', queries: ['bts quiz', 'quiz bts', 'bts test'], url: '/bts-quiz', status: 'live' },
  { cluster: 'bts army test', queries: ['bts army test', 'army ranks'], url: '/q/bts-army-level-test', status: 'planned' },
  { cluster: 'bts trivia', queries: ['bts trivia', 'bts trivia questions'], url: '/bts-trivia', status: 'live' },
  { cluster: 'kpop games', queries: ['kpop games', 'kpop games online'], url: '/kpop-games', status: 'planned' },
  { cluster: 'kpop generations', queries: ['kpop generations', 'what gen is X'], url: '/articles/kpop-generations-explained', status: 'live' },
  { cluster: 'kpop trivia', queries: ['kpop trivia', 'kpop questions'], url: '/trivia', status: 'live' },
  { cluster: 'kpop test', queries: ['kpop test'], url: '/kpop-test', status: 'planned' },
  { cluster: 'blind test kpop', queries: ['blind test kpop'], url: '/blindtest', status: 'live' },
  { cluster: 'guess the kpop song', queries: ['guess the kpop song'], url: '/guess-the-kpop-song', status: 'live' },
  { cluster: 'which {group} member are you', queries: ['which {group} member are you'], url: '/which-{group}-member-are-you', status: 'live' },
  { cluster: 'name them all', queries: ['sporcle kpop', 'name them all'], url: '/name-them-all', status: 'planned' },
  { cluster: 'kpop groups a-z', queries: ['kpop groups a-z'], url: '/groups', status: 'live' },
  { cluster: '{group} quiz', queries: ['{group} quiz', '{group} test'], url: '/{group}-quiz', status: 'live' },
  { cluster: '{group} games', queries: ['{group} games'], url: 'section of /{group}-quiz', status: 'live' },
  { cluster: 'kuis bts', queries: ['kuis bts'], url: '/id/kuis-bts', status: 'planned' },
];
