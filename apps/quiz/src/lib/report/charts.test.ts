import { describe, expect, it } from 'vitest';

import { CHART_FILES, CHART_LAYOUT, CHART_LICENCE_LINE, REPORT_CHARTS, chartByFile, chartHeight, chartSvg } from './charts';
import { HARDEST, REPORT_CREDIT, REPORT_SCORES } from './knowledge-report-2026';

// SEO Mission 3, part F.3: three report charts as files, the credit and the licence drawn
// into each one, every value from the report's figures (themselves pinned to the dataset).

describe('report charts', () => {
  it('are three, each served as SVG and PNG', () => {
    expect(REPORT_CHARTS).toHaveLength(3);
    expect(CHART_FILES).toHaveLength(6);
    expect(chartByFile('hardest-quizzes.png')?.format).toBe('png');
    expect(chartByFile('hardest-quizzes.svg')?.spec.id).toBe('hardest-quizzes');
    expect(chartByFile('nope.svg')).toBeNull();
    expect(chartByFile('../hardest-quizzes.svg')).toBeNull();
  });

  it('every SVG carries the credit line and the licence', () => {
    for (const c of REPORT_CHARTS) {
      const svg = chartSvg(c);
      expect(svg).toContain(`>${REPORT_CREDIT}</text>`);
      expect(svg).toContain(`>${CHART_LICENCE_LINE}</text>`);
      expect(CHART_LICENCE_LINE).toBe('CC BY 4.0 · kpopquiz.org/data/knowledge-report-2026');
      expect(svg).toContain(`viewBox="0 0 ${CHART_LAYOUT.width} ${chartHeight(c)}"`);
    }
  });

  it('the hardest chart is the report table, row for row', () => {
    const c = REPORT_CHARTS.find((x) => x.id === 'hardest-quizzes')!;
    expect(c.bars.map((b) => [b.valueLabel, b.note, b.label])).toEqual(HARDEST.map(([s, a, q]) => [s, `${a} attempts`, q]));
  });

  it('the score split is computed from the counts and adds up', () => {
    const c = REPORT_CHARTS.find((x) => x.id === 'perfect-and-zero-scores')!;
    const { attempts, perfect, zero } = REPORT_SCORES;
    expect(c.bars.map((b) => b.valueLabel)).toEqual(['35.9%', '63.5%', '0.6%']);
    expect(c.bars.map((b) => b.note)).toEqual([`${perfect.toLocaleString('en-US')} attempts`, `${(attempts - perfect - zero).toLocaleString('en-US')} attempts`, `${zero} attempts`]);
    expect(c.bars.reduce((s, b) => s + b.value, 0)).toBeCloseTo(100, 6);
    expect(c.title).toBe('How 17,425 quiz attempts scored');
  });

  it('the same-fandom chart states the report gap', () => {
    const c = REPORT_CHARTS.find((x) => x.id === 'bts-members-vs-eras')!;
    expect(c.bars.map((b) => b.valueLabel)).toEqual(['97.5%', '41.6%']);
    expect(c.subtitle).toContain('a 56 point drop');
  });

  it('bar length is the value on a 100% track', () => {
    const c = REPORT_CHARTS.find((x) => x.id === 'hardest-quizzes')!;
    const svg = chartSvg(c);
    const inner = CHART_LAYOUT.width - CHART_LAYOUT.pad * 2;
    expect(svg).toContain(`width="${Math.round(0.4 * inner)}" height="${CHART_LAYOUT.barHeight}" rx="4" fill="#D4537E"`);
  });

  it('is well formed, escaped, and dash-free', () => {
    for (const c of REPORT_CHARTS) {
      const svg = chartSvg(c);
      expect(svg.match(/<text/g)?.length).toBe(svg.match(/<\/text>/g)?.length);
      expect(svg).not.toMatch(/[\u2013\u2014]/);
      expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
    }
  });
});
