// Field data for Core Web Vitals (audit 02 P0-3, option B): a first-party beacon, no new dependency.
// Enum values and numbers only: the metric, its rating, the template of the page and the device class.
// No URL, no id, no user. Behind NEXT_PUBLIC_WEB_VITALS, OFF by default (the owner turns it on, or picks Speed Insights instead).

export const VITAL_METRICS = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'] as const;
export const VITAL_RATINGS = ['good', 'needs-improvement', 'poor'] as const;
export const VITAL_TEMPLATES = ['home', 'quiz', 'group', 'browse', 'blindtest', 'daily', 'embed', 'other'] as const;
export const VITAL_DEVICES = ['mobile', 'desktop'] as const;

export type VitalMetric = (typeof VITAL_METRICS)[number];
export type VitalRating = (typeof VITAL_RATINGS)[number];
export type VitalTemplate = (typeof VITAL_TEMPLATES)[number];
export type VitalDevice = (typeof VITAL_DEVICES)[number];

export interface Vital {
  metric: VitalMetric;
  rating: VitalRating;
  template: VitalTemplate;
  device: VitalDevice;
  /** Milliseconds, rounded; CLS is multiplied by 1000 and rounded (0.1 is 100). */
  value: number;
}

export function webVitalsOn(): boolean {
  const v = process.env.NEXT_PUBLIC_WEB_VITALS;
  return v === '1' || v === 'true';
}

/** The template of a pathname: a fixed enum, so the slug of a quiz never leaves the browser. */
export function templateOf(pathname: string): VitalTemplate {
  const p = pathname.replace(/^\/(?:fr|es|id|anime)(?=\/|$)/, '') || '/';
  if (p === '/') return 'home';
  if (/^\/embed(?:\/|$)/.test(p)) return 'embed';
  if (/^\/(?:q|quiz)\//.test(p)) return 'quiz';
  if (/^\/(?:g|group|groups)(?:\/|$)/.test(p)) return 'group';
  if (/^\/(?:quizzes|search|new|most-liked|trending)(?:\/|$)/.test(p)) return 'browse';
  if (/^\/(?:blindtest|blind-test)(?:\/|$)/.test(p)) return 'blindtest';
  if (/^\/daily(?:\/|$)/.test(p)) return 'daily';
  return 'other';
}

const has = <T extends string>(t: readonly T[], v: unknown): v is T => typeof v === 'string' && (t as readonly string[]).includes(v);

/** A beacon body as a Vital, or null when any field is outside its enum or the number is not a sane duration. */
export function parseVital(body: unknown): Vital | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!has(VITAL_METRICS, b.metric) || !has(VITAL_RATINGS, b.rating) || !has(VITAL_TEMPLATES, b.template) || !has(VITAL_DEVICES, b.device)) return null;
  if (typeof b.value !== 'number' || !Number.isFinite(b.value) || b.value < 0 || b.value > 600_000) return null;
  return { metric: b.metric, rating: b.rating, template: b.template, device: b.device, value: Math.round(b.value) };
}
