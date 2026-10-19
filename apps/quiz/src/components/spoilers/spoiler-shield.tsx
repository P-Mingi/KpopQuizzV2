'use client';

import { useEffect, useId, useRef } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { UxDropdown } from '@/components/ux-v1/dropdown';
import { Segmented } from '@/components/ux-v1/segmented';
import { t } from '@/lib/anime/copy';
import { SHOW_EVERYTHING_VIEW, SPOILER_FREE_VIEW } from '@/lib/anime/spoilers';
import { SPOILER_SHOW_ALL } from '@/lib/anime/types';

import { useSpoilerProgress } from './use-spoiler-progress';

import type { SpoilerMedium, SpoilerProgress, SpoilerShieldProps } from '@/lib/anime/types';

const MEDIA: Array<{ value: SpoilerMedium; label: string }> = [
  { value: 'anime', label: t('shield.anime') },
  { value: 'manga', label: t('shield.manga') },
];

/**
 * A5, the spoiler shield: "I follow the [Anime / Manga] and I have seen up to [arc]", with the spoiler-free view and
 * "Show everything" one click away. It reads and writes the guest store (localStorage `anime.spoiler.v1`) or, signed in,
 * `series_progress`, and tells its page through `onChange`. With no stored value the reader is on the spoiler-free view.
 */
export function SpoilerShield({ seriesSlug, groupId, arcs, signedIn, onChange }: SpoilerShieldProps): React.ReactElement {
  const uid = useId();
  const state = useSpoilerProgress(seriesSlug, groupId, signedIn);
  const { progress, stored, ready } = state;
  const sent = useRef<string>('');

  // Tell the page about the reader's progress once it is known, and after every change.
  useEffect(() => {
    if (!ready || !onChange) return;
    const key = `${progress.arc}|${progress.scope}`;
    if (sent.current === key) return;
    sent.current = key;
    onChange(progress);
  }, [ready, progress, onChange]);

  const set = (next: SpoilerProgress): void => { void state.setProgress(next); };
  const showAll = progress.arc >= SPOILER_SHOW_ALL;
  // Arcs the chosen medium has: the manga reader skips anime-only arcs, the anime watcher manga-only ones.
  const shown = arcs.filter((a) => (progress.scope === 'manga' ? !a.animeOnly : !a.mangaOnly));
  const current = shown.find((a) => a.ord === progress.arc)?.name;
  const status = progress.arc <= 0
    ? t('shield.current.free')
    : showAll ? t('shield.current.all') : t('shield.current.arc', { arc: current ?? t('hub.arcFallback', { ord: progress.arc }) });

  return (
    <section className="anime-o3-shield" aria-labelledby={`${uid}-h`} data-testid="spoiler-shield">
      <h2 id={`${uid}-h`} className="anime-o3-shield-h"><Icon name="eye" />{t('shield.title')}</h2>
      {arcs.length === 0 ? (
        <p className="anime-o3-status">{t('shield.noArcs')}</p>
      ) : (
        <>
          <div className="anime-o3-controls">
            <Segmented
              options={MEDIA}
              value={progress.scope}
              onChange={(scope) => set({ arc: progress.arc, scope })}
              label={t('shield.medium')}
            />
            <UxDropdown
              label={t('shield.arc')}
              value={String(progress.arc)}
              options={[
                { value: '0', label: t('shield.spoilerFree') },
                ...shown.map((a) => ({ value: String(a.ord), label: a.name })),
                { value: String(SPOILER_SHOW_ALL), label: t('shield.showEverything') },
              ]}
              onChange={(v) => set({ arc: Number(v), scope: progress.scope })}
            />
          </div>
          <div className="anime-o3-quick">
            <UxButton variant={progress.arc <= 0 ? 'primary' : 'ghost'} size="sm" aria-pressed={progress.arc <= 0} onClick={() => set(SPOILER_FREE_VIEW)}>{t('shield.spoilerFree')}</UxButton>
            <UxButton variant={showAll ? 'primary' : 'ghost'} size="sm" aria-pressed={showAll} onClick={() => set(SHOW_EVERYTHING_VIEW)}>{t('shield.showEverything')}</UxButton>
          </div>
        </>
      )}
      <p className="anime-o3-status" role="status" aria-live="polite">
        {status}
        {ready && stored ? ` ${signedIn ? t('shield.savedAccount') : t('shield.saved')}` : ''}
      </p>
    </section>
  );
}

/** The island the pages mount: the shield with the reader's signed-in state from the session. */
export function SpoilerShieldIsland(props: Omit<SpoilerShieldProps, 'signedIn'>): React.ReactElement {
  const { signedIn } = useSpoilerProgress(props.seriesSlug, props.groupId);
  return <SpoilerShield {...props} signedIn={signedIn} />;
}
