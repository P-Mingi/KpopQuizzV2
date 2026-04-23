import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export async function getPinterestToken(): Promise<string> {
  const adminDb = createServiceRoleClient();
  const { data: auth } = await adminDb
    .from('pinterest_auth')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!auth) {
    throw new Error('Pinterest not connected. Go to /admin/pinterest to connect.');
  }

  // Refresh if token expires within 5 minutes
  const expiresAt = new Date(auth.expires_at);
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - Date.now() < fiveMinutes) {
    const credentials = Buffer.from(
      `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`,
    ).toString('base64');

    const refreshRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: auth.refresh_token,
      }),
    });

    const newTokens = await refreshRes.json();

    if (newTokens.access_token) {
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      await adminDb
        .from('pinterest_auth')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || auth.refresh_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auth.id);

      return newTokens.access_token as string;
    }
  }

  return auth.access_token as string;
}

/** Returns null instead of throwing when Pinterest is not connected. */
export async function getPinterestAuthStatus(): Promise<{
  connected: boolean;
  expiresAt?: string;
  scope?: string;
} | null> {
  const adminDb = createServiceRoleClient();
  const { data: auth } = await adminDb
    .from('pinterest_auth')
    .select('expires_at, scope')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!auth) return { connected: false };

  const expired = new Date(auth.expires_at).getTime() < Date.now();
  return {
    connected: !expired,
    expiresAt: auth.expires_at,
    scope: auth.scope,
  };
}

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

export async function getPinterestBoards(): Promise<Array<{ id: string; name: string }>> {
  const token = await getPinterestToken();

  const res = await fetch('https://api.pinterest.com/v5/boards?page_size=50', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!data.items) return [];
  return (data.items as Array<{ id: string; name: string }>).map((b) => ({
    id: b.id,
    name: b.name,
  }));
}

export async function createPinterestBoard(name: string, description?: string): Promise<{ id: string; name: string } | null> {
  const token = await getPinterestToken();

  const res = await fetch('https://api.pinterest.com/v5/boards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: description ?? '',
      privacy: 'PUBLIC',
    }),
  });

  if (!res.ok) {
    console.error('[pinterest] create board failed:', await res.text());
    return null;
  }

  const data = await res.json();
  return { id: data.id as string, name: data.name as string };
}

// ---------------------------------------------------------------------------
// Pin creation
// ---------------------------------------------------------------------------

export async function createPinterestPin(pin: {
  title: string;
  description: string;
  link?: string;
  board_id: string;
  image_url: string;
}): Promise<{ success: boolean; pin_id?: string; error?: string }> {
  const token = await getPinterestToken();

  const body: Record<string, unknown> = {
    title: pin.title,
    description: pin.description,
    board_id: pin.board_id,
    media_source: {
      source_type: 'image_url',
      url: pin.image_url,
    },
  };

  if (pin.link) {
    body.link = pin.link;
  }

  const res = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.id) {
    return { success: true, pin_id: data.id as string };
  }
  return { success: false, error: JSON.stringify(data) };
}
