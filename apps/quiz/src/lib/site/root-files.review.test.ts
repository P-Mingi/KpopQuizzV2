// SEO-LAUNCH-1 review (2026-11-24), fixes 3 and 19: llms.txt writes a sentence about a page only when that page answers.
import { describe, expect, it } from 'vitest';

import { REGISTRY } from './registry';
import { llmsText } from './root-files';

describe('the hub llms.txt', () => {
  it('writes the KpopCards lines only with cards on, and /credits only when its page lists something', () => {
    const off = llmsText(REGISTRY.hub, [], '1', false, false);
    expect(off).not.toMatch(/kpopcards|photocard/i);
    expect(off).not.toContain('- /credits');
    const on = llmsText(REGISTRY.hub, [], '1', true, true);
    expect(on).toContain('- /kpopcards/odds:');
    expect(on).toContain('a free photocard game');
    expect(on).toContain('- /credits:');
  });
  it('writes the daily games and Kpopdle sentences only with the switch on', () => {
    const closed = { ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: false } };
    const text = llmsText(closed, [], '1', false, false);
    expect(text).not.toMatch(/daily|Kpopdle|Otakudle|\/daily/);
    expect(llmsText(REGISTRY.hub, [], '1', false, false)).toContain('- /daily:');
  });
  it('the anime file says the reported quizzes are reviewed, not hidden', () => {
    const t = llmsText(REGISTRY.anime);
    expect(t).toContain('Reported quizzes are reviewed by the team.');
    expect(t).not.toMatch(/hidden until/);
  });
});
