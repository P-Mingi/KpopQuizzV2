'use client';

import { useState, useEffect } from 'react';

interface ScrapedPin {
  id: string;
  source_image_url: string;
  original_title: string;
  detected_group: string | null;
  save_count: number;
  status: string;
}

export function ReviewTab() {
  const [pins, setPins] = useState<ScrapedPin[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/pinterest/scraped?filter=${filter}`);
    if (res.ok) setPins(await res.json());
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch('/api/admin/pinterest/scraped', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setPins(prev => prev.filter(p => p.id !== id));
  }

  async function approveAll() {
    if (!confirm(`Approve all ${pins.length} pins?`)) return;
    await Promise.all(pins.map(p => updateStatus(p.id, 'approved')));
  }

  const groups = ['all', 'BTS', 'BLACKPINK', 'Stray Kids', 'aespa', 'TWICE', 'NewJeans', 'SEVENTEEN', 'IVE', 'EXO', 'unknown'];

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, gap: 8,
      }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1 }}>
          {groups.map(g => (
            <button key={g} onClick={() => setFilter(g)} style={{
              padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap",
              fontSize: 10, fontWeight: filter === g ? 600 : 500, cursor: "pointer",
              background: filter === g ? "#D4537E" : "#fff",
              color: filter === g ? "#fff" : "#888780",
              border: `1px solid ${filter === g ? "#D4537E" : "#e8e6e0"}`,
              fontFamily: "inherit",
            }}>{g === 'all' ? 'All' : g}</button>
          ))}
        </div>
        <button onClick={approveAll} disabled={pins.length === 0} style={{
          padding: "5px 12px", borderRadius: 8,
          background: pins.length > 0 ? "#27ae60" : "#e8e6e0",
          color: "#fff", border: "none",
          fontSize: 10, fontWeight: 600, cursor: pins.length > 0 ? "pointer" : "default",
          whiteSpace: "nowrap", fontFamily: "inherit",
        }}>Approve all</button>
      </div>

      {loading && <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 40 }}>Loading...</p>}
      {!loading && pins.length === 0 && (
        <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 40 }}>
          No pins to review. Run <code style={{ background: "#f0ede8", padding: "2px 6px", borderRadius: 3 }}>npm run pinterest:scrape</code> first.
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 8,
      }}>
        {pins.map(pin => (
          <div key={pin.id} style={{
            borderRadius: 8, overflow: "hidden",
            background: "#fff", border: "1px solid #e8e6e0",
          }}>
            <div style={{ position: "relative", aspectRatio: "2/3", background: "#f0ede8" }}>
              <img src={pin.source_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              {pin.detected_group && (
                <span style={{
                  position: "absolute", top: 4, left: 4,
                  fontSize: 7, fontWeight: 700, color: "#fff",
                  padding: "2px 6px", borderRadius: 4,
                  background: "rgba(0,0,0,0.6)",
                }}>{pin.detected_group}</span>
              )}
              <span style={{
                position: "absolute", top: 4, right: 4,
                fontSize: 7, fontWeight: 600, color: "#fff",
                padding: "2px 6px", borderRadius: 4,
                background: "rgba(0,0,0,0.6)",
              }}>{pin.save_count} saves</span>
            </div>
            <div style={{ display: "flex", gap: 2, padding: 4 }}>
              <button onClick={() => updateStatus(pin.id, 'rejected')} style={{
                flex: 1, padding: "5px 0", borderRadius: 4,
                background: "transparent", border: "1px solid #e8e6e0",
                fontSize: 10, color: "#888780", cursor: "pointer",
                fontFamily: "inherit",
              }}>{'\u2715'}</button>
              <button onClick={() => updateStatus(pin.id, 'approved')} style={{
                flex: 1, padding: "5px 0", borderRadius: 4,
                background: "#27ae60", color: "#fff", border: "none",
                fontSize: 10, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}>{'\u2713'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
