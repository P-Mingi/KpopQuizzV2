// Owner test tool 2, pure URL building for `signin-link.sh --vercel` (no network, no secret, unit-tested by signin-urls.test.mjs).
// The Vercel test addresses of branch o1/integration and the link that signs a one-time magic link token in on them.

export const VERCEL_SITES = {
  kpop: 'https://kpopquiz-git-o1-integration-p-mingis-projects.vercel.app',
  anime: 'https://otakuquiz-git-o1-integration-p-mingis-projects.vercel.app',
  hub: 'https://fanquiz-git-o1-integration-p-mingis-projects.vercel.app',
};

// kpop has no /auth/confirm: the link is the anime one and its `next` is the passport jump to kpop, which signs the user in there.
export const KPOP_JUMP = '/auth/passport/out?to=kpop&next=/';

/** The link for `site` (kpop|anime|hub) from the hashed token of an admin generateLink (type magiclink). */
export function vercelLink(site, hashedToken, sites = VERCEL_SITES) {
  if (!Object.hasOwn(sites, site)) throw new Error(`unknown site ${site}`);
  if (typeof hashedToken !== 'string' || !/^[A-Za-z0-9_-]{8,}$/.test(hashedToken)) throw new Error('bad token hash');
  const host = site === 'kpop' ? 'anime' : site;
  const next = site === 'kpop' ? KPOP_JUMP : '/';
  const q = new URLSearchParams({ token_hash: hashedToken, type: 'magiclink', next });
  return `${sites[host]}/auth/confirm?${q.toString()}`;
}
