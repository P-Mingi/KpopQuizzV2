'use client';

import { UxButton } from '@/components/ux-v1/button';
import {
  bestStrip,
  cardState,
  comma,
  placementLines,
  runsLeftLine,
  seasonLine,
  stepProgress,
  tierDisplay,
} from '@/lib/ranked/view';

import { useRanked } from './controller';
import { TierShield } from './tiers';

import type { RankedApi } from './controller';
import type { CardState } from '@/lib/ranked/view';

// The season card at the top of /blindtest/ranked (prototype #ranked .rkhead ->
// .best5): shield, season line, the H1, points and ladder place, the progress bar to
// the next division, Play a ranked run with the score to beat and the runs left
// today, then the best 5 runs. Every number is the engine's (GET /api/ranked/me).
// Before the season card answers, and when ranked is not live, it says so plainly.

function Head({ tier, line, title, sub }: {
  tier: ReturnType<typeof tierDisplay> | null;
  line: string;
  title: string;
  sub: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="p7-head">
      <TierShield tier={tier} />
      <div className="p7-head-t">
        <p className="p7-season">{line}</p>
        <h1 className="ux-h1 p7-h1">{title}</h1>
        <p className="p7-line">{sub}</p>
      </div>
    </div>
  );
}

function Progress({ value, tierKey, label }: { value: number; tierKey: string | null; label: string }): React.ReactElement {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10;
  return (
    <div className={`p7-prog ${tierKey ? `p7-t-${tierKey}` : 'p7-t-none'}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

function PlayRow({ r, disabled, note }: { r: RankedApi; disabled: boolean; note: React.ReactNode }): React.ReactElement {
  return (
    <div className="p7-qact">
      <UxButton size="lg" icon="play" onClick={r.play} disabled={disabled || r.starting} aria-busy={r.starting || undefined}>
        Play a ranked run
      </UxButton>
      <span className="p7-note">{note}</span>
    </div>
  );
}

function BestRuns({ best, score, label }: { best: ReadonlyArray<{ id: string; points: number }>; score: number; label: string }): React.ReactElement | null {
  if (!best.length) return null;
  return (
    <p className="p7-best5">
      <span>{label}</span>
      {bestStrip(best).map((b) => (
        <span key={b.id} className={b.lowest ? 'is-low' : undefined}>
          <b className="ux-num">{comma(b.points)}</b>{b.lowest ? ' (lowest)' : null}
        </span>
      ))}
      <span>= <b className="ux-num">{comma(score)}</b></span>
    </p>
  );
}

/** Pure render of one card state (also used by the render tests). */
export function CardView({ state, r }: { state: CardState; r: RankedApi | null }): React.ReactElement {
  if (!r || state.kind === 'loading') {
    return (
      <div className="p7-card" aria-busy="true">
        <Head tier={null} line="Ranked blindtest" title="Ranked" sub={<span className="ux-muted">Loading the season</span>} />
      </div>
    );
  }
  switch (state.kind) {
    case 'not_live':
      return (
        <div className="p7-card" data-state="not-live">
          <Head tier={null} line="Ranked blindtest" title="Not live yet" sub={<span className="ux-muted">The first season has not started.</span>} />
          <p className="p7-lead">Seasons, tiers and the ladder open with the first season. Until then, play the Blindtest of the day or a free run.</p>
          <div className="p7-qact">
            <UxButton size="lg" icon="play" href="/blindtest">Play the blindtest</UxButton>
            <span className="p7-note">The rules below are the ones ranked will use.</span>
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="p7-card" data-state="error">
          <Head tier={null} line="Ranked blindtest" title="Ranked" sub={<span className="ux-muted">The season could not load.</span>} />
          <div className="p7-qact">
            <UxButton size="lg" icon="redo" onClick={r.retry}>Try again</UxButton>
          </div>
        </div>
      );
    case 'guest':
      return (
        <div className="p7-card" data-state="guest">
          <Head tier={null} line={seasonLine(state.season)} title="Ranked blindtest" sub={<span className="ux-muted">Ten songs drawn by the server, the same rules for everyone.</span>} />
          <div className="p7-qact">
            <UxButton size="lg" icon="play" onClick={r.signIn}>Sign in to play ranked</UxButton>
            <span className="p7-note">No password needed</span>
          </div>
        </div>
      );
    case 'placing': {
      const me = state.me;
      const p = placementLines(me.placement.done);
      return (
        <div className="p7-card" data-state="placing">
          <Head tier={null} line={seasonLine(state.season)} title={p.title} sub={<><b className="ux-num">{comma(me.score)}</b> <span className="ux-muted">season points so far</span></>} />
          <Progress value={me.placement.done / me.placement.of} tierKey={null} label="Placement runs played" />
          <p className="p7-next"><span className="ux-muted">{p.toGo}. Your first 5 runs place you.</span></p>
          <PlayRow r={r} disabled={me.runsLeft === 0} note={runsLeftLine(me.runsLeft)} />
          <BestRuns best={me.best} score={me.score} label="Your runs so far:" />
        </div>
      );
    }
    case 'placed': {
      const me = state.me;
      const tier = tierDisplay(me.score, me.legend);
      const place = me.ladder.position !== null
        ? <> <span className="ux-muted">season points · #{comma(me.ladder.position)} of {comma(me.ladder.total)}</span></>
        : <> <span className="ux-muted">season points</span></>;
      return (
        <div className="p7-card" data-state="placed">
          <Head tier={tier} line={seasonLine(state.season)} title={tier.label} sub={<><b className="ux-num">{comma(me.score)}</b>{place}</>} />
          <Progress value={stepProgress(me.score)} tierKey={tier.key} label={me.next ? `Progress to ${me.next.label}` : 'Master'} />
          <p className="p7-next">
            {me.next
              ? <><b className="ux-num">{comma(me.next.toGo)}</b> <span className="ux-muted">points to {me.next.label}</span></>
              : <span className="ux-muted">{me.legend ? 'You are in the top 100 Masters. Legend is recomputed every night.' : 'Legend is the top 100 Masters, recomputed every night.'}</span>}
          </p>
          <PlayRow
            r={r}
            disabled={me.runsLeft === 0}
            note={<>{me.toBeat !== null ? <>Score over <b className="ux-num">{comma(me.toBeat)}</b> to count · </> : null}{runsLeftLine(me.runsLeft)}</>}
          />
          <BestRuns best={me.best} score={me.score} label="Your best 5 runs:" />
        </div>
      );
    }
  }
}

/** Client island: the card of the current state. */
export function RankedCard(): React.ReactElement {
  const r = useRanked();
  return <CardView state={r ? cardState(r.card, r.status) : { kind: 'loading' }} r={r} />;
}
