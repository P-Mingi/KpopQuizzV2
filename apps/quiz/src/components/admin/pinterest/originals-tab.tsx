'use client';

import { useState, useEffect } from 'react';

interface OriginalPin {
  quiz_slug: string;
  quiz_title: string;
  group_tag: string | null;
  pin_image_url: string | null;
  status: string;
}

export function OriginalsTab() {
  const [pins, setPins] = useState<OriginalPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/pinterest/originals');
    if (res.ok) setPins(await res.json());
    setLoading(false);
  }

  async function generatePin(quizSlug: string) {
    setGenerating(quizSlug);
    await fetch('/api/admin/pinterest/generate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_slug: quizSlug }),
    });
    setGenerating(null);
    load();
  }

  return (
    <div>
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "rgba(212,83,126,0.04)", border: "1px solid rgba(212,83,126,0.08)",
        marginBottom: 12,
      }}>
        <p style={{ fontSize: 10, color: "#555550", margin: 0, lineHeight: 1.5 }}>
          Generate Pinterest pin images (1000x1500px) for your published quizzes. Once generated, export them to CSV for bulk upload.
        </p>
      </div>

      {loading && <p style={{ fontSize: 10, color: "#888780", textAlign: "center", padding: 40 }}>Loading...</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {pins.map(pin => (
          <div key={pin.quiz_slug} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 8,
            background: "#fff", border: "1px solid #e8e6e0",
          }}>
            {pin.pin_image_url ? (
              <img src={pin.pin_image_url} alt="" style={{ width: 32, height: 48, borderRadius: 4, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 48, borderRadius: 4, background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{'\uD83D\uDCCC'}</div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#2c2c2a", margin: 0 }}>{pin.quiz_title}</p>
              <p style={{ fontSize: 9, color: "#888780", margin: 0, marginTop: 1 }}>{pin.group_tag || 'No group'} {'\u00B7'} {pin.status}</p>
            </div>
            <button
              onClick={() => generatePin(pin.quiz_slug)}
              disabled={generating === pin.quiz_slug}
              style={{
                padding: "5px 12px", borderRadius: 6,
                background: pin.pin_image_url ? "rgba(212,83,126,0.06)" : "#D4537E",
                color: pin.pin_image_url ? "#D4537E" : "#fff",
                border: pin.pin_image_url ? "1px solid rgba(212,83,126,0.15)" : "none",
                fontSize: 9, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {generating === pin.quiz_slug ? 'Generating...' : pin.pin_image_url ? 'Regenerate' : 'Generate pin'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
