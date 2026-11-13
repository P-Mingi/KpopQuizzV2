import fs from 'node:fs';
import path from 'node:path';
import { IMG_DIR } from './env';

/** Every spec appends one JSON line here; report.mjs turns the lines into qa/pass-<n>.md. */
export const RESULTS_FILE = process.env.KC_RESULTS || path.join(IMG_DIR, 'results.jsonl');

export function record(entry: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.appendFileSync(RESULTS_FILE, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}
