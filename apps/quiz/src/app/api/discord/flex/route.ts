import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

// K7 - "Brag in the Discord" webhook poster (opt-in result/win/level-up).
// SECRET: DISCORD_FLEX_WEBHOOK_URL is read from process.env only - NEVER
// logged, NEVER exposed to the client, NEVER hard-coded. If unset, we return
// 503 so the UI can hide the button (kill switch).
// Rate-limited per voter_hash via discord_flex_log.
export const dynamic = 'force-dynamic';

const MAX_PER_DAY = 3;
const BRAND = 0xe8457a; // --brand

interface Body {
  kind?: unknown;
  title?: unknown;
  score?: unknown;
  total?: unknown;
  quizSlug?: unknown;
  battleId?: unknown;
  level?: unknown;
  displayName?: unknown;
}

function clamp(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhook = process.env.DISCORD_FLEX_WEBHOOK_URL;
  if (!webhook) {
    // Kill switch: env unset -> 503 so the UI hides the button entirely.
    return NextResponse.json({ ok: false, error: 'Flex disabled' }, { status: 503 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const kind = body.kind === 'quiz' || body.kind === 'battle' || body.kind === 'levelup' ? body.kind : null;
  const title = clamp(body.title, 100);
  if (!kind || !title) return NextResponse.json({ error: 'kind + title required' }, { status: 400 });

  const displayName = clamp(body.displayName, 40) || 'a fan';
  const quizSlug = clamp(body.quizSlug, 120) || null;
  const battleId = clamp(body.battleId, 64) || null;
  const score = typeof body.score === 'number' ? body.score : null;
  const total = typeof body.total === 'number' ? body.total : null;
  const level = typeof body.level === 'number' ? body.level : null;

  // Context key so the UI can ask "did I already flex THIS exact result?".
  let contextKey: string;
  if (kind === 'quiz' && quizSlug) contextKey = 'quiz:' + quizSlug + ':' + (score ?? '') + '/' + (total ?? '');
  else if (kind === 'battle' && battleId) contextKey = 'battle:' + battleId;
  else if (kind === 'levelup' && level != null) contextKey = 'level-' + level;
  else return NextResponse.json({ error: 'Missing context for this kind' }, { status: 400 });

  const voterHash = anonHash(req);
  const svc = createServiceRoleClient();

  // Per-day cap.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await svc
    .from('discord_flex_log')
    .select('id', { count: 'exact', head: true })
    .eq('voter_hash', voterHash)
    .gte('posted_at', since);
  if ((count ?? 0) >= MAX_PER_DAY) {
    return NextResponse.json({ ok: false, error: 'rate_limited', max_per_day: MAX_PER_DAY }, { status: 429 });
  }

  // Already flexed THIS exact context? -> no-op success.
  const { count: alreadyCount } = await svc
    .from('discord_flex_log')
    .select('id', { count: 'exact', head: true })
    .eq('voter_hash', voterHash)
    .eq('context_key', contextKey);
  if ((alreadyCount ?? 0) > 0) {
    return NextResponse.json({ ok: true, already_flexed: true });
  }

  // Build the embed (branded, tidy).
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
  const urlBase = kind === 'quiz' && quizSlug ? origin + '/q/' + quizSlug : origin;
  const url = urlBase + (urlBase.includes('?') ? '&' : '?') + 'utm_source=discord&utm_medium=community&utm_campaign=flex';
  const image = quizSlug ? origin + '/api/og/' + quizSlug : null;

  let embedTitle: string;
  let embedDesc: string;
  if (kind === 'quiz') {
    embedTitle = displayName + ' scored ' + (score ?? '?') + '/' + (total ?? '?') + ' on “' + title + '”';
    embedDesc = 'Can you beat it?';
  } else if (kind === 'battle') {
    embedTitle = displayName + ' just won a 1v1 battle on ' + title;
    embedDesc = 'Beat the score they set.';
  } else {
    embedTitle = displayName + ' just reached ' + title;
    embedDesc = 'Climbing the Fan Level ladder.';
  }

  const embed: Record<string, unknown> = {
    title: embedTitle,
    description: embedDesc,
    url,
    color: BRAND,
    footer: { text: 'kpopquiz.org' },
  };
  if (image) embed.image = { url: image };

  let postOk = false;
  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    });
    postOk = r.ok;
  } catch {
    postOk = false;
  }

  if (!postOk) {
    return NextResponse.json({ ok: false, error: 'webhook_failed' }, { status: 502 });
  }

  await svc.from('discord_flex_log').insert({ voter_hash: voterHash, kind, context_key: contextKey });
  return NextResponse.json({ ok: true });
}
