import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

interface MetadataEntry {
  image_url: string;
  title: string;
  description: string;
  board_name: string;
  pin_type?: string;
  group_name?: string | null;
  link_url?: string;
  hashtags?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { metadata: MetadataEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { metadata } = body;
  if (!Array.isArray(metadata) || metadata.length === 0) {
    return NextResponse.json({ error: 'metadata must be a non-empty array' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();
  const results = { matched: 0, created: 0, failed: 0, errors: [] as string[] };

  for (const item of metadata) {
    if (!item.image_url) {
      results.failed++;
      results.errors.push('Missing image_url in metadata entry');
      continue;
    }

    const pinData = {
      title: item.title || 'Untitled',
      description: item.description || '',
      board: item.board_name || 'K-pop Quizzes',
      pin_type: item.pin_type || 'aesthetic',
      group_name: item.group_name || null,
      link_url: item.link_url || null,
      hashtags: (item.hashtags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`)),
      headline: (item.title || 'Untitled').slice(0, 80),
      status: 'approved',
      updated_at: new Date().toISOString(),
    };

    // Try to match by image_public_url
    const { data: existingPin } = await adminDb
      .from('pinterest_pins')
      .select('id')
      .eq('image_public_url', item.image_url)
      .single();

    if (existingPin) {
      // Update existing pin
      const { error } = await adminDb
        .from('pinterest_pins')
        .update(pinData)
        .eq('id', existingPin.id);

      if (error) {
        results.failed++;
        results.errors.push(`Update failed for ${item.image_url}: ${error.message}`);
      } else {
        results.matched++;
      }
    } else {
      // Create new pin
      const { error } = await adminDb
        .from('pinterest_pins')
        .insert({
          ...pinData,
          image_public_url: item.image_url,
          image_url: item.image_url,
          needs_photo: false,
          subtext: null,
          category: pinData.pin_type,
          sort_order: 0,
        });

      if (error) {
        results.failed++;
        results.errors.push(`Create failed for ${item.image_url}: ${error.message}`);
      } else {
        results.created++;
      }
    }
  }

  return NextResponse.json(results);
}
