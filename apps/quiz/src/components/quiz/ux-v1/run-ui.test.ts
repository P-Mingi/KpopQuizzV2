import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadRunUi, runUiNow } from './run-ui';

describe('the quiz run UI loads on demand', () => {
  it('is absent until loaded, then loads once with all six parts', async () => {
    expect(runUiNow()).toBeNull();
    const [a, b] = await Promise.all([loadRunUi(), loadRunUi()]);
    expect(a).toBe(b);
    expect(runUiNow()).toBe(a);
    for (const k of ['P4Game', 'P4Results', 'ConfirmSheet', 'ShareSheet', 'storyFile', 'downloadStory'] as const) {
      expect(typeof a[k], k).toBe('function');
    }
    expect(await loadRunUi()).toBe(a);
  });

  it('P4Run imports none of them statically, so they stay out of the /q/ first-load chunks', () => {
    const src = readFileSync(fileURLToPath(new URL('./quiz-run.tsx', import.meta.url)), 'utf8');
    const statics = [...src.matchAll(/^import (?!type )[^;]*from '([^']+)';/gm)].map((m) => m[1]);
    for (const mod of ['./game', './results', './story', '@/components/ux-v1/confirm-sheet', '@/components/ux-v1/share-sheet']) {
      expect(statics, mod).not.toContain(mod);
    }
    expect(src).toContain('loadRunUi()');
  });

  it('waits for the load event before the idle load, so the run UI stays out of the first-load window', () => {
    const src = readFileSync(fileURLToPath(new URL('./quiz-run.tsx', import.meta.url)), 'utf8');
    expect(src).toContain("document.readyState === 'complete'");
    expect(src).toContain("window.addEventListener('load', schedule, { once: true })");
  });
});
