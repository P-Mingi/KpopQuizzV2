import Link from 'next/link';

import { isUxV12 } from '@/lib/ux-v12';

import { Icon } from './icon';
import { UxAvatar } from './avatar';
import { PersonName } from './person-name';
import { TeamNote } from './team';

import type { UxIconName } from './icon';
import type { PersonFlair } from './person-name';

export type PostKind = 'thread' | 'blog' | 'debate' | 'challenge';

const KIND: Record<PostKind, { label: string; icon: UxIconName }> = {
  thread: { label: 'Thread', icon: 'msg' },
  blog: { label: 'Blog', icon: 'blog' },
  debate: { label: 'Debate', icon: 'debate' },
  challenge: { label: 'Challenge', icon: 'target' },
};

interface PostCardProps {
  kind: PostKind;
  /** Extra chip text after the kind: "BTS", "BLACKPINK · 5 min read". */
  chipDetail?: string;
  title: string;
  href: string;
  author: PersonFlair & { avatarUrl?: string | null; href?: string };
  /** "Lv 9 · 20 min ago" (real level and time). */
  meta?: string;
  /** Excerpt under the title (muted, 62ch). */
  excerpt?: React.ReactNode;
  /** Type-specific body: debate options, blog cover grid, challenge replies... */
  children?: React.ReactNode;
  /** Action row (<PostAction> buttons: like, replies, take it, share). */
  actions?: React.ReactNode;
  titleAs?: 'h2' | 'h3';
  className?: string;
  /** v12 editorial account (SYSTEM.md 5.6): team avatar, Team pill after the name,
   *  no fan flair. Pass the time alone as `meta` (a team account has no level).
   *  Ignored unless the v12 flag is on. */
  isTeam?: boolean;
  /** With `isTeam`: the "Editorial account of the KpopQuiz team..." line under the
   *  author (the post itself and the profile show it; the feed card does not). */
  teamNote?: boolean;
}

/**
 * Community post card (17.1 / 17.7): bordered box, radius 20, padding 24/26 (20/18
 * on phones), 16px between posts. Author with identity flair (PersonName), the
 * pink-soft type chip, the title as a real link, then the slots. Server component.
 */
export function PostCard({ kind, chipDetail, title, href, author, meta, excerpt, children, actions, titleAs: T = 'h2', className, isTeam, teamNote }: PostCardProps): React.ReactElement {
  const k = KIND[kind];
  const team = Boolean(isTeam) && isUxV12();
  return (
    <article className={['ux-post', className ?? ''].filter(Boolean).join(' ')}>
      <div className="ux-ph2">
        {team ? <UxAvatar name={author.name} size={36} team /> : <UxAvatar name={author.name} src={author.avatarUrl} size={36} />}
        <span>
          {team ? <PersonName name={author.name} href={author.href} isTeam /> : <PersonName {...author} />}
          {meta ? <span className="ux-ph2-lv"> · {meta}</span> : null}
        </span>
      </div>
      {team && teamNote ? <TeamNote surface="post" /> : null}
      <span className="ux-ptype"><Icon name={k.icon} />{k.label}{chipDetail ? ` · ${chipDetail}` : ''}</span>
      <T className="ux-ptt"><Link href={href}>{title}</Link></T>
      {excerpt ? <p className="ux-pbd">{excerpt}</p> : null}
      {children}
      {actions ? <div className="ux-pacts">{actions}</div> : null}
    </article>
  );
}

/** Score chip (challenge posts, replies and comments with a score: "7/8"). */
export function ScoreChip({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="ux-chsc">{children}</span>;
}

/** Row of reply scores under a challenge post: [{ score: '8/8', name }], "+14 more". */
export function ReplyScores({ items, more }: { items: { score: string; name: React.ReactNode }[]; more?: number | undefined }): React.ReactElement {
  return (
    <div className="ux-reps">
      {items.map((r, i) => <span key={i}><b>{r.score}</b> {r.name}</span>)}
      {more ? <span>+{more} more</span> : null}
    </div>
  );
}

interface PostActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  icon: UxIconName;
  /** Visible text or count. */
  children?: React.ReactNode;
  /** Toggle state (likes): aria-pressed, pink heart when true. */
  pressed?: boolean;
  /** Push to the right edge (share). */
  end?: boolean;
}

/** Post action button (36px): heart + count, replies, "Take it", share. */
export function PostAction({ icon, children, pressed, end, style, ...rest }: PostActionProps): React.ReactElement {
  return (
    <button type="button" className="ux-pa2" aria-pressed={pressed} style={end ? { marginLeft: 'auto', ...style } : style} {...rest}>
      <Icon name={icon} />{children}
    </button>
  );
}
