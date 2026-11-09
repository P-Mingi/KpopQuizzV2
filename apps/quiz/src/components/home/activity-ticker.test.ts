import { describe, expect, it } from 'vitest';

import { realOnline } from './activity-ticker';

describe('ticker online count', () => {
  it('shows the real number, never a padded one', () => {
    expect(realOnline(3)).toBe(3);
    expect(realOnline(1)).toBe(1);
    expect(realOnline(212)).toBe(212);
  });
  it('shows nothing when there is no real count', () => {
    expect(realOnline(0)).toBeNull();
    expect(realOnline(null)).toBeNull();
    expect(realOnline(undefined)).toBeNull();
    expect(realOnline(Number.NaN)).toBeNull();
    expect(realOnline('12')).toBeNull();
  });
});
