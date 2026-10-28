// The run UI of /q/ (game, results, the leave and share sheets, the story image), loaded on demand
// (SEO phase 1, 2026-10-27): none of it is in the server HTML, so its chunks no longer compete with
// the CSS and the cover on first load. P4Run starts the load when the browser is idle after the load
// event, and start() awaits it next to the questions request, so the game never waits on a blank
// screen. One load per page; a failed load is retried on the next call.

import type { ConfirmSheet } from '@/components/ux-v1/confirm-sheet';
import type { ShareSheet } from '@/components/ux-v1/share-sheet';
import type { P4Game } from './game';
import type { P4Results } from './results';
import type { downloadStory, storyFile } from './story';

export interface RunUi {
  P4Game: typeof P4Game;
  P4Results: typeof P4Results;
  ConfirmSheet: typeof ConfirmSheet;
  ShareSheet: typeof ShareSheet;
  storyFile: typeof storyFile;
  downloadStory: typeof downloadStory;
}

let loaded: RunUi | null = null;
let loading: Promise<RunUi> | null = null;

/** The run UI when it is already loaded (null on the server and before the first load). */
export function runUiNow(): RunUi | null {
  return loaded;
}

export function loadRunUi(): Promise<RunUi> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= Promise.all([
    import('./game'),
    import('./results'),
    import('@/components/ux-v1/confirm-sheet'),
    import('@/components/ux-v1/share-sheet'),
    import('./story'),
  ]).then(([game, results, confirm, share, story]) => {
    loaded = {
      P4Game: game.P4Game,
      P4Results: results.P4Results,
      ConfirmSheet: confirm.ConfirmSheet,
      ShareSheet: share.ShareSheet,
      storyFile: story.storyFile,
      downloadStory: story.downloadStory,
    };
    return loaded;
  }).catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}
