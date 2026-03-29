import { NextResponse } from 'next/server';
import { getSongCounts } from '@/lib/get-song-counts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getSongCounts();
  return NextResponse.json(data);
}
