import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { INDEXNOW_KEY } from './indexnow';

// SEO PR-I3. IndexNow proves domain ownership by hosting the key as a plain-text
// file at https://kpopquiz.org/<KEY>.txt, whose body is the key itself. That file
// lives in apps/quiz/public/. If the key here is rotated but the file is not (or
// the file is deleted), the api.indexnow.org endpoint returns 403 and every
// submission - per-quiz publish AND the on-deploy full resubmit - is silently
// dropped. Bing is our #1 search referrer, so that failure is invisible and
// expensive. This test is the drift guard.
const here = dirname(fileURLToPath(import.meta.url));
const keyFile = join(here, '..', '..', 'public', `${INDEXNOW_KEY}.txt`);

describe('IndexNow key file', () => {
  it('exists in public/', () => {
    expect(existsSync(keyFile)).toBe(true);
  });

  it('contains exactly the key used by pingIndexNow (no drift)', () => {
    const body = readFileSync(keyFile, 'utf8').trim();
    expect(body).toBe(INDEXNOW_KEY);
  });

  it('key is a 32-char hex string (IndexNow format)', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });
});
