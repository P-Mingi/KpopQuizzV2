// Three charts of the K-pop Knowledge Report 2026, exported as SVG (drawn here, by code)
// and PNG (the same layout through next/og, see the charts route), with the credit line
// and the licence drawn INTO the image, so a chart lifted on its own still says where it
// came from (SEO Mission 3, part F.3).
//
// Every value comes from lib/report/knowledge-report-2026.ts, which a test pins to the
// published dataset. Nothing is typed here: shares are computed from the counts. Each chart
// is one series (bar length = a percentage, the track = 100%), so it uses one hue and no
// legend; text stays in ink, never the bar colour (dataviz rules).

import { HARDEST, EASIEST, REPORT_CREDIT, REPORT_PATH, REPORT_SCORES, REPORT_WINDOW } from './knowledge-report-2026';

export interface ChartBar {
  label: string;
  /** 0 to 100 */
  value: number;
  /** "40.0%" */
  valueLabel: string;
  /** "71 attempts" */
  note: string;
}

export interface ChartSpec {
  id: string;
  title: string;
  subtitle: string;
  bars: ChartBar[];
  /** One-sentence description of what the chart shows, for alt text and the press page. */
  alt: string;
}

export const CHART_COLORS = {
  background: '#FFFFFF',
  ink: '#1A1714',
  muted: '#6B6560',
  track: '#EFEAE6',
  // Brand pink, validated (dataviz validator, light surface): contrast >= 3:1, chroma ok.
  bar: '#D4537E',
  rule: '#E3DDD8',
} as const;

export const CHART_LICENCE_LINE = `CC BY 4.0 · kpopquiz.org${REPORT_PATH}`;

const pct = (s: string): number => Number(s.replace('%', ''));
const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');
const share = (part: number, whole: number): string => `${((part / whole) * 100).toFixed(1)}%`;
const attemptsNote = (n: string | number): string => `${typeof n === 'number' ? fmt(n) : n} attempts`;

function hardestChart(): ChartSpec {
  return {
    id: 'hardest-quizzes',
    title: 'The five hardest quizzes',
    subtitle: `Average score, ${REPORT_WINDOW}, quizzes with 50 or more attempts`,
    bars: HARDEST.map(([score, attempts, quiz]) => ({ label: quiz, value: pct(score), valueLabel: score, note: attemptsNote(attempts) })),
    alt: `Bar chart of the five hardest quizzes in the K-pop Knowledge Report 2026, from ${HARDEST[0]![0]} to ${HARDEST[HARDEST.length - 1]![0]} average score.`,
  };
}

function sameFandomChart(): ChartSpec {
  // The report's own comparison: one group, the roster against the eras.
  const members = EASIEST.find(([, , quiz]) => quiz === 'BTS members real names')!;
  const eras = HARDEST.find(([, , quiz]) => quiz.startsWith('Ultimate BTS era quiz'))!;
  const gap = Math.round(pct(members[0]) - pct(eras[0]));
  return {
    id: 'bts-members-vs-eras',
    title: 'Same fandom, different questions',
    subtitle: `Average score on two BTS quizzes, ${REPORT_WINDOW}: a ${gap} point drop`,
    bars: [members, eras].map(([score, attempts, quiz]) => ({ label: quiz, value: pct(score), valueLabel: score, note: attemptsNote(attempts) })),
    alt: `Bar chart: BTS members real names averages ${members[0]}, the BTS era quiz ${eras[0]}, a ${gap} point drop between two quizzes about the same group.`,
  };
}

function scoreSplitChart(): ChartSpec {
  const { attempts, perfect, zero } = REPORT_SCORES;
  const between = attempts - perfect - zero;
  return {
    id: 'perfect-and-zero-scores',
    title: `How ${fmt(attempts)} quiz attempts scored`,
    subtitle: `Share of attempts, ${REPORT_WINDOW}`,
    bars: [
      { label: 'Perfect score', value: (perfect / attempts) * 100, valueLabel: share(perfect, attempts), note: attemptsNote(perfect) },
      { label: 'Between zero and perfect', value: (between / attempts) * 100, valueLabel: share(between, attempts), note: attemptsNote(between) },
      { label: 'Zero', value: (zero / attempts) * 100, valueLabel: share(zero, attempts), note: attemptsNote(zero) },
    ],
    alt: `Bar chart: of ${fmt(attempts)} attempts, ${share(perfect, attempts)} were perfect scores and ${share(zero, attempts)} scored zero.`,
  };
}

export const REPORT_CHARTS: readonly ChartSpec[] = [hardestChart(), sameFandomChart(), scoreSplitChart()];

export type ChartFormat = 'svg' | 'png';

/** The published path of one chart file. */
export const chartPath = (id: string, format: ChartFormat): string => `${REPORT_PATH}/charts/${id}.${format}`;

/** Every file the charts route serves: "<id>.svg" and "<id>.png". */
export const CHART_FILES: readonly string[] = REPORT_CHARTS.flatMap((c) => [`${c.id}.svg`, `${c.id}.png`]);

export function chartByFile(file: string): { spec: ChartSpec; format: ChartFormat } | null {
  const m = /^([a-z0-9-]+)\.(svg|png)$/.exec(file);
  if (!m) return null;
  const spec = REPORT_CHARTS.find((c) => c.id === m[1]);
  return spec ? { spec, format: m[2] as ChartFormat } : null;
}

// ---- Layout, shared by the SVG and the PNG renderers --------------------------------

export const CHART_LAYOUT = {
  width: 1200,
  pad: 64,
  titleY: 92,
  subtitleY: 132,
  rowsTop: 184,
  rowHeight: 86,
  labelSize: 22,
  barTop: 16,
  barHeight: 26,
  footer: 118,
} as const;

export function chartHeight(spec: ChartSpec): number {
  const L = CHART_LAYOUT;
  return L.rowsTop + spec.bars.length * L.rowHeight + L.footer;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The chart as a standalone SVG document, credit and licence included. */
export function chartSvg(spec: ChartSpec): string {
  const L = CHART_LAYOUT;
  const C = CHART_COLORS;
  const height = chartHeight(spec);
  const inner = L.width - L.pad * 2;
  const font = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";

  const rows = spec.bars.map((b, i) => {
    const y = L.rowsTop + i * L.rowHeight;
    const w = Math.max(4, Math.round((Math.min(100, Math.max(0, b.value)) / 100) * inner));
    const barY = y + L.barTop;
    return [
      `<text x="${L.pad}" y="${y}" font-size="${L.labelSize}" fill="${C.ink}">${esc(b.label)}</text>`,
      `<text x="${L.width - L.pad}" y="${y}" font-size="${L.labelSize}" text-anchor="end" fill="${C.ink}"><tspan font-weight="700">${esc(b.valueLabel)}</tspan><tspan fill="${C.muted}"> · ${esc(b.note)}</tspan></text>`,
      `<rect x="${L.pad}" y="${barY}" width="${inner}" height="${L.barHeight}" rx="4" fill="${C.track}"/>`,
      `<rect x="${L.pad}" y="${barY}" width="${w}" height="${L.barHeight}" rx="4" fill="${C.bar}"/>`,
    ].join('\n    ');
  });

  const footY = height - L.footer + 40;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${L.width}" height="${height}" viewBox="0 0 ${L.width} ${height}" role="img" aria-labelledby="t d">
  <title id="t">${esc(spec.title)}. ${esc(REPORT_CREDIT)}</title>
  <desc id="d">${esc(spec.alt)} ${esc(CHART_LICENCE_LINE)}</desc>
  <rect width="${L.width}" height="${height}" fill="${C.background}"/>
  <g font-family="${font}">
    <text x="${L.pad}" y="${L.titleY}" font-size="38" font-weight="700" fill="${C.ink}">${esc(spec.title)}</text>
    <text x="${L.pad}" y="${L.subtitleY}" font-size="22" fill="${C.muted}">${esc(spec.subtitle)}</text>
    ${rows.join('\n    ')}
    <line x1="${L.pad}" y1="${footY - 38}" x2="${L.width - L.pad}" y2="${footY - 38}" stroke="${C.rule}" stroke-width="1"/>
    <text x="${L.pad}" y="${footY}" font-size="20" font-weight="700" fill="${C.ink}">${esc(REPORT_CREDIT)}</text>
    <text x="${L.pad}" y="${footY + 32}" font-size="18" fill="${C.muted}">${esc(CHART_LICENCE_LINE)}</text>
  </g>
</svg>
`;
}
