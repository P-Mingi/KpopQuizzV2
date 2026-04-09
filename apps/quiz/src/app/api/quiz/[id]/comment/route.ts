import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { notifyComment } from '@/lib/notifications';

import type { NextRequest } from 'next/server';

const MAX_COMMENT_LENGTH = 200;
const DEFAULT_LIMIT = 20;

interface CommentRow {
  id: string;
  quiz_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

/**
 * GET /api/quiz/[id]/comment?limit=20
 * Returns the most recent comments, newest first. Max 20 by default.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json({ comments: [] });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam), 100) : DEFAULT_LIMIT;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quiz_comments')
    .select('id, quiz_id, user_id, username, content, created_at')
    .eq('quiz_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ comments: [] });
  }

  return NextResponse.json({ comments: (data ?? []) as CommentRow[] });
}

/**
 * POST /api/quiz/[id]/comment
 * Body: { content: string } (trimmed, max 200 chars)
 * Inserts a comment and fires a `comment` notification to the creator.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json(
      { error: 'Community features are not yet enabled' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { content } = body as Record<string, unknown>;
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const trimmed = content.trim().slice(0, MAX_COMMENT_LENGTH);
  if (trimmed.length === 0) {
    return NextResponse.json({ error: 'Comment is empty' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const username = (profile?.username as string | undefined) ?? 'anonymous';

  const { data: comment, error: insertError } = await supabase
    .from('quiz_comments')
    .insert({
      quiz_id: id,
      user_id: user.id,
      username,
      content: trimmed,
    })
    .select('id, quiz_id, user_id, username, content, created_at')
    .single();

  if (insertError || !comment) {
    console.error('Failed to insert comment:', insertError);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }

  // Fire a notification to the creator (service role bypasses RLS).
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('creator_id')
    .eq('id', id)
    .single();

  if (quiz && quiz.creator_id && quiz.creator_id !== user.id) {
    await notifyComment({
      creatorId: quiz.creator_id as string,
      quizId: id,
      username,
      content: trimmed,
    });
  }

  return NextResponse.json({ comment: comment as CommentRow });
}

/**
 * DELETE /api/quiz/[id]/comment?commentId=xxx
 * Deletes the caller's own comment (RLS enforces ownership).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json(
      { error: 'Community features are not yet enabled' },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const commentId = url.searchParams.get('commentId');
  if (!commentId) {
    return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase
    .from('quiz_comments')
    .delete()
    .match({ id: commentId, quiz_id: id, user_id: user.id });

  if (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
