// Production-write guard for v11 specs (ORCH rule until the owner answers: the
// dev server and the previews use the PRODUCTION Supabase, so no spec may write).
// Every mutating request (not GET / HEAD / OPTIONS) to the app's /api/** or to
// Supabase is answered locally with 200 {} and recorded, so a spec can assert the
// payload instead of hitting production. Call before page.goto.

import type { Page, Request } from '@playwright/test';

export interface StubbedCall { method: string; url: string; body: string | null }

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function guardWrites(page: Page, supabaseUrl?: string): Promise<StubbedCall[]> {
  const calls: StubbedCall[] = [];
  const supa = supabaseUrl ? new URL(supabaseUrl).host : '.supabase.co';
  await page.route(
    (url) => url.pathname.startsWith('/api/') || url.host.endsWith(supa) || url.host.endsWith('.supabase.co'),
    async (route) => {
      const req: Request = route.request();
      if (SAFE.has(req.method())) { await route.continue(); return; }
      calls.push({ method: req.method(), url: req.url(), body: req.postData() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    },
  );
  return calls;
}
