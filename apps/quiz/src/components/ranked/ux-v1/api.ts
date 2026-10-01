// Typed client calls of the ranked API (apps/quiz/src/app/api/ranked). Shapes are
// the engine's own types (lib/ranked), imported as types only: nothing of the server
// store reaches the browser bundle.

import type { PublicRound, RoundReveal } from '@/lib/ranked/run';
import type { IssuedRun, SeasonCard, SubmittedRun } from '@/lib/ranked/service';
import type { LadderScope, LadderView } from '@/lib/ranked/view';

/** A refused or failed call: `code` is the API's error code ('not_live' for a 503). */
export class RankedApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly body: Record<string, unknown> = {}) {
    super(code);
    this.name = 'RankedApiError';
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'include', cache: 'no-store', ...init });
  } catch {
    throw new RankedApiError(0, 'network');
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return body as T;
  if (res.status === 503 && body.ranked === 'not_live') throw new RankedApiError(503, 'not_live', body);
  throw new RankedApiError(res.status, typeof body.error === 'string' ? body.error : `http_${res.status}`, body);
}

function post<T>(url: string, body?: unknown): Promise<T> {
  return call<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  });
}

export const rankedApi = {
  me: (): Promise<SeasonCard> => call<SeasonCard>('/api/ranked/me'),
  ladder: (scope: LadderScope): Promise<LadderView> => call<LadderView>(`/api/ranked/ladder?scope=${scope}`),
  issue: (): Promise<IssuedRun> => post<IssuedRun>('/api/ranked/run'),
  start: (token: string, round: number): Promise<PublicRound> => post<PublicRound>('/api/ranked/run/start', { token, round }),
  answer: (token: string, round: number, choice: number | null, clientMs: number | null): Promise<RoundReveal> =>
    post<RoundReveal>('/api/ranked/run/answer', { token, round, choice, clientMs }),
  submit: (token: string): Promise<SubmittedRun> => post<SubmittedRun>('/api/ranked/run/submit', { token }),
};

/** Retry transient failures (network, 5xx) a few times; refusals (4xx) are final. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const transient = e instanceof RankedApiError && (e.status === 0 || e.status >= 500) && e.code !== 'not_live';
      if (!transient || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw last;
}
