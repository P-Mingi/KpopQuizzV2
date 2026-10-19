// Run O1, lot (b), lane LB: the copy helper of the anime blocks. Strings live in copy/anime/o2.ts and o3.ts; the
// words for the series, the character and the oshi come from the site registry's vocabulary (never from the copy
// text), so one change of SiteConfig.vocabulary changes every block.

import { COPY as O2 } from '@/copy/anime/o2';
import { COPY as O3 } from '@/copy/anime/o3';
import { siteConfig } from '@/lib/site/registry';

export type CopyKey = keyof typeof O2 | keyof typeof O3;
export type CopyVars = Readonly<Record<string, string | number>>;

const V = siteConfig('anime').vocabulary;

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The vocabulary placeholders: topic is the series, member the character, pick the oshi. */
export const VOCAB_VARS: CopyVars = {
  topic: V.topic,
  topicCap: cap(V.topic),
  topicPlural: V.topicPlural,
  topicPluralCap: cap(V.topicPlural),
  member: V.member,
  memberCap: cap(V.member),
  memberPlural: V.memberPlural,
  memberPluralCap: cap(V.memberPlural),
  pick: V.favourites.pickLabel,
  pickLower: V.favourites.pickLabel.toLowerCase(),
  song: V.song,
  songCap: cap(V.song),
};

/** `{name}` placeholders replaced from `vars` then from the vocabulary; an unknown placeholder is left as written. */
export function fill(template: string, vars: CopyVars = {}): string {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (whole, key: string) => {
    const v = vars[key] ?? VOCAB_VARS[key];
    return v === undefined ? whole : String(v);
  });
}

/** One copy string by key, filled. */
export function t(key: CopyKey, vars: CopyVars = {}): string {
  const raw = (O2 as Readonly<Record<string, string>>)[key] ?? (O3 as Readonly<Record<string, string>>)[key];
  return fill(raw ?? key, vars);
}

/** `key.one` or `key.other` by the count (the two plural keys of copy-keys.md 1). */
export function tPlural(key: string, count: number, vars: CopyVars = {}): string {
  return t((count === 1 ? `${key}.one` : `${key}.other`) as CopyKey, { count: count.toLocaleString('en-US'), ...vars });
}
