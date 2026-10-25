import { describe, expect, it } from 'vitest';

import { bankRefillAlert, BANK_REFILL_THRESHOLD } from './quiz-bank-scheduling';

// Mission U (owner, 2026-10-15): the bank ran down to 4 rows with no warning.

describe('bankRefillAlert', () => {
  it('no alert at or above the threshold', () => {
    expect(bankRefillAlert(BANK_REFILL_THRESHOLD)).toBeNull();
    expect(bankRefillAlert(120)).toBeNull();
  });
  it('under the threshold, the alert says how many days are left', () => {
    expect(bankRefillAlert(4)).toContain('Only 4 quizzes left');
    expect(bankRefillAlert(1)).toContain('Only 1 quiz left');
  });
  it('an empty bank says the quiz of the day falls back to the catalog', () => {
    expect(bankRefillAlert(0)).toContain('empty');
  });
});
