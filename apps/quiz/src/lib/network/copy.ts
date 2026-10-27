// Run O1, lot (c), lane B6: the copy helper of the network layer. Strings live in copy/kpop/b6.ts and copy/anime/b6.ts; the
// build's site picks the file (hub reads the anime file: neutral wording, no fandom word). {brand}, {network} and {level} are
// filled here from the registry, never written in the strings.
import { COPY as ANIME } from '@/copy/anime/b6';
import { COPY as KPOP } from '@/copy/kpop/b6';
import { NETWORK, SITE, SITE_ID } from '@/lib/site/registry';

export type NetCopyKey = keyof typeof ANIME;

const TABLE: Readonly<Record<string, string>> = SITE_ID === 'kpop' ? KPOP : ANIME;

export function netCopy(key: NetCopyKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const all: Record<string, string | number> = { brand: SITE.brand.name, network: NETWORK.name, ...vars };
  return (TABLE[key] ?? '').replace(/\{([a-zA-Z0-9]+)\}/g, (whole, k: string) => (all[k] === undefined ? whole : String(all[k])));
}
