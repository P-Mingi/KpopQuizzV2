'use client';

// KpopCards (lot 5): friends by one-time code, in the ranking page. A player makes a code (it replaces the old one and runs out after a while) and hands it to a
// friend; the friend types it here. Friends see each other's completion and wishlist. No chat, no message, no search of players.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { kcPath } from '@/lib/cards/kc-paths';
import { RARITY_LABEL } from '@/lib/cards/rules';
import { isApiError } from '@/lib/kpopcards/contract';
import { newKey } from '@/lib/kpopcards/registry';

import { Ico } from './card-art';
import { useCards } from './cards-provider';

import type { CardRef, FriendsState } from '@/lib/kpopcards/contract';

const EDITION_RARITY: Record<string, keyof typeof RARITY_LABEL> = { std: 'C', stage: 'U', holo: 'R', era: 'SR', gold: 'UR', full: 'L' };
const edName = (e: string): string => RARITY_LABEL[EDITION_RARITY[e] ?? 'C'];
const WORDS: Record<string, string> = {
  code_invalid: 'That code is not valid. Check it with your friend, or ask for a new one.',
  code_expired: 'That code has run out. Ask your friend for a new one.',
  code_used: 'That code was already used. Ask your friend for a new one.',
  self_friend: 'That is your own code.',
  friend_limit: 'The friends list is full.',
  no_nickname: 'Choose a nickname first, then you can add friends.',
  rate_limited: 'Too many tries. Wait a little and try again.',
};

export function wishText(w: readonly CardRef[]): string {
  return w.map((c) => `${c.name}${c.part ? ` ${c.part}/2` : ''}, ${edName(c.edition)}`).join(' · ');
}

export function FriendsPanel({ onChange }: { onChange?: () => void }): React.ReactElement {
  const { kc, toast } = useCards();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FriendsState | null>(null);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const load = useCallback(async (): Promise<void> => {
    if (!kc) return;
    const r = await kc.friends();
    if (!isApiError(r)) setData(r);
  }, [kc]);
  useEffect(() => {
    if (!open) return undefined;
    void load();
    closeRef.current?.focus();
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, load]);

  const makeCode = async (): Promise<void> => {
    if (!kc || busy) return;
    setBusy(true); setMsg('');
    const r = await kc.friendCode();
    setBusy(false);
    if (isApiError(r)) { setMsg(WORDS[r.error] ?? 'Could not make a code. Try again.'); return; }
    await load();
  };
  const redeem = async (): Promise<void> => {
    if (!kc || busy || !typed.trim()) return;
    setBusy(true); setMsg('');
    const r = await kc.friendRedeem({ key: newKey(), code: typed.trim() });
    setBusy(false);
    if (isApiError(r)) { setMsg(WORDS[r.error] ?? 'Could not add that friend. Try again.'); return; }
    setTyped(''); setData(r.friends); toast(`${r.friend.nickname} is now your friend.`); onChange?.();
  };
  const remove = async (nickname: string): Promise<void> => {
    if (!kc || busy) return;
    setBusy(true);
    const r = await kc.friendRemove({ nickname });
    setBusy(false);
    if (!isApiError(r)) { setData(r); onChange?.(); }
  };
  const code = data?.code ?? null;
  return (
    <>
      <div className="fr-inline">
        <form className="fr-add" onSubmit={(e) => { e.preventDefault(); void redeem(); }}>
          <label className="sr-only" htmlFor="friend-in-top">Add a friend with their code</label>
          <input id="friend-in-top" className="search-in" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Friend's code" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} />
          <button type="submit" className="btn-outline" disabled={busy || !typed.trim()}>Add</button>
        </form>
        <button type="button" className="btn-outline" id="friends-open" onClick={() => setOpen(true)}><Ico name="goals" />My code and friends</button>
      </div>
      {msg && !open ? <p className="fr-err" role="alert" style={{ flexBasis: '100%' }}>{msg}</p> : null}
      {open ? (
        <div className="dt" id="friends-dt" role="dialog" aria-modal="true" aria-label="Friends" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="adbox fr-box">
            <div className="ad-top"><span>Friends</span><button type="button" className="close in" aria-label="Close" ref={closeRef} onClick={() => setOpen(false)}><Ico name="x" /></button></div>
            <div className="fr-body">
              <p className="fr-note">Friends see each other&rsquo;s completion and wishlist. There is no chat and no message. You add a friend with a one-time code.</p>
              <h3>Your code</h3>
              {code ? (
                <p className="fr-code"><b id="friend-code">{code.code}</b><small>Runs out {new Date(code.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}. A new code replaces this one.</small></p>
              ) : <p className="fr-note">Make a code and give it to a friend. It works once.</p>}
              <button type="button" className="btn-outline" id="friend-make" disabled={busy} onClick={() => void makeCode()}>{code ? 'Make a new code' : 'Make a code'}</button>
              <h3>Add a friend</h3>
              <form className="fr-add" onSubmit={(e) => { e.preventDefault(); void redeem(); }}>
                <label className="sr-only" htmlFor="friend-in">Your friend&rsquo;s code</label>
                <input id="friend-in" className="search-in" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Friend's code" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} />
                <button type="submit" className="btn-primary" id="friend-add" disabled={busy || !typed.trim()}>Add</button>
              </form>
              {msg ? <p className="fr-err" role="alert">{msg}</p> : null}
              <h3>Your friends{data ? ` (${data.friends.length} of ${data.max})` : ''}</h3>
              {data && data.friends.length === 0 ? <p className="fr-note">No friends yet.</p> : null}
              <ul className="fr-list">
                {(data?.friends ?? []).map((f) => (
                  <li key={f.nickname}>
                    <div className="fr-row"><span className="av sm">{f.nickname.charAt(0).toUpperCase()}</span><b><Link href={kcPath.player(f.nickname)} onClick={() => setOpen(false)}>{f.nickname}</Link></b><small>Level {f.level} {'·'} {f.pct}%</small><button type="button" className="btn-quiet sm" onClick={() => void remove(f.nickname)} aria-label={`Remove ${f.nickname} from your friends`}>Remove</button></div>
                    <p className="fr-wish">{f.wishlist.length ? <><b>Wants:</b> {wishText(f.wishlist)}</> : 'Wishlist is empty.'}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
