'use client';

// KpopCards: the frame of every page, from the v6 prototype: the top bar (the rabbit and the name, five tabs, the packs and shards pills, the bell, the
// avatar with the level and the profile panel with the Sound and Vibration switches and the kpopquiz.org links), the phone tab bar, and the main area.
// It reads the wallet through useCards(); a signed-out visitor sees the bar and no wallet. The panels close on an outside tap and on Escape.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMe } from '@/lib/auth/use-me';
import { useKcPrefs } from '@/lib/cards/kc-prefs';
import { kcPath } from '@/lib/cards/kc-paths';
import { withBasePath } from '@/lib/site/base-path';
import { MASCOT_PATH } from '@/lib/cards/ui-logo';

import { Ico } from './card-art';
import { useCards } from './cards-provider';


type TabId = 'lobby' | 'collection' | 'missions' | 'ranking' | 'help';
const TABS: readonly { id: TabId; href: string; label: string; icon: string }[] = [
  { id: 'lobby', href: kcPath.lobby, label: 'Lobby', icon: 'pack' },
  { id: 'collection', href: kcPath.collection, label: 'Collection', icon: 'binder' },
  { id: 'missions', href: kcPath.missions, label: 'Missions', icon: 'goals' },
  { id: 'ranking', href: kcPath.ranking, label: 'Ranking', icon: 'trophy' },
  { id: 'help', href: kcPath.help, label: 'Help', icon: 'help' },
];

/** The tab a path belongs to: the lobby holds the opening, the collection holds the card and the idol pages, the ranking the player pages. */
export function tabOf(path: string): TabId | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === kcPath.lobby || p.startsWith(`${kcPath.lobby}/open`)) return 'lobby';
  if (p.startsWith(`${kcPath.lobby}/collection`) || p.startsWith(`${kcPath.lobby}/c/`) || p.startsWith(`${kcPath.lobby}/idol`)) return 'collection';
  if (p.startsWith(kcPath.missions)) return 'missions';
  if (p.startsWith(kcPath.ranking) || p.startsWith(`${kcPath.lobby}/u/`)) return 'ranking';
  if (p.startsWith(kcPath.help) || p.startsWith(kcPath.odds) || p.startsWith(kcPath.report)) return 'help';
  return null;
}

export function KcShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const { status, lobby: w, newSet, kc } = useCards();
  const path = usePathname() ?? '';
  const tab = tabOf(path);
  const me = useMe();
  const [prefs, setPrefs] = useKcPrefs();
  const [open, setOpen] = useState<'bell' | 'profile' | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  // Reduced motion: the prototype's `rm` class (short fades instead of motion) on <html>, read again when the setting changes.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = (): void => { root.classList.toggle('rm', mq.matches); };
    on();
    mq.addEventListener('change', on);
    return () => { mq.removeEventListener('change', on); root.classList.remove('rm'); };
  }, []);

  useEffect(() => { setOpen(null); }, [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event): void => { if (bar.current && !(e.target as Element | null)?.closest('.setwrap')) setOpen(null); };
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', key); };
  }, [open]);

  const lv = w ? { level: w.level.level, label: `Level ${w.level.level} \u00B7 ${w.level.title}`, progress: w.level.progress / 10, nextLabel: `${w.level.toNext} more card${w.level.toNext === 1 ? '' : 's'} to level ${w.level.nextLevel}` } : { level: 1, label: '', progress: 0, nextLabel: '' };
  const nick = w?.nickname ?? me?.profile?.username ?? (status === 'ready' ? 'you' : null);
  const initial = (me?.profile?.display_name ?? nick ?? '?').trim().charAt(0).toUpperCase() || '?';
  const items = w?.bell ?? [];
  const badges: Partial<Record<TabId, number>> = { collection: Math.max(newSet.size, w?.newCards ?? 0), missions: w?.claimable ?? 0 };
  const toggle = useCallback((which: 'bell' | 'profile') => setOpen((o) => (o === which ? null : which)), []);
  const signedIn = status === 'ready' && !!w;

  const badge = (id: TabId): React.ReactElement | null => ((badges[id] ?? 0) > 0 ? <span className="badge" aria-label={`${badges[id]} ${id === 'collection' ? 'new' : 'to claim'}`}>{badges[id]}</span> : null);

  return (
    <>
      <header className="top" ref={bar}>
        <div className="wrap">
          <Link className="brand kc" href={kcPath.lobby} aria-label="KpopCards lobby">
            {/* The Bunnyverse rabbit (public/mascot), not the card icon of the older bar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="kc-ico" src={withBasePath(MASCOT_PATH)} alt="" width={34} height={34} />
            <span className="kc-word">Kpop<b>Cards</b></span>
          </Link>
          <nav className="tabs" aria-label="KpopCards">
            {TABS.map((t) => (
              <Link key={t.id} href={t.href} aria-current={tab === t.id ? 'page' : undefined}><Ico name={t.icon} />{t.label}{t.id === 'collection' || t.id === 'missions' ? <> {badge(t.id)}</> : null}</Link>
            ))}
          </nav>
          <div className="wallet">
            {signedIn && w ? (
              <>
                <span className="pill" id="pill-packs" title="Free packs waiting"><Ico name="pack" /><span className="num"><b id="w-packs">{w.stock}</b>/{w.cap}</span><span className="lbl">packs</span></span>
                <span className="pill" id="pill-shards" title="Shards"><svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-R" /></svg><b id="w-shards" className="num">{w.shards}</b><span className="lbl">shards</span></span>
              </>
            ) : null}
            {signedIn ? (
              <div className="setwrap">
                <button className="iconbtn" id="bell-btn" type="button" aria-label="Notifications" aria-expanded={open === 'bell'} aria-controls="bell-pop" onClick={() => toggle('bell')}>
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
                  {items.length > 0 ? <span className="dot" id="bell-n">{items.length}</span> : null}
                </button>
                <div className="setpop bellpop" id="bell-pop" hidden={open !== 'bell'}>
                  <b className="pop-h">Notifications</b>
                  <ul>
                    {items.length ? items.map((x) => <li key={x.id}><Link href={x.href}><i /><span>{x.title}<small>{x.text}</small></span></Link></li>) : <li className="empty">Nothing new right now.</li>}
                  </ul>
                </div>
              </div>
            ) : null}
            <div className="setwrap">
              <button className="avatar" id="set-btn" type="button" aria-label="Your profile, sound and vibration" aria-expanded={open === 'profile'} aria-controls="set-pop" onClick={() => toggle('profile')}>
                <span className="av">{initial}</span>{signedIn ? <span className="lv" id="lv-chip">Lv {lv.level}</span> : null}
              </button>
              <div className="setpop" id="set-pop" hidden={open !== 'profile'}>
                {signedIn ? (
                  <>
                    <div className="me"><span className="av big">{initial}</span><span><b>{nick}</b><small id="me-lv">{lv.label}</small></span></div>
                    <span className="bar"><i id="me-bar" style={{ width: `${lv.progress * 100}%` }} /></span>
                    <small className="me-next" id="me-next">{lv.nextLabel}</small>
                  </>
                ) : null}
                <label className="srow"><span><b>Sound</b><small>Rip, flip and reveal sounds</small></span><input type="checkbox" className="switch" id="o-snd" checked={prefs.sound} onChange={(e) => { setPrefs({ sound: e.target.checked }); void kc?.prefs({ sound: e.target.checked }); }} /></label>
                <label className="srow"><span><b>Vibration</b><small>On phones that support it</small></span><input type="checkbox" className="switch" id="o-hap" checked={prefs.vibration} onChange={(e) => { setPrefs({ vibration: e.target.checked }); void kc?.prefs({ vibration: e.target.checked }); }} /></label>
                {signedIn ? (
                  <Link className="srow linkrow" href={kcPath.ranking}><span><b>Your profile and ranking</b><small>Showcase, badges, friends</small></span><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></Link>
                ) : null}
                <a className="srow linkrow" href="https://kpopquiz.org" target="_blank" rel="noopener"><span><b>kpopquiz.org</b><small>Your passport, quizzes and Kpopdle</small></span><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg></a>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="kc-main" id="kc-main">{children}</div>
      <nav className="bottomnav" aria-label="KpopCards">
        {TABS.map((t) => (
          <Link key={t.id} href={t.href} aria-current={tab === t.id ? 'page' : undefined}><Ico name={t.icon} />{t.label}{t.id === 'collection' || t.id === 'missions' ? badge(t.id) : null}</Link>
        ))}
      </nav>
    </>
  );
}
