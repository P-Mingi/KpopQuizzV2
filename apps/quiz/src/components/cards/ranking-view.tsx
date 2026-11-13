'use client';

// KpopCards: Ranking (v6 prototype #ranking) and a player's page (/kpopcards/u/<nickname>): players ranked by how COMPLETE their collection is, never by packs
// opened; only nicknames show; friends first. Each row carries the player's showcase of three cards, and the side card shows the level, the showcase and
// the badges (earned by playing, never bought). The data comes from the contract (lib/kpopcards/contract.ts).
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { kcPath } from '@/lib/cards/kc-paths';
import { isApiError } from '@/lib/kpopcards/contract';

import { CardFront, Ico } from './card-art';
import { useCards } from './cards-provider';

import type { CardRef, PlayerPage, RankRow } from '@/lib/kpopcards/contract';

function Showcase({ refs }: { refs: readonly CardRef[] }): React.ReactElement {
  const { byN } = useCards();
  return <>{refs.map((r, i) => { const d = byN.get(r.n); return d ? <span key={`${r.n}-${i}`}><CardFront card={d} /></span> : null; })}</>;
}

interface MeView { nickname: string; level: number; title: string; pct: number; showcase: CardRef[]; badges: string[] }

export function MeCard({ me, own = false }: { me: MeView; own?: boolean }): React.ReactElement {
  return (
    <aside className="me-card" id="me-card">
      <div className="me"><span className="av big">{me.nickname.charAt(0).toUpperCase()}</span><span><b>{me.nickname}</b><small>Level {me.level} {'\u00B7'} {me.title} {'\u00B7'} {me.pct}% complete</small></span></div>
      <h3>Showcase</h3>
      <div className="showcase"><Showcase refs={me.showcase} /></div>
      {own ? <p className="small">Star any card in your collection to show it here.</p> : null}
      <h3>Badges</h3>
      <div className="badges">{me.badges.map((b) => <span key={b} className="bdg"><Ico name="check" />{b}</span>)}</div>
      <p className="small">Badges are earned by playing, never bought.</p>
    </aside>
  );
}

export function RankingView(): React.ReactElement {
  const { status, kc, lobby } = useCards();
  const [all, setAll] = useState(false);
  const [rows, setRows] = useState<RankRow[] | null>(null);
  const [me, setMe] = useState<MeView | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setRows(null);
    if (!kc) return undefined;
    void kc.ranking(all ? 'all' : 'friends').then((r) => { if (!live) return; if (!isApiError(r)) { setRows(r.rows); setFailed(false); } else setFailed(true); });
    return () => { live = false; };
  }, [all, kc]);
  useEffect(() => {
    if (!kc || !lobby?.nickname) return;
    void kc.player(lobby.nickname).then((r) => { if (!isApiError(r)) setMe(r); });
  }, [kc, lobby?.nickname]);

  return (
    <div className="wrap page">
      <h1 className="h1" id="t-ranking">Ranking</h1>
      <p className="lede">Ranked by how complete each collection is, never by packs opened. Only nicknames show, and you choose who sees you.</p>
      {status === 'guest' ? <p className="page-note" role="status">Sign in with your Bunnyverse passport to see where you stand.</p> : null}
      <div className="rk-layout">
        <div>
          <div className="seg" id="rk-tab" role="group" aria-label="Who">
            <button type="button" data-v="friends" aria-pressed={!all} onClick={() => setAll(false)}>Friends</button>
            <button type="button" data-v="all" aria-pressed={all} onClick={() => setAll(true)}>Everyone</button>
          </div>
          <ol className="rank" id="rank">
            {(rows ?? []).map((x) => (
              <li key={`${x.pos}-${x.nickname}`} className={x.me ? 'me' : undefined}>
                <span className="pos">{x.pos}</span>
                <span className="av">{x.nickname.charAt(0).toUpperCase()}</span>
                <span className="who"><b><Link href={kcPath.player(x.nickname)}>{x.nickname}</Link>{x.me ? <small className="you">You</small> : null}</b><small>Level {x.level} {'·'} {x.title}</small><span className="bar"><i style={{ width: `${x.pct}%` }} /></span></span>
                <span className="sc" aria-hidden="true"><Showcase refs={x.showcase} /></span>
                <span className="pct num">{x.pct}%</span>
              </li>
            ))}
          </ol>
          {failed ? <p className="emptyline" style={{ marginTop: 14 }}>The ranking is not available right now. Try again in a few minutes.</p> : null}
          {rows && rows.length === 0 ? <p className="emptyline" style={{ marginTop: 14 }}>{all ? 'Nobody is ranked yet.' : 'Add friends to see them here.'}</p> : null}
        </div>
        {me ? <MeCard me={me} own /> : <aside className="me-card" id="me-card" aria-busy="true" />}
      </div>
      <footer className="foot"><Link href={kcPath.help}>How it works</Link><span>Only nicknames are shown.</span></footer>
    </div>
  );
}

/** A player's page: the side card on its own, with the way back to the ranking. An unknown nickname says so. */
export function PlayerView({ nickname }: { nickname: string }): React.ReactElement {
  const { kc } = useCards();
  const [me, setMe] = useState<PlayerPage | null | undefined>(undefined);
  useEffect(() => { if (kc) void kc.player(nickname).then((r) => setMe(isApiError(r) ? null : r)); }, [kc, nickname]);
  return (
    <div className="wrap page">
      <p><Link className="back-link" href={kcPath.ranking}><span aria-hidden="true">&larr;</span> Ranking</Link></p>
      <h1 className="h1" id="t-player">{nickname}</h1>
      <p className="lede">A KpopCards collector. Only the nickname, the level, three starred cards and the badges are public.</p>
      <div style={{ maxWidth: 420, marginTop: 22 }}>
        {me ? <MeCard me={me} own={me.me} /> : me === null ? <p className="emptyline">This player is not here, or keeps their page private.</p> : <aside className="me-card" aria-busy="true" />}
      </div>
    </div>
  );
}
