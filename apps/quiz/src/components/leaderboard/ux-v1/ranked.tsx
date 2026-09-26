'use client';

import { useCallback, useEffect, useState } from 'react';

import { rankedApi, RankedApiError } from '@/components/ranked/ux-v1/api';
import { TierGem } from '@/components/ranked/ux-v1/tiers';
import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton, UxLink } from '@/components/ux-v1/button';
import { PinnedRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { comma, ladderSub, seasonLine } from '@/lib/ranked/view';

import { BoardRows, Podium } from './board';
import { useLbTab } from './tab-context';

import type { LadderEntry, LadderView } from '@/lib/ranked/view';
import type { SeasonCard } from '@/lib/ranked/service';
import type { PodiumItem, RowItem } from './board';

// The Ranked tab (prototype #lb-ranked): the season line, the podium and rows of
// the season ladder, your row pinned. It reads P7's API as it is (GET
// /api/ranked/me for the season, GET /api/ranked/ladder?scope=global), once, when
// the tab is first opened. Until P7's pending migration is applied both answer 503
// not_live and the tab says so plainly: no invented season, no sample ladder.

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not_live' }
  | { kind: 'error' }
  | { kind: 'live'; season: SeasonCard['season']; ladder: LadderView };

function href(e: LadderEntry): string | undefined {
  return e.username ? `/u/${encodeURIComponent(e.username)}` : undefined;
}

function gemAvatar(e: LadderEntry): React.ReactElement {
  return <span className="p9-pav p9-pav-tier" aria-hidden="true"><TierGem tier={e.tier} /></span>;
}

export function rankedPodium(rows: LadderEntry[]): PodiumItem[] {
  return rows.slice(0, 3).map((e) => ({
    key: `${e.scopePosition}-${e.name}`,
    rank: e.scopePosition,
    avatar: gemAvatar(e),
    title: <PersonName name={e.name} accent={e.accent} font={e.font} href={href(e)} showBias={false} className="p9-link" />,
    sub: e.tier.label,
    value: comma(e.seasonScore),
  }));
}

export function rankedRows(rows: LadderEntry[]): RowItem[] {
  return rows.map((e) => ({
    key: `${e.scopePosition}-${e.name}`,
    rank: e.scopePosition,
    avatar: <span className="p9-gemrow" aria-hidden="true"><TierGem tier={e.tier} /></span>,
    name: <PersonName name={e.name} accent={e.accent} font={e.font} bias={e.bias} href={href(e)} className="p9-link" />,
    sub: ladderSub(e),
    value: comma(e.seasonScore),
  }));
}

/** Pure render of a Ranked tab state (also used by the render tests). */
export function RankedBody({ status, retry }: { status: Status; retry: () => void }): React.ReactElement {
  if (status.kind === 'idle' || status.kind === 'loading') {
    return <p className="p9-rnote" aria-busy="true">Loading the ranked season</p>;
  }
  if (status.kind === 'not_live') {
    return (
      <p className="p9-rnote" data-state="not-live">
        Ranked is not live yet: the first season has not started, so there is no ladder to show.{' '}
        <UxLink href="/blindtest/ranked">How ranked works</UxLink>
      </p>
    );
  }
  if (status.kind === 'error') {
    return (
      <p className="p9-rnote" data-state="error">
        The ranked ladder could not load.{' '}
        <UxButton variant="ghost" size="sm" onClick={retry}>Try again</UxButton>
      </p>
    );
  }
  const { season, ladder } = status;
  const me = ladder.me;
  return (
    <>
      <p className="p9-rline">
        {seasonLine(season)}. <UxLink href="/blindtest/ranked">How ranked works</UxLink>
      </p>
      {ladder.rows.length ? (
        <>
          <Podium items={rankedPodium(ladder.rows)} label="Top 3 of the season" />
          <BoardRows items={rankedRows(ladder.rows.length >= 3 ? ladder.rows.slice(3) : ladder.rows)} top={ladder.rows.length >= 3} label="Season ladder" />
        </>
      ) : (
        <p className="p9-rnote">No one is placed yet this season: five ranked runs place a player.</p>
      )}
      {me ? (
        <PinnedRow
          you
          className="p9-pin"
          rank={<span className="ux-num">#{comma(me.scopePosition)}</span>}
          lead={<UxAvatar name={me.name} src={me.avatarUrl} size={40} />}
          end={<span className="p9-pin-v ux-num">{comma(me.seasonScore)}</span>}
        >
          <PersonName name={me.name} accent={me.accent} font={me.font} showBias={false} />
          {' '}
          <span className="p9-pin-s">· {me.tier.label}</span>
        </PinnedRow>
      ) : null}
    </>
  );
}

export function RankedPane(): React.ReactElement {
  const { seen } = useLbTab();
  const opened = seen.has('ranked');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!opened) return undefined;
    let on = true;
    Promise.all([rankedApi.me(), rankedApi.ladder('global')])
      .then(([card, ladder]) => { if (on) setStatus({ kind: 'live', season: card.season, ladder }); })
      .catch((e: unknown) => { if (on) setStatus(e instanceof RankedApiError && e.code === 'not_live' ? { kind: 'not_live' } : { kind: 'error' }); });
    return () => { on = false; };
  }, [opened, attempt]);

  const retry = useCallback(() => {
    setStatus({ kind: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  // Opened and not answered yet = loading (derived, no state set inside the effect).
  const shown: Status = opened && status.kind === 'idle' ? { kind: 'loading' } : status;
  return <div className="p9-ranked" aria-live="polite"><RankedBody status={shown} retry={retry} /></div>;
}
