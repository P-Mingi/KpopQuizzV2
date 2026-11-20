// Launch polish, lane LEGAL: the numbers of the privacy policy about KpopCards are the ones the SQL and the code decide.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REMOVAL_PROMISE } from '@/components/cards/report-form';

import { CARDS_PRIVACY_FACTS as F } from './privacy-facts';
import { QUIET_HOURS } from './rules';

const SQL = join(__dirname, '../../../../../docs/pending-migrations/cards');
const sql = (f: string): string => readFileSync(join(SQL, f), 'utf8');

describe('the numbers of the privacy policy about KpopCards', () => {
  it('a friend code lasts 24 hours and a player has at most 100 friends (112-social.sql)', () => {
    const s = sql('112-social.sql');
    expect(s).toContain(`interval '${F.friendCodeHours} hours'`);
    expect(s).toContain(`>= ${F.maxFriends}`);
  });

  it('a player keeps at most 5 push subscriptions (108-push.sql), and no push between 22:00 and 08:00 Paris (rules.ts)', () => {
    expect(sql('108-push.sql')).toContain(`At most ${F.maxPush}`);
    expect(F.quietFrom).toBe(QUIET_HOURS.from);
    expect(F.quietTo).toBe(QUIET_HOURS.to);
    expect([F.quietFrom, F.quietTo]).toEqual([22, 8]);
  });

  it('the claims of the demo pack are deleted after 7 days (106-demo.sql)', () => {
    expect(sql('106-demo.sql')).toContain(`claimed_at < p_now - interval '${F.demoClaimDays} days'`);
  });

  it('a reported photo leaves within 48 hours (the promise of the report form)', () => {
    expect(REMOVAL_PROMISE).toContain(`within ${F.removalHours} hours`);
  });

  it('a report closes with its contact erased (002-functions.sql), a friend code is 8 characters (112-social.sql)', () => {
    expect(sql('002-functions.sql')).toContain('new.contact := null');
    expect(sql('112-social.sql')).toContain('{8}');
  });
});

describe('Card coming', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const OLD = [`Carte ${String.fromCharCode(0xe0)} venir`, `Carte ${'a'} venir`];

  it('the French pocket copy is nowhere in the code any more, and the binder says Card coming', () => {
    const files = walk(join(__dirname, '../..')).filter((f) => /\.(ts|tsx|css|json|md)$/.test(f));
    expect(files.length).toBeGreaterThan(100);
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      for (const old of OLD) expect(body.includes(old), `${f} still has "${old}"`).toBe(false);
    }
    const binder = readFileSync(join(__dirname, '../../components/cards/binder-view.tsx'), 'utf8');
    expect(binder).toContain('Card coming');
  });
});
