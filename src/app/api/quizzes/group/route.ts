import { NextResponse } from 'next/server';

import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const groupId = parseInt(searchParams.get('groupId') ?? '0', 10);
  const tab = (searchParams.get('tab') ?? 'popular') as 'popular' | 'newest' | 'most_liked' | 'hardest';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  try {
    const quizzes = await getQuizzesByGroup(groupId, tab, offset, 10);
    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error('Failed to fetch group quizzes:', err);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}
