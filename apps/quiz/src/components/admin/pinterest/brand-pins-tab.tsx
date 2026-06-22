'use client';

import { useState } from 'react';

interface SamplePin {
  filename: string;
  base64: string;
  meta: { type: string; group?: string; fact?: string; headline?: string };
}

export function BrandPinsTab() {
  const [samples, setSamples] = useState<SamplePin[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullResult, setFullResult] = useState<{ count: number } | null>(null);

  async function generateSamples() {
    setSampleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pinterest/generate-brand-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sample' }),
      });
      if (!res.ok) { setError(`Error ${res.status}`); return; }
      const data = await res.json();
      setSamples(data.pins ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setSampleLoading(false);
    }
  }

  async function generateFull() {
    setFullLoading(true);
    setError(null);
    setFullResult(null);
    try {
      const res = await fetch('/api/admin/pinterest/generate-brand-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      });
      if (!res.ok) { setError(`Error ${res.status}`); return; }

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/zip')) {
        // Trigger download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kpopquiz-brand-pins.zip';
        a.click();
        URL.revokeObjectURL(url);
        setFullResult({ count: 200 });
      } else {
        const data = await res.json();
        setFullResult({ count: data.count ?? 0 });
        if (data.error) setError(data.error);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setFullLoading(false);
    }
  }

  function downloadSample(pin: SamplePin) {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${pin.base64}`;
    a.download = pin.filename;
    a.click();
  }

  return (
    <div>
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "rgba(212,83,126,0.04)", border: "1px solid rgba(212,83,126,0.08)",
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 10, color: "#555550", margin: 0, lineHeight: 1.5 }}>
          Generate standalone brand pins (1000x1500px) using templates A (group promo), B (trivia fact), C (comparison). These are separate from per-quiz OG pins.
        </p>
      </div>

      {/* Sample section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#2c2c2a", margin: 0 }}>Step 1 - Preview</p>
          <button
            onClick={generateSamples}
            disabled={sampleLoading}
            style={{
              padding: "6px 14px", borderRadius: 6,
              background: "#D4537E", color: "#fff",
              border: "none", fontSize: 10, fontWeight: 600,
              cursor: sampleLoading ? "not-allowed" : "pointer",
              opacity: sampleLoading ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {sampleLoading ? 'Generating...' : 'Generate 3 Samples'}
          </button>
        </div>

        {samples.length > 0 && (
          <div style={{ display: "flex", gap: 12 }}>
            {samples.map((pin) => (
              <div key={pin.filename} style={{ flex: 1, maxWidth: 160 }}>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e8e6e0" }}>
                  <img
                    src={`data:image/png;base64,${pin.base64}`}
                    alt={pin.filename}
                    style={{ width: "100%", display: "block" }}
                  />
                  <button
                    onClick={() => downloadSample(pin)}
                    style={{
                      position: "absolute", bottom: 6, right: 6,
                      padding: "4px 8px", borderRadius: 4,
                      background: "rgba(0,0,0,0.65)", color: "#fff",
                      border: "none", fontSize: 9, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Download
                  </button>
                </div>
                <p style={{ fontSize: 9, color: "#888780", margin: "4px 0 0", textAlign: "center" }}>
                  {pin.filename}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full batch section */}
      <div style={{ borderTop: "1px solid #e8e6e0", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#2c2c2a", margin: 0 }}>Step 2 - Full Batch</p>
          <button
            onClick={generateFull}
            disabled={fullLoading}
            style={{
              padding: "6px 14px", borderRadius: 6,
              background: fullLoading ? "#e8e6e0" : "#1A1816",
              color: fullLoading ? "#888780" : "#fff",
              border: "none", fontSize: 10, fontWeight: 600,
              cursor: fullLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {fullLoading ? 'Generating (up to 60s)...' : 'Generate All Pins + Download ZIP'}
          </button>
        </div>
        <p style={{ fontSize: 9, color: "#888780", margin: 0 }}>
          Generates all A/B/C pins from live DB data. Returns a ZIP with all PNGs and manifest.csv.
        </p>

        {fullResult && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: "rgba(39,174,96,0.06)", border: "1px solid rgba(39,174,96,0.15)",
          }}>
            <p style={{ fontSize: 10, color: "#27ae60", margin: 0 }}>
              Done - {fullResult.count} pins generated. ZIP download started.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: "rgba(212,83,126,0.06)", border: "1px solid rgba(212,83,126,0.15)",
        }}>
          <p style={{ fontSize: 10, color: "#D4537E", margin: 0 }}>{error}</p>
        </div>
      )}
    </div>
  );
}
