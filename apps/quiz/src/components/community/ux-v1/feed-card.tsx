import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { PostCard, ReplyScores, ScoreChip } from '@/components/ux-v1/post-card';
import { closesIn, comma, leaderIndex, levelLine, percents, plural } from '@/lib/ux-v1/p8/format';

import { LikeButton, ShareButton } from './actions';

import type { DebateData, FeedPost, P8Person } from '@/lib/ux-v1/p8/types';

// One feed card (DESIGN-SPEC 13.1 + 17.7): A0's PostCard (bordered box, flair name,
// pink-soft type chip, the title as a real link) with the per-type body. Rendered by
// the client feed island, so no server-only import here.

/** The author PostCard shows: a person, or the site itself for the daily debate. */
export function cardAuthor(p: P8Person | null): { name: string; accent?: string | null; font?: string | null; bias?: string | null; avatarUrl?: string | null; href?: string } {
  if (!p) return { name: 'KpopQuiz' };
  return { name: p.name, accent: p.accent, font: p.font, bias: p.bias, avatarUrl: p.avatarUrl, ...(p.href ? { href: p.href } : {}) };
}

/** "Lv 9 · 20 min ago", "Daily debate · 4 days ago", "3 hours ago". */
export function cardMeta(post: Pick<FeedPost, 'author' | 'ago' | 'debate'>): string {
  if (!post.author && post.debate?.daily) return `Daily debate · ${post.ago}`;
  const lv = levelLine(post.author);
  return lv ? `${lv} · ${post.ago}` : post.ago;
}

/** Bars with percents, the leader in pink (prototype .dopts). */
export function DebateBars({ debate, label }: { debate: DebateData; label: string }): React.ReactElement {
  const counts = debate.options.map((o) => o.votes);
  const pct = percents(counts);
  const lead = leaderIndex(counts);
  return (
    <div className="p8-dopts" role="list" aria-label={label}>
      {debate.options.map((o, i) => (
        <div key={i} className={`p8-dopt${i === lead ? ' is-win' : ''}`} role="listitem" aria-label={`${o.label}: ${pct[i]}%, ${plural(o.votes, 'vote')}`}>
          <i style={{ width: `${pct[i]}%` }} aria-hidden="true" />
          <span aria-hidden="true">{o.label}</span>
          <b aria-hidden="true">{pct[i]}%</b>
        </div>
      ))}
    </div>
  );
}

/** "1,902 votes · closes in 2 days" / "2 votes · closed". */
export function debateLine(d: DebateData, now?: number): string {
  const close = d.open ? closesIn(d.closesAt, now) : 'closed';
  return [plural(d.total, 'vote'), close].filter(Boolean).join(' · ');
}

function shareLine(post: FeedPost): string {
  return ['Community', post.group?.name].filter(Boolean).join(' · ');
}

export function FeedCard({ post }: { post: FeedPost }): React.ReactElement {
  const author = cardAuthor(post.author);
  const meta = cardMeta(post);
  const group = post.group?.name;
  const chip = group ? { chipDetail: group } : {};
  const replies = (
    <Link href={`${post.href}#replies`} className="ux-pa2" aria-label={`${plural(post.replies, 'reply', 'replies')}`}>
      <Icon name="msg" />{comma(post.replies)}
    </Link>
  );
  const heart = post.likes === null ? null : (
    <LikeButton type={post.kind === 'blog' ? 'essay' : post.kind === 'debate' && post.debate?.daily ? 'daily_debate' : post.kind} id={post.key} count={post.likes} />
  );
  const share = <ShareButton path={post.href} title={post.title} line2={shareLine(post)} image={post.blog?.coverUrl ?? null} />;

  if (post.kind === 'blog' && post.blog) {
    const b = post.blog;
    return (
      <PostCard
        kind="blog" className="p8-card p8-card-blog" chipDetail={[group, `${b.readingMin} min read`].filter(Boolean).join(' · ')}
        title={post.title} href={post.href} author={author} meta={meta} excerpt={post.excerpt ?? undefined}
        actions={<>{heart}{replies}{share}</>}
      >
        <Link href={post.href} className="p8-bcov" aria-label={`Open the blog: ${post.title}`} tabIndex={-1}>
          {b.coverUrl
            // eslint-disable-next-line @next/next/no-img-element -- public/idols photos and album covers, lazy, fixed 200 box
            ? <img src={b.coverUrl} alt="" loading="lazy" style={{ objectPosition: b.coverFocal }} />
            : <span className="p8-bcov-fb" aria-hidden="true">{group ?? 'Blog'}</span>}
        </Link>
      </PostCard>
    );
  }

  if (post.kind === 'debate' && post.debate) {
    return (
      <PostCard
        kind="debate" className="p8-card" {...chip} title={post.title} href={post.href} author={author} meta={meta}
        excerpt={post.excerpt ?? undefined} actions={<>{heart}{replies}{share}</>}
      >
        <DebateBars debate={post.debate} label={`Results: ${post.title}`} />
        <p className="p8-help">{debateLine(post.debate)}</p>
      </PostCard>
    );
  }

  if (post.kind === 'challenge' && post.challenge) {
    const c = post.challenge;
    return (
      <PostCard
        kind="challenge" className="p8-card" {...chip} title={post.title} href={post.href} author={author} meta={meta}
        excerpt={<><ScoreChip>{c.score}/{c.total}</ScoreChip>{post.excerpt ?? ''}</>}
        actions={(
          <>
            {heart}{replies}
            {c.quiz ? <Link href={`/q/${c.quiz.slug}`} className="ux-pa2"><Icon name="play" />Take it</Link> : null}
            {share}
          </>
        )}
      >
        {c.replyScores.length ? <ReplyScores items={c.replyScores} more={c.moreReplies || undefined} /> : null}
      </PostCard>
    );
  }

  return (
    <PostCard
      kind="thread" className="p8-card" {...chip} title={post.title} href={post.href} author={author} meta={meta}
      excerpt={post.excerpt ?? undefined} actions={<>{heart}{replies}{share}</>}
    />
  );
}
