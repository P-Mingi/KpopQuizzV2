/**
 * Build-time preflight: the public Supabase env must be present before `next build`
 * touches a data page. When it is absent the build otherwise dies much later on an
 * unrelated page (the Vercel Preview build died on /leaderboard for exactly this
 * reason - the missing variable was never named). This fails HERE, immediately,
 * naming the missing variable and the environment. Presence only, never a value.
 *
 * Run from apps/quiz:  npx tsx scripts/check-env.mts   (chained in `build`)
 *
 * Next.js loads .env.local at build time, but this check runs BEFORE `next build`,
 * so it mirrors that: it looks in process.env (Vercel injects vars there) and then
 * in the local env files Next would have loaded (a dev's apps/quiz/.env.local).
 */
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

function fromEnvFiles(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of ['.env.local', '.env']) {
    const url = new URL(`../${f}`, import.meta.url);
    if (!existsSync(url)) continue;
    for (const line of readFileSync(url, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      if (!(k in out)) out[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const fileEnv = fromEnvFiles();
const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local';
const missing = REQUIRED.filter((k) => !((process.env[k] ?? '').trim() || (fileEnv[k] ?? '').trim()));

if (missing.length > 0) {
  console.error(`\n[check:env] Build preflight FAILED for environment "${environment}".`);
  console.error(`[check:env] Missing required public env var(s): ${missing.join(', ')}.`);
  console.error('[check:env] Set them for this scope (Vercel: Project Settings -> Environment Variables; local: apps/quiz/.env.local). No value is ever printed.');
  process.exit(1);
}

console.log(`[check:env] OK - ${REQUIRED.join(', ')} present (environment: ${environment}).`);
