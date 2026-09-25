'use client';

import Image from 'next/image';
import { useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPopover } from '@/components/ux-v1/popover';
import { useUxToast } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { ALL_PICK, filterGroups, GENERATIONS, groupPick, initials, MIXES, ROUND_OPTIONS, TITLE_TRACKS } from '@/lib/ux-v1/p6/playlists';

import { useHub } from './hub-context';

import type { BtPick } from '@/lib/ux-v1/p6/playlists';

// The hero's setup row (DESIGN-SPEC 16.7, 17.5; prototype .setup): playlist menu,
// 5 / 10 / 15 songs, Start, "Your best 8/10 · Idol" (signed in, real best daily
// score; the rank title only when bt_players has the row).

function Avatar({ slug, name }: { slug: string; name: string }): React.ReactElement {
  const src = groupPhotoUrl(slug);
  return (
    <span className="p6-gav" aria-hidden="true">
      {src ? <Image src={src} alt="" width={28} height={28} sizes="28px" /> : initials(name)}
    </span>
  );
}

function PlaylistMenu({ close }: { close: () => void }): React.ReactElement | null {
  const hub = useHub();
  const toast = useUxToast();
  const [q, setQ] = useState('');
  const [gens, setGens] = useState(false);
  if (!hub) return null;
  const list = filterGroups(hub.groups, q);
  const choose = (p: BtPick): void => {
    hub.setPick(p);
    toast(`Playlist: ${p.label}`);
    close();
  };
  const item = (p: BtPick, children: React.ReactNode, key?: string): React.ReactElement => (
    <button key={key ?? p.playlist} type="button" className="ux-mi p6-mi" aria-pressed={hub.pick.playlist === p.playlist} onClick={() => choose(p)}>
      {children}
    </button>
  );
  return (
    <>
      {item(ALL_PICK, <>All K-pop<small className="ux-num">{hub.songs.toLocaleString('en-US')} songs</small></>)}
      <div className="p6-pl-h">Groups<small>{list.length} {list.length === 1 ? 'playlist' : 'playlists'}</small></div>
      <div className="p6-pl-f">
        <label className="ux-sr" htmlFor="p6-pl-find">Find a group</label>
        <input className="ux-inp" id="p6-pl-find" type="search" placeholder="Find a group" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="p6-pl-list">
        {list.map((g) => item(groupPick(g), <><Avatar slug={g.slug} name={g.name} />{g.name}<small className="ux-num">{g.songs} songs</small></>, g.slug))}
      </div>
      <div className="ux-msep" />
      <div className="p6-pl-h">Mixes</div>
      {MIXES.map((m) => item(m, m.label))}
      <button type="button" className="ux-mi p6-mi" aria-expanded={gens} aria-controls="p6-pl-gens" onClick={() => setGens((v) => !v)}>
        By generation<small>1st to 5th</small>
      </button>
      <div className="p6-pl-gens" id="p6-pl-gens" hidden={!gens}>
        {GENERATIONS.map((m) => item(m, m.label))}
      </div>
      {item(TITLE_TRACKS, TITLE_TRACKS.label)}
    </>
  );
}

export function BtSetup(): React.ReactElement | null {
  const hub = useHub();
  const live = useIsClient();
  if (!hub) return null;
  const me = hub.board?.me ?? null;
  const loading = hub.run.phase === 'loading';
  return (
    <>
      <div className="p6-setup" data-live={live || undefined}>
        <UxPopover
          wrap
          label="Choose a playlist"
          className="p6-plmenu"
          trigger={(props) => (
            <button type="button" className="p6-pl" {...props}>
              <span>Playlist</span><b>{hub.pick.label}</b><Icon name="chev" size="sm" />
            </button>
          )}
        >
          {(close) => <PlaylistMenu close={close} />}
        </UxPopover>
        <div className="p6-seg" role="group" aria-label="Songs">
          {ROUND_OPTIONS.map((n) => (
            <button key={n} type="button" aria-pressed={hub.rounds === n} onClick={() => hub.setRounds(n)}>{n} songs</button>
          ))}
        </div>
        <UxButton size="lg" icon="play" onClick={hub.startSelected} aria-busy={loading || undefined}>Start</UxButton>
        {me && me.best !== null ? (
          <span className="p6-btbest">Your best <b className="ux-num">{me.best}/10</b>{me.rankTitle ? ` · ${me.rankTitle.charAt(0).toUpperCase()}${me.rankTitle.slice(1)}` : ''}</span>
        ) : null}
      </div>
      {hub.run.error ? <p className="p6-err" role="alert">{hub.run.error}</p> : null}
    </>
  );
}
