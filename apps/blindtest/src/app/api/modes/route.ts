import { NextResponse } from 'next/server';
import { getModesData } from '@/lib/get-modes';

export const revalidate = 60;

export async function GET(): Promise<NextResponse> {
  const data = await getModesData();
  return NextResponse.json(data);
}
