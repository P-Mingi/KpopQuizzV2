import { NextResponse } from 'next/server';

import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  try {
    const quizzes = await getQuizzesByCreator(creatorId, offset, 10);
    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error('Failed to fetch user quizzes:', err);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}
