'use client';

import { useState, useEffect } from 'react';
import { JobsTab } from './jobs-tab';
import { ReviewTab } from './review-tab';
import { OriginalsTab } from './originals-tab';
import { ExportTab } from './export-tab';

const TABS = [
  { id: 'jobs', label: 'Scrape Jobs' },
  { id: 'review', label: 'Review Pins' },
  { id: 'originals', label: 'Originals' },
  { id: 'export', label: 'Export CSV' },
] as const;

type TabId = typeof TABS[number]['id'];

export function PinterestAdminPanel() {
  const [tab, setTab] = useState<TabId>('jobs');
  const [stats, setStats] = useState({ pendingJobs: 0, toReview: 0, approved: 0, readyToExport: 0 });

  useEffect(() => {
    fetch('/api/admin/pinterest/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d));
  }, [tab]);

  return (
    <div style={{
      maxWidth: 1100, margin: "0 auto", padding: "24px 16px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#2c2c2a", margin: 0 }}>Pinterest Manager</p>
        <p style={{ fontSize: 11, color: "#888780", margin: 0, marginTop: 4 }}>
          Scrape, review, and export pins for bulk upload to Pinterest
        </p>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {[
          { label: "Pending jobs", value: stats.pendingJobs, color: "#888780" },
          { label: "To review", value: stats.toReview, color: "#D4537E" },
          { label: "Approved", value: stats.approved, color: "#9a7acc" },
          { label: "Ready to export", value: stats.readyToExport, color: "#27ae60" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: "10px 12px", borderRadius: 10,
            background: "#fff", border: "1px solid #e8e6e0",
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 9, color: "#888780", margin: 0, marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 20, marginBottom: 16, borderBottom: "1px solid #e8e6e0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 14px",
            background: "transparent",
            border: "none",
            borderBottom: tab === t.id ? "2px solid #D4537E" : "2px solid transparent",
            fontSize: 11, fontWeight: tab === t.id ? 600 : 500,
            color: tab === t.id ? "#D4537E" : "#888780",
            cursor: "pointer",
            marginBottom: -1,
            fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'jobs' && <JobsTab />}
      {tab === 'review' && <ReviewTab />}
      {tab === 'originals' && <OriginalsTab />}
      {tab === 'export' && <ExportTab />}
    </div>
  );
}
