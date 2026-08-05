import { ImageResponse } from 'next/og';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// H5 share card (Section 3b-3e): cover image + gradient overlay default, with
// optional ?overlay / ?opacity / ?hook / ?title params so H6's customizer can
// drive it without a rebuild. Pure server render via the existing @vercel/og.

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Classic', true_false: 'True / False', guess_from_clues: 'Clues',
  image: 'Image', intruder: 'Intruder',
};

const BRAND = '#E8457A';

type Overlay = 'dark-bottom' | 'full-dark' | 'brand' | 'purple';

/** The gradient baked OVER the cover (or over the brand fallback) for legibility. */
function overlayGradient(overlay: Overlay, o: number): string {
  switch (overlay) {
    case 'full-dark':
      return `linear-gradient(rgba(0,0,0,${o}), rgba(0,0,0,${o}))`;
    case 'brand':
      return `linear-gradient(150deg, rgba(232,69,122,${Math.min(0.96, o + 0.25)}), rgba(150,24,80,${o}))`;
    case 'purple':
      return `linear-gradient(150deg, rgba(139,92,246,${Math.min(0.96, o + 0.2)}), rgba(76,29,149,${o}))`;
    case 'dark-bottom':
    default:
      // Vignette top (logo/pill) + heavy bottom (title + footer); light middle.
      return `linear-gradient(to bottom, rgba(0,0,0,${o * 0.55}) 0%, rgba(0,0,0,${o * 0.12}) 28%, rgba(0,0,0,${o * 0.5}) 60%, rgba(0,0,0,${o}) 100%)`;
  }
}

const SHADOW = '0 2px 10px rgba(0,0,0,0.55)';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const origin = new URL(request.url).origin;

  const supabase = await createServerClient();
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('title, question_count, quiz_type, cover_image_url, groups!inner (name, display_color, text_color), profiles!inner (username)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!quiz) return new Response('Not found', { status: 404 });

  const row = quiz as unknown as {
    title: string;
    question_count: number;
    quiz_type: string;
    cover_image_url: string | null;
    groups: { name: string; display_color: string; text_color: string };
    profiles: { username: string };
  };

  // The creator's saved customizer config (H6). Read separately + tolerantly so
  // the card still renders if the share_card column does not exist yet (pre-071).
  let sc: { overlay?: string; opacity?: number; hook?: string; title?: string } = {};
  {
    const { data: scRow, error: scErr } = await supabase
      .from('quizzes').select('share_card').eq('slug', slug).maybeSingle();
    if (!scErr && scRow && typeof scRow.share_card === 'object' && scRow.share_card) {
      sc = scRow.share_card as typeof sc;
    }
  }

  // --- resolve params: URL override > saved share_card > computed default ---
  const overlayRaw = searchParams.get('overlay') ?? sc.overlay ?? 'dark-bottom';
  const overlay = (['dark-bottom', 'full-dark', 'brand', 'purple'].includes(overlayRaw) ? overlayRaw : 'dark-bottom') as Overlay;
  const opacityStr = searchParams.get('opacity') ?? (typeof sc.opacity === 'number' ? String(sc.opacity) : null);
  const opacityNum = Number(opacityStr);
  const o = (opacityStr !== null && Number.isFinite(opacityNum) ? Math.min(100, Math.max(0, opacityNum)) : 40) / 100;
  const score = searchParams.get('s');
  const total = searchParams.get('t');
  const hasScore = score !== null && total !== null;

  const title = (searchParams.get('title')?.trim() || sc.title?.trim() || row.title).slice(0, 120);
  const hook = (searchParams.get('hook')?.trim() || sc.hook?.trim()
    || (hasScore ? `I scored ${score}/${total}` : "Bet you can't get 100%")).slice(0, 60).toUpperCase();

  const cover = row.cover_image_url;
  const count = row.question_count || 0;
  const typeLabel = TYPE_LABEL[row.quiz_type] ?? 'Quiz';
  const titleSize = title.length > 64 ? 52 : title.length > 38 ? 66 : 80;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'sans-serif' }}>
        {/* Background: cover image, or brand-pink gradient fallback */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: `linear-gradient(135deg, ${BRAND}, #B81E5A)` }} />
        )}

        {/* Gradient overlay (baked on top for legibility) */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: overlayGradient(overlay, o) }} />

        {/* Content */}
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 60px', color: '#FFFFFF' }}>
          {/* Top: brand mark + group/type pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${origin}/mascot/mascot-default.png`} alt="" width={60} height={60} style={{ borderRadius: 14 }} />
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: -0.5, textShadow: SHADOW }}>kpopquiz</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', padding: '8px 18px', borderRadius: 9999, fontSize: 22, fontWeight: 700, backgroundColor: row.groups.display_color, color: row.groups.text_color }}>{row.groups.name}</div>
              <div style={{ display: 'flex', padding: '8px 16px', borderRadius: 9999, fontSize: 20, fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.22)', color: '#FFFFFF' }}>{typeLabel}</div>
            </div>
          </div>

          {/* Center: hook + title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1040 }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: '#FFFFFF', opacity: 0.96, textShadow: SHADOW }}>{hook}</div>
            <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1, textShadow: '0 3px 18px rgba(0,0,0,0.6)' }}>{title}</div>
          </div>

          {/* Bottom: count + beat-it + Play now */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, textShadow: SHADOW }}>{count} questions &middot; can you beat it?</div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 30px', borderRadius: 9999, backgroundColor: '#FFFFFF', color: BRAND, fontSize: 26, fontWeight: 800, boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>Play now</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
