// The job summary of .github/workflows/cards-publish.yml (scripts/cards/publish-summary.mjs) and the retry rule of a Commons download
// (scripts/cards/card-files.mjs). Pure: no file, no network.
import { describe, expect, it } from 'vitest';

import { RETRY_STATUS, retryWait } from '../../../scripts/cards/card-files.mjs';
import { cell, kpopdleCounts, parseCsv, summaryMarkdown } from '../../../scripts/cards/publish-summary.mjs';

const REPORT = {
  mode: 'non-interactive', host: 'rdkgouofytwfdpbxbzio.supabase.co', keepGoing: true,
  photos: { uploaded: 12, upToDate: 30, notInData: 1, failed: 2 }, cards: 25, panoramas: 7,
  failed: [
    { slug: 'cid', slot: 2, page: 'https://commons.wikimedia.org/wiki/File:A.jpg', reason: 'cid photo 2: the Commons file changed (sha1 x, recorded y); refused' },
    { slug: 'dee', slot: 1, page: 'https://commons.wikimedia.org/wiki/File:B|C.jpg', reason: 'GET https://upload.wikimedia.org/b.jpg: 404' },
  ],
  cleanup: { objects: 900, kept: 880, proposed: 20, deleted: 0 }, stopped: null,
};
const CSV = [
  'idol_id,name,group,file,result',
  '11,Jisoo,BLACKPINK,Jisoo BLACKPINK.jpg,published',
  '12,Bang Chan,Stray Kids,Bang Chan STRAYKIDS.jpg,"published, small source: may look soft"',
  '13,"Kim, ""Q""",Group,q.jpg,error: storage HTTP 500',
  '14,Nobody,Group,,no photo',
  '15,Two,Group,,no photo: several files fit: a.jpg, b.jpg',
].join('\n');

describe('the job summary', () => {
  it('counts the cards, the panoramas and the failed photos, with each reason', () => {
    const md = summaryMarkdown({ cards: REPORT, kpopdle: { asked: false, csv: null } });
    expect(md).toContain('Project: `rdkgouofytwfdpbxbzio.supabase.co`, non-interactive mode, --keep-going.');
    expect(md).toContain('| Photos published | 12 |');
    expect(md).toContain('| Cards published (one per part, one per person) | 25 |');
    expect(md).toContain('| Panoramas published | 7 |');
    expect(md).toContain('| Photos failed | 2 |');
    expect(md).toContain('| cid | 2 | https://commons.wikimedia.org/wiki/File:A.jpg | cid photo 2: the Commons file changed (sha1 x, recorded y); refused |');
    // a pipe in a cell does not open a column
    expect(md).toContain('File:B\\|C.jpg');
    expect(md).toContain('Cleanup: 900 files in the bucket, 880 current files kept, 20 proposed for deletion, 0 deleted (this mode only lists).');
    expect(md).toContain('Not run (input kpopdle = non).');
  });

  it('says so when the publish step left no report, and shows where a run stopped', () => {
    expect(summaryMarkdown({ cards: null, kpopdle: { asked: false, csv: null } })).toContain('No report: the publish step did not run to its end');
    const md = summaryMarkdown({ cards: { ...REPORT, failed: [], stopped: 'upload x: 403 denied' }, kpopdle: { asked: true, csv: null } });
    expect(md).toContain('**Stopped:** upload x: 403 denied');
    expect(md).not.toContain('### Photos failed');
    expect(md).toContain('No report: the Kpopdle step did not reach its end.');
  });

  it('reads the Kpopdle CSV: idols given a photo, errors, idols without one', () => {
    expect(parseCsv('a,"b ""c"", d",e\n1,2,3\n')).toEqual([['a', 'b "c", d', 'e'], ['1', '2', '3']]);
    const k = kpopdleCounts(CSV);
    expect(k).toEqual({ published: 2, soft: 1, errors: [{ name: 'Kim, "Q"', group: 'Group', reason: 'storage HTTP 500' }], none: 2 });
    const md = summaryMarkdown({ cards: REPORT, kpopdle: { asked: true, csv: CSV } });
    expect(md).toContain('| Idols given a photo | 2 |');
    expect(md).toContain('| Errors | 1 |');
    expect(md).toContain('| Idols without a photo | 2 |');
    expect(md).toContain('| Kim, "Q" | Group | storage HTTP 500 |');
  });

  it('shows the live photos read first, so a gap with the photos handled shows (lot CPUB-RETRY, run Cards publish #2)', () => {
    const md = summaryMarkdown({ cards: { ...REPORT, photos: { ...REPORT.photos, live: 1101 } }, kpopdle: { asked: false, csv: null } });
    expect(md).toContain('| | Count |\n| --- | ---: |\n| Live photos read (auto or approved) | 1101 |\n| Photos published | 12 |');
    // a run stopped before the read, or a report written before this line existed
    expect(summaryMarkdown({ cards: { ...REPORT, photos: { ...REPORT.photos, live: null } }, kpopdle: { asked: false, csv: null } })).toContain('| Live photos read (auto or approved) | not read |');
    expect(summaryMarkdown({ cards: REPORT, kpopdle: { asked: false, csv: null } })).toContain('| Live photos read (auto or approved) | not read |');
  });

  it('a cell stays on one line', () => {
    expect(cell('a\nb|c\r\n')).toBe('a b\\|c');
    expect(cell(null)).toBe('');
  });

  it('has no em or en dash', () => {
    const md = summaryMarkdown({ cards: REPORT, kpopdle: { asked: true, csv: CSV } });
    expect(md).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('a Commons download tried again', () => {
  it('is tried again on a timeout, the rate limit or a busy server, never on a 404 or a 403', () => {
    for (const s of [408, 429, 500, 502, 503, 504]) expect(RETRY_STATUS.has(s)).toBe(true);
    for (const s of [400, 401, 403, 404, 410]) expect(RETRY_STATUS.has(s)).toBe(false);
  });
  it('waits the Retry-After of the server (at most 60 s), else 5 s then 20 s', () => {
    expect(retryWait(1, '0')).toBe(0);
    expect(retryWait(1, '12')).toBe(12_000);
    expect(retryWait(2, '600')).toBe(60_000);
    expect(retryWait(1, null)).toBe(5000);
    expect(retryWait(2, null)).toBe(20_000);
    expect(retryWait(1, 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(5000);
    expect(retryWait(2, '-3')).toBe(20_000);
  });
});
