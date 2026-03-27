import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const input = body as Record<string, unknown>;
  const errors: string[] = [];

  // Title
  if (typeof input.title !== 'string' || input.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }
  if (typeof input.title === 'string' && input.title.length > 100) {
    errors.push('Title must be at most 100 characters');
  }

  // Matchups
  if (!Array.isArray(input.matchups)) {
    errors.push('Matchups must be an array');
  } else {
    if (input.matchups.length < 5) errors.push('Minimum 5 matchups required');
    if (input.matchups.length > 15) errors.push('Maximum 15 matchups allowed');
    for (let i = 0; i < input.matchups.length; i++) {
      const m = input.matchups[i] as Record<string, unknown>;
      if (!m || typeof m.option_a !== 'string' || m.option_a.trim().length === 0) {
        errors.push(`Matchup ${i + 1}: option A is required`);
      }
      if (!m || typeof m.option_b !== 'string' || m.option_b.trim().length === 0) {
        errors.push(`Matchup ${i + 1}: option B is required`);
      }
      if (typeof m.option_a === 'string' && m.option_a.length > 100) {
        errors.push(`Matchup ${i + 1}: option A must be 100 characters or less`);
      }
      if (typeof m.option_b === 'string' && m.option_b.length > 100) {
        errors.push(`Matchup ${i + 1}: option B must be 100 characters or less`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', details: errors }, { status: 400 });
  }

  // Resolve group (optional)
  let groupId: number | null = null;
  if (typeof input.group_id === 'number') {
    groupId = input.group_id;
  } else if (typeof input.group_name === 'string' && input.group_name.trim().length >= 2) {
    const groupName = input.group_name.trim();

    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .ilike('name', groupName)
      .maybeSingle();

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      const groupSlug = groupName
        .toLowerCase()
        .replace(/[()]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);

      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          slug: groupSlug,
          fandom_name: 'fan',
          display_color: '#F1EFE8',
          text_color: '#444441',
          is_custom: true,
          needs_review: true,
          created_by_user: true,
        })
        .select('id')
        .single();

      if (groupError) {
        console.error('Failed to create group:', groupError);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
      }
      groupId = newGroup.id;
    }
  }

  // Build content JSONB
  const matchups = (input.matchups as Record<string, string>[]).map((m, i) => ({
    id: `m${i + 1}`,
    option_a: (m.option_a ?? '').trim(),
    option_b: (m.option_b ?? '').trim(),
    votes_a: 0,
    votes_b: 0,
  }));

  // Generate unique slug
  const title = (input.title as string).trim();
  let slug = generateSlug(title);

  const { data: slugCheck } = await supabase
    .from('games')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheck) {
    let suffix = 2;
    let candidateSlug = `${slug}-${suffix}`;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: check } = await supabase
        .from('games')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();
      if (!check) {
        slug = candidateSlug;
        break;
      }
      suffix++;
      candidateSlug = `${slug}-${suffix}`;
    }
  }

  // Insert game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      creator_id: user.id,
      group_id: groupId,
      title,
      slug,
      game_type: 'this_or_that',
      content: { matchups },
      matchup_count: matchups.length,
    })
    .select('id, slug')
    .single();

  if (gameError) {
    console.error('Failed to create game:', gameError);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }

  // Award XP
  try {
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: 25,
      p_reason: 'create',
    });
  } catch (err) {
    console.error('Failed to award XP:', err);
  }

  return NextResponse.json({ id: game.id, slug: game.slug });
}
