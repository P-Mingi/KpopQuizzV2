'use client';

// KpopCards: Missions (v6 prototype #missions): the weekly list with its reward, then every set with a fixed reward, the ready ones first. Rewards are packs and
// shards only, claimed once. Nothing is decided here: the numbers come from the contract (lib/kpopcards/contract.ts).
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { kcPath } from '@/lib/cards/kc-paths';
import { weekOf } from '@/lib/cards/kc-views';
import { isApiError } from '@/lib/kpopcards/contract';
import { newKey } from '@/lib/kpopcards/registry';

import { Gem, Ico } from './card-art';
import { useCards } from './cards-provider';
import { WeekList } from './lobby-view';
import { flyReward } from './reward-fly';

import type { MissionSet, MissionsState } from '@/lib/kpopcards/contract';

const PackIco = (): React.ReactElement => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}><use href="#bvc-i-pack" /></svg>;
const GEM: Partial<Record<MissionSet['kind'], 'R' | 'UR'>> = { holo: 'R', gold: 'UR' };

export function MissionsView(): React.ReactElement {
  const { catalog, now, status, toast, refresh, kc } = useCards();
  const [m, setM] = useState<MissionsState | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async (): Promise<void> => {
    if (!kc) return;
    const r = await kc.missions();
    if (isApiError(r)) { setFailed(true); return; }
    setM(r); setFailed(false);
  }, [kc]);
  useEffect(() => { if (status === 'ready') void load(); }, [status, load]);
  const week = useMemo(() => (m ? weekOf(m.week, now ?? 0) : null), [m, now]);
  // The groups of a debut year set, in catalog order: "Stray Kids and ATEEZ" (the prototype's line under the name).
  const yearSub = (id: string): string | null => {
    const y = Number(id.replace('year:', ''));
    const names: string[] = [];
    for (const c of catalog.cards) if (c.kind === 'group' && c.debutYear === y && !names.includes(c.name)) names.push(c.name);
    return names.length < 2 ? null : names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  };
  const colorOf = (name: string): string => catalog.sections.find((s) => s.name === name)?.color ?? '#9B59D9';

  const claim = async (target: string, label: string, packs: number): Promise<void> => {
    if (busy || !kc) return;
    setBusy(target);
    const r = await kc.claim({ key: newKey(), target });
    setBusy(null);
    if (isApiError(r)) { toast('Could not claim that reward. Try again.'); return; }
    setM(r.missions);
    const pill = (id: string): HTMLElement | null => document.getElementById(id);
    if (r.packs > 0) flyReward(pill('pill-packs'), r.packs, document.activeElement);
    if (r.shards > 0) window.setTimeout(() => flyReward(pill('pill-shards'), r.shards), 350);
    toast(target === 'week' ? `Weekly reward claimed: ${week?.rewardLabel ?? ''}.` : `${label} claimed: +${packs} pack${packs > 1 ? 's' : ''}.`);
    void refresh();
  };
  const sets = m?.sets ?? [];

  return (
    <div className="wrap page">
      <h1 className="h1" id="t-goals">Missions</h1>
      <p className="lede">Each set gives its reward once. The weekly list starts over every Monday, and missing a week costs nothing.</p>
      {status === 'guest' ? <p className="page-note" role="status">Sign in with your Bunnyverse passport to see your missions.</p> : null}
      <div className="box week" id="week">
        <div className="week-head"><h2 className="h2"><Ico name="goals" />This week</h2><span>{week?.leftLabel ?? ''}</span></div>
        <WeekList week={week} />
        {week && m ? (
          <div className="week-foot">
            <p><b>Reward: {week.rewardLabel}.</b> The list starts over on Monday at midnight, Paris time. There is no streak to keep.</p>
            {week.claimed ? <span className="claimed"><Ico name="check" />Claimed this week</span> : <button type="button" className="btn-primary" id="wk-claim" disabled={!week.done || busy !== null} onClick={() => void claim('week', 'Week', 0)}>{week.done ? 'Claim the reward' : 'Finish the list to claim'}</button>}
          </div>
        ) : null}
      </div>
      <div className="sec-head"><h2 className="h2">Sets</h2><span id="sets-sum">{m ? `${m.setsDone} of ${m.setsTotal} complete` : ''}</span></div>
      <div className="sets" id="sets">
        {failed ? <p className="emptyline">Missions are not available right now. Try again in a few minutes.</p> : null}
        {sets.map((s) => (
          <div key={s.id} className={`set${s.done ? ' done' : ''}${s.ready ? ' ready' : ''}`}>
            <div className="set-top">{GEM[s.kind] ? <Gem r={GEM[s.kind]!} className={`gem gc-${GEM[s.kind]}`} /> : <i style={{ background: s.kind === 'group' ? colorOf(s.name) : s.kind === 'solo' ? '#FFC24B' : '#9B59D9' }} />}<b>{s.name}</b><small>{s.type === 'Debut' ? 'Debut year' : s.type}</small></div>
            {s.kind === 'year' && yearSub(s.id) ? <p className="set-sub">{yearSub(s.id)}</p> : null}
            <span className="bar"><i style={{ width: `${((s.owned / Math.max(1, s.total)) * 100).toFixed(1)}%` }} /></span>
            <div className="set-row">
              <span><b style={{ color: 'var(--txt1)' }}>{s.owned}</b> of {s.total} cards</span>
              {s.claimed ? <span className="claimed"><Ico name="check" />Claimed</span>
                : s.ready ? <button type="button" className="btn-primary" data-claim={s.id} disabled={busy !== null} onClick={() => void claim(s.id, s.name, s.packs)}>Claim +{s.packs} pack{s.packs > 1 ? 's' : ''}</button>
                : <span className="rw"><PackIco />+{s.packs} pack{s.packs > 1 ? 's' : ''}</span>}
            </div>
          </div>
        ))}
      </div>
      <footer className="foot"><Link href={kcPath.help}>How it works</Link><span>Rewards are packs and shards only. Nothing here costs money.</span></footer>
    </div>
  );
}
