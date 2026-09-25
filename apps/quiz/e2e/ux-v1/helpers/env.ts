// Test env for the v11 run (worker prompt 3b). Reads the owner's env from the
// shell first, then apps/quiz/.env.local and apps/quiz/.env.test.local (both
// gitignored). Values are returned, never printed, never written anywhere except
// the gitignored storage-state file of auth.setup.ts.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(here, '../../..');
/** Storage state of the parity test user (gitignored: apps/quiz/e2e/.auth/). */
export const AUTH_FILE = path.join(APP_DIR, 'e2e/.auth/test-user.json');

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || !m[1]) continue;
    out[m[1]] = (m[2] ?? '').replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export interface TestEnv {
  email: string | undefined;
  userId: string | undefined;
  supabaseUrl: string | undefined;
  anonKey: string | undefined;
  serviceKey: string | undefined;
  bypass: string | undefined;
  /** Everything needed to mint the test user's session. */
  ready: boolean;
}

let cached: TestEnv | null = null;

export function loadTestEnv(): TestEnv {
  if (cached) return cached;
  const files = { ...parseEnvFile(path.join(APP_DIR, '.env.local')), ...parseEnvFile(path.join(APP_DIR, '.env.test.local')) };
  const get = (k: string): string | undefined => process.env[k] || files[k] || undefined;
  const env: TestEnv = {
    email: get('UX_V1_TEST_EMAIL'),
    userId: get('UX_V1_TEST_USER_ID'),
    supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceKey: get('SUPABASE_SERVICE_ROLE_KEY'),
    bypass: get('VERCEL_AUTOMATION_BYPASS_SECRET'),
    ready: false,
  };
  env.ready = Boolean(env.email && env.supabaseUrl && env.anonKey && env.serviceKey);
  cached = env;
  return env;
}

/** True when auth.setup.ts wrote a storage state for this run. */
export function hasAuthState(): boolean {
  return fs.existsSync(AUTH_FILE);
}
