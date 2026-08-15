'use client';

import Link from 'next/link';

import { formatRelativeDate } from '@/lib/utils';

import type { NotificationRow } from '@/app/api/notifications/route';

// NotificationCard: one notification row, reused by the notifications center.
// (The old NotificationsStrip export was dead code - mounted nowhere - and was
// removed in O1 item 8.)

function Ico({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// O1 item 9: real SVG icons per type instead of ASCII letter chips.
function notificationIcon(type: NotificationRow['type']): React.ReactElement {
  switch (type) {
    case 'milestone': // trophy
      return <Ico><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></Ico>;
    case 'rating': // flame
      return <Ico><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" /></Ico>;
    case 'comment': // message
      return <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>;
    case 'admin_dm': // mail
      return <Ico><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></Ico>;
    case 'new_follower': // user-plus
      return <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></Ico>;
    case 'streak_milestone': // lightning
      return <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ico>;
    case 'group_mastered': // star
      return <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Ico>;
    case 'followed_new_quiz': // file
      return <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Ico>;
    case 'badge_earned': // award
      return <Ico><circle cx="12" cy="8" r="6" /><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" /></Ico>;
    case 'cheer': // heart
      return <Ico><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></Ico>;
    case 'battle_beaten': // crossed swords - the challenge type, styled red below
      return <Ico><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="M19 21h2v-2" /><path d="M9.5 6.5 21 18v3h-3L6.5 9.5" /></Ico>;
    default: // bell
      return <Ico><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Ico>;
  }
}

const MUTE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.9 17.9 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function NotificationCard({ notification, onMute, onDismiss, onOpen }: {
  notification: NotificationRow;
  onMute?: (quizId: string) => void;
  onDismiss?: (id: string) => void;
  onOpen?: () => void;
}): React.ReactElement {
  // W2: a challenge reads differently from every other notification. It is the one
  // type that is somebody coming FOR you, so it gets the challenge red rather than
  // the brand pink every other unread notification uses. Read challenges calm down
  // like the rest, so the inbox does not stay shouting.
  const isChallenge = notification.type === 'battle_beaten';
  const unreadChallenge = isChallenge && !notification.is_read;

  const inner = (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
        notification.is_read
          ? 'bg-surface border-default'
          : unreadChallenge
            ? 'notif-challenge'
            : 'bg-accent-bg border-accent hover:border-accent-hover'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          notification.is_read ? 'bg-elevated text-tertiary' : unreadChallenge ? 'notif-challenge-chip' : 'bg-btn text-white'
        }`}
        aria-hidden="true"
      >
        {notificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold truncate ${
          notification.is_read ? 'text-secondary' : unreadChallenge ? 'notif-challenge-title' : 'text-accent-hover'
        }`}>
          {notification.title}
        </p>
        {notification.body && <p className="text-[10px] text-ghost truncate">{notification.body}</p>}
      </div>
      <span className="text-[9px] text-ghost flex-shrink-0">{formatRelativeDate(notification.created_at)}</span>
    </div>
  );

  // The content routes to the click-through URL (admin DM, follower profile),
  // else the linked quiz. External URLs open in a new tab.
  const href = notification.link_url ?? (notification.quiz_slug ? `/q/${notification.quiz_slug}` : null);
  const external = href ? /^https?:\/\//.test(href) : false;
  const openProps = onOpen ? { onClick: onOpen } : {};
  const ariaLabel = `${notification.title}${notification.is_read ? '' : ', unread'}`;
  const linked = href
    ? external
      ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} {...openProps} className="block flex-1 min-w-0">{inner}</a>
      : <Link href={href} aria-label={ariaLabel} {...openProps} className="block flex-1 min-w-0">{inner}</Link>
    : <div className="flex-1 min-w-0">{inner}</div>;

  const showMute = onMute && notification.quiz_id;
  const showDismiss = !!onDismiss;
  if (!showMute && !showDismiss) return linked;

  // Actions ride alongside the content so the card stays one click target while
  // mute/dismiss are separate buttons (they do not trigger the link).
  return (
    <div className="flex items-stretch gap-1">
      {linked}
      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
        {showMute && (
          <button type="button" aria-label="Mute notifications for this quiz" title="Mute this quiz"
            onClick={() => onMute?.(notification.quiz_id as string)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-tertiary hover:text-accent hover:bg-elevated transition-colors cursor-pointer">
            {MUTE_ICON}
          </button>
        )}
        {showDismiss && (
          <button type="button" aria-label="Dismiss notification" title="Dismiss"
            onClick={() => onDismiss?.(notification.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-tertiary hover:text-primary hover:bg-elevated transition-colors cursor-pointer">
            {X_ICON}
          </button>
        )}
      </div>
    </div>
  );
}
