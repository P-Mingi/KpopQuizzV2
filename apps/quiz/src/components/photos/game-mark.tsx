// o1/dle2b (owner, 2026-11-25): the admin-set icon of a game (the slots of the game page's switch, lib/dle/worlds.ts iconSlot: k-idol, o-char,
// o-by-one-piece...) drawn as a plain image on the daily games hub and the Daily games blocks: no round frame, whatever the circle setting says
// there, larger than the old line icon. A slot with nothing saved answers null, so the caller keeps the drawing it always had. No directive and no
// hook: a server component and a client one can both draw it.
import { DLE_WORLDS } from '@/lib/dle/worlds';

import { IconMark } from './icon-mark';

import type { IconState } from './icon-mark';
import type { LiveIcon, LiveIcons } from '@/lib/photos/icons-read';

/** The first of these slots the owner saved (a live row), else null: the defaults of a slot never replace a page's own drawing. */
export function firstSavedIcon(icons: LiveIcons | undefined, ...ids: readonly string[]): LiveIcon | null {
  for (const id of ids) {
    const i = icons?.[id];
    if (i && i.live) return i;
  }
  return null;
}

/** The icon without its circle: its PNG, or its stroke in the colour of its slot. `state` "next" greys it (a game that is not open yet). */
export function GameMark({ icon, size, slot, state = 'done' }: { icon: LiveIcon; size: number; slot?: string | undefined; state?: IconState }): React.ReactElement {
  return <IconMark cfg={{ ...icon.cfg, circle: false }} png={icon.png} state={state} size={size} glyph={Math.round(size * 0.62)} {...(slot ? { slot } : {})} />;
}

/** The icon slot of a game's switch on its page (lib/dle/worlds.ts iconSlot: k-idol, o-char, o-by-one-piece...), or null for a game with none. */
export function gameIconSlot(game: string): string | null {
  for (const w of DLE_WORLDS) {
    const m = w.modes.find((x) => x.game === game);
    if (m) return m.iconSlot;
  }
  return null;
}
