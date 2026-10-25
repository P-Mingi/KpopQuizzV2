// /llms.txt, generated (SEO Mission 3, part F.4): what the site is, its live counts from the
// site stats function (never typed), the pages that own each search intent (lib/seo/targets.ts,
// mirrored from docs/seo/TARGETS.md), the reports, how to cite, and the trust pages. Plain
// markdown in the llmstxt.org shape: an H1, a one-paragraph summary, then link lists. There is
// deliberately no llms-full.txt.

import { REPORT_CREDIT, REPORT_PATH, REPORT_SCORES, REPORT_TITLE, REPORT_WINDOW } from '@/lib/report/knowledge-report-2026';
import { DATA_LICENCE, LINK_NOTE, PRESS_EMAIL, SITE_URL } from '@/lib/seo/org';
import { exact, fillStats } from '@/lib/stats/site-stats';
import { isLivePage } from '@/lib/seo/targets';

import type { PublicStats } from '@/lib/stats/site-stats';
import type { TargetCluster } from '@/lib/seo/targets';

const abs = (path: string): string => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

function asOfDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function targetLine(t: TargetCluster): string {
  if (t.url.includes('{group}')) {
    // A page type, one page per group: name the pattern, link the cluster's live example when
    // it has one (/bts-quiz owns "bts quiz"), never an invented URL.
    const example = t.url === '/{group}-quiz' ? ' (for example [BTS quiz](https://kpopquiz.org/bts-quiz))' : '';
    return `- ${t.label}: ${SITE_URL}${t.url}, one page per group, to ${t.intent}${example}`;
  }
  return `- [${t.label}](${abs(t.url)}): ${t.intent}`;
}

export function buildLlmsTxt(stats: PublicStats | null, targets: readonly TargetCluster[]): string {
  const scale = fillStats(
    '{quizzes} published quizzes about {groups} K-pop groups, {songs} songs in the blind test, and {plays} finished quiz plays',
    stats,
  );
  const when = stats ? ` (counts as of ${asOfDate(stats.asOf)}, rounded down)` : '';
  const live = targets.filter((t) => isLivePage(t));

  return `# kpopquiz.org

> kpopquiz.org is an independent fan site where K-pop fans play and write quizzes. It holds ${scale}${when}.

Every count on the site comes from real recorded plays and published quizzes, never from estimates. Quizzes are written by fans, and their names are shown on them; facts on our own pages come from official sources, Wikidata, MusicBrainz and Wikipedia.

## Main pages
${live.map(targetLine).join('\n')}

## Data and reports
- [${REPORT_TITLE}](${abs(REPORT_PATH)}): what fans know, measured on ${exact(REPORT_SCORES.attempts)} quiz attempts, ${REPORT_WINDOW}
- [Report dataset](${abs(`${REPORT_PATH}/dataset`)}): every figure of the report with its query, sample size and window
- [Monthly K-pop Pulse](${abs('/data/pulse')}): the fandom of the month and the most-played quizzes, by real plays
- [Site statistics](${abs('/stats')}): live counts, the most-played fandoms this week, the hardest and easiest quizzes

## Citing our data
Our numbers, charts and reports are under ${DATA_LICENCE.name} (${DATA_LICENCE.url}): credit kpopquiz.org. ${LINK_NOTE} A ready credit line for the report: "${REPORT_CREDIT}". The quizzes are written by fans and are not under this licence.

## About
- [About kpopquiz.org](${abs('/about')}): who runs the site and how quizzes are made
- [Editorial policy](${abs('/editorial-policy')}): sources, moderation, AI use and the corrections log
- [Press kit](${abs('/press')}): live numbers, logos, licences, and the press contact ${PRESS_EMAIL}
`;
}
