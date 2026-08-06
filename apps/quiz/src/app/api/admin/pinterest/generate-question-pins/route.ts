import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { loadFonts, loadMascotUri, questionPinToPng } from '@/lib/pinterest/question-pin';
import {
  gatherQuestionPins, toCSV, clean, scheduledDate, hubUrlFor, boardFor,
  titleFor, descriptionFor, keywordsFor,
} from '@/lib/pinterest/question-pin-batch';

import type { NextRequest } from 'next/server';

// V-PIN-Q: per-question Pinterest pins (question + options, ANSWER HIDDEN). The
// same machinery as generate-brand-pins, moved into a shared lib. For the full
// hundreds-of-pins batch prefer scripts/generate-question-pins.mts (no auth or
// serverless timeout); this route offers an in-dashboard preview + a capped run.
export const runtime = 'nodejs';
export const maxDuration = 300;

const BUCKET = 'pinterest-question-pins';
const MASCOTS = ['mascot-default', 'mascot-celebrate', 'mascot-think'] as const;
const PER_GROUP_CAP = 26;
const PER_DAY = 12;

async function fetchQuizzes(db: ReturnType<typeof createServiceRoleClient>) {
  const { data, error } = await db.from('quizzes')
    .select('quiz_type, questions, play_count, groups!inner(name, slug, display_color)')
    .eq('status', 'published')
    .in('quiz_type', ['multiple_choice', 'true_false', 'guess_from_clues'])
    .not('questions', 'is', null)
    .order('play_count', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`quizzes: ${error.message}`);
  return (data ?? []) as Array<{ quiz_type: string; questions: unknown; groups: unknown }>;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { mode?: 'sample' | 'full'; limit?: number };
  const mode = body.mode ?? 'sample';
  const db = createServiceRoleClient();
  const fonts = loadFonts();
  const mascots = MASCOTS.map((m) => loadMascotUri(m));

  if (mode === 'sample') {
    // One preview per approved template layout from a real, answer-agnostic question.
    const { picked } = gatherQuestionPins(await fetchQuizzes(db), { limit: 1, perGroupCap: PER_GROUP_CAP });
    const pin = picked[0]?.pin ?? { group: 'BTS', themeColor: '#7C5CFC', question: 'Which company manages BTS?', kind: 'options' as const, options: ['SM', 'YG', 'HYBE', 'JYP'] };
    const [a, b] = await Promise.all([
      questionPinToPng(pin, 0, mascots[0]!, fonts),
      questionPinToPng(pin, 1, mascots[1]!, fonts),
    ]);
    return NextResponse.json({ pins: [
      { template: 'bold', base64: a.toString('base64') },
      { template: 'editorial', base64: b.toString('base64') },
    ] });
  }

  // full: capped so a serverless invocation stays within maxDuration.
  const limit = Math.min(Math.max(1, body.limit ?? 60), 120);
  const { picked, stats } = gatherQuestionPins(await fetchQuizzes(db), { limit, perGroupCap: PER_GROUP_CAP });
  await db.storage.createBucket(BUCKET, { public: true }).catch(() => null);

  const rows: Record<string, string>[] = [];
  let idx = 0;
  for (const cnd of picked) {
    const { url: link, isHome } = hubUrlFor(cnd.groupSlug, `q${idx}`);
    const png = await questionPinToPng(cnd.pin, idx % 2, mascots[idx % mascots.length]!, fonts);
    const fn = `q-${cnd.groupSlug ?? 'home'}-${idx}.png`;
    await db.storage.from(BUCKET).upload(fn, png, { contentType: 'image/png', upsert: true });
    const mediaUrl = db.storage.from(BUCKET).getPublicUrl(fn).data.publicUrl;
    rows.push({
      'Title': titleFor(cnd.groupName, isHome, idx),
      'Media URL': mediaUrl,
      'Pinterest board': boardFor(cnd.groupName, isHome),
      'Thumbnail': '',
      'Description': descriptionFor(cnd.groupName, isHome),
      'Link': clean(link, 500),
      'Publish date': scheduledDate(rows.length, PER_DAY),
      'Keywords': keywordsFor(cnd.groupName, isHome),
    });
    idx++;
  }

  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const csv = Buffer.concat([bom, Buffer.from(toCSV(rows), 'utf-8')]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pinterest-question-pins.csv"',
      'X-Excluded': `media:${stats.media},glyph:${stats.glyph},malformed:${stats.malformed}`,
    },
  });
}
