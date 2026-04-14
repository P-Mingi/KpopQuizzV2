import { NextResponse } from 'next/server';

import { getAllQuizzes, getTrendingQuizzes, getNewQuizzes, getMostLikedQuizzes, getHardestQuizzes, getQuizzesByDifficulty } from '@/lib/db/queries/quizzes';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'trending';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limitParam = parseInt(searchParams.get('limit') ?? '10', 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  try {
    let quizzes;

    switch (tab) {
      case 'all':
        quizzes = await getAllQuizzes(offset, limit);
        break;
      case 'new':
        quizzes = await getNewQuizzes(offset, limit);
        break;
      case 'most_liked':
        quizzes = await getMostLikedQuizzes(offset, limit);
        break;
      case 'hardest':
        quizzes = await getHardestQuizzes(offset, limit);
        break;
      case 'easy':
        quizzes = await getQuizzesByDifficulty('easy', offset, limit);
        break;
      case 'hard':
        quizzes = await getQuizzesByDifficulty('hard', offset, limit);
        break;
      case 'trending':
      default:
        quizzes = await getTrendingQuizzes(offset, limit);
        break;
    }

    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error('Failed to fetch quizzes:', err);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}
