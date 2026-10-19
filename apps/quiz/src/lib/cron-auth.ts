// Who may call a cron route. Vercel sends `Authorization: Bearer <CRON_SECRET>`
// on every cron invocation when the project has a CRON_SECRET env var (Vercel
// docs, "Securing cron jobs"); a manual run uses the same header. No secret
// configured = nobody is authorized (fail closed). The `x-vercel-cron` header is
// not checked: any caller can send it.
export function isCronAuthorized(req: { headers: { get(name: string): string | null } }, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// O1 (manifest.md cron table): the three Vercel projects share vercel.json, so every cron fires on
// every site. A route calls `cronForSite(['kpop'])` right after its auth check and returns the
// answer when it is not null (a 200 `{ skipped: true }` on a site outside the list).
export { cronForSite } from '@/lib/site/cron';
