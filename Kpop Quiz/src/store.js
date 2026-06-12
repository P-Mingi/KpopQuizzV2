// store.js — persists created role/channel IDs so re-runs are idempotent and
// the reveal step is a one-liner (Section 7, step 4).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, 'generated-ids.json');

const EMPTY = { roles: {}, categories: {}, channels: {}, roleMenu: {} };

export function load() {
  if (!existsSync(FILE)) return structuredClone(EMPTY);
  try {
    return { ...structuredClone(EMPTY), ...JSON.parse(readFileSync(FILE, 'utf8')) };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function save(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
}

export const STORE_FILE = FILE;
