// Read docs/seo/TARGETS.md and docs/seo/CALENDAR.md at run time (SEO Mission 3, part C).
// Server only. Both files live at the repository root, two levels above apps/quiz; next.config.ts
// lists them in outputFileTracingIncludes for the routes that read them, so a Vercel function
// carries them. A file that is absent (CALENDAR.md comes with part E, TARGETS.md with Mission 2)
// or not shipped reads as null, and the caller skips what needs it.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function firstReadable(candidates: string[]): Promise<string | null> {
  for (const file of candidates) {
    try {
      const text = await readFile(file, 'utf8');
      if (text.trim()) return text;
    } catch {
      // next candidate
    }
  }
  return null;
}

/** docs/seo/TARGETS.md, from apps/quiz (dev, Vercel) or from the repository root (scripts). */
export function readTargetsMd(): Promise<string | null> {
  return firstReadable([
    path.join(process.cwd(), '..', '..', 'docs', 'seo', 'TARGETS.md'),
    path.join(process.cwd(), 'docs', 'seo', 'TARGETS.md'),
  ]);
}

/** docs/seo/CALENDAR.md, same places. */
export function readCalendarMd(): Promise<string | null> {
  return firstReadable([
    path.join(process.cwd(), '..', '..', 'docs', 'seo', 'CALENDAR.md'),
    path.join(process.cwd(), 'docs', 'seo', 'CALENDAR.md'),
  ]);
}
