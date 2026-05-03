'use client';

import { useState, useEffect } from 'react';

interface ScrapeJob {
  id: string;
  query: string;
  job_type: string;
  target_count: number;
  scraped_count: number;
  status: string;
  created_at: string;
  error_message?: string;
}

const SUGGESTED_SEARCHES = [
  "kpop aesthetic", "bts wallpaper", "blackpink aesthetic",
  "stray kids aesthetic", "aespa concept photo", "newjeans aesthetic",
  "twice aesthetic", "seventeen wallpaper", "kpop concert",
  "kpop photocard", "kpop fashion", "kpop meme", "kpop fanart",
];

const SUGGESTED_BOARDS: Array<{ label: string; url: string }> = [];

export function JobsTab() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [jobType, setJobType] = useState<'search' | 'board'>('search');
  const [newQuery, setNewQuery] = useState('');
  const [targetCount, setTargetCount] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/pinterest/jobs');
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }

  async function addJob(query: string, type: 'search' | 'board' = jobType) {
    if (!query.trim()) return;

    if (type === 'board' && !query.includes('pinterest.com/')) {
      alert('Board URL must contain pinterest.com/ - copy the full URL from a Pinterest board page');
      return;
    }

    const res = await fetch('/api/admin/pinterest/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        job_type: type,
        target_count: targetCount,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      alert(`Failed to add job (${res.status}): ${err.error || res.statusText}`);
      console.error('Add job failed:', res.status, err);
      return;
    }

    setNewQuery('');
    load();
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this job?')) return;
    await fetch(`/api/admin/pinterest/jobs?id=${id}`, { method: 'DELETE' });
    load();
  }

  const statusColors: Record<string, string> = {
    pending: '#888780', scraping: '#e8a060', completed: '#27ae60', failed: '#e74c3c',
  };

  return (
    <div>
      <div style={{
        padding: "12px", borderRadius: 12,
        background: "#fff", border: "1px solid #e8e6e0",
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#2c2c2a", margin: 0, marginBottom: 8 }}>Add scrape job</p>

        {/* Type toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          <button onClick={() => setJobType('search')} style={{
            flex: 1, padding: "6px 10px", borderRadius: 8,
            background: jobType === 'search' ? "#D4537E" : "#fff",
            color: jobType === 'search' ? "#fff" : "#888780",
            border: `1px solid ${jobType === 'search' ? "#D4537E" : "#e8e6e0"}`,
            fontSize: 10, fontWeight: jobType === 'search' ? 600 : 500, cursor: "pointer",
            fontFamily: "inherit",
          }}>{'\uD83D\uDD0D'} Search query</button>
          <button onClick={() => setJobType('board')} style={{
            flex: 1, padding: "6px 10px", borderRadius: 8,
            background: jobType === 'board' ? "#D4537E" : "#fff",
            color: jobType === 'board' ? "#fff" : "#888780",
            border: `1px solid ${jobType === 'board' ? "#D4537E" : "#e8e6e0"}`,
            fontSize: 10, fontWeight: jobType === 'board' ? 600 : 500, cursor: "pointer",
            fontFamily: "inherit",
          }}>{'\uD83D\uDCCC'} Specific board</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={newQuery}
            onChange={e => setNewQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addJob(newQuery)}
            placeholder={jobType === 'search'
              ? "Search query (e.g. 'bts aesthetic')"
              : "https://pinterest.com/username/board-name/"}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "1px solid #e8e6e0", fontSize: 11, outline: "none",
              fontFamily: "inherit",
            }}
          />
          <input
            type="number"
            value={targetCount}
            onChange={e => setTargetCount(parseInt(e.target.value) || 100)}
            placeholder="Count"
            style={{
              width: 80, padding: "8px 10px", borderRadius: 8,
              border: "1px solid #e8e6e0", fontSize: 11, outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button onClick={() => addJob(newQuery)} style={{
            padding: "8px 16px", borderRadius: 8,
            background: "#D4537E", color: "#fff", border: "none",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}>Add</button>
        </div>

        <p style={{ fontSize: 9, color: "#888780", margin: 0, marginBottom: 4 }}>
          {jobType === 'search' ? 'Suggested queries:' : 'Suggested boards:'}
        </p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {jobType === 'search' && SUGGESTED_SEARCHES.map(q => (
            <button key={q} onClick={() => addJob(q, 'search')} style={{
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(212,83,126,0.04)", border: "1px solid rgba(212,83,126,0.1)",
              fontSize: 9, color: "#D4537E", cursor: "pointer",
              fontFamily: "inherit",
            }}>+ {q}</button>
          ))}
          {jobType === 'board' && SUGGESTED_BOARDS.length === 0 && (
            <p style={{ fontSize: 9, color: "#b4b2a9", margin: 0, fontStyle: "italic" }}>
              No suggested boards yet - paste a Pinterest board URL above
            </p>
          )}
          {jobType === 'board' && SUGGESTED_BOARDS.map(b => (
            <button key={b.url} onClick={() => addJob(b.url, 'board')} style={{
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(212,83,126,0.04)", border: "1px solid rgba(212,83,126,0.1)",
              fontSize: 9, color: "#D4537E", cursor: "pointer",
              fontFamily: "inherit",
            }}>+ {b.label}</button>
          ))}
        </div>

        {jobType === 'board' && (
          <p style={{ fontSize: 8, color: "#b4b2a9", margin: 0, marginTop: 8, lineHeight: 1.4 }}>
            To find boards: search Pinterest for "kpop aesthetic", click a popular pin, then click the board name. Copy the full URL from your browser.
          </p>
        )}
      </div>

      <div style={{
        padding: "12px", borderRadius: 12,
        background: "#fff", border: "1px solid #e8e6e0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#2c2c2a", margin: 0 }}>Jobs ({jobs.length})</p>
          <p style={{ fontSize: 9, color: "#888780", margin: 0 }}>Run: <code style={{ background: "#f0ede8", padding: "2px 6px", borderRadius: 3, fontSize: 8 }}>npm run pinterest:scrape</code></p>
        </div>

        {loading && <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 20 }}>Loading...</p>}
        {!loading && jobs.length === 0 && <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 20 }}>No jobs yet. Add one above.</p>}

        {jobs.map(job => (
          <div key={job.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8,
            background: "#faf9f6", border: "1px solid #f0ede8",
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              background: `${statusColors[job.status] ?? '#888780'}15`, color: statusColors[job.status] ?? '#888780',
              textTransform: "uppercase",
            }}>{job.status}</span>
            <span style={{
              fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
              background: job.job_type === 'board' ? "rgba(154,122,204,0.08)" : "rgba(74,144,208,0.08)",
              color: job.job_type === 'board' ? "#9a7acc" : "#4a90d0",
            }}>{job.job_type === 'board' ? '\uD83D\uDCCC board' : '\uD83D\uDD0D search'}</span>
            <span style={{
              fontSize: 11, fontWeight: 500, color: "#2c2c2a", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }} title={job.query}>
              {job.query}
            </span>
            <span style={{ fontSize: 9, color: "#888780" }}>
              {job.scraped_count}/{job.target_count}
            </span>
            {job.error_message && (
              <span style={{ fontSize: 8, color: "#e74c3c" }} title={job.error_message}>{'\u26A0'}</span>
            )}
            <button onClick={() => deleteJob(job.id)} style={{
              fontSize: 12, color: "#d3d1c7", background: "transparent",
              border: "none", cursor: "pointer", padding: "2px 6px",
              fontFamily: "inherit",
            }}>{'\u2715'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
