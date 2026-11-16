import { dailyGroup } from './model';

import type { World } from './model';

/** The id of the pack of the day for a Paris day, from the TypeScript view. */
export function dailyGroupId(w: World, day: string): string | null {
  return dailyGroup(w, day)?.id ?? null;
}
