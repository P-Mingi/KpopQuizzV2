// L35 and L36 (owner 2026-11-22: "I don't want any '?'"): the values the fills set are shown in words in both languages, never raw.
import { describe, expect, it } from 'vitest';

import { valueLabel } from './copy';
import { seriesValueLabel } from './value-i18n';

describe('the words of the values the fills set', () => {
  it('L36: an unknown planet or sea, a race, an organisation, a neutral alignment', () => {
    expect(seriesValueLabel('home_planet', 'Unknown', 'en')).toBe('Unknown');
    expect(seriesValueLabel('home_planet', 'Unknown', 'fr')).toBe('Inconnu');
    expect(seriesValueLabel('sea_of_origin', 'Unknown', 'fr')).toBe('Inconnu');
    expect(seriesValueLabel('race', "Hit's race", 'fr')).toBe('Race de Hit');
    expect(seriesValueLabel('affiliation', 'Supreme Kais', 'fr')).toBe('Kaïoshins');
    expect(seriesValueLabel('alignment_at_debut', 'neutral', 'en')).toBe('Neutral');
    expect(seriesValueLabel('alignment_at_debut', 'neutral', 'fr')).toBe('Neutre');
  });

  it('L35: a gender the work does not give is "unspecified", in words in both games and both languages', () => {
    expect(valueLabel('gender', 'unspecified', 'en')).toBe('Unspecified');
    expect(valueLabel('gender', 'unspecified', 'fr')).toBe('Non précisé');
    expect(seriesValueLabel('gender', 'unspecified', 'fr')).toBe('Non précisé');
  });
});
