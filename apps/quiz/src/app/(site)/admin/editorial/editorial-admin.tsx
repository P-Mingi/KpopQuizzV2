'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { FeedCard } from '@/components/community/ux-v1/feed-card';
import { PostView } from '@/components/community/ux-v1/post-view';
import { P8ViewerProvider } from '@/components/community/ux-v1/viewer';
import { approvalBlocker, checkDraftInput } from '@/lib/editorial/drafts';
import { draftToPost } from '@/lib/editorial/preview';
import { DRAFT_KINDS, MAX_PER_DAY, publishedHref } from '@/lib/editorial/types';
import { timeAgo } from '@/lib/ux-v1/p8/format';

import type { DraftInput, DraftKind, DraftStatus, EditorialAccount, EditorialDraft } from '@/lib/editorial/types';
import type { P8Group } from '@/lib/ux-v1/p8/types';

// The editorial review queue (client). Admin chrome like the other admin pages
// (the aiv-* classes of globals.css); the preview is the real feed card and the
// real post view, fed the post this draft becomes (lib/editorial/preview.ts).

type AdminGroup = P8Group & { photo: string | null };

interface Props {
  live: boolean;
  failed: boolean;
  drafts: EditorialDraft[];
  accounts: EditorialAccount[];
  groups: AdminGroup[];
  now: number;
}

interface FormState {
  account_id: string;
  kind: DraftKind;
  group_id: string;
  title: string;
  body: string;
  options: string[];
  debate_days: string;
  sources: { label: string; url: string }[];
}

const TABS: { status: DraftStatus; label: string }[] = [
  { status: 'draft', label: 'Queue' },
  { status: 'approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
  { status: 'rejected', label: 'Rejected' },
];

const ERRORS: Record<string, string> = {
  bad_account: 'Pick an active editorial account.',
  bad_kind: 'Pick a kind.',
  bad_title: 'The title needs 5 to 160 characters.',
  too_long: 'The text is too long (a debate holds 2,000 characters, a thread or blog 20,000).',
  empty_body: 'A thread or a blog needs a text.',
  bad_group: 'That group does not exist.',
  bad_sources: 'Each source needs a label, and a link must start with http:// or https://.',
  bad_options: 'A debate needs 2 to 4 different options, 80 characters at most each.',
  bad_days: 'A debate closes after 1, 3 or 7 days.',
  bad_date: 'Pick a date and a time.',
  blog_needs_sources: 'A blog needs at least one source before it can be approved.',
  template_needs_sources: 'A draft built from data keeps its sources: add them back before approving.',
  already_published: 'This draft is already published.',
  not_editable: 'This draft changed in the meantime. Refresh the page.',
  not_live: 'The editorial tables are not applied yet.',
  duplicate: 'This draft already exists.',
  forbidden: 'Only an admin can review a draft.',
};
const errorLine = (code: string | undefined): string => (code && ERRORS[code]) || 'That did not work. Try again.';

function emptyForm(accounts: EditorialAccount[]): FormState {
  return { account_id: accounts.find((a) => a.active)?.user_id ?? '', kind: 'thread', group_id: '', title: '', body: '', options: ['', ''], debate_days: '3', sources: [{ label: '', url: '' }] };
}

function formOf(d: EditorialDraft): FormState {
  return {
    account_id: d.account_id, kind: d.kind, group_id: d.group_id === null ? '' : String(d.group_id), title: d.title, body: d.body,
    options: d.options?.length ? [...d.options] : ['', ''], debate_days: String(d.debate_days ?? 3),
    sources: d.sources.length ? d.sources.map((s) => ({ label: s.label, url: s.url ?? '' })) : [{ label: '', url: '' }],
  };
}

function payloadOf(f: FormState): Record<string, unknown> {
  return {
    account_id: f.account_id, kind: f.kind, group_id: f.group_id === '' ? null : Number(f.group_id), title: f.title, body: f.body,
    options: f.kind === 'debate' ? f.options : null, debate_days: f.kind === 'debate' ? Number(f.debate_days) : null,
    sources: f.sources,
  };
}

/** datetime-local value (the admin's own time zone) for an instant. */
function localInput(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return { ok: false, data: {} }; }
}

function Preview({ input, account, group, at, now }: { input: DraftInput; account: EditorialAccount | null; group: AdminGroup | null; at: number; now: number }): React.ReactElement {
  const shown = Math.min(at, now);
  const post = draftToPost(input, { account, group, groupPhoto: group?.photo ?? null, at: shown, now, ago: timeAgo(new Date(shown).toISOString(), now) || 'just now' });
  return (
    // inert: the preview is the real post markup, but nothing in it can be clicked,
    // focused or submitted (no like, vote, reply or follow from the admin page).
    <div className="g9-preview" inert data-g9="preview">
      <p className="g9-preview-h">In the feed</p>
      <div className="g9-preview-col"><FeedCard post={post} /></div>
      <p className="g9-preview-h" style={{ marginTop: 20 }}>The post</p>
      <div className="g9-preview-col"><PostView post={post} more={[]} likesLive={false} titleAs="h2" /></div>
    </div>
  );
}

export function EditorialAdmin({ live, failed, drafts, accounts, groups, now }: Props): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<DraftStatus>('draft');
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [dates, setDates] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.user_id, a] as const)), [accounts]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g] as const)), [groups]);
  const counts = useMemo(() => {
    const c: Record<DraftStatus, number> = { draft: 0, approved: 0, published: 0, rejected: 0 };
    for (const d of drafts) c[d.status]++;
    return c;
  }, [drafts]);
  const list = drafts.filter((d) => d.status === tab);
  const activeAccounts = accounts.filter((a) => a.active);
  const refresh = (): void => startTransition(() => router.refresh());

  const checkedForm = form ? checkDraftInput(payloadOf(form)) : null;

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form || busy) return;
    const c = checkDraftInput(payloadOf(form));
    if (!c.ok) { setError(errorLine(c.error)); return; }
    setBusy(true);
    setError(null);
    const r = editingId === null
      ? await send('/api/admin/editorial', 'POST', { action: 'create', draft: payloadOf(form) })
      : await send(`/api/admin/editorial/${editingId}`, 'PATCH', { action: 'edit', draft: payloadOf(form) });
    setBusy(false);
    if (!r.ok) { setError(errorLine(r.data.error as string | undefined)); return; }
    setForm(null);
    setEditingId(null);
    setTab('draft');
    setNotice(editingId === null ? 'Draft saved to the queue.' : 'Changes saved. The draft is back in the queue for review.');
    refresh();
  }

  async function act(d: EditorialDraft, action: 'approve' | 'reject'): Promise<void> {
    if (busy) return;
    if (action === 'reject' && !window.confirm(`Reject "${d.title}"?`)) return;
    setBusy(true);
    setError(null);
    const local = dates[d.id] ?? localInput(Math.max(now, d.scheduled_at ? Date.parse(d.scheduled_at) : now));
    const body = action === 'approve' ? { action, scheduled_at: new Date(local).toISOString() } : { action };
    const r = await send(`/api/admin/editorial/${d.id}`, 'PATCH', body);
    setBusy(false);
    if (!r.ok) { setError(errorLine(r.data.error as string | undefined)); return; }
    setNotice(action === 'approve' ? `Approved. It goes live at the first run after ${when(new Date(local).toISOString())}.` : 'Rejected.');
    refresh();
  }

  async function generate(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await send('/api/admin/editorial', 'POST', { action: 'generate' });
    setBusy(false);
    if (!r.ok) { setError(errorLine(r.data.error as string | undefined)); return; }
    const created = Number(r.data.created ?? 0);
    const existing = Number(r.data.existing ?? 0);
    setNotice(created ? `${created} new ${created === 1 ? 'draft' : 'drafts'} from this week's data.` : existing ? 'Nothing new: this week\'s drafts are already in the list.' : 'No draft: the data has nothing to report this week.');
    setTab('draft');
    refresh();
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]): void => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="aiv-page" data-g9="admin">
      <div className="aiv-header">
        <div>
          <h1 className="aiv-title">Editorial</h1>
          <p className="aiv-subtitle">
            Topics, debates and blogs of the team accounts. Nothing goes live without your approval. Approved drafts are
            published by the cron every 15 minutes: at most {MAX_PER_DAY} a day, never two in a row from one account.
          </p>
        </div>
        {live && activeAccounts.length ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="aiv-filter-tab" onClick={generate} disabled={busy}>Drafts from this week&apos;s data</button>
            <button type="button" className="aiv-add-btn" onClick={() => { setEditingId(null); setForm(emptyForm(accounts)); setError(null); }}>+ New draft</button>
          </div>
        ) : null}
      </div>

      {failed ? <p className="aiv-empty" role="status">The editorial tables did not load. Refresh the page in a moment.</p> : null}
      {!failed && !live ? (
        <p className="aiv-empty" data-g9="not-live">
          Not applied yet. Run docs/pending-migrations/v12-g9-editorial.sql, then fill in and run
          v12-g9-editorial-accounts.sql. Until then nothing is written and no surface changes.
        </p>
      ) : null}

      {live ? (
        <>
          <div className="aiv-form" style={{ marginBottom: 24 }} data-g9="accounts">
            <p className="aiv-notes-text" style={{ margin: 0, fontStyle: 'normal' }}>
              {accounts.length
                ? `Accounts: ${accounts.map((a) => `${a.display_name} (${a.beat}${a.active ? '' : ', retired'})`).join('  ·  ')}`
                : 'No editorial account yet. Create the accounts yourself, then fill in and run docs/pending-migrations/v12-g9-editorial-accounts.sql.'}
            </p>
          </div>

          {notice ? <p className="g9-note" role="status">{notice}</p> : null}
          {error && !form ? <p className="g9-note" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}

          {form ? (
            <form className="aiv-form" onSubmit={save} style={{ marginBottom: 24 }} data-g9="form">
              <div className="aiv-form-row">
                <label className="aiv-label">
                  Account
                  <select className="aiv-input" value={form.account_id} onChange={(e) => set('account_id', e.target.value)} required>
                    {activeAccounts.map((a) => <option key={a.user_id} value={a.user_id}>{a.display_name} ({a.beat})</option>)}
                  </select>
                </label>
                <label className="aiv-label" style={{ maxWidth: 140 }}>
                  Kind
                  <select className="aiv-input" value={form.kind} onChange={(e) => set('kind', e.target.value as DraftKind)}>
                    {DRAFT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
                <label className="aiv-label">
                  Group
                  <select className="aiv-input" value={form.group_id} onChange={(e) => set('group_id', e.target.value)}>
                    <option value="">All groups</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="aiv-label">
                {form.kind === 'debate' ? 'Question' : 'Title'}
                <input className="aiv-input" value={form.title} maxLength={160} onChange={(e) => set('title', e.target.value)} required />
              </label>
              <label className="aiv-label">
                {form.kind === 'debate' ? 'Text (optional)' : 'Text (a blank line starts a new paragraph)'}
                <textarea className="aiv-textarea" rows={form.kind === 'blog' ? 14 : 6} value={form.body} onChange={(e) => set('body', e.target.value)} />
              </label>
              {form.kind === 'debate' ? (
                <div className="aiv-form-row">
                  {form.options.map((o, i) => (
                    <label key={i} className="aiv-label">
                      Option {i + 1}
                      <input className="aiv-input" value={o} maxLength={80} onChange={(e) => set('options', form.options.map((x, j) => (j === i ? e.target.value : x)))} />
                    </label>
                  ))}
                  {form.options.length < 4 ? <button type="button" className="aiv-filter-tab" onClick={() => set('options', [...form.options, ''])}>+ Option</button> : null}
                  <label className="aiv-label" style={{ maxWidth: 140 }}>
                    Closes after
                    <select className="aiv-input" value={form.debate_days} onChange={(e) => set('debate_days', e.target.value)}>
                      <option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option>
                    </select>
                  </label>
                </div>
              ) : null}
              <div>
                <p className="aiv-label" style={{ marginBottom: 4 }}>Sources (every fact needs one; a blog cannot be approved without)</p>
                {form.sources.map((s, i) => (
                  <div key={i} className="aiv-form-row">
                    <input className="aiv-input" aria-label={`Source ${i + 1}`} placeholder="What it says and where it comes from" value={s.label} maxLength={200} onChange={(e) => set('sources', form.sources.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input className="aiv-input" aria-label={`Link of source ${i + 1}`} placeholder="https://... (optional)" value={s.url} onChange={(e) => set('sources', form.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  </div>
                ))}
                <button type="button" className="aiv-filter-tab" onClick={() => set('sources', [...form.sources, { label: '', url: '' }])}>+ Source</button>
              </div>

              {checkedForm?.ok ? (
                <Preview
                  key={JSON.stringify(checkedForm.value)}
                  input={checkedForm.value}
                  account={accountById.get(checkedForm.value.account_id) ?? null}
                  group={checkedForm.value.group_id !== null ? groupById.get(checkedForm.value.group_id) ?? null : null}
                  at={now} now={now}
                />
              ) : <p className="g9-note">The preview shows once the draft is complete: {errorLine(checkedForm && !checkedForm.ok ? checkedForm.error : undefined)}</p>}

              {error ? <p className="aiv-snippet-text" role="alert" style={{ color: '#dc2626', margin: 0 }}>{error}</p> : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="aiv-submit" disabled={busy}>{busy ? 'Saving...' : editingId === null ? 'Save to the queue' : 'Save changes'}</button>
                <button type="button" className="aiv-filter-tab" onClick={() => { setForm(null); setEditingId(null); setError(null); }}>Cancel</button>
              </div>
            </form>
          ) : null}

          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }} role="tablist" aria-label="Drafts by status">
            {TABS.map((t) => (
              <button key={t.status} type="button" role="tab" aria-selected={tab === t.status} className={`aiv-filter-tab${tab === t.status ? ' active' : ''}`} onClick={() => { setTab(t.status); setPreviewId(null); }}>
                {t.label} ({counts[t.status]})
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="aiv-empty">{tab === 'draft' ? 'The queue is empty.' : `No ${tab} draft.`}</p>
          ) : (
            <div className="aiv-table-wrap">
              <table className="aiv-table" data-g9="queue">
                <thead>
                  <tr><th>Draft</th><th>Kind</th><th>Account</th><th>{tab === 'published' ? 'Published' : tab === 'approved' ? 'Goes live' : 'Created'}</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    const account = accountById.get(d.account_id) ?? null;
                    const group = d.group_id !== null ? groupById.get(d.group_id) ?? null : null;
                    const blocker = approvalBlocker(d);
                    const href = publishedHref(d.kind, d.published_ref);
                    const stuck = d.status === 'approved' && !!d.published_ref;
                    return (
                      <tr key={d.id} data-g9-draft={d.id}>
                        <td className="aiv-td-snippet">
                          <p className="aiv-snippet-text" style={{ margin: 0, fontWeight: 600 }}>{d.title}</p>
                          <p className="aiv-notes-text" style={{ margin: 0, fontStyle: 'normal' }}>
                            {[group?.name ?? 'All groups', d.template_key ? `from data (${d.template_key})` : 'written by an admin', `${d.sources.length} ${d.sources.length === 1 ? 'source' : 'sources'}`].join(' · ')}
                          </p>
                          {stuck ? <p className="aiv-notes-text" style={{ margin: 0, color: '#dc2626', fontStyle: 'normal' }}>A publisher run stopped half way on this draft. Approve it again to put it back in line.</p> : null}
                          {previewId === d.id ? (
                            <Preview input={d} account={account} group={group} at={d.published_at ? Date.parse(d.published_at) : d.scheduled_at ? Date.parse(d.scheduled_at) : now} now={now} />
                          ) : null}
                        </td>
                        <td>{d.kind}</td>
                        <td>{account ? account.display_name : 'unknown'}</td>
                        <td className="aiv-td-date">{when(tab === 'published' ? d.published_at : tab === 'approved' ? d.scheduled_at : d.created_at)}</td>
                        <td>
                          <div className="g9-acts">
                            <button type="button" className="aiv-filter-tab" aria-expanded={previewId === d.id} onClick={() => setPreviewId((cur) => (cur === d.id ? null : d.id))}>Preview</button>
                            {d.status !== 'published' ? (
                              <button type="button" className="aiv-filter-tab" onClick={() => { setEditingId(d.id); setForm(formOf(d)); setError(null); setNotice(null); window.scrollTo({ top: 0 }); }}>Edit</button>
                            ) : null}
                            {d.status !== 'published' ? (
                              <>
                                <input
                                  type="datetime-local" aria-label={`Date for ${d.title}`}
                                  value={dates[d.id] ?? localInput(Math.max(now, d.scheduled_at ? Date.parse(d.scheduled_at) : now))}
                                  onChange={(e) => setDates((m) => ({ ...m, [d.id]: e.target.value }))}
                                />
                                <button type="button" className="aiv-submit" style={{ width: 'auto', padding: '0 12px' }} disabled={busy || !!blocker} title={blocker ? errorLine(blocker) : undefined} onClick={() => { void act(d, 'approve'); }}>
                                  {d.status === 'approved' ? 'Approve again' : 'Approve'}
                                </button>
                              </>
                            ) : null}
                            {d.status === 'draft' || d.status === 'approved' ? (
                              <button type="button" className="aiv-filter-tab" style={{ color: '#dc2626' }} disabled={busy} onClick={() => { void act(d, 'reject'); }}>Reject</button>
                            ) : null}
                            {href ? <a className="aiv-filter-tab" href={href}>Open</a> : null}
                          </div>
                          {blocker && d.status !== 'published' ? <p className="aiv-notes-text" style={{ margin: '4px 0 0', fontStyle: 'normal' }}>{errorLine(blocker)}</p> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {pending ? <div className="aiv-loading">Refreshing...</div> : null}
    </div>
  );
}

/** The preview wrapped in the viewer context the post islands read. */
export function EditorialAdminRoot(props: Props): React.ReactElement {
  return <P8ViewerProvider><EditorialAdmin {...props} /></P8ViewerProvider>;
}
