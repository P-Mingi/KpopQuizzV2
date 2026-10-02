// P11 x V12 G9: which notification rows are about an editorial (team) account
// (SYSTEM.md 5.6: the Team badge sits next to the name in notifications too).
// A notification row has no actor column: the person it is about is the passport
// its link opens (link_url "/u/<username>", e.g. a new follower). Pure and client
// safe; the usernames come from GET /api/ux-v1/p11/team (public data: a username
// and the fact that the account is editorial, both shown on every post).

/** The username a row links to, lower case, or null. */
export function linkedUsername(linkUrl: string | null | undefined): string | null {
  const m = /^\/u\/([A-Za-z0-9_.-]{1,40})(?:[/?#].*)?$/.exec((linkUrl ?? '').trim());
  return m?.[1] ? m[1].toLowerCase() : null;
}

/** True when the row is about an editorial account. */
export function isTeamRow(n: { link_url: string | null }, team: ReadonlySet<string>): boolean {
  if (!team.size) return false;
  const u = linkedUsername(n.link_url);
  return u !== null && team.has(u);
}

/** Normalise the endpoint payload (never trusted: strings only, lower case). */
export function teamSet(payload: unknown): Set<string> {
  const list = (payload as { usernames?: unknown } | null)?.usernames;
  return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && x.length > 0).map((x) => x.toLowerCase()) : []);
}
