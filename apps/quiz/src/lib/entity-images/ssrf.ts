// Run O1 (ADM back): which addresses an import by URL may reach. Pure. Only globally routable unicast addresses pass: loopback,
// private, link-local, carrier-grade NAT, multicast, documentation, benchmarking, 6to4 and every other reserved range of
// IPv4 and IPv6 are refused. An IPv4-mapped or NAT64 IPv6 address is judged by the IPv4 address inside it.
import { isIP } from 'node:net';

export function parseIPv4(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const part = Number(m[i]);
    if (part > 255) return null;
    n = n * 256 + part;
  }
  return n;
}

// [network, prefix length]
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

export function isPublicIPv4(ip: string): boolean {
  const n = parseIPv4(ip);
  if (n === null) return false;
  return !BLOCKED_V4.some(([net, bits]) => {
    const base = parseIPv4(net)!;
    const size = 2 ** (32 - bits);
    return n >= base && n < base + size;
  });
}

/** An IPv6 address as eight 16-bit groups, or null. Handles "::", an IPv4 tail and a zone id (refused: null). */
export function parseIPv6(ip: string): number[] | null {
  if (ip.includes('%')) return null;
  let s = ip.toLowerCase();
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    const v4 = parseIPv4(tail[1]!);
    if (v4 === null) return null;
    s = s.slice(0, s.length - tail[1]!.length) + ((v4 >>> 16) & 0xffff).toString(16) + ':' + (v4 & 0xffff).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const toGroups = (part: string): number[] | null => {
    if (part === '') return [];
    const out: number[] = [];
    for (const g of part.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = toGroups(halves[0]!);
  const rest = halves.length === 2 ? toGroups(halves[1]!) : [];
  if (!head || !rest) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const fill = 8 - head.length - rest.length;
  if (fill < 1) return null;
  return [...head, ...new Array<number>(fill).fill(0), ...rest];
}

export function isPublicIPv6(ip: string): boolean {
  const g = parseIPv6(ip);
  if (!g) return false;
  const v4Of = (hi: number, lo: number): string => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  // ::ffff:a.b.c.d (IPv4-mapped): the IPv4 address decides. ("::", "::1" and the deprecated ::a.b.c.d fall outside 2000::/3 below.)
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPublicIPv4(v4Of(g[6]!, g[7]!));
  // 64:ff9b::/96 (NAT64): the embedded IPv4 address decides.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPublicIPv4(v4Of(g[6]!, g[7]!));
  // Only global unicast 2000::/3 can be public; then cut the special blocks inside it.
  if ((g[0]! & 0xe000) !== 0x2000) return false;
  if (g[0] === 0x2001 && g[1]! < 0x200) return false; // 2001::/23: Teredo, IETF protocol assignments, ORCHID
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g[0] === 0x2002) return false; // 6to4
  if (g[0] === 0x3fff && g[1]! < 0x1000) return false; // 3fff::/20 documentation
  return true;
}

/** True when `ip` (any text) is an IPv4 or IPv6 address that a public server may have. Not an address: false. */
export function isPublicAddress(ip: string): boolean {
  const v = isIP(ip);
  return v === 4 ? isPublicIPv4(ip) : v === 6 ? isPublicIPv6(ip) : false;
}
