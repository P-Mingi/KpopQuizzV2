import { NextResponse } from 'next/server';

// POST /api/blind-test/play - RETIRED (R1, 2026-10). It answers 410 and does nothing.
//
// It recorded a legacy YouTube blind test run and awarded up to 50 XP per call from
// a score the browser sent, with no check and no limit, so a signed-in user could
// farm XP with a script. Its only caller, the legacy /blindtest/<mode> player, has
// not reached it since the generate route moved to Deezer, and no longer calls it
// (the repaired player saves nothing, like a free run on the hub). Recording
// blindtest runs comes back as a validated design (v12 blindtest tracking).
export const dynamic = 'force-dynamic';

export function POST(): NextResponse {
  return NextResponse.json({ error: 'gone' }, { status: 410 });
}
