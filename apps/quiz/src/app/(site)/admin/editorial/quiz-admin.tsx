'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { checkQuizPayload } from '@/lib/editorial/quiz/payload';
import { DEFAULT_SCHEDULE_DAYS, MAX_SCHEDULE_DAYS, REJECT_AT_ERRORS, drawSample } from '@/lib/editorial/quiz/rules';

import type { QuizPanel } from '@/lib/editorial/quiz/panel';
import type { QuizDraft } from '@/lib/editorial/quiz/types';
import type { DraftStatus, EditorialAccount } from '@/lib/editorial/types';
import type { P8Group } from '@/lib/ux-v1/p8/types';

// The quiz lane of /admin/editorial (run O1, lot E1b; EDITORIAL_QUIZ on, SQL 012 applied). Admin chrome like the rest of the page
// (the aiv-* classes of globals.css, inline styles for the few extras). Times are UTC because the caps are UTC days.
// Steps: paste drafts (they form a review batch), read the sample of the batch, close the review (approves every draft in the queue
// and spreads them over N days, or rejects the batch), then spread again whenever needed. A single draft can be approved or
// rejected from its row: an approved quiz goes live at the scheduled time, never sooner.

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop, so the code is today's).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

type AdminGroup = P8Group & { photo: string | null };

interface Props {
  panel: QuizPanel;
  accounts: EditorialAccount[];
  groups: AdminGroup[];
}

const TABS: { status: DraftStatus; label: string }[] = [
  { status: 'draft', label: 'Queue' },
  { status: 'approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
  { status: 'rejected', label: 'Rejected' },
];

const ERRORS: Record<string, string> = {
  forbidden: 'Only an admin can review a draft.',
  quiz_not_live: 'SQL 012 is not applied yet.',
  unavailable: 'The editorial tables did not answer. Try again in a moment.',
  bad_batch_size: 'Paste 1 to 50 drafts at a time.',
  bad_ids: 'Pick at least one draft.',
  bad_errors: 'The number of errors is a whole number from 0.',
  not_found: 'That draft or batch does not exist.',
  not_open: 'This review is already closed.',
  not_editable: 'This draft changed in the meantime. Refresh the page.',
  already_published: 'This quiz is already published.',
  bad_payload: 'The draft is not a valid quiz draft.',
  bad_account: 'The account is not an active Team account.',
  bad_group: 'No group has that slug.',
  no_group: 'The draft has no group.',
  group_mismatch: 'The group of the draft does not match its group slug.',
  hub_slug: 'The slug is the slug of a group hub (a group name followed by quiz, test or trivia).',
  slug_taken: 'Another quiz or draft already uses this slug.',
  slug_repeated: 'Another draft of this paste uses the same slug.',
  title_taken: 'Another quiz already has this title: two pages never share a title.',
  no_room: 'No room: every day in the range already holds 10 quizzes or a quiz of that group. Pick more days.',
  title_is_hub_query: 'The title is the query of a group hub.',
  blocked_source: 'A source is a site the rulebook does not allow.',
  image_not_allowed: 'A quiz draft carries no image.',
  quiz_not_editable: 'A quiz draft is not edited: reject it and paste the corrected draft.',
  bad_json: 'The text is not valid JSON.',
};
const errorLine = (code: string | undefined, detail?: string): string => {
  const base = (code && ERRORS[code]) || (code ? `Refused (${code}).` : 'That did not work. Try again.');
  return detail ? `${base} ${detail}` : base;
};

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const r = await fetch(BASE_PATH ? BASE_PATH + url : url, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return { ok: false, data: {} }; }
}

/** 2026-11-04 14:07 UTC */
function utc(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

const FRAME: React.CSSProperties = { border: '1px dashed var(--ux-line)', borderRadius: 16, padding: 16, margin: '12px 0 24px', background: 'var(--ux-bg)', color: 'var(--ux-ink)', fontFamily: 'var(--ux-font)', textAlign: 'left', whiteSpace: 'normal' };
const NOTE: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, margin: '8px 0', fontStyle: 'normal' };
const ACTS: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' };
const NUM_INPUT: React.CSSProperties = { height: 30, width: 72, padding: '0 8px', border: '1px solid var(--border-default, #d4d4d4)', borderRadius: 8, fontSize: 12, background: 'transparent', color: 'inherit' };

function Details({ d }: { d: QuizDraft }): React.ReactElement {
  const parsed = useMemo(() => checkQuizPayload(d.payload), [d.payload]);
  if (!parsed.ok) return <p className="aiv-notes-text" style={{ ...NOTE, color: '#dc2626' }}>{errorLine(parsed.error, parsed.detail)}</p>;
  const p = parsed.value;
  return (
    <div style={FRAME}>
      <p style={NOTE}>Slug: <code>/q/{p.slug}</code> · {p.difficulty} · {p.questions.length} questions · group <code>{p.group_slug}</code></p>
      {p.description ? <p style={NOTE}>About the quiz: {p.description}</p> : null}
      <ol style={{ paddingLeft: 20, margin: 0 }}>
        {p.questions.map((q, i) => (
          <li key={i} style={{ margin: '0 0 10px' }}>
            <p style={{ ...NOTE, margin: 0, fontWeight: 600 }}>{q.question}</p>
            <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
              {q.options.map((o, j) => <li key={j} style={{ fontSize: 13 }}>{j === q.correct ? <strong>{o} (right answer)</strong> : o}</li>)}
            </ul>
            {q.fun_fact ? <p style={{ ...NOTE, margin: 0 }}>Fun fact: {q.fun_fact}</p> : null}
            <p style={{ ...NOTE, margin: 0 }}>Source: <a href={q.source_url} target="_blank" rel="noopener noreferrer nofollow">{q.source_url}</a></p>
          </li>
        ))}
      </ol>
      <p style={{ ...NOTE, fontWeight: 600 }}>Sources of the draft</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {p.sources.map((s) => <li key={s.id} style={{ fontSize: 13 }}>{s.id}: <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a></li>)}
      </ul>
      {p.notes ? <p style={NOTE}>Note for the reviewer: {p.notes}</p> : null}
    </div>
  );
}

export function QuizAdmin({ panel, accounts, groups }: Props): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<DraftStatus>('draft');
  const [openId, setOpenId] = useState<number | null>(null);
  const [paste, setPaste] = useState('');
  const [label, setLabel] = useState('');
  const [days, setDays] = useState(String(DEFAULT_SCHEDULE_DAYS));
  const [errorsBy, setErrorsBy] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = (): void => startTransition(() => router.refresh());

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.user_id, a] as const)), [accounts]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g] as const)), [groups]);
  const counts = useMemo(() => {
    const c: Record<DraftStatus, number> = { draft: 0, approved: 0, published: 0, rejected: 0 };
    for (const d of panel.drafts) c[d.status]++;
    return c;
  }, [panel.drafts]);
  const list = panel.drafts.filter((d) => d.status === tab);
  const daysNumber = Math.max(1, Math.min(MAX_SCHEDULE_DAYS, Math.floor(Number(days)) || DEFAULT_SCHEDULE_DAYS));
  const openBatches = panel.batches.filter((b) => b.status === 'open');
  const titleOf = (id: number): string => panel.drafts.find((d) => d.id === id)?.title ?? `Draft ${id}`;

  async function run(call: () => Promise<{ ok: boolean; data: Record<string, unknown> }>, done: (data: Record<string, unknown>) => string): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const r = await call();
    setBusy(false);
    if (!r.ok) { setError(errorLine(r.data.error as string | undefined, r.data.detail as string | undefined)); return; }
    setNotice(done(r.data));
    refresh();
  }

  const lines = (list: unknown, f: (x: Record<string, unknown>) => string): string => (Array.isArray(list) && list.length ? ` ${(list as Record<string, unknown>[]).map(f).join(' ')}` : '');
  const blockedLine = (b: unknown): string => lines(b, (x) => `Draft ${String(x.id)}: ${errorLine(x.error as string, x.detail as string | undefined)}`);
  const unplacedLine = (u: unknown): string => lines(u, (x) => `Draft ${String(x.id)}: ${errorLine(x.reason as string)}`);

  function importDrafts(e: React.FormEvent): void {
    e.preventDefault();
    let parsed: unknown;
    try { parsed = JSON.parse(paste); } catch { setError(errorLine('bad_json')); return; }
    const drafts = Array.isArray(parsed) ? parsed : [parsed];
    void run(() => send('/api/admin/editorial', 'POST', { action: 'import_quizzes', label, drafts }), (data) => {
      const created = Array.isArray(data.created) ? data.created.length : 0;
      const rejected = Array.isArray(data.rejected) ? (data.rejected as Array<Record<string, unknown>>) : [];
      if (created) { setPaste(''); setLabel(''); setTab('draft'); }
      return `${created} ${created === 1 ? 'draft' : 'drafts'} filed as a review batch.${rejected.map((x) => ` Draft ${Number(x.index) + 1}${x.slug ? ` (${String(x.slug)})` : ''}: ${errorLine(x.error as string, x.detail as string | undefined)}`).join('')}`;
    });
  }

  function approveOne(d: QuizDraft): void {
    void run(() => send(`/api/admin/editorial/${d.id}`, 'PATCH', { action: 'approve' }), (data) => {
      const a = Array.isArray(data.approved) ? (data.approved as Array<{ scheduled_at: string }>)[0] : undefined;
      return a ? `Approved. It goes live at the first run after ${utc(a.scheduled_at)}.` : 'Approved.';
    });
  }

  function rejectOne(d: QuizDraft): void {
    if (!window.confirm(`Reject "${d.title}"?`)) return;
    void run(() => send(`/api/admin/editorial/${d.id}`, 'PATCH', { action: 'reject' }), () => 'Rejected.');
  }

  function closeBatch(id: number): void {
    const errors = Number(errorsBy[id] ?? '0');
    if (!Number.isInteger(errors) || errors < 0) { setError(errorLine('bad_errors')); return; }
    const verdict = errors >= REJECT_AT_ERRORS ? 'reject the whole batch' : 'approve every draft still in the queue';
    if (!window.confirm(`${errors} ${errors === 1 ? 'error' : 'errors'} in the sample: this will ${verdict}. Continue?`)) return;
    void run(() => send('/api/admin/editorial', 'POST', { action: 'close_review_batch', id, errors, days: daysNumber }), (data) => {
      const approved = Array.isArray(data.approved) ? data.approved.length : 0;
      const rejected = Array.isArray(data.rejected) ? data.rejected.length : 0;
      return (rejected ? `Batch rejected: ${rejected} ${rejected === 1 ? 'draft' : 'drafts'} rejected.` : `Batch approved: ${approved} ${approved === 1 ? 'quiz' : 'quizzes'} scheduled over ${daysNumber} ${daysNumber === 1 ? 'day' : 'days'}.`)
        + blockedLine(data.blocked) + unplacedLine(data.unplaced);
    });
  }

  function scheduleAll(): void {
    void run(() => send('/api/admin/editorial', 'POST', { action: 'schedule_quizzes', days: daysNumber }), (data) => {
      const n = Array.isArray(data.scheduled) ? data.scheduled.length : 0;
      return `${n} approved ${n === 1 ? 'quiz' : 'quizzes'} scheduled at random times over ${daysNumber} ${daysNumber === 1 ? 'day' : 'days'}, the groups with no published quiz first.${blockedLine(data.blocked)}${unplacedLine(data.unplaced)}`;
    });
  }

  return (
    <div className="aiv-page" data-e1b="quizzes" style={{ marginTop: 32 }}>
      <div className="aiv-header">
        <div>
          <h2 className="aiv-title" style={{ fontSize: 22 }}>Quizzes</h2>
          <p className="aiv-subtitle">
            Quiz drafts of the Team accounts. An approved quiz goes live at a random time between 06:00 and 22:00 UTC, never sooner
            than scheduled: at most {panel.stats.cap} a day and {panel.stats.perGroupCap} per group a day, on top of the other items.
            Published today (UTC): {panel.stats.publishedToday} of {panel.stats.cap}.
          </p>
        </div>
      </div>

      {notice ? <p className="aiv-notes-text" role="status" style={NOTE}>{notice}</p> : null}
      {error ? <p className="aiv-notes-text" role="alert" style={{ ...NOTE, color: '#dc2626' }}>{error}</p> : null}

      <details className="aiv-form" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>1. Paste quiz drafts</summary>
        <form onSubmit={importDrafts} data-e1b="import" style={{ marginTop: 12 }}>
          <label className="aiv-label">
            Name of the batch (optional)
            <input className="aiv-input" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="aiv-label">
            The drafts, as JSON: one draft or a list of up to 50 (the format of docs/o1/contracts/formats.md section 4)
            <textarea className="aiv-textarea" rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} spellCheck={false} />
          </label>
          <button type="submit" className="aiv-submit" style={{ width: 'auto', padding: '0 12px' }} disabled={busy || !paste.trim()}>File as a review batch</button>
        </form>
      </details>

      <div className="aiv-form" style={{ marginBottom: 16 }} data-e1b="batches">
        <p style={{ ...NOTE, fontWeight: 600, margin: '0 0 4px' }}>2. Read the sample, then close the review</p>
        <p style={NOTE}>
          Read about a quarter of each batch (the quizzes marked &quot;sample&quot; below). Two errors or more reject the whole batch;
          fewer approve every draft still in the queue and spread it at random over the days you pick.
        </p>
        <label style={{ ...NOTE, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          Days to spread over
          <input type="number" min={1} max={MAX_SCHEDULE_DAYS} style={NUM_INPUT} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Days to spread over" />
        </label>
        {openBatches.length === 0 ? <p style={NOTE}>No batch is waiting for its review.</p> : openBatches.map((b) => {
          const members = panel.drafts.filter((d) => d.review_batch_id === b.id);
          const sample = drawSample(members.map((d) => d.id), b.id);
          return (
            <div key={b.id} style={{ borderTop: '1px solid var(--ux-line)', paddingTop: 8, marginTop: 8 }} data-e1b-batch={b.id}>
              <p style={{ ...NOTE, margin: 0, fontWeight: 600 }}>{b.label} · {b.size} {b.size === 1 ? 'draft' : 'drafts'} · sample of {b.sample_size}</p>
              <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                {sample.map((id) => <li key={id} style={{ fontSize: 13 }}>{titleOf(id)}</li>)}
              </ul>
              <div style={ACTS}>
                <label style={{ ...NOTE, margin: 0, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  Errors found in the sample
                  <input type="number" min={0} style={NUM_INPUT} value={errorsBy[b.id] ?? '0'} onChange={(e) => setErrorsBy((m) => ({ ...m, [b.id]: e.target.value }))} aria-label={`Errors found in the sample of ${b.label}`} />
                </label>
                <button type="button" className="aiv-submit" style={{ width: 'auto', padding: '0 12px' }} disabled={busy} onClick={() => closeBatch(b.id)}>Close the review</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="aiv-form" style={{ marginBottom: 16 }} data-e1b="schedule">
        <p style={{ ...NOTE, fontWeight: 600, margin: '0 0 4px' }}>3. Spread the approved quizzes again (optional)</p>
        <p style={NOTE}>Gives every approved quiz that is not live yet a new random time over the days above, the groups with no published quiz first. Quizzes already published or due now are not moved.</p>
        <button type="button" className="aiv-filter-tab" disabled={busy || counts.approved === 0} onClick={scheduleAll}>Spread {counts.approved} approved over {daysNumber} {daysNumber === 1 ? 'day' : 'days'}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }} role="tablist" aria-label="Quiz drafts by status">
        {TABS.map((t) => (
          <button key={t.status} type="button" role="tab" aria-selected={tab === t.status} className={`aiv-filter-tab${tab === t.status ? ' active' : ''}`} onClick={() => { setTab(t.status); setOpenId(null); }}>
            {t.label} ({counts[t.status]})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="aiv-empty">{tab === 'draft' ? 'The quiz queue is empty.' : `No ${tab} quiz.`}</p>
      ) : (
        <div className="aiv-table-wrap">
          <table className="aiv-table" data-e1b="queue">
            <thead>
              <tr><th>Quiz</th><th>Account</th><th>{tab === 'published' ? 'Published' : tab === 'approved' ? 'Goes live' : 'Created'}</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const account = accountById.get(d.account_id);
                const group = d.group_id !== null ? groupById.get(d.group_id) : undefined;
                const batch = panel.batches.find((b) => b.id === d.review_batch_id);
                const inSample = !!batch && drawSample(panel.drafts.filter((x) => x.review_batch_id === batch.id).map((x) => x.id), batch.id).includes(d.id);
                const stuck = d.status === 'approved' && !!d.published_ref;
                return (
                  <tr key={d.id} data-e1b-draft={d.id}>
                    <td className="aiv-td-snippet">
                      <p className="aiv-snippet-text" style={{ margin: 0, fontWeight: 600 }}>{d.title}</p>
                      <p className="aiv-notes-text" style={{ margin: 0, fontStyle: 'normal' }}>
                        {[group?.name ?? 'No group', batch ? `batch: ${batch.label}${inSample ? ' (sample)' : ''}` : 'no batch', `${d.sources.length} ${d.sources.length === 1 ? 'source' : 'sources'}`].join(' · ')}
                      </p>
                      {stuck ? <p className="aiv-notes-text" style={{ margin: 0, color: '#dc2626', fontStyle: 'normal' }}>A publisher run stopped half way on this quiz. Approve it again to put it back in line.</p> : null}
                      {openId === d.id ? <Details d={d} /> : null}
                    </td>
                    <td>{account ? account.display_name : 'unknown'}</td>
                    <td className="aiv-td-date">{utc(tab === 'published' ? d.published_at : tab === 'approved' ? d.scheduled_at : d.created_at)}</td>
                    <td>
                      <div style={ACTS}>
                        <button type="button" className="aiv-filter-tab" aria-expanded={openId === d.id} onClick={() => setOpenId((cur) => (cur === d.id ? null : d.id))}>Read</button>
                        {d.status !== 'published' ? (
                          <button type="button" className="aiv-submit" style={{ width: 'auto', padding: '0 12px' }} disabled={busy} onClick={() => approveOne(d)}>{d.status === 'approved' ? 'Approve again' : 'Approve'}</button>
                        ) : null}
                        {d.status === 'draft' || d.status === 'approved' ? (
                          <button type="button" className="aiv-filter-tab" style={{ color: '#dc2626' }} disabled={busy} onClick={() => rejectOne(d)}>Reject</button>
                        ) : null}
                        {d.status === 'published' && d.published_ref?.startsWith('quiz:') ? <a className="aiv-filter-tab" href={`${BASE_PATH}/q/${d.published_ref.slice(5)}`}>Open</a> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pending ? <div className="aiv-loading">Refreshing...</div> : null}
    </div>
  );
}
