import Link from 'next/link';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { Icon } from '@/components/ux-v1/icon';
import { UxRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { comma, levelLine, plural } from '@/lib/ux-v1/p8/format';

import { FollowButton, LikeButton, ReportButton, ShareButton } from './actions';
import { cardMeta } from './feed-card';
import { DailyDebateVote, FanDebateVote } from './post-debate';
import { Replies } from './replies';

import type { P8Post } from '@/lib/ux-v1/p8/post';
import type { FeedPost } from '@/lib/ux-v1/p8/types';

// The post view (DESIGN-SPEC 13.4 + 16.7 Post; prototype #postview): crumb, author
// with flair + Follow, the title as the page's one H1, the body per type (blog cover
// max 480 wide, debate vote then results, challenge quiz card with the score to
// beat), the actions (heart, replies, share, report), the replies, then "More from
// the community". Server component; the controls are client islands.

const KIND_LABEL = { thread: 'Thread', blog: 'Blog', debate: 'Debate', challenge: 'Challenge' } as const;

function moreSub(p: FeedPost): string {
  if (p.kind === 'blog') return ['Blog', p.blog ? `${p.blog.readingMin} min read` : null, p.replies ? plural(p.replies, 'reply', 'replies') : null].filter(Boolean).join(' · ');
  if (p.kind === 'debate') return ['Debate', p.debate ? plural(p.debate.total, 'vote') : null].filter(Boolean).join(' · ');
  return [KIND_LABEL[p.kind], plural(p.replies, 'reply', 'replies')].join(' · ');
}

function replyContext(post: P8Post, fandom: string | null): { placeholder: string; chip: string | null } {
  if (post.kind === 'challenge' && post.challenge) return { placeholder: 'Reply with your score', chip: `Their score: ${post.challenge.score}/${post.challenge.total}` };
  if (post.kind === 'debate') return { placeholder: 'Reply', chip: null };
  return { placeholder: 'Write a reply', chip: fandom ? `Replying in ${fandom}` : null };
}

export function PostView({ post, more, likesLive }: { post: P8Post; more: FeedPost[]; likesLive: boolean }): React.ReactElement {
  const a = post.author;
  const group = post.group;
  const meta = a ? [levelLine(a, true), post.ago].filter(Boolean).join(' · ') : cardMeta(post);
  const ctx = replyContext(post, group && group.slug !== 'general-kpop' ? group.name : null);
  const heart = post.likes === null ? null : <LikeButton type={post.likeType} id={post.key} count={post.likes} />;

  return (
    <>
      <article className="p8-pv" aria-labelledby="p8-post-t">
        <nav className="ux-crumb" aria-label="Breadcrumb">
          <Link href="/community">Community</Link>
          <span className="p8-sep" aria-hidden="true">/</span>
          {group ? <Link href={`/${group.slug}-quiz`}>{group.name}</Link> : <span>All groups</span>}
          <span className="p8-sep" aria-hidden="true">/</span>
          <span aria-current="page">{KIND_LABEL[post.kind]}</span>
        </nav>

        <div className="p8-author">
          <UxAvatar name={a?.name ?? 'KpopQuiz'} src={a?.avatarUrl ?? null} size={36} />
          <span className="p8-author-t">
            {a ? <PersonName name={a.name} accent={a.accent} font={a.font} bias={a.bias} href={a.href ?? undefined} /> : <b className="ux-who">KpopQuiz</b>}
            <span className="p8-lv"> · {meta}</span>
          </span>
          {a?.username ? <span className="p8-follow"><FollowButton username={a.username} /></span> : null}
        </div>

        <h1 className="p8-post-t" id="p8-post-t" tabIndex={-1}>{post.title}</h1>

        {post.blog?.coverUrl ? (
          <div className="p8-post-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- the blog's own cover or its group photo (public/idols), max 480 wide, no upscaling */}
            <img src={post.blog.coverUrl} alt={group ? `${group.name}` : ''} style={{ objectPosition: post.blog.coverFocal }} />
          </div>
        ) : null}

        {post.html ? <div className="p8-post-b" dangerouslySetInnerHTML={{ __html: post.html }} /> : null}
        {post.paragraphs.length ? <div className="p8-post-b">{post.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div> : null}

        {post.kind === 'debate' && post.debate ? (
          post.debate.daily
            ? <DailyDebateVote date={post.key} question={post.title} sides={[post.debate.options[0]?.label ?? '', post.debate.options[1]?.label ?? '']} votes={[post.debate.options[0]?.votes ?? 0, post.debate.options[1]?.votes ?? 0]} open={post.debate.open} />
            : <FanDebateVote id={Number(post.key)} question={post.title} debate={post.debate} />
        ) : null}

        {post.kind === 'challenge' && post.challenge?.quiz ? (
          <Link href={`/q/${post.challenge.quiz.slug}`} className="p8-nextq">
            <span className="ux-thumb" aria-hidden="true">
              {post.challenge.quiz.coverUrl || groupPhotoUrl(group?.slug)
                // eslint-disable-next-line @next/next/no-img-element -- 96 x 72 quiz thumb
                ? <img src={(post.challenge.quiz.coverUrl ?? groupPhotoUrl(group?.slug))!} alt="" loading="lazy" />
                : <Icon name="play" />}
            </span>
            <span className="p8-grow">
              <span className="ux-rs" style={{ margin: '0 0 2px' }}>Beat {a?.username ?? a?.name ?? 'them'}: {post.challenge.score}/{post.challenge.total}</span>
              <span className="ux-rt">{post.challenge.quiz.title}</span>
              <span className="ux-rs">{[post.challenge.quiz.type, post.challenge.quiz.difficulty, `${comma(post.challenge.quiz.plays)} plays`].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="p8-go" aria-hidden="true"><Icon name="play" /></span>
          </Link>
        ) : null}

        <div className="ux-pacts p8-pacts">
          {heart}
          <a href="#replies" className="ux-pa2" aria-label={plural(post.commentCount, 'reply', 'replies')}><Icon name="msg" />{comma(post.commentCount)}</a>
          <ShareButton path={post.href} title={post.title} line2={['Community', group?.name].filter(Boolean).join(' · ')} image={post.blog?.coverUrl ?? null} />
          {post.openingCommentId ? <ReportButton commentId={post.openingCommentId} /> : null}
        </div>
      </article>

      <section className="ux-sec" id="replies" aria-labelledby="p8-rep-h">
        <Replies post={post} likesLive={likesLive} chip={ctx.chip} placeholder={ctx.placeholder} />
      </section>

      {more.length ? (
        <section className="ux-sec" aria-labelledby="p8-more-h">
          <div className="ux-sec-h">
            <h2 id="p8-more-h">More from the community</h2>
            <Link href="/community" className="ux-lnk">Open community</Link>
          </div>
          <div className="ux-rows">
            {more.map((p) => {
              const photo = groupPhotoUrl(p.group?.slug);
              return (
                <UxRow
                  key={`${p.kind}-${p.key}`}
                  href={p.href}
                  lead={<span className="ux-gav" aria-hidden="true" style={photo ? { backgroundImage: `url("${photo}")` } : undefined}>{photo ? null : (p.group?.name ?? 'K').charAt(0)}</span>}
                  title={p.title}
                  sub={moreSub(p)}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
