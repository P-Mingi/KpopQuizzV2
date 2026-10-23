import { AI_SOURCE_LABEL, AI_SOURCES } from '@/lib/seo/watch/ai-referrer';
import { readAiVisits, summarizeAiVisits } from '@/lib/seo/watch/ai-visits';
import { readLastRuns } from '@/lib/seo/watch/runs';

import type { WatchKind } from '@/lib/seo/watch/runs';

// SEO Mission 3, part D, point 4 (admin only, under the page's admin gate): visits that came
// from an AI assistant, counted server-side by the middleware per UTC day, assistant and landing
// path, with no personal data (lib/seo/watch/ai-visit-record.ts). Plus the last result of each
// monitoring job (linked-URL guard, source check, play spikes). Server-rendered, no client JS.

const DAYS = 30;

const RUN_LABEL: Record<WatchKind, string> = {
  linked_urls: 'Linked-URL guard (nightly)',
  sources: 'Fact sources (monthly)',
  spikes: 'Play spikes (hourly)',
};

const NOT_APPLIED = 'Not recording yet: the owner applies docs/pending-migrations/seo-watch.sql.';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function AiVisitsSection(): Promise<React.ReactElement> {
  const [read, runs] = await Promise.all([readAiVisits(DAYS), readLastRuns()]);
  const summary = 'rows' in read ? summarizeAiVisits(read.rows, DAYS) : null;

  return (
    <section className="mt-10" aria-labelledby="ai-visits-h">
      <h2 id="ai-visits-h" className="text-lg font-semibold text-primary mb-1">AI assistant visits</h2>
      <p className="text-sm text-secondary mb-4">
        Page loads whose referrer (or utm_source) is ChatGPT, Perplexity, Copilot or Gemini, last {DAYS} days, UTC. Counted
        server-side on production, no IP, no user id.
      </p>

      {!summary ? (
        <p className="aiv-empty">{'unavailable' in read && read.unavailable === 'not_applied' ? NOT_APPLIED : 'The counts could not be read right now.'}</p>
      ) : summary.total === 0 ? (
        <p className="aiv-empty">No AI assistant visit recorded in the last {DAYS} days.</p>
      ) : (
        <>
          <div className="aiv-table-wrap mb-4">
            <table className="aiv-table">
              <thead>
                <tr>
                  <th>Day</th>
                  {AI_SOURCES.map((s) => <th key={s}>{AI_SOURCE_LABEL[s]}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{DAYS} days</strong></td>
                  {AI_SOURCES.map((s) => <td key={s}><strong>{summary.bySource[s].toLocaleString('en-US')}</strong></td>)}
                  <td><strong>{summary.total.toLocaleString('en-US')}</strong></td>
                </tr>
                {summary.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className="aiv-td-date">{d.day}</td>
                    {AI_SOURCES.map((s) => <td key={s}>{d[s].toLocaleString('en-US')}</td>)}
                    <td>{d.total.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-sm font-semibold text-primary mb-2">Top landing pages ({DAYS} days)</h3>
          <div className="aiv-table-wrap">
            <table className="aiv-table">
              <thead>
                <tr><th>Page</th><th>Visits</th></tr>
              </thead>
              <tbody>
                {summary.topPaths.map((p) => (
                  <tr key={p.path}>
                    <td className="aiv-td-query"><a href={p.path} target="_blank" rel="noopener noreferrer">{p.path}</a></td>
                    <td>{p.visits.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold text-primary mt-10 mb-1">SEO monitoring</h2>
      <p className="text-sm text-secondary mb-4">The last run of each job that found something. Alerts go to the Discord ops channel; play spikes also e-mail the owner.</p>
      {runs === null ? (
        <p className="aiv-empty">{NOT_APPLIED}</p>
      ) : (
        <div className="aiv-table-wrap">
          <table className="aiv-table">
            <thead>
              <tr><th>Job</th><th>Last finding</th><th>Result</th></tr>
            </thead>
            <tbody>
              {(Object.keys(RUN_LABEL) as WatchKind[]).map((k) => {
                const r = runs[k];
                return (
                  <tr key={k}>
                    <td>{RUN_LABEL[k]}</td>
                    <td className="aiv-td-date">{r ? fmtDate(r.ran_at) : 'Nothing found yet'}</td>
                    <td>{r ? r.summary : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
