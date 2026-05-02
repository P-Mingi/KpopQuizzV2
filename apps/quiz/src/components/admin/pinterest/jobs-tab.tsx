'use client';

import { useState, useEffect } from 'react';

interface ScrapeJob {
  id: string;
  query: string;
  target_count: number;
  scraped_count: number;
  status: string;
  created_at: string;
  error_message?: string;
}

const SUGGESTED_QUERIES = [
  "kpop aesthetic", "bts wallpaper", "blackpink aesthetic",
  "stray kids aesthetic", "aespa concept photo", "newjeans aesthetic",
  "twice aesthetic", "seventeen wallpaper", "kpop concert",
  "kpop photocard", "kpop fashion", "kpop meme", "kpop fanart",
];

export function JobsTab() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
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

  async function addJob(query: string) {
    if (!query.trim()) return;
    await fetch('/api/admin/pinterest/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), target_count: targetCount }),
    });
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
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={newQuery}
            onChange={e => setNewQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addJob(newQuery)}
            placeholder="Search query (e.g. 'bts aesthetic')"
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

        <p style={{ fontSize: 9, color: "#888780", margin: 0, marginBottom: 4 }}>Suggested:</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SUGGESTED_QUERIES.map(q => (
            <button key={q} onClick={() => addJob(q)} style={{
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(212,83,126,0.04)", border: "1px solid rgba(212,83,126,0.1)",
              fontSize: 9, color: "#D4537E", cursor: "pointer",
              fontFamily: "inherit",
            }}>+ {q}</button>
          ))}
        </div>
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
            <span style={{ fontSize: 11, fontWeight: 500, color: "#2c2c2a", flex: 1 }}>{job.query}</span>
            <span style={{ fontSize: 9, color: "#888780" }}>
              {job.scraped_count}/{job.target_count}
            </span>
            {job.error_message && (
              <span style={{ fontSize: 8, color: "#e74c3c" }}>{job.error_message.slice(0, 30)}</span>
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
