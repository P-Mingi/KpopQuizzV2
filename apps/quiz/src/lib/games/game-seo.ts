// Client-safe SEO helpers for the V game modes (V closeout Task 2).
//
// One OG image PER MODE (v1), reusing the existing /api/og/page route
// (?title=&subtitle=&accent=). Accents match each mode's hub-card tint.

type GameMode = 'sort-it' | 'match-up' | 'name-them-all';

interface ModeOg {
  ogTitle: string;
  ogSubtitle: string;
  accent: string;
}

const MODE_OG: Record<GameMode, ModeOg> = {
  'sort-it': {
    ogTitle: 'K-pop Sort It',
    ogSubtitle: 'Boy group or girl group? Sort real K-pop groups against the clock.',
    accent: '#0EA5A9',
  },
  'match-up': {
    ogTitle: 'K-pop Match-Up',
    ogSubtitle: 'Match songs, idols, and groups. Clear the board fast.',
    accent: '#E8843C',
  },
  'name-them-all': {
    ogTitle: 'K-pop Name Them All',
    ogSubtitle: 'Name every group before the timer runs out.',
    accent: '#3B6FF6',
  },
};

/** openGraph.images array for a mode's pages (index + every playlist share it). */
export function gameOgImages(mode: GameMode): Array<{ url: string; width: number; height: number; alt: string }> {
  const m = MODE_OG[mode];
  const url = `/api/og/page?title=${encodeURIComponent(m.ogTitle)}&subtitle=${encodeURIComponent(m.ogSubtitle)}&accent=${encodeURIComponent(m.accent)}`;
  return [{ url, width: 1200, height: 630, alt: m.ogTitle }];
}
