'use client';

import { useId, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { t } from '@/lib/anime/copy';
import { isSafeFor } from '@/lib/anime/spoilers';

import { SpoilerShield } from './spoiler-shield';
import { useSpoilerProgress } from './use-spoiler-progress';

import type { SpoilerArc, SpoilerScope } from '@/lib/anime/types';

interface SpoilerGateProps {
  readonly seriesSlug: string;
  readonly groupId: number;
  /** The series title, for the interstitial. */
  readonly name: string;
  /** The quiz's spoiler level, computed on the server. */
  readonly level: { readonly arc: number; readonly scope: SpoilerScope | null };
  readonly arcName: string;
  readonly arcs: readonly SpoilerArc[];
}

/**
 * A5 on a quiz page (a quiz with a level above 0): the interstitial "this quiz can spoil <series>" with "Show anyway" and
 * "Set my progress", and the spoiler shield below it. The server renders it for the spoiler-free view, so the cached HTML
 * is the same for everyone and carries no tagged question; a reader whose stored progress already covers the quiz sees
 * only the shield. "Show anyway" hides the notice for this visit and changes nothing that is stored.
 */
export function SpoilerGate({ seriesSlug, groupId, name, level, arcName, arcs }: SpoilerGateProps): React.ReactElement {
  const uid = useId();
  const state = useSpoilerProgress(seriesSlug, groupId);
  const [dismissed, setDismissed] = useState(false);
  const [shieldOpen, setShieldOpen] = useState(false);
  const safe = state.ready && isSafeFor({ arcOrd: level.arc, scope: level.scope }, state.progress);
  const mangaOnly = level.scope === 'manga' && state.progress.scope === 'anime' && state.progress.arc >= level.arc;

  return (
    <div className="anime-o3-gate" data-testid="spoiler-gate">
      {!dismissed && !safe ? (
        <section className="anime-o3-interstitial" aria-labelledby={`${uid}-t`}>
          <h2 id={`${uid}-t`} className="anime-o3-interstitial-h">{t('spoiler.interstitialTitle', { name })}</h2>
          <p>{t('spoiler.interstitialBody', { arc: arcName })}{mangaOnly ? ` ${t('spoiler.mangaNote')}` : ''}</p>
          <div className="anime-o3-quick">
            <UxButton variant="ghost" size="sm" onClick={() => setDismissed(true)}>{t('spoiler.showAnyway')}</UxButton>
            <UxButton size="sm" aria-expanded={shieldOpen} onClick={() => setShieldOpen(true)}>{t('spoiler.setProgress')}</UxButton>
          </div>
        </section>
      ) : null}
      <details className="anime-o3-gate-shield" open={shieldOpen} onToggle={(e) => setShieldOpen(e.currentTarget.open)}>
        <summary>{t('shield.title')}</summary>
        <SpoilerShield seriesSlug={seriesSlug} groupId={groupId} arcs={[...arcs]} signedIn={state.signedIn} />
      </details>
    </div>
  );
}
