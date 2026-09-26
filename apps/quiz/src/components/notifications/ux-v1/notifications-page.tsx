'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { Segmented } from '@/components/ux-v1/segmented';
import { UxPopover } from '@/components/ux-v1/popover';
import { useUxToast } from '@/components/ux-v1/toast';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { setUnread, useUnreadCount } from '@/lib/notifications-store';
import { streakView } from '@/lib/ux-v1/a0/streak';
import {
  applyRead, applyRemove, dismissNotification, fetchNotifications, markAllRead, markOneRead, muteQuiz, onNotificationEvents,
} from '@/lib/ux-v1/p11/actions';
import {
  P11_FILTERS, compactAgo, groupByDay, iconOf, matchesFilter, spokenAgo, streakRow, targetOf, unreadLine,
} from '@/lib/ux-v1/p11/notifications';

import type { P11Filter, P11Notification } from '@/lib/ux-v1/p11/notifications';

// P11 notifications page (DESIGN-SPEC 15.2 + 16.7 "Notifications (720)", prototype
// view #notifs, state `notifications`). The live notifications center re-skinned:
// the same reads and writes (lib/ux-v1/p11/actions.ts: GET /api/notifications,
// POST /api/notifications/mark-read, DELETE /api/notifications, POST
// /api/notifications/prefs) and the same shared unread store as the nav bell.
// Header (H1, "4 unread", Mark all read), filters All / Your quizzes / Social /
// Achievements, the pinned streak row, rows grouped Today / Yesterday / Earlier
// (unread = pink dot + bold title, the whole row opens its target and marks it read),
// Load more, the retention line + Notification settings.

const PAGE = 50;


function StreakRow(): React.ReactElement | null {
  const me = useUxMe();
  const p = me?.profile;
  const row = streakRow(p ? streakView(p.daily_streak, p.last_daily_date) : null);
  if (!row) return null;
  return (
    <div className={`p11-streak is-${row.state}`} data-p11="streak">
      <Icon name={row.state === 'saved' ? 'check' : 'flame'} />
      <span className="p11-streak-g">
        <b>{row.title}</b>
        <span>{row.sub}</span>
      </span>
      {row.action ? <Link href={row.action.href} className="ux-btn ux-btn-primary ux-btn-sm">{row.action.label}</Link> : null}
    </div>
  );
}

function RowMenu({ n, onDismiss, onMute }: { n: P11Notification; onDismiss: () => void; onMute: (() => void) | null }): React.ReactElement {
  return (
    <div className="p11-rowact">
      <UxPopover
        menu
        label="Notification actions"
        className="p11-rowpop"
        trigger={(p) => (
          <button type="button" className="p11-more" {...p} aria-label={`More actions: ${n.title}`}>
            <Icon name="dots" size="sm" />
          </button>
        )}
      >
        {(close) => (
          <>
            {!n.is_read ? <button type="button" role="menuitem" className="ux-mi" onClick={() => { close(); markOneRead(n); }}><Icon name="check" />Mark as read</button> : null}
            {onMute ? <button type="button" role="menuitem" className="ux-mi" onClick={() => { close(); onMute(); }}><Icon name="mute" />Mute this quiz</button> : null}
            <button type="button" role="menuitem" className="ux-mi" onClick={() => { close(); onDismiss(); }}><Icon name="x" />Dismiss</button>
          </>
        )}
      </UxPopover>
    </div>
  );
}

function Row({ n, now, onDismiss, onMute }: { n: P11Notification; now: Date; onDismiss: () => void; onMute: (() => void) | null }): React.ReactElement {
  const t = targetOf(n);
  const unread = !n.is_read;
  const cls = `p11-nrow${unread ? ' is-unread' : ''}`;
  const inner = (
    <>
      <span className="p11-ud" aria-hidden="true" />
      <span className="p11-ni" aria-hidden="true"><Icon name={iconOf(n.type)} /></span>
      <span className="p11-grow">
        <span className="p11-t">{unread ? <span className="ux-sr">Unread: </span> : null}{n.title}</span>
        {n.body ? <span className="p11-b">{n.body}</span> : null}
      </span>
      <span className="p11-tm"><span aria-hidden="true">{compactAgo(n.created_at, now)}</span><span className="ux-sr">, {spokenAgo(n.created_at, now)}</span></span>
    </>
  );
  // Opening a row marks it read (the live center's markOneRead), whatever the click.
  const open = (): void => markOneRead(n);
  let body: React.ReactElement;
  if (t?.external) body = <a className={cls} href={t.href} target="_blank" rel="noopener noreferrer" onClick={open} data-p11-row={n.id}>{inner}</a>;
  else if (t) body = <Link className={cls} href={t.href} onClick={open} data-p11-row={n.id}>{inner}</Link>;
  else if (unread) body = <button type="button" className={cls} onClick={open} data-p11-row={n.id}>{inner}</button>;
  else body = <div className={cls} data-p11-row={n.id}>{inner}</div>;
  return (
    <li className="p11-nli">
      {body}
      <RowMenu n={n} onDismiss={onDismiss} onMute={onMute} />
    </li>
  );
}

function Skeleton(): React.ReactElement {
  return (
    <div className="p11-skel" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <div className="p11-skel-row" key={k}><i className="p11-skel-ni" /><span><i /><i /></span></div>
      ))}
    </div>
  );
}

/** The notifications page body (under UxPage width="text"). Signed-in only: the
 *  route redirects guests to /login, exactly like the live page. */
export function UxNotifications(): React.ReactElement {
  const unread = useUnreadCount();
  const toast = useUxToast();
  const [items, setItems] = useState<P11Notification[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<P11Filter>('all');
  const [now, setNow] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void fetchNotifications(PAGE).then((p) => {
      if (!live) return;
      setNow(new Date());
      if (!p) { setStatus('failed'); return; }
      setItems(p.notifications);
      setHasMore(p.hasMore);
      setUnread(p.unreadCount);
      setStatus('ready');
    });
    return () => { live = false; };
  }, [attempt]);

  // Keep the ages fresh while the page stays open.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Reads and removals made anywhere (this page, the bell panel).
  useEffect(() => onNotificationEvents(
    (d) => setItems((prev) => applyRead(prev, d)),
    (d) => setItems((prev) => applyRemove(prev, d)),
  ), []);

  const shown = useMemo(() => items.filter((n) => matchesFilter(n, filter)), [items, filter]);
  const groups = useMemo(() => (now ? groupByDay(shown, now) : []), [shown, now]);

  const loadMore = async (): Promise<void> => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const p = await fetchNotifications(PAGE, items.length);
    if (p) {
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...p.notifications.filter((x) => !seen.has(x.id))];
      });
      setHasMore(p.hasMore);
    } else {
      toast('Could not load more notifications. Try again.');
    }
    setLoadingMore(false);
  };

  // After a row leaves the list, focus the row that takes its place.
  const focusAfter = (id: string): void => {
    const ids = shown.map((x) => x.id);
    const i = ids.indexOf(id);
    const next = ids[i + 1] ?? ids[i - 1];
    window.requestAnimationFrame(() => {
      const el = next ? document.querySelector<HTMLElement>(`[data-p11-row="${next}"]`) : null;
      (el ?? document.querySelector<HTMLElement>('.p11-nh h1'))?.focus();
    });
  };

  const onMarkAll = (): void => {
    markAllRead();
    toast('All marked as read');
  };

  return (
    <div className="p11-notifs" data-p11="notifications">
      <header className="ux-ph p11-nh">
        <div>
          <h1 tabIndex={-1}>Notifications</h1>
          <p className="p11-sub">{status === 'ready' ? unreadLine(unread) : ' '}</p>
        </div>
        {status === 'ready' && unread > 0 ? <button type="button" className="ux-lnk" onClick={onMarkAll}>Mark all read</button> : null}
      </header>

      <Segmented className="p11-seg" label="Filter" options={P11_FILTERS} value={filter} onChange={setFilter} />

      <StreakRow />

      {status === 'loading' ? <Skeleton /> : null}
      {status === 'failed' ? (
        <div className="ux-empty p11-empty" role="alert">
          <b>Could not load your notifications</b>
          Check your connection and try again.
          <div><button type="button" className="ux-btn ux-btn-ghost" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1); }}>Try again</button></div>
        </div>
      ) : null}
      {status === 'ready' && shown.length === 0 ? (
        <div className="ux-empty p11-empty">
          <b>Nothing here yet</b>
          New activity shows up here.
        </div>
      ) : null}
      {status === 'ready' && shown.length > 0 && now ? (
        <div className="p11-list">
          {groups.map((g) => {
            const hid = `p11-g-${g.label.toLowerCase()}`;
            return (
              <section key={g.label} aria-labelledby={hid}>
                <h2 className="p11-ngroup" id={hid}>{g.label}</h2>
                <ul aria-labelledby={hid}>
                  {g.items.map((n) => (
                    <Row
                      key={n.id}
                      n={n}
                      now={now}
                      onDismiss={() => { focusAfter(n.id); dismissNotification(n); toast('Notification dismissed'); }}
                      onMute={n.quiz_id ? () => {
                        const quizId = n.quiz_id as string;
                        focusAfter(n.id);
                        muteQuiz(quizId, items.filter((x) => x.quiz_id === quizId));
                        toast('Quiz muted');
                      } : null}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
      {status === 'ready' && hasMore ? (
        <div className="p11-more-wrap">
          <button type="button" className="ux-btn ux-btn-ghost" onClick={() => void loadMore()} disabled={loadingMore} aria-busy={loadingMore || undefined}>
            {loadingMore ? 'Loading' : 'Load more'}
          </button>
        </div>
      ) : null}

      <p className="ux-help p11-foot">
        Read notifications older than 60 days are cleared. <Link className="ux-lnk" href="/settings">Notification settings</Link>
      </p>
    </div>
  );
}
