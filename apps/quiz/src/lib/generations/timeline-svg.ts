// The K-pop generations timeline as a standalone SVG (SEO Mission 2, part C point 4).
//
// Drawn from the same data as the hub's table (lib/generations/generations.ts), so the image
// and the page never disagree. The credit "kpopquiz.org" and the licence "CC BY 4.0" are
// part of the drawing, so they travel with every copy. Served by
// app/(site)/data/kpop-generations-timeline.svg/route.ts and shown on the hub. Pure: no I/O.

import { ordinal } from './generations';

import type { GenerationData, GenerationEra } from './generations';

export const TIMELINE_WIDTH = 1200;
export const TIMELINE_HEIGHT = 560;

const CHART_LEFT = 170;
const CHART_RIGHT = 1160;
const FIRST_YEAR = 1995;
const ROW_TOP = 120;
const ROW_GAP = 64;
const BAR_H = 26;

// One fill per generation, light enough for dark text (contrast above 7:1 with #111827).
const FILLS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe'];
const INK = '#111827';
const MUTED = '#4b5563';

/** XML-escape text for an SVG text node or attribute. */
export function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function monthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function eraYears(e: GenerationEra): string {
  const start = e.startAlt ? `${e.start} or ${e.startAlt}` : String(e.start);
  if (e.end == null) return `${start} on${e.official ? '' : ' (not official)'}`;
  return `${start} to ${e.end}`;
}

/** The SVG document for the data's eras, reviewed date and sources. */
export function buildGenerationsTimelineSvg(data: GenerationData): string {
  const lastYear = Number(data.reviewed.slice(0, 4)) + 1;
  const span = lastYear - FIRST_YEAR;
  const x = (year: number): number => CHART_LEFT + ((year - FIRST_YEAR) / span) * (CHART_RIGHT - CHART_LEFT);
  const mid = (CHART_LEFT + CHART_RIGHT) / 2;

  const rows = data.eras.map((e, i) => {
    const y = ROW_TOP + i * ROW_GAP;
    const fill = FILLS[i % FILLS.length]!;
    const solidStart = x(e.startAlt ?? e.start);
    const end = x((e.end ?? lastYear - 1) + 1);
    const parts: string[] = [];
    parts.push(`<text x="40" y="${y + 18}" font-size="16" font-weight="700" fill="${INK}">${escXml(`${ordinal(e.generation)} gen`)}</text>`);
    if (e.startAlt) {
      // The debated stretch (the 4th generation starts around 2018 for some, 2020 for most).
      const debated = x(e.start);
      parts.push(`<rect x="${debated.toFixed(1)}" y="${y}" width="${(solidStart - debated).toFixed(1)}" height="${BAR_H}" rx="4" fill="url(#hatch)" stroke="${MUTED}" stroke-width="1" stroke-dasharray="4 3"/>`);
    }
    parts.push(`<rect x="${solidStart.toFixed(1)}" y="${y}" width="${(end - solidStart).toFixed(1)}" height="${BAR_H}" rx="4" fill="${fill}"${e.official ? '' : ` stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="6 4"`}/>`);
    const label = `${eraYears(e)} · ${e.examples.slice(0, 3).join(', ')}`;
    const left = x(e.start);
    const anchorEnd = left > mid;
    parts.push(`<text x="${(anchorEnd ? end : left).toFixed(1)}" y="${y + BAR_H + 18}" font-size="14" fill="${MUTED}"${anchorEnd ? ' text-anchor="end"' : ''}>${escXml(label)}</text>`);
    return parts.join('');
  });

  const axisY = ROW_TOP + data.eras.length * ROW_GAP + 6;
  const ticks: string[] = [];
  for (let year = 2000; year < lastYear; year += 5) {
    const tx = x(year).toFixed(1);
    ticks.push(`<line x1="${tx}" y1="${ROW_TOP - 10}" x2="${tx}" y2="${axisY}" stroke="#e5e7eb" stroke-width="1"/>`);
    ticks.push(`<text x="${tx}" y="${axisY + 20}" font-size="13" fill="${MUTED}" text-anchor="middle">${year}</text>`);
  }

  const sources = data.eras.flatMap((e) => e.sources.map((s) => s.short));
  const sourceLine = `Sources: ${[...new Set(sources)].join('; ')}. Reviewed ${monthYear(data.reviewed)}.`;
  const title = 'K-pop generations timeline';
  const desc = `Debut years of K-pop idol generations, 1st to 5th. The start of the 4th generation is debated (around 2018 or 2020) and the 5th generation label is not official. ${sourceLine} kpopquiz.org, licensed CC BY 4.0.`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}" width="${TIMELINE_WIDTH}" height="${TIMELINE_HEIGHT}" role="img" aria-labelledby="t d" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif">`,
    `<title id="t">${escXml(title)}</title>`,
    `<desc id="d">${escXml(desc)}</desc>`,
    '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fce7f3"/><line x1="0" y1="0" x2="0" y2="8" stroke="#f9a8d4" stroke-width="3"/></pattern></defs>',
    `<rect width="${TIMELINE_WIDTH}" height="${TIMELINE_HEIGHT}" fill="#ffffff"/>`,
    `<text x="40" y="58" font-size="30" font-weight="800" fill="${INK}">${escXml(title)}</text>`,
    `<text x="40" y="88" font-size="15" fill="${MUTED}">${escXml('When each generation of K-pop idols debuted. The lines are approximate, and the dashed parts are debated or not official.')}</text>`,
    ...ticks,
    ...rows,
    `<text x="40" y="${TIMELINE_HEIGHT - 52}" font-size="12" fill="${MUTED}">${escXml(sourceLine)}</text>`,
    `<text x="40" y="${TIMELINE_HEIGHT - 26}" font-size="15" font-weight="700" fill="${INK}">kpopquiz.org</text>`,
    `<text x="${TIMELINE_WIDTH - 40}" y="${TIMELINE_HEIGHT - 26}" font-size="13" fill="${MUTED}" text-anchor="end">${escXml('CC BY 4.0: credit kpopquiz.org')}</text>`,
    '</svg>',
  ].join('\n');
}
