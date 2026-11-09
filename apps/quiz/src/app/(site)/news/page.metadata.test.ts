// O1 audit 03 P0-1: /news is noindex,follow.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => [] }));

import { metadata } from './page';

describe('/news metadata', () => {
  it('is noindex,follow with its canonical', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe('/news');
  });
});
