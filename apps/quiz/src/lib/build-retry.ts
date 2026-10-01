// A page whose defining read throws on failure (so a failed read is never
// cached) fails the whole build when that read times out while Next prerenders
// it. During the production build only, retry such a read a few times before
// giving up; at request time it runs once, exactly as before.

export function isProductionBuild(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PHASE === 'phase-production-build';
}

const DELAYS_MS = [2000, 5000, 10000];

export async function atBuildRetry<T>(
  read: () => Promise<T>,
  opts: { build?: boolean; delaysMs?: readonly number[]; sleep?: (ms: number) => Promise<void>; label?: string } = {},
): Promise<T> {
  const build = opts.build ?? isProductionBuild();
  if (!build) return read();
  const delays = opts.delaysMs ?? DELAYS_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await read();
    } catch (err) {
      lastError = err;
      if (attempt === delays.length) break;
      console.warn(`[build-retry] ${opts.label ?? 'read'} failed (attempt ${attempt + 1} of ${delays.length + 1}), retrying:`, (err as Error)?.message ?? err);
      await sleep(delays[attempt]!);
    }
  }
  throw lastError;
}
