'use client';

import { useState, useEffect } from 'react';

interface BatchRecord {
  id: string;
  batch_type: string;
  pin_count: number;
  created_at: string;
}

export function ExportTab() {
  const [stats, setStats] = useState({ reposts: 0, originals: 0 });
  const [batches, setBatches] = useState<BatchRecord[]>([]);

  useEffect(() => {
    fetch('/api/admin/pinterest/export-stats').then(r => r.ok ? r.json() : { reposts: 0, originals: 0 }).then(setStats);
    fetch('/api/admin/pinterest/batches').then(r => r.ok ? r.json() : []).then(setBatches);
  }, []);

  function downloadCSV(type: 'reposts' | 'originals') {
    window.location.href = `/api/admin/pinterest/export-csv?type=${type}`;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{
          flex: 1, padding: "16px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(212,83,126,0.04), rgba(212,83,126,0.01))",
          border: "1px solid rgba(212,83,126,0.12)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#D4537E", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Reposts</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#2c2c2a", margin: 0, marginTop: 4 }}>{stats.reposts}</p>
          <p style={{ fontSize: 9, color: "#888780", margin: 0, marginBottom: 10 }}>processed pins ready to export</p>
          <button
            onClick={() => downloadCSV('reposts')}
            disabled={stats.reposts === 0}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 8,
              background: stats.reposts > 0 ? "#D4537E" : "#e8e6e0",
              color: "#fff", border: "none",
              fontSize: 11, fontWeight: 600,
              cursor: stats.reposts > 0 ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >Download Reposts CSV</button>
        </div>

        <div style={{
          flex: 1, padding: "16px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(154,122,204,0.04), rgba(154,122,204,0.01))",
          border: "1px solid rgba(154,122,204,0.12)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#9a7acc", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Originals</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#2c2c2a", margin: 0, marginTop: 4 }}>{stats.originals}</p>
          <p style={{ fontSize: 9, color: "#888780", margin: 0, marginBottom: 10 }}>quiz pins ready to export</p>
          <button
            onClick={() => downloadCSV('originals')}
            disabled={stats.originals === 0}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 8,
              background: stats.originals > 0 ? "#9a7acc" : "#e8e6e0",
              color: "#fff", border: "none",
              fontSize: 11, fontWeight: 600,
              cursor: stats.originals > 0 ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >Download Originals CSV</button>
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: "#2c2c2a", margin: 0, marginBottom: 8 }}>Past exports</p>
      <div style={{
        padding: "10px", borderRadius: 10,
        background: "#fff", border: "1px solid #e8e6e0",
      }}>
        {batches.length === 0 && <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 16 }}>No exports yet.</p>}
        {batches.map(b => (
          <div key={b.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 4px",
            borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: b.batch_type === 'reposts' ? "rgba(212,83,126,0.08)" : "rgba(154,122,204,0.08)",
              color: b.batch_type === 'reposts' ? "#D4537E" : "#9a7acc",
              textTransform: "uppercase",
            }}>{b.batch_type}</span>
            <span style={{ fontSize: 10, color: "#2c2c2a", flex: 1 }}>{b.pin_count} pins</span>
            <span style={{ fontSize: 9, color: "#888780" }}>{new Date(b.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
