// V12 G5: the words of a Which member are you result (SYSTEM.md 5.2: "Result
// describes the player ... No invented personal facts").
//
// Every sentence and trait here is about the PLAYER ("You ..."). They are derived
// from the six axis values of the profile the player landed on, so nothing is said
// about the member as a person. The stored `trait_lines` of personality_profiles
// are deliberately not shown: several of them state private habits of real people
// ("Bakes brownies at 2am", "Cats over people, usually").

import { AXIS_KEYS, AXIS_NEUTRAL } from './engine';

import type { Axes, AxisKey } from './engine';

interface Pole { trait: string; line: string }

/** `low` is the 0 end of the axis, `high` the 100 end (the bank's axis definitions). */
const POLES: Record<AxisKey, { low: Pole; high: Pole }> = {
  energy: {
    low: { trait: 'Quiet', line: 'You say little and notice everything.' },
    high: { trait: 'Outgoing', line: 'You bring the energy up the moment you walk in.' },
  },
  chaos: {
    low: { trait: 'Calm', line: 'You stay steady when everything around you speeds up.' },
    high: { trait: 'Playful', line: 'You keep things fun and a little unpredictable.' },
  },
  care: {
    low: { trait: 'Caring', line: 'You look after people without being asked.' },
    high: { trait: 'Easy to love', line: 'People like looking out for you, and you let them.' },
  },
  craft: {
    low: { trait: 'Performer', line: 'You learn by doing it in front of people, not by planning it.' },
    high: { trait: 'Creative', line: 'You would rather make something than talk about it.' },
  },
  heart: {
    low: { trait: 'Soft-hearted', line: 'You lead with kindness, and it shows.' },
    high: { trait: 'Honest', line: 'You tell the truth plainly, and people trust you for it.' },
  },
  spotlight: {
    low: { trait: 'Bold', line: 'You are at ease being the one everyone looks at.' },
    high: { trait: 'Low-key', line: 'You do your best work away from the spotlight.' },
  },
};

/** The axes furthest from the middle, strongest first. Equal strengths keep the axis order. */
function strongest(axes: Axes): Array<{ key: AxisKey; pole: Pole }> {
  return AXIS_KEYS
    .map((key, i) => ({ key, i, v: Number.isFinite(axes[key]) ? axes[key] : AXIS_NEUTRAL }))
    .sort((a, b) => Math.abs(b.v - AXIS_NEUTRAL) - Math.abs(a.v - AXIS_NEUTRAL) || a.i - b.i)
    .map(({ key, v }) => ({ key, pole: v < AXIS_NEUTRAL ? POLES[key].low : POLES[key].high }));
}

/** Three trait pills for the player. */
export function playerTraits(axes: Axes): [string, string, string] {
  const s = strongest(axes);
  return [s[0]!.pole.trait, s[1]!.pole.trait, s[2]!.pole.trait];
}

/** Two sentences about the player, from the two strongest axes. */
export function playerDescription(axes: Axes): string {
  const s = strongest(axes);
  return `${s[0]!.pole.line} ${s[1]!.pole.line}`;
}
