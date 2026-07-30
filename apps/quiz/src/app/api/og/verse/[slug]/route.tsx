import { ImageResponse } from 'next/og';

import { createServerClient } from '@/lib/supabase/server';
import { isConfiguredImageHost } from '@/lib/image-hosts';

import type { NextRequest } from 'next/server';

// V-IDENTITY step 2 (surface: OG) - the Verse world OG template. Violet system,
// KpopVerse brand, the group's name + logo (from approved hosts only = "imagery
// where legal"). Mirrors /api/og/group but in the Verse identity. Every text node
// carries display:flex (Satori) and any remote logo is prefetched to a data URI
// (a remote <img> that stalls takes the whole card down with a 500).

const VIOLET = '#7c5cfc';
const INK = '#f4f1f8';
const SUB = '#b3a7d6';
const BG = '#14111c';

async function logoDataUri(url: string | null): Promise<string | null> {
  if (!url || !isConfiguredImageHost(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 3_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function abbreviate(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
}

/** GET /api/og/verse/[slug] - per-space KpopVerse OG card (1200x630). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: group } = await supabase
    .from('groups')
    .select('name, fandom_name, display_color, text_color, logo_url')
    .eq('slug', slug)
    .single();
  if (!group) return new Response('Not found', { status: 404 });

  const row = group as { name: string; fandom_name: string; display_color: string | null; text_color: string | null; logo_url: string | null };
  const logo = await logoDataUri(row.logo_url);
  const logoSize = 128;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: BG, fontFamily: 'sans-serif', padding: 64, position: 'relative' }}>
        {/* faint violet glow top-right */}
        <div style={{ position: 'absolute', top: -160, right: -120, width: 520, height: 520, borderRadius: '50%', backgroundColor: 'rgba(124,92,252,0.18)', display: 'flex' }} />

        {/* eyebrow: KpopVerse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', position: 'relative', width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 44, height: 22, borderRadius: '50%', border: `5px solid ${VIOLET}`, transform: 'rotate(-20deg)', display: 'flex' }} />
            <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: VIOLET, display: 'flex' }} />
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: INK }}>Kpop</span><span style={{ color: VIOLET }}>Verse</span>
          </div>
        </div>

        {/* group identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={logoSize} height={logoSize} style={{ borderRadius: 26, border: '1px solid rgba(255,255,255,0.12)' }} />
          ) : (
            <div style={{ width: logoSize, height: logoSize, borderRadius: 26, backgroundColor: row.display_color ?? VIOLET, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: row.text_color ?? '#fff' }}>
              {abbreviate(row.name)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.02, letterSpacing: -2 }}>{row.name}</div>
            <div style={{ display: 'flex', fontSize: 32, color: SUB, marginTop: 6 }}>{`the ${row.fandom_name} home`}</div>
          </div>
        </div>

        {/* footer line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 22, color: SUB }}>Fans build their fandom&rsquo;s home here</div>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.34)' }}>kpopquiz.org/verse</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
