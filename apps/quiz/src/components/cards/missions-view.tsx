'use client';

// KpopCards: Missions (v6 prototype #missions): the weekly list with its reward, then every set with a fixed reward, the ready ones first. Rewards are packs and
// shards only, claimed once. Nothing is decided here: the numbers come from the contract (lib/cards/kc-goals-client.ts).
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useKcGoals } from '@/lib/cards/kc-goals-client';
import { kcPath } from '@/lib/cards/kc-paths';
import { setDone, setReady } from '@/lib/cards/kc-views';

import { Gem, Ico } from './card-art';
import { useCards } from './cards-provider';
import { WeekList } from './lobby-view';

import type { SetView } from '@/lib/cards/kc-views';

const PackIco = (): React.ReactElement => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}><use href="#bvc-i-pack" /></svg>;

export function MissionsView(): React.ReactElement {
  const { catalog, now, status, toast, refresh } = useCards();
  const g = useKcGoals((name) => catalog.sections.find((s) => s.name === name)?.color, now);
  const [busy, setBusy] = useState<string | null>(null);
  const list = useMemo(() => [...g.sets].sort((a, b) => Number(setReady(b)) - Number(setReady(a)) || b.own / b.all - a.own / a.all), [g.sets]);
  const nDone = g.sets.filter(setDone).length;

  const claimSet = async (s: SetView): Promise<void> => {
    if (busy) return;
    setBusy(s.id);
    const r = await g.claimSet(s.id);
    setBusy(null);
    toast(r.ok ? `${s.name} claimed: +${s.packs} pack${s.packs > 1 ? 's' : ''}.` : r.message);
    if (r.ok) void refresh();
  };
  const claimWeek = async (): Promise<void> => {
    if (busy) return;
    setBusy('week');
    const r = await g.claimWeek();
    setBusy(null);
    toast(r.ok ? `Weekly reward claimed: ${g.week?.rewardLabel ?? ''}.` : r.message);
    if (r.ok) void refresh();
  };

  return (
    <div className="wrap page">
      <h1 className="h1" id="t-goals">Missions</h1>
      <p className="lede">Each set gives its reward once. The weekly list starts over every Monday, and missing a week costs nothing.</p>
      {status === 'guest' ? <p className="page-note" role="status">Sign in with your Bunnyverse passport to see your missions.</p> : null}
      <div className="box week" id="week">
        <div className="week-head"><h2 className="h2"><Ico name="goals" />This week</h2><span>{g.week?.leftLabel ?? ''}</span></div>
        <WeekList week={g.week} />
        {g.week ? (
          <div className="week-foot">
            <p><b>Reward: {g.week.rewardLabel}.</b> The list starts over on Monday at midnight, Paris time. There is no streak to keep.</p>
            {g.week.claimed ? <span className="claimed"><Ico name="check" />Claimed this week</span> : <button type="button" className="btn-primary" id="wk-claim" disabled={!g.week.done || busy !== null} onClick={() => void claimWeek()}>{g.week.done ? 'Claim the reward' : 'Finish the list to claim'}</button>}
          </div>
        ) : null}
      </div>
      <div className="sec-head"><h2 className="h2">Sets</h2><span id="sets-sum">{g.sets.length ? `${nDone} of ${g.sets.length} complete` : ''}</span></div>
      <div className="sets" id="sets">
        {g.failed ? <p className="emptyline">Missions are not available right now. Try again in a few minutes.</p> : null}
        {list.map((s) => {
          const ready = setReady(s);
          return (
            <div key={s.id} className={`set${setDone(s) ? ' done' : ''}${ready ? ' ready' : ''}`}>
              <div className="set-top">{s.gem ? <Gem r={s.gem} className={`gem gc-${s.gem}`} /> : <i style={{ background: s.color ?? '#9B59D9' }} />}<b>{s.name}</b><small>{s.type}</small></div>
              {s.sub ? <p className="set-sub">{s.sub}</p> : null}
              <span className="bar"><i style={{ width: `${((s.own / Math.max(1, s.all)) * 100).toFixed(1)}%` }} /></span>
              <div className="set-row">
                <span><b style={{ color: 'var(--txt1)' }}>{s.own}</b> of {s.all} cards</span>
                {s.claimed ? <span className="claimed"><Ico name="check" />Claimed</span>
                  : ready ? <button type="button" className="btn-primary" disabled={busy !== null} onClick={() => void claimSet(s)}>Claim +{s.packs} pack{s.packs > 1 ? 's' : ''}</button>
                  : <span className="rw"><PackIco />+{s.packs} pack{s.packs > 1 ? 's' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="foot"><Link href={kcPath.help}>How it works</Link><span>Rewards are packs and shards only. Nothing here costs money.</span></footer>
    </div>
  );
}
