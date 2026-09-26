/**
 * The live home's hub order (components/home/home-group-pills.tsx ORDER, SEO PR-I2:
 * every Tier A/B head-term hub linked from the home, the high-impression rookies
 * near the front). The v11 groups rail keeps every one of these hub links, in this
 * order; p1.test.ts reads the live file and fails if the two lists drift apart.
 */
export const LIVE_HUB_ORDER: readonly string[] = [
  'general-kpop', 'bts', 'blackpink', 'cortis', 'illit', 'stray-kids', 'twice',
  'aespa', 'seventeen', 'newjeans', 'babymonster', 'exo', 'ive', 'enhypen',
  'txt', 'le-sserafim', 'itzy',
];
