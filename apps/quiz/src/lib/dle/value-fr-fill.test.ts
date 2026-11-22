// L36 (owner 2026-11-22: "I don't want any '?'"): the values the series fill sets are shown in words in both languages, never raw.
import { describe, expect, it } from 'vitest';

import { seriesValueLabel } from './value-i18n';

describe('the words of the values L36 sets', () => {
  it('an unknown planet or sea, a race, an organisation, a neutral alignment', () => {
    expect(seriesValueLabel('home_planet', 'Unknown', 'en')).toBe('Unknown');
    expect(seriesValueLabel('home_planet', 'Unknown', 'fr')).toBe('Inconnu');
    expect(seriesValueLabel('sea_of_origin', 'Unknown', 'fr')).toBe('Inconnu');
    expect(seriesValueLabel('race', "Hit's race", 'fr')).toBe('Race de Hit');
    expect(seriesValueLabel('affiliation', 'Supreme Kais', 'fr')).toBe('Kaïoshins');
    expect(seriesValueLabel('alignment_at_debut', 'neutral', 'en')).toBe('Neutral');
    expect(seriesValueLabel('alignment_at_debut', 'neutral', 'fr')).toBe('Neutre');
  });
});
