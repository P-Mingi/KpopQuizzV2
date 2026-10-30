// Offline test of the --vercel link building.   node scripts/o1-tools/signin-urls.test.mjs   (exit 0 = every case as expected)
import assert from 'node:assert/strict';
import { VERCEL_SITES, KPOP_JUMP, BASE_PATHS, vercelLink } from './signin-urls.mjs';

const T = 'abcDEF123_-xyz0987654321';
let n = 0;
const ok = (name, fn) => { fn(); n += 1; };

ok('addresses', () => {
  assert.equal(VERCEL_SITES.kpop, 'https://kpopquiz-git-o1-integration-p-mingis-projects.vercel.app');
  assert.equal(VERCEL_SITES.anime, 'https://otakuquiz-git-o1-integration-p-mingis-projects.vercel.app');
  assert.equal(VERCEL_SITES.hub, 'https://fandomverse-git-o1-integration-p-mingis-projects.vercel.app');
});
// Bunnyverse (owner, 2026-10-28): the anime build lives under the basePath /anime.
ok('base paths', () => {
  assert.deepEqual(BASE_PATHS, { kpop: '', anime: '/anime', hub: '' });
});
ok('anime', () => {
  assert.equal(vercelLink('anime', T), `${VERCEL_SITES.anime}/anime/auth/confirm?token_hash=${T}&type=magiclink&next=%2F`);
});
ok('hub', () => {
  assert.equal(vercelLink('hub', T), `${VERCEL_SITES.hub}/auth/confirm?token_hash=${T}&type=magiclink&next=%2F`);
});
ok('kpop uses the anime page and the passport jump', () => {
  const u = new URL(vercelLink('kpop', T));
  assert.equal(u.origin, VERCEL_SITES.anime);
  assert.equal(u.pathname, '/anime/auth/confirm');
  assert.equal(u.searchParams.get('token_hash'), T);
  assert.equal(u.searchParams.get('type'), 'magiclink');
  assert.equal(u.searchParams.get('next'), KPOP_JUMP);
  assert.equal(KPOP_JUMP, '/auth/passport/out?to=kpop&next=/');
  assert.equal([...u.searchParams.keys()].length, 3, 'the jump is one encoded value, not extra query keys');
});
ok('refuses an unknown site or a bad token', () => {
  assert.throws(() => vercelLink('blog', T));
  assert.throws(() => vercelLink('constructor', T));
  assert.throws(() => vercelLink('anime', ''));
  assert.throws(() => vercelLink('anime', 'a&next=//evil.example'));
  assert.throws(() => vercelLink('anime', undefined));
});
console.log(`signin-urls: ${n} cases ok`);
