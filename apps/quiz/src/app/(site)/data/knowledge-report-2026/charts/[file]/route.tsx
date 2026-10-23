import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { CHART_COLORS, CHART_FILES, CHART_LAYOUT, CHART_LICENCE_LINE, chartByFile, chartHeight, chartSvg } from '@/lib/report/charts';
import { REPORT_CREDIT } from '@/lib/report/knowledge-report-2026';

import type { ChartSpec } from '@/lib/report/charts';

// SEO Mission 3, part F.3: three Knowledge Report charts as files, for press and anyone
// citing the report: /data/knowledge-report-2026/charts/<id>.svg and .png. The SVG is drawn
// by lib/report/charts.ts; the PNG is the same layout through next/og (the renderer the
// site already uses for its share images). Both carry the credit line and the licence.
//
// Static: the report is a fixed snapshot, so every file is rendered once at build and
// served from the CDN. An unknown file is a 404 (dynamicParams off).
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): Array<{ file: string }> {
  return CHART_FILES.map((file) => ({ file }));
}

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');
function font(file: string): ArrayBuffer {
  const b = readFileSync(join(FONTS_DIR, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const CACHE = 'public, max-age=86400, s-maxage=604800';

function ChartPng({ spec }: { spec: ChartSpec }): React.ReactElement {
  const L = CHART_LAYOUT;
  const C = CHART_COLORS;
  const inner = L.width - L.pad * 2;
  // Satori: every element that holds text is display:flex.
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.background, padding: `0 ${L.pad}px`, fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex', marginTop: L.titleY - 38, fontSize: 38, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{spec.title}</div>
      <div style={{ display: 'flex', marginTop: L.subtitleY - L.titleY - 22 + 6, fontSize: 22, color: C.muted, lineHeight: 1 }}>{spec.subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: L.rowsTop - L.subtitleY - L.labelSize + 4 }}>
        {spec.bars.map((b) => {
          const w = Math.max(4, Math.round((Math.min(100, Math.max(0, b.value)) / 100) * inner));
          return (
            <div key={b.label} style={{ display: 'flex', flexDirection: 'column', height: L.rowHeight }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: L.labelSize, color: C.ink, lineHeight: 1 }}>
                <div style={{ display: 'flex' }}>{b.label}</div>
                <div style={{ display: 'flex' }}>
                  <span style={{ fontWeight: 700 }}>{b.valueLabel}</span>
                  <span style={{ color: C.muted, marginLeft: 8 }}>{`· ${b.note}`}</span>
                </div>
              </div>
              <div style={{ display: 'flex', marginTop: 10, width: inner, height: L.barHeight, borderRadius: 4, background: C.track }}>
                <div style={{ display: 'flex', width: w, height: L.barHeight, borderRadius: 4, background: C.bar }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.rule}`, marginTop: 4, paddingTop: 20 }}>
        <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: C.ink }}>{REPORT_CREDIT}</div>
        <div style={{ display: 'flex', fontSize: 18, color: C.muted, marginTop: 8 }}>{CHART_LICENCE_LINE}</div>
      </div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await params;
  const hit = chartByFile(file);
  if (!hit) return new Response('Not found', { status: 404 });
  const { spec, format } = hit;

  if (format === 'svg') {
    return new Response(chartSvg(spec), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `inline; filename="kpopquiz-knowledge-report-2026-${spec.id}.svg"`,
        'Cache-Control': CACHE,
      },
    });
  }

  const png = new ImageResponse(<ChartPng spec={spec} />, {
    width: CHART_LAYOUT.width,
    height: chartHeight(spec),
    fonts: [
      { name: 'DM Sans', data: font('dm-sans-400.ttf'), weight: 400, style: 'normal' },
      { name: 'DM Sans', data: font('dm-sans-700.ttf'), weight: 700, style: 'normal' },
    ],
  });
  const headers = new Headers(png.headers);
  headers.set('Content-Disposition', `inline; filename="kpopquiz-knowledge-report-2026-${spec.id}.png"`);
  headers.set('Cache-Control', CACHE);
  return new Response(png.body, { status: 200, headers });
}
