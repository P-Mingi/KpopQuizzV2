// O1 audit 03 P2-4: the 410 of a removed quiz is a real 410, noindex, with a way back.
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/legacy/gone', () => {
  it('answers 410 Gone, noindex, html', async () => {
    const res = GET();
    expect(res.status).toBe(410);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('href="/"');
  });
});
