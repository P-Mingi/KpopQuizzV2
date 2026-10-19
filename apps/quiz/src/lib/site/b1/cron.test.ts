// Run O1, lane B1 (rpcs.md 3, manifest.md cron table, apis.md 5): cronForSite.

import { describe, expect, it } from 'vitest';

import { cronForSite as viaCronAuth } from '@/lib/cron-auth';

import { cronForSite, cronSkipFor } from '../cron';
import { SITE_ID } from '../registry';

describe('cronSkipFor', () => {
  it('runs (null) on a site in the list', () => {
    expect(cronSkipFor('kpop', ['kpop'])).toBeNull();
    expect(cronSkipFor('anime', ['kpop', 'anime'])).toBeNull();
    expect(cronSkipFor('hub', ['hub'])).toBeNull();
  });

  it('answers 200 { skipped: true } on a site outside the list', async () => {
    for (const [site, list] of [['anime', ['kpop']], ['hub', ['kpop', 'anime']], ['kpop', ['hub']], ['kpop', []]] as const) {
      const r = cronSkipFor(site, list);
      expect(r, `${site} ${list.join(',')}`).not.toBeNull();
      expect(r!.status).toBe(200);
      expect(r!.headers.get('content-type')).toBe('application/json');
      expect(await r!.json()).toEqual({ skipped: true });
    }
  });
});

describe('cronForSite', () => {
  it('reads the site of the build', async () => {
    expect(cronForSite([SITE_ID])).toBeNull();
    expect(cronForSite(['kpop', 'anime', 'hub'])).toBeNull();
    const none = cronForSite([]);
    expect(none?.status).toBe(200);
    expect(await none!.json()).toEqual({ skipped: true });
  });

  it('is also reachable from lib/cron-auth, next to isCronAuthorized', () => {
    expect(viaCronAuth).toBe(cronForSite);
  });
});
