import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Everything the KpopCards harness shares: where the prototype lives, where the app runs,
// the fixed seed and time, and the folders the reports and images go to.
export const QUIZ_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..');
export const REPO_ROOT = path.resolve(QUIZ_ROOT, '..', '..');
export const PROTO_FILE = path.join(REPO_ROOT, 'docs', 'design', 'cards', 'kpopcards-prototype-v6.html');
export const PROTO_ORIGIN = 'http://proto.kpopcards.test';

export const APP_BASE = process.env.KC_BASE_URL || 'http://localhost:3135';
export const APP_ROOT = process.env.KC_APP_ROOT || '/kpopcards';

/** Same for both sides: the seed of Math.random and the frozen clock (a Friday, 10:00 in Paris). */
export const SEED = Number(process.env.KC_SEED || 20261113);
export const FIXED_TIME = new Date(process.env.KC_TIME || '2026-11-13T09:00:00Z');

export const QA_DIR =
  process.env.KC_QA_DIR ||
  '/private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/kpopcards/qa';
export const IMG_DIR = path.join(QA_DIR, 'img');
export const CONTRACT_READY = path.join(path.dirname(QA_DIR), 'CONTRACT_READY');

export const VIEWPORTS = [
  { name: '1440x860', width: 1440, height: 860 },
  { name: '1366x657', width: 1366, height: 657 },
  { name: '390x664', width: 390, height: 664 },
] as const;

/** Target of lot 3+4+5: at most 1% of the pixels differ, key boxes within 2 px. */
export const MAX_DIFF_RATIO = 0.01;
export const BOX_TOLERANCE = 2;
