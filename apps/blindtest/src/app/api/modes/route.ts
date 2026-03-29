import { NextResponse } from 'next/server';
import { getModesData } from '@/lib/get-modes';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const data = await getModesData();
  return NextResponse.json(data);
}
