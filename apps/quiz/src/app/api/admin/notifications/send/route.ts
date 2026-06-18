import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// POST /api/admin/notifications/send
// Body: { recipient_username | recipient_id, title, body?, link_url? }
// Sends an admin DM to a single user. Service-role insert because the table's
// INSERT policy is system-only. Auth + isAdmin gate on top so only the admin
// account can reach this.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user: sender } } = await supabase.auth.getUser();
  if (!sender || !isAdmin(sender.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const bodyText = typeof body.body === 'string' ? body.body.trim() : null;
  const linkUrl = typeof body.link_url === 'string' ? body.link_url.trim() : null;
  const recipientUsername = typeof body.recipient_username === 'string'
    ? body.recipient_username.trim()
    : null;
  const recipientId = typeof body.recipient_id === 'string'
    ? body.recipient_id.trim()
    : null;

  if (!title || title.length < 2 || title.length > 80) {
    return NextResponse.json({ error: 'title required (2-80 chars)' }, { status: 400 });
  }
  if (bodyText && bodyText.length > 500) {
    return NextResponse.json({ error: 'body too long (max 500 chars)' }, { status: 400 });
  }
  if (linkUrl && !/^https?:\/\/|^\//.test(linkUrl)) {
    return NextResponse.json({ error: 'link_url must be http(s):// or start with /' }, { status: 400 });
  }
  if (!recipientUsername && !recipientId) {
    return NextResponse.json({ error: 'recipient_username or recipient_id required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Resolve recipient.
  let targetId = recipientId;
  let targetUsername: string | null = null;
  if (!targetId && recipientUsername) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', recipientUsername.toLowerCase())
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: 'recipient not found' }, { status: 404 });
    targetId = profile.id as string;
    targetUsername = profile.username as string;
  }

  const { data: inserted, error } = await admin
    .from('creator_notifications')
    .insert({
      user_id: targetId,
      type: 'admin_dm',
      title,
      body: bodyText,
      link_url: linkUrl,
      sender_id: sender.id,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[admin/notifications/send]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id,
    created_at: inserted?.created_at,
    recipient: { id: targetId, username: targetUsername },
  });
}
