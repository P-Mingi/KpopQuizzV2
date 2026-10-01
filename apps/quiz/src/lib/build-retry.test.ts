import { describe, expect, it, vi } from 'vitest';

import { atBuildRetry, isProductionBuild } from './build-retry';

const noSleep = async (): Promise<void> => {};

describe('atBuildRetry', () => {
  it('at request time the read runs once and its error goes straight up', async () => {
    const read = vi.fn().mockRejectedValue(new Error('timeout'));
    await expect(atBuildRetry(read, { build: false, sleep: noSleep })).rejects.toThrow('timeout');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('during the build a read that recovers is returned', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const read = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(['bts']);
    const waits: number[] = [];
    await expect(atBuildRetry(read, { build: true, sleep: async (ms) => { waits.push(ms); } })).resolves.toEqual(['bts']);
    expect(read).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([2000, 5000]);
  });

  it('during the build it still throws when every attempt fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const read = vi.fn().mockRejectedValue(new Error('down'));
    await expect(atBuildRetry(read, { build: true, sleep: noSleep, delaysMs: [1, 1] })).rejects.toThrow('down');
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('a read that works is called once, build or not', async () => {
    const read = vi.fn().mockResolvedValue(1);
    await atBuildRetry(read, { build: true, sleep: noSleep });
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe('isProductionBuild', () => {
  it('is true only in the next build phase', () => {
    expect(isProductionBuild({ NEXT_PHASE: 'phase-production-build' })).toBe(true);
    expect(isProductionBuild({ NEXT_PHASE: 'phase-production-server' })).toBe(false);
    expect(isProductionBuild({})).toBe(false);
  });
});
