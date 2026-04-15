export const POWERUPS = {
  extra_time: {
    id: 'extra_time',
    label: '+5s',
    description: 'Add 5 seconds to the timer',
    icon: 'clock',
    default_count: 2,
    point_penalty: 0.5,
  },
  fifty_fifty: {
    id: 'fifty_fifty',
    label: '50/50',
    description: 'Remove 2 wrong answers',
    icon: 'minus',
    default_count: 1,
    point_penalty: 0.5,
  },
  skip: {
    id: 'skip',
    label: 'Skip',
    description: 'Skip to the next song',
    icon: 'skip',
    default_count: 3,
    point_penalty: 0,
  },
} as const;

export type PowerupId = keyof typeof POWERUPS;

export function getInitialPowerups(): Record<PowerupId, number> {
  return {
    extra_time: POWERUPS.extra_time.default_count,
    fifty_fifty: POWERUPS.fifty_fifty.default_count,
    skip: POWERUPS.skip.default_count,
  };
}
