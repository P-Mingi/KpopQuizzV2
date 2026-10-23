/**
 * SEO Mission 3, part C: preview of the Monday e-mail, from fixtures. SENDS NOTHING.
 *
 *   cd apps/quiz && npx tsx scripts/seo-weekly-email-preview.mts                 # text to stdout
 *   cd apps/quiz && npx tsx scripts/seo-weekly-email-preview.mts --html out.html # and the HTML
 *
 * The rows are the SAMPLE rows of src/lib/seo/weekly/fixtures.ts (not measurements), run
 * through the same code as the cron: gatherWeeklyInput (with an in-memory reader instead of the
 * database, and a fake fetch instead of GitHub and the linked-URL check), buildReport,
 * renderEmail. No network request, no database, no e-mail.
 *
 * The preview on production data is the cron itself with ?dry=1 (see
 * docs/seo/WEEKLY-DATA-SETUP.md): it builds from the real tables and returns the e-mail as JSON.
 */

import { writeFileSync } from 'node:fs';

import { CALENDAR_MD, memoryWeeklyReader, SAMPLE_LINKS, SAMPLE_ROWS, TARGETS_MD } from '../src/lib/seo/weekly/fixtures';
import { gatherWeeklyInput } from '../src/lib/seo/weekly/report-data';
import { buildReport } from '../src/lib/seo/weekly/report';
import { renderEmail } from '../src/lib/seo/weekly/email';

import type { FetchLike } from '../src/lib/seo/weekly/google-auth';

const fakeFetch: FetchLike = async (url) => {
  if (url.startsWith('https://api.github.com/')) {
    return { status: 200, ok: true, json: async () => ({ workflow_runs: [{ conclusion: 'success', created_at: '2026-10-12T04:40:00Z', html_url: 'https://github.com/example/repo/actions/runs/1' }] }), text: async () => '' };
  }
  // The sample link to /q/old-slug answers 404, to show a red line.
  const status = url.endsWith('/q/old-slug') ? 404 : 200;
  return { status, ok: status === 200, json: async () => ({}), text: async () => '' };
};

const input = await gatherWeeklyInput({
  reader: memoryWeeklyReader(SAMPLE_ROWS, SAMPLE_LINKS, [], 0),
  env: { GSC_SERVICE_ACCOUNT_JSON: 'sample', BING_WEBMASTER_API_KEY: 'sample', SEO_GITHUB_REPO: 'example/repo' },
  today: '2026-10-12',
  fetchImpl: fakeFetch,
  readTargets: async () => TARGETS_MD,
  readCalendar: async () => CALENDAR_MD,
});
const email = renderEmail(buildReport(input));

console.log('APERÇU (données d\'exemple, rien n\'est envoyé)');
console.log(`Objet: ${email.subject}`);
console.log(`Lignes: ${email.text.split('\n').length} (maximum 15)`);
console.log('');
console.log(email.text);

const i = process.argv.indexOf('--html');
if (i > 0 && process.argv[i + 1]) {
  writeFileSync(process.argv[i + 1]!, email.html);
  console.log(`\nHTML écrit dans ${process.argv[i + 1]}`);
}
