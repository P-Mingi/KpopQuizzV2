// A draft as the post it will become (/admin/editorial preview, "rendered exactly
// like the post"): the same P8Post the feed card and the post view receive once the
// draft is published (lib/ux-v1/p8/feed.ts readEditorialPosts / readFanDebates and
// post.ts editorialPost / fanDebatePost), with no heart, no vote and no reply yet.
// Pure and client safe: only type imports and the pure format helpers.

import { excerpt, paragraphs, readingMinutes } from '@/lib/ux-v1/p8/format';

import { DEFAULT_DEBATE_DAYS } from './types';

import type { P8Post } from '@/lib/ux-v1/p8/post';
import type { P8Group, P8Person } from '@/lib/ux-v1/p8/types';
import type { DraftInput, EditorialAccount } from './types';

export interface PreviewContext {
  account: Pick<EditorialAccount, 'display_name'> | null;
  group: P8Group | null;
  /** The group's photo (public/idols), a blog's cover fallback. */
  groupPhoto: string | null;
  /** The instant the preview pretends the post went live (scheduled_at, else now). */
  at: number;
  now: number;
  /** "2 hours ago" for `at` (the caller formats it with the feed's timeAgo). */
  ago: string;
}

export function teamPerson(name: string): P8Person {
  return { name, username: null, href: null, avatarUrl: null, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: false, isTeam: true };
}

export function draftToPost(d: Pick<DraftInput, 'kind' | 'title' | 'body' | 'options' | 'sources' | 'debate_days'>, ctx: PreviewContext): P8Post {
  const author = teamPerson(ctx.account?.display_name ?? 'Team');
  const at = new Date(ctx.at).toISOString();
  const base = { title: d.title, group: ctx.group, author, at, ago: ctx.ago, replies: 0, likes: null, html: null, openingCommentId: null, comments: [], commentCount: 0, replyTo: null, sources: d.sources };
  if (d.kind === 'debate') {
    const days = d.debate_days ?? DEFAULT_DEBATE_DAYS;
    return {
      ...base, kind: 'debate', key: 'preview', href: '#preview', excerpt: d.body.trim() ? excerpt(d.body, 220) : null,
      debate: { daily: false, open: true, closesAt: new Date(ctx.at + days * 86_400_000).toISOString(), comments: 0, options: (d.options ?? []).map((label) => ({ label, votes: 0 })), total: 0 },
      paragraphs: paragraphs(d.body), likeType: 'debate',
    };
  }
  const words = d.body.split(/\s+/).filter(Boolean).length;
  return {
    ...base, kind: d.kind, key: 'preview', href: '#preview', excerpt: d.body.trim() ? excerpt(d.body, d.kind === 'blog' ? 160 : 220) : null,
    ...(d.kind === 'blog' ? { blog: { coverUrl: ctx.groupPhoto, coverFocal: '50% 30%', readingMin: readingMinutes(words) } } : {}),
    paragraphs: paragraphs(d.body), likeType: 'editorial',
  };
}
