// Shared Game-of-the-Day presentation helpers: resolve the rotation payload to a
// {title, href} link, and map its kind to the matching game preview. Used by the
// games-hub spotlight (and mirrors the older daily-strip resolution).
import type { GameOfTheDayData } from '@/lib/db/queries/game-of-the-day';
import type { PreviewKind } from '@/components/game/game-preview';

export function resolveGotdLink(data: GameOfTheDayData): { title: string; href: string } {
  switch (data.kind) {
    case 'duel':
      return { title: data.prompt, href: `/games/this-or-that?group=${encodeURIComponent(data.group)}&type=${encodeURIComponent(data.type)}&daily=game` };
    case 'personality':
      return { title: `Which ${data.groupName} member are you?`, href: `/which-${data.slug}-member-are-you?daily=game` };
    case 'sort-it':
      return { title: data.title, href: `/games/sort-it/${data.slug}?daily=game` };
    case 'match-up':
      return { title: data.title, href: `/games/match-up/${data.slug}?daily=game` };
    case 'name-them-all':
      return { title: data.title, href: `/games/name-them-all/${data.slug}?daily=game` };
    case 'name-all':
    default:
      return { title: `Name all ${data.groupName ?? ''} members`.replace(/\s+/g, ' ').trim(), href: `/games/name-all/${data.slug}?daily=game` };
  }
}

export function gotdPreviewKind(data: GameOfTheDayData): PreviewKind {
  switch (data.kind) {
    case 'duel': return 'tot';
    case 'personality': return 'member';
    case 'sort-it': return 'sort';
    case 'match-up': return 'match';
    case 'name-them-all':
    case 'name-all':
    default: return 'name';
  }
}
