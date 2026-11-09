// Audit 05 Part C4: the pure functions of apps/quiz/scripts/kpopdle-members.mjs on an excerpt shaped like the English Wikipedia NCT page (no network).
import { describe, expect, it } from 'vitest';

import { classify, currentSections, formerSections, infoboxParam } from '../../../scripts/kpopdle-members.mjs';

const NCT = `{{Infobox musical artist
| name            = NCT
| current_members = see [[#Members|Members]]
| website         = {{URL|x}}
}}
==History==
Prose: Mark and Winwin left in 2026.
==Members==
Prose about the members: Mark and Winwin departed.
===Current members===
{| class="wikitable"
| [[Taeyong]]
| [[Doyoung]]
|}
===Former members===
{| class="wikitable"
| [[Taeil (singer)|Taeil]]
| Departed on August 28, 2024
|-
| [[Mark (rapper)|Mark]]
| Departed on April 8, 2026
|}
===Timeline===
bar:Mark from:start till:end
==Discography==
`;

const TREASURE = `{{Infobox
| current_members = * [[Choi Hyun-suk]]
* Junkyu
| past_members = * Mashiho
}}
==Members==
===Current===
* Junkyu - vocalist
===Former===
* Mashiho - dancer
`;

describe('kpopdle-members: current, former or unlisted from a Wikipedia page', () => {
  it('reads the infobox parameters and the sections', () => {
    expect(infoboxParam(TREASURE, 'current_members')).toContain('Junkyu');
    expect(infoboxParam(TREASURE, 'past_members')).toContain('Mashiho');
    expect(currentSections(NCT)).toContain('Taeyong');
    expect(currentSections(NCT)).not.toContain('Taeil');
    expect(formerSections(NCT)).toContain('Taeil');
    expect(formerSections(NCT)).not.toContain('bar:Mark');
  });

  it('names the former members, even when prose or a timeline elsewhere mentions them', () => {
    expect(classify(NCT, { name: 'Taeyong' })).toBe('current');
    expect(classify(NCT, { name: 'Taeil' })).toBe('former');
    expect(classify(NCT, { name: 'Mark' })).toBe('former');
    expect(classify(NCT, { name: 'Nobody' })).toBe('unlisted');
    expect(classify(NCT, { name: 'Zzz', romanized: 'Doyoung' })).toBe('current');
    expect(classify(TREASURE, { name: 'Junkyu' })).toBe('current');
    expect(classify(TREASURE, { name: 'Mashiho' })).toBe('former');
  });

  it('matches whole names only (a short stage name does not match inside another)', () => {
    expect(classify(NCT, { name: 'Tae' })).toBe('unlisted');
    expect(classify(NCT, { name: 'Mar' })).toBe('unlisted');
  });
});
