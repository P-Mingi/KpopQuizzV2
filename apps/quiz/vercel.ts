// The Vercel configuration of the three projects that share this Root Directory (apps/quiz): kpopquiz, fandomverse and
// otakuquiz. Vercel runs this file at build time and reads its `config` export, with the property names of vercel.json
// (docs, "Programmatic Configuration with vercel.ts"; a project has either vercel.ts or vercel.json, never both). No import
// of @vercel/config: the plain object is the documented form, and the package only adds types and helpers.
//
// Every setting comes from shared.vercel.json, the former vercel.json, unchanged. Only the crons of the anime build differ
// (48 bis, 2026-11-07). otakuquiz is a child of the Microfrontends group of bunnyverse.org (/anime/:path*), and the group
// routes the child's own domains too: on otakuquiz-....vercel.app a path outside /anime is served by the default app
// (fandomverse), seen on the production alias, where / and /robots.txt are the hub's. Vercel calls a cron on the project's
// deployment URL, so a cron path /api/cron/x of otakuquiz never reached the anime code (no cron call in its CDN Requests,
// not even a manual Run). On the anime build each cron path therefore carries the base path, /anime/api/cron/x, which the
// group routes to otakuquiz, with otakuquiz's own CRON_SECRET in the Authorization header. kpopquiz and the hub keep the
// list as it is: no /anime entry on kpopquiz (no 404), and nothing added to the hub (no second run).
//
// The site comes from NEXT_PUBLIC_SITE_ID, else SITE_ID, as in registry.ts (flags-env.md); a build without either is kpop.
// The build log prints the cron list this file gave, so a deployment shows which one it got.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type VercelCron = { path: string; schedule: string };
export type VercelSharedConfig = { crons: VercelCron[] } & Record<string, unknown>;

/** The base path of the anime site (the path of https://bunnyverse.org/anime, registry.ts; vercel-config.test.ts checks it). */
export const ANIME_BASE_PATH = '/anime';

/** The site of the build, read as registry.ts reads it. */
export function vercelSiteOf(env: Readonly<Record<string, string | undefined>>): string {
  return env.NEXT_PUBLIC_SITE_ID?.trim() || env.SITE_ID?.trim() || 'kpop';
}

/** The configuration of one project: the shared file, with the base path in front of each cron path on the anime build. */
export function vercelConfigFor(shared: VercelSharedConfig, site: string): VercelSharedConfig {
  if (site !== 'anime') return shared;
  return { ...shared, crons: shared.crons.map((c) => ({ path: `${ANIME_BASE_PATH}${c.path}`, schedule: c.schedule })) };
}

function readShared(): VercelSharedConfig {
  const file = join(process.cwd(), 'shared.vercel.json');
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`vercel.ts: cannot read ${file} (${(err as Error).message}). Vercel runs vercel.ts from apps/quiz, the Root Directory.`);
  }
  const crons = (json as { crons?: unknown } | null)?.crons;
  if (!Array.isArray(crons) || crons.some((c) => typeof (c as VercelCron)?.path !== 'string' || typeof (c as VercelCron)?.schedule !== 'string')) {
    throw new Error(`vercel.ts: ${file} has no valid "crons" array.`);
  }
  return json as VercelSharedConfig;
}

const site = vercelSiteOf(process.env);
export const config = vercelConfigFor(readShared(), site);
// Whether the project variables are visible here (yes or no, never a value): the anime list depends on NEXT_PUBLIC_SITE_ID.
const projectVariables = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'yes' : 'no';
console.log(`[vercel.ts] ${site} (${process.env.VERCEL_ENV ?? 'local'}, project variables visible: ${projectVariables}): ${config.crons.length} crons, ${config.crons.map((c) => c.path).join(' ')}`);
