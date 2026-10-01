'use client';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton, UxLink } from '@/components/ux-v1/button';
import { PinnedRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { Segmented } from '@/components/ux-v1/segmented';
import { comma, ladderSub } from '@/lib/ranked/view';

import { useRanked } from './controller';
import { TierGem } from './tiers';

import type { RankedApi } from './controller';
import type { LadderEntry, LadderScope, LadderView } from '@/lib/ranked/view';

// "Season N ladder" (prototype #ranked .sec-h + #rk-ladder + .pin): Global / My
// fandom / Following, the top 8 of the scope with each fan's name flair (A0
// PersonName), tier, average answer time and season score, then your own row
// pinned under the list (always, like the prototype, also when you are in the top 8). Rows come from GET /api/ranked/ladder (public profile
// fields only). The section hides until ranked is live and someone is placed.

const SCOPES: { value: LadderScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'fandom', label: 'My fandom' },
  { value: 'following', label: 'Following' },
];

function profileHref(e: LadderEntry): string | undefined {
  return e.username ? `/u/${encodeURIComponent(e.username)}` : undefined;
}

function Row({ e }: { e: LadderEntry }): React.ReactElement {
  return (
    <li className="p7-lrow">
      <span className="p7-rk ux-num">{e.scopePosition}</span>
      <TierGem tier={e.tier} />
      <span className="p7-grow">
        <PersonName name={e.name} accent={e.accent} font={e.font} bias={e.bias} href={profileHref(e)} />
        <span className="p7-sub">{ladderSub(e)}</span>
      </span>
      <span className="p7-score ux-num">{comma(e.seasonScore)}</span>
    </li>
  );
}

/** Pure render of a ladder answer (also used by the render tests). */
export function LadderBody({ view, r }: { view: LadderView; r: Pick<RankedApi, 'signIn'> }): React.ReactElement {
  if (view.needs === 'sign_in') {
    return (
      <p className="p7-lnote">
        Sign in to see this ladder. <UxButton size="sm" variant="ghost" onClick={r.signIn}>Sign in</UxButton>
      </p>
    );
  }
  if (view.needs === 'fandom') {
    return (
      <p className="p7-lnote">
        Pick your main fandom in Settings to see how its fans rank. <UxLink href="/settings">Open Settings</UxLink>
      </p>
    );
  }
  if (!view.rows.length) {
    return <p className="p7-lnote">{view.scope === 'following' ? 'None of the fans you follow is placed yet.' : 'No fan of your main fandom is placed yet.'}</p>;
  }
  const me = view.me;
  return (
    <>
      <ol className="ux-rows p7-ladder" aria-label={`Top ${view.rows.length} of ${comma(view.total)}`}>
        {view.rows.map((e) => <Row key={`${e.scopePosition}-${e.name}`} e={e} />)}
      </ol>
      {me ? (
        <PinnedRow
          you
          className="p7-pin"
          rank={<span className="ux-num">#{comma(me.scopePosition)}</span>}
          lead={<UxAvatar name={me.name} src={me.avatarUrl} size={40} />}
          end={<span className="p7-score ux-num">{comma(me.seasonScore)}</span>}
        >
          <PersonName name={me.name} accent={me.accent} font={me.font} bias={me.bias} showBias={false} />
          <span className="ux-muted"> · {ladderSub(me)}</span>
        </PinnedRow>
      ) : null}
    </>
  );
}

export function RankedLadder(): React.ReactElement | null {
  const r = useRanked();
  if (!r || r.status !== 'live' || !r.card) return null;
  const { ladder, scope } = r;
  const view = ladder.view;
  // Min-gate: no ladder section while nobody is placed on the global ladder.
  if (scope === 'global' && ladder.status === 'ready' && view && view.total === 0) return null;
  return (
    <section className="ux-sec p7-sec" aria-labelledby="p7-ladder-h" aria-busy={ladder.status === 'loading' || undefined}>
      <SectionHeader
        id="p7-ladder-h"
        title={`Season ${r.card.season.id} ladder`}
        aside={<Segmented options={SCOPES} value={scope} onChange={r.setScope} label="Ladder" />}
      />
      {view && view.scope === scope
        ? <LadderBody view={view} r={r} />
        : ladder.status === 'error'
          ? <p className="p7-lnote">The ladder could not load. <UxButton size="sm" variant="ghost" onClick={r.retry}>Try again</UxButton></p>
          : <p className="p7-lnote p7-lwait">Loading the ladder</p>}
    </section>
  );
}
