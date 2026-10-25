// Run O1, lot H2c: a block of the home never fails the page. The modules of lib/site/hub/data/ already answer null on a database error;
// this is the second net, at the loader: anything else that goes wrong reads as "no data" and the block disappears. Next's own signals
// (a dynamic page, a redirect) are not errors and pass through.

import { isNextInternalError } from '@/lib/error-handling';

export async function safeBlock<T>(block: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error(`[hub-home:${block}]`, err instanceof Error ? err.message : err);
    return fallback;
  }
}
