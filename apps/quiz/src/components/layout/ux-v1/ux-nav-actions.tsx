'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxPopover } from '@/components/ux-v1/popover';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { clearMe } from '@/lib/auth/use-me';
import { getLevelInfo } from '@/lib/constants';
import { refetchUnread, useUnreadCount } from '@/lib/notifications-store';
import { isPlainClick } from '@/lib/ux-v1/a0/nav';
import { streakView } from '@/lib/ux-v1/a0/streak';
import { localDraftCount, MY_QUIZZES_HREF, samePageHash } from '@/lib/ux-v1/a0/my-quizzes';
import { markAllRead } from '@/lib/ux-v1/p11/actions';
import { applyTheme, useEffectiveTheme } from '@/lib/ux-v1/a0/theme';

import { BellPanel } from './slots';
import { useUxSearch } from './ux-search';

import type { MeProfile } from '@/lib/auth/use-me';
import type { StreakView } from '@/lib/ux-v1/a0/streak';

const POLL_MS = 90_000;

/** Streak popover content (also rendered statically by the /ux-v1/kit gallery). */
export function StreakBody({ v, close }: { v: StreakView; close: () => void }): React.ReactElement {
  const risk = v.state === 'at_risk';
  return (
    <>
      <div className="ux-streakpop-big">{v.days} {v.days === 1 ? 'day' : 'days'}</div>
      <p>{risk
        ? `Today is not played yet. Play the daily quiz or the daily blindtest in the next ${v.left} to keep it.`
        : `Today is played. Come back tomorrow to make it ${v.days + 1}.`}</p>
      <ol className="ux-week" aria-label="This week">
        {v.week.map((d, i) => (
          <li key={i} className={[d.done ? 'is-done' : '', d.today && !d.done ? 'is-today' : ''].filter(Boolean).join(' ')}>
            {d.label}<span className="ux-sr">{d.done ? ', played' : d.today ? ', today' : ''}</span>
          </li>
        ))}
      </ol>
      {risk
        ? <Link href="/daily" className="ux-btn ux-btn-primary ux-btn-block" onClick={close}>Play today&apos;s quiz</Link>
        : <Link href="/profile" className="ux-btn ux-btn-ghost ux-btn-block" onClick={close}>See your passport</Link>}
    </>
  );
}

function StreakPill({ profile }: { profile: MeProfile }): React.ReactElement | null {
  const v = streakView(profile.daily_streak, profile.last_daily_date);
  if (!v) return null;
  const risk = v.state === 'at_risk';
  return (
    <UxPopover
      label="Your streak"
      className="ux-streakpop"
      trigger={(p) => (
        <button
          type="button"
          className={`ux-streak${risk ? ' is-risk' : ''}`}
          {...p}
          aria-label={risk ? `${v.days} day streak, ends in ${v.hoursLeft} hours` : `${v.days} day streak, today is played`}
        >
          <Icon name="flame" />{v.days}
        </button>
      )}
    >
      {(close) => <StreakBody v={v} close={close} />}
    </UxPopover>
  );
}

function Bell(): React.ReactElement {
  const unread = useUnreadCount();
  const toast = useUxToast();
  useEffect(() => {
    void refetchUnread();
    const onVisible = (): void => { if (document.visibilityState === 'visible') void refetchUnread(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const t = window.setInterval(() => { void refetchUnread(); }, POLL_MS);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(t);
    };
  }, []);
  return (
    <UxPopover
      label="Notifications"
      className="ux-bellpop"
      trigger={(p) => (
        <button type="button" className="ux-ib" {...p} aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Icon name="bell" />{unread > 0 ? <span className="ux-bell-dot" /> : null}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="ux-pop-h">
            <b>Notifications</b>
            {unread > 0 ? (
              <button type="button" className="ux-lnk" onClick={() => { markAllRead(); toast('All marked as read'); }}>Mark all read</button>
            ) : null}
          </div>
          <BellPanel unread={unread} onClose={close} />
          <div className="ux-msep" />
          <Link className="ux-mi" href="/notifications" onClick={close}>See all notifications<Icon name="right" size="sm" style={{ marginLeft: 'auto' }} /></Link>
        </>
      )}
    </UxPopover>
  );
}

/** "My quizzes" on the passport already shown: switch its tab in place (a soft
 *  navigation to the same path with a new hash fires no hashchange). Elsewhere the
 *  link navigates and the passport opens the tab from the hash. */
function openMyQuizzes(e: React.MouseEvent<HTMLAnchorElement>): void {
  if (!isPlainClick(e)) return;
  const hash = samePageHash(MY_QUIZZES_HREF, window.location.pathname);
  if (!hash) return;
  e.preventDefault();
  window.history.replaceState(window.history.state, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Account menu content (also rendered statically by the /ux-v1/kit gallery). */
export function AccountBody({ profile, close, onSignOut }: { profile: MeProfile; close: () => void; onSignOut: () => void }): React.ReactElement {
  const dark = useEffectiveTheme() === 'dark';
  const name = profile.display_name || profile.username;
  const lv = getLevelInfo(profile.xp ?? 0);
  // The device's create draft (localStorage, no server read): after mount only, so
  // the kit's server-rendered menu hydrates without a mismatch.
  const client = useIsClient();
  const drafts = useMemo(() => (client ? localDraftCount() : 0), [client]);
  return (
    <>
      <div className="ux-pop-id">
        <UxAvatar name={name} src={profile.avatar_url} size={40} />
        <div><b>{profile.username}</b><small>Lv {lv.level} · {lv.name}</small></div>
      </div>
      <div className="ux-msep" />
      <Link className="ux-mi" href="/profile" onClick={close}><Icon name="user" />Passport</Link>
      {/* no prefetch: /me renders on the server for the viewer (badge grants, passport
          snapshot), so it runs only when the viewer actually opens it */}
      <Link className="ux-mi" href={MY_QUIZZES_HREF} prefetch={false} onClick={(e) => { close(); openMyQuizzes(e); }}>
        <Icon name="layers" />My quizzes{drafts > 0 ? <small>{drafts} {drafts === 1 ? 'draft' : 'drafts'}</small> : null}
      </Link>
      <Link className="ux-mi" href="/settings" onClick={close}><Icon name="gear" />Settings</Link>
      <button type="button" className="ux-mi" onClick={() => applyTheme(dark ? 'light' : 'dark')}>
        <Icon name={dark ? 'sun' : 'moon'} />{dark ? 'Light mode' : 'Dark mode'}
      </button>
      <div className="ux-msep" />
      <button type="button" className="ux-mi" onClick={onSignOut}><Icon name="out" />Sign out</button>
    </>
  );
}

function Account({ profile }: { profile: MeProfile }): React.ReactElement {
  const name = profile.display_name || profile.username;
  const signOut = async (): Promise<void> => {
    try {
      const { createBrowserClient } = await import('@/lib/supabase/client'); // loaded on the click only
      await createBrowserClient().auth.signOut();
    } catch { /* still leave */ }
    clearMe();
    window.location.assign('/');
  };
  return (
    <UxPopover
      label="Your account"
      trigger={(p) => (
        <button type="button" className="ux-avabtn" {...p} aria-label="Your account">
          <UxAvatar name={name} src={profile.avatar_url} />
        </button>
      )}
    >
      {(close) => <AccountBody profile={profile} close={close} onSignOut={() => { void signOut(); }} />}
    </UxPopover>
  );
}

/**
 * Right side of the top bar (16.5 + 17.1): search (icon at every width, "/"),
 * + Create (ghost), then streak pill, bell and avatar menu when signed in, or Sign
 * in for guests. Client island: reads the shared /api/auth/me (one call per page)
 * and the shared unread store, so the server-rendered shell stays static.
 *
 * Search is a real `<a href="/search">` in the server HTML (every live page links
 * to /search: link-set rule). Once hydrated a plain click opens the overlay
 * instead; modified clicks (new tab) and visitors without JS reach the page.
 */
export function UxNavActions(): React.ReactElement {
  const me = useUxMe();
  const openSearch = useUxSearch();
  const openSignIn = useSignIn();
  const profile = me?.profile ?? null;

  return (
    <div className="ux-nav-r">
      <Link
        href="/search"
        prefetch={false}
        className="ux-sbtn"
        aria-label="Search"
        aria-keyshortcuts="/"
        onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); openSearch(); }}
      >
        <Icon name="search" size="sm" />
      </Link>
      {/* the label is its own span so a0.css can show Create as its round icon, name kept, where a streak pill needs the room (901 to 959px) */}
      <Link href="/create" className="ux-btn ux-btn-ghost ux-nav-create"><Icon name="plus" /><span className="ux-nav-create-t">Create</span></Link>
      {profile ? (
        <>
          <StreakPill profile={profile} />
          <Bell />
          <Account profile={profile} />
        </>
      ) : (
        <button type="button" className="ux-btn ux-btn-ghost ux-nav-signin" onClick={() => openSignIn()} aria-busy={me === null ? true : undefined}>
          Sign in
        </button>
      )}
    </div>
  );
}
