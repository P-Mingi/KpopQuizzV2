import { manhwaLabel } from '@/lib/anime/manhwa';

/**
 * The "Manhwa" chip of a series card or list row (lib/anime/manhwa.ts: derived from `series.type`, never from a slug). Nothing
 * for any other type. Hooks-free, a server or a client component.
 */
export function ManhwaTag({ type }: { readonly type?: string | null | undefined }): React.ReactElement | null {
  const label = manhwaLabel(type);
  return label ? <span className="anime-o2-kind" data-testid="manhwa-tag">{label}</span> : null;
}
