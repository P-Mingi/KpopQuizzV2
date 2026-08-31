'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { AiCheck } from './page';

interface Props {
  checks: AiCheck[];
  trackedQueries: string[];
  platforms: Array<{ id: string; label: string }>;
  userId: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#10a37f',
  perplexity: '#20808d',
  gemini: '#4285f4',
  google_aio: '#ea4335',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ScoreCard({
  checks,
  platforms,
}: {
  checks: AiCheck[];
  platforms: Props['platforms'];
}): React.ReactElement {
  const latest = new Map<string, AiCheck>();
  for (const c of checks) {
    const key = `${c.platform}:${c.query}`;
    if (!latest.has(key)) latest.set(key, c);
  }

  const byPlatform = new Map<string, { total: number; mentioned: number }>();
  for (const p of platforms) {
    byPlatform.set(p.id, { total: 0, mentioned: 0 });
  }
  for (const c of latest.values()) {
    const entry = byPlatform.get(c.platform);
    if (entry) {
      entry.total++;
      if (c.mentioned) entry.mentioned++;
    }
  }

  return (
    <div className="aiv-scores">
      {platforms.map((p) => {
        const entry = byPlatform.get(p.id);
        const pct =
          entry && entry.total > 0
            ? Math.round((entry.mentioned / entry.total) * 100)
            : 0;
        return (
          <div key={p.id} className="aiv-score-card">
            <span
              className="aiv-score-dot"
              style={{ background: PLATFORM_COLORS[p.id] }}
            />
            <span className="aiv-score-label">{p.label}</span>
            <span className="aiv-score-value">
              {entry ? `${entry.mentioned}/${entry.total}` : '0/0'}
            </span>
            <span className="aiv-score-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function AiVisibilityDashboard({
  checks,
  trackedQueries,
  platforms,
  userId,
}: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [formPlatform, setFormPlatform] = useState(platforms[0]!.id);
  const [formQuery, setFormQuery] = useState(trackedQueries[0]!);
  const [formMentioned, setFormMentioned] = useState(false);
  const [formPosition, setFormPosition] = useState('');
  const [formSnippet, setFormSnippet] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: formPlatform,
          query: formQuery,
          mentioned: formMentioned,
          position: formPosition ? Number(formPosition) : null,
          snippet: formSnippet || null,
          notes: formNotes || null,
          checked_by: userId,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormMentioned(false);
        setFormPosition('');
        setFormSnippet('');
        setFormNotes('');
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered =
    filter === 'all'
      ? checks
      : checks.filter((c) => c.platform === filter);

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <div>
          <h1 className="aiv-title">AI Visibility Tracker</h1>
          <p className="aiv-subtitle">
            Monthly manual checks: is kpopquiz.org cited by AI assistants?
          </p>
        </div>
        <button
          className="aiv-add-btn"
          onClick={() => setShowForm(!showForm)}
          type="button"
        >
          {showForm ? 'Cancel' : '+ Log check'}
        </button>
      </div>

      <ScoreCard checks={checks} platforms={platforms} />

      {showForm && (
        <form className="aiv-form" onSubmit={handleSubmit}>
          <div className="aiv-form-row">
            <label className="aiv-label">
              Platform
              <select
                className="aiv-select"
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value)}
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="aiv-label">
              Query
              <select
                className="aiv-select"
                value={formQuery}
                onChange={(e) => setFormQuery(e.target.value)}
              >
                {trackedQueries.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="aiv-form-row">
            <label className="aiv-label aiv-checkbox-label">
              <input
                type="checkbox"
                checked={formMentioned}
                onChange={(e) => setFormMentioned(e.target.checked)}
              />
              Mentioned kpopquiz.org
            </label>
            {formMentioned && (
              <label className="aiv-label">
                Position (1 = first)
                <input
                  type="number"
                  className="aiv-input"
                  min={1}
                  max={20}
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="e.g. 1"
                />
              </label>
            )}
          </div>
          <label className="aiv-label">
            Snippet (copy the relevant part)
            <textarea
              className="aiv-textarea"
              rows={3}
              value={formSnippet}
              onChange={(e) => setFormSnippet(e.target.value)}
              placeholder="Paste the AI's response excerpt..."
            />
          </label>
          <label className="aiv-label">
            Notes
            <input
              type="text"
              className="aiv-input"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Any observations..."
            />
          </label>
          <button className="aiv-submit" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save check'}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="aiv-filters">
        <button
          className={`aiv-filter-tab${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
          type="button"
        >
          All ({checks.length})
        </button>
        {platforms.map((p) => {
          const count = checks.filter((c) => c.platform === p.id).length;
          return (
            <button
              key={p.id}
              className={`aiv-filter-tab${filter === p.id ? ' active' : ''}`}
              onClick={() => setFilter(p.id)}
              type="button"
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Log table */}
      {filtered.length === 0 ? (
        <p className="aiv-empty">
          No checks logged yet. Click &quot;+ Log check&quot; to record your
          first AI visibility check.
        </p>
      ) : (
        <div className="aiv-table-wrap">
          <table className="aiv-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Platform</th>
                <th>Query</th>
                <th>Cited?</th>
                <th>Pos</th>
                <th>Snippet / Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={c.mentioned ? 'aiv-row-yes' : ''}>
                  <td className="aiv-td-date">{formatDate(c.checked_at)}</td>
                  <td>
                    <span
                      className="aiv-platform-badge"
                      style={{
                        borderColor: PLATFORM_COLORS[c.platform] ?? '#888',
                        color: PLATFORM_COLORS[c.platform] ?? '#888',
                      }}
                    >
                      {platforms.find((p) => p.id === c.platform)?.label ??
                        c.platform}
                    </span>
                  </td>
                  <td className="aiv-td-query">{c.query}</td>
                  <td>
                    <span
                      className={`aiv-cited ${c.mentioned ? 'yes' : 'no'}`}
                    >
                      {c.mentioned ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="aiv-td-pos">
                    {c.position ? `#${c.position}` : ''}
                  </td>
                  <td className="aiv-td-snippet">
                    {c.snippet && (
                      <p className="aiv-snippet-text">{c.snippet}</p>
                    )}
                    {c.notes && <p className="aiv-notes-text">{c.notes}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPending && (
        <div className="aiv-loading">Refreshing...</div>
      )}
    </div>
  );
}
