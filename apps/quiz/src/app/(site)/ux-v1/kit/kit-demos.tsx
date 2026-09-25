'use client';

import { useState } from 'react';
import Link from 'next/link';

import { AccountBody, StreakBody } from '@/components/layout/ux-v1/ux-nav-actions';
import { BellPanel } from '@/components/layout/ux-v1/slots';
import { useUxSearch } from '@/components/layout/ux-v1/ux-search';
import { Chip, Chips } from '@/components/ux-v1/chip';
import { ConfirmSheet } from '@/components/ux-v1/confirm-sheet';
import { UxDropdown } from '@/components/ux-v1/dropdown';
import { UxCheckbox, UxField, UxSwitch } from '@/components/ux-v1/form';
import { HeaderPictureSheet } from '@/components/ux-v1/header-picture-sheet';
import { Icon } from '@/components/ux-v1/icon';
import { Segmented } from '@/components/ux-v1/segmented';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { SignInSheet, useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { UxTabs } from '@/components/ux-v1/tabs';
import { tabPanelProps } from '@/components/ux-v1/tab-panel';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { streakView } from '@/lib/ux-v1/a0/streak';

import type { MeProfile } from '@/lib/auth/use-me';

// Kit-only helpers. Every control below is the real shared component; the
// sample props are component STATES for the gallery (noindex, flag-on only).

const noop = (): void => {};

function utcDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function KitControls(): React.ReactElement {
  const [tab, setTab] = useState('foryou');
  const [sort, setSort] = useState<'trending' | 'newest' | 'played' | 'rated'>('trending');
  const [level, setLevel] = useState<string | null>(null);
  const [type, setType] = useState<string | null>('tf');
  const [chip, setChip] = useState(true);
  const TYPES = [{ value: 'classic', label: 'Classic' }, { value: 'tf', label: 'True/false' }, { value: 'image', label: 'Image' }];
  const LEVELS = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }];
  return (
    <div data-kit="controls">
      <span className="ux-kit-label">Tabs (button tablist, arrow keys)</span>
      <UxTabs
        label="Feed"
        idPrefix="kit-feed"
        value={tab}
        onChange={setTab}
        items={[{ id: 'foryou', label: 'For you' }, { id: 'following', label: 'Following' }, { id: 'blogs', label: 'Blogs', icon: 'blog' }]}
      />
      <div {...tabPanelProps('kit-feed', tab)} className="ux-help">Panel: {tab}</div>
      <div className="ux-kit-row" style={{ marginTop: 20 }}>
        <div>
          <span className="ux-kit-label">Link tabs (aria-current)</span>
          <UxTabs label="Leaderboard" value="players" items={[{ id: 'war', label: 'Fandom war', href: '/leaderboard' }, { id: 'players', label: 'Players', href: '/leaderboard?tab=players' }, { id: 'creators', label: 'Creators', href: '/leaderboard?tab=creators' }]} />
        </div>
      </div>
      <div className="ux-kit-row" style={{ marginTop: 20 }}>
        <div>
          <span className="ux-kit-label">Segmented (aria-pressed)</span>
          <Segmented label="Sort" value={sort} onChange={setSort} options={[{ value: 'trending', label: 'Trending' }, { value: 'newest', label: 'Newest' }, { value: 'played', label: 'Most played' }, { value: 'rated', label: 'Top rated' }]} />
        </div>
      </div>
      <div className="ux-kit-row" style={{ marginTop: 20 }}>
        <UxDropdown label="Type" value={type} options={TYPES} onChange={setType} />
        <UxDropdown label="Level" value={level} options={LEVELS} onChange={setLevel} />
      </div>
      <div className="ux-kit-row">
        <Chips label="Active filters">
          {type ? <Chip filter onRemove={() => setType(null)}>{TYPES.find((t) => t.value === type)?.label ?? type}</Chip> : null}
          {level ? <Chip filter onRemove={() => setLevel(null)}>{LEVELS.find((t) => t.value === level)?.label ?? level}</Chip> : null}
          <Chip pressed={chip} onClick={() => setChip(!chip)}>Toggle chip</Chip>
          <Chip>Static chip</Chip>
          <Chip href="/groups" icon="users">Link chip</Chip>
        </Chips>
      </div>
    </div>
  );
}

export function KitForms(): React.ReactElement {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [rights, setRights] = useState(true);
  const [title, setTitle] = useState('');
  return (
    <div data-kit="forms" style={{ maxWidth: 560 }}>
      <UxField label="Title" hint="5+ characters" htmlFor="kit-title" help="Shown on the card and the quiz page." error={title && title.length < 5 ? 'Use at least 5 characters.' : null}>
        <input id="kit-title" className="ux-inp" placeholder="Stray Kids: District 9 Quiz" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={title.length > 0 && title.length < 5 ? true : undefined} />
      </UxField>
      <UxField label="Text" htmlFor="kit-text">
        <textarea id="kit-text" className="ux-inp" placeholder="Say more" />
      </UxField>
      <UxCheckbox checked={rights} onChange={setRights}>I made this cover or have the right to use it.</UxCheckbox>
      <div className="ux-kit-row" style={{ marginTop: 20 }}>
        <UxSwitch checked={on} onChange={setOn} label="Kit switch on" /> <span className="ux-help" style={{ margin: 0 }}>on</span>
        <UxSwitch checked={off} onChange={setOff} label="Kit switch off" /> <span className="ux-help" style={{ margin: 0 }}>off</span>
      </div>
    </div>
  );
}

export function KitPopovers(): React.ReactElement {
  const risk = streakView(12, utcDay(-1));
  const played = streakView(13, utcDay(0));
  const profile: MeProfile = { username: 'kit_sample', display_name: null, avatar_url: null, avatar_bg: '#ED93B1', avatar_text: '#FFFFFF', xp: 820 };
  return (
    <div className="ux-kit-grid2 ux-kit-static" data-kit="popovers">
      {risk ? <div><span className="ux-kit-label">Streak popover, at risk</span><div className="ux-pop ux-layer ux-streakpop" role="dialog" aria-label="Streak at risk (static)"><StreakBody v={risk} close={noop} /></div></div> : null}
      {played ? <div><span className="ux-kit-label">Streak popover, played today</span><div className="ux-pop ux-layer ux-streakpop" role="dialog" aria-label="Streak played (static)"><StreakBody v={played} close={noop} /></div></div> : null}
      <div>
        <span className="ux-kit-label">Bell panel frame (content = P11 slot)</span>
        <div className="ux-pop ux-layer ux-bellpop" role="dialog" aria-label="Notifications (static)">
          <div className="ux-pop-h"><b>Notifications</b></div>
          <BellPanel unread={4} onClose={noop} />
          <div className="ux-msep" />
          <Link className="ux-mi" href="/notifications">See all notifications<Icon name="right" size="sm" style={{ marginLeft: 'auto' }} /></Link>
        </div>
      </div>
      <div>
        <span className="ux-kit-label">Account menu</span>
        <div className="ux-pop ux-layer" role="dialog" aria-label="Account (static)"><AccountBody profile={profile} close={noop} onSignOut={noop} /></div>
      </div>
      <div>
        <span className="ux-kit-label">Streak pill states</span>
        <div className="ux-kit-row">
          <span className="ux-streak is-risk"><Icon name="flame" />12</span>
          <span className="ux-streak"><Icon name="flame" />13</span>
          <span className="ux-ib" style={{ position: 'relative' }}><Icon name="bell" /><span className="ux-bell-dot" /></span>
        </div>
      </div>
    </div>
  );
}

export function KitSheets(): React.ReactElement {
  const openSignIn = useSignIn();
  const openSearch = useUxSearch();
  const toast = useUxToast();
  const [share, setShare] = useState(false);
  const [header, setHeader] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const shareProps = {
    title: 'Share your score',
    preview: { image: '/idols/BTS.jpg', line1: '8/8 on Ultimate BTS era quiz', line2: 'You beat 96% of players · #95 of 2,375' },
    url: 'https://kpopquiz.org/q/ultimate-bts-era-quiz-only-real-armys-survive',
    text: 'I got 8/8 on Ultimate BTS era quiz',
    challenge: { url: 'https://kpopquiz.org/c/7KQ2PX' },
  };
  return (
    <div data-kit="sheets">
      <div className="ux-kit-row">
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="signin" onClick={() => openSignIn({ title: 'Sign in to publish', sub: 'Your quiz needs an owner so you can edit it and see its plays. Your draft is kept.', action: { id: 'kit-demo' } })}>Open sign-in</button>
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="share" onClick={() => setShare(true)}>Open share</button>
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="header" onClick={() => setHeader(true)}>Open header picture</button>
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="confirm" onClick={() => setConfirm(true)}>Open confirm</button>
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="search" onClick={openSearch}>Open search</button>
      </div>
      <ShareSheet open={share} onClose={() => setShare(false)} {...shareProps} onStoryImage={() => toast('Saves a 1080 x 1920 story image')} />
      <HeaderPictureSheet
        open={header}
        onClose={() => setHeader(false)}
        onFile={(f) => { toast(`Kit: would upload ${f.name}`); setHeader(false); }}
        onLink={() => { toast('Kit: would send the link to the server fetch route'); setHeader(false); }}
        onThemeColour={() => { toast('Kit: would use the theme colour'); setHeader(false); }}
      />
      <ConfirmSheet
        open={confirm}
        title="Leave this quiz?"
        body="You answered 3 of 8. You can pick it up later from Continue playing."
        confirmLabel="Leave"
        cancelLabel="Keep playing"
        onConfirm={() => { setConfirm(false); toast('Kit: left'); }}
        onCancel={() => setConfirm(false)}
      />
      <div className="ux-kit-grid2 ux-kit-static" style={{ marginTop: 24 }}>
        <div><span className="ux-kit-label">Sign-in sheet (inline)</span><SignInSheet inline open onClose={noop} request={{ title: 'Sign in to publish', sub: 'Your quiz needs an owner so you can edit it and see its plays. Your draft is kept.' }} /></div>
        <div><span className="ux-kit-label">Share sheet (inline)</span><ShareSheet inline open onClose={noop} {...shareProps} onStoryImage={noop} /></div>
        <div><span className="ux-kit-label">Header picture sheet (inline)</span><HeaderPictureSheet inline open onClose={noop} onFile={noop} onLink={noop} onThemeColour={noop} /></div>
        <div><span className="ux-kit-label">Confirm sheet (inline)</span><ConfirmSheet inline open title="Leave this quiz?" body="You answered 3 of 8. You can pick it up later from Continue playing." confirmLabel="Leave" cancelLabel="Keep playing" onConfirm={noop} onCancel={noop} /></div>
      </div>
    </div>
  );
}

export function KitFeedback(): React.ReactElement {
  const toast = useUxToast();
  const announce = useAnnounce();
  return (
    <div data-kit="feedback">
      <div className="ux-kit-row">
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="toast" onClick={() => toast('Link copied')}>Show a toast</button>
        <button type="button" className="ux-btn ux-btn-ghost" data-kit-open="announce" onClick={() => announce('Quiz finished. 8 out of 8.')}>Announce (screen readers)</button>
      </div>
      <div className="ux-kit-static" style={{ marginTop: 16 }}><div className="ux-toast is-shown" aria-hidden="true">Signed in. Your 8/8 is saved</div></div>
    </div>
  );
}
