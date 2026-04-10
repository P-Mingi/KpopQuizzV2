import { ImageResponse } from 'next/og';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

const ABBREVIATIONS: Record<string, string> = {
  'BTS': 'BTS', 'BLACKPINK': 'BP', 'Stray Kids': 'SKZ', 'TWICE': 'TW', 'aespa': 'ae',
  'NewJeans': 'NJ', 'SEVENTEEN': 'SVT', 'EXO': 'EXO', '(G)I-DLE': 'IDLE', 'IVE': 'IVE',
  'LE SSERAFIM': 'LSF', 'NCT': 'NCT', 'Red Velvet': 'RV', 'ATEEZ': 'ATZ', 'ENHYPEN': 'ENH',
  'TXT': 'TXT', 'ITZY': 'ITZY', 'General K-pop': 'K',
};

function getAbbreviation(name: string): string {
  const abbr = ABBREVIATIONS[name];
  if (abbr) return abbr;
  return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
}

/**
 * GET /api/og/group/[slug]
 *
 * Per-group OG image for `/[slug]-quiz` and `/[slug]-trivia` pages. Shows
 * the group logo (or abbreviation pill), name, quiz count, and total
 * plays on a 1200x630 canvas.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;

  const supabase = await createServerClient();

  const { data: group } = await supabase
    .from('groups')
    .select('name, slug, fandom_name, display_color, text_color, logo_url, quiz_count, total_plays')
    .eq('slug', slug)
    .single();

  if (!group) {
    return new Response('Not found', { status: 404 });
  }

  const row = group as {
    name: string;
    slug: string;
    fandom_name: string;
    display_color: string;
    text_color: string;
    logo_url: string | null;
    quiz_count: number;
    total_plays: number;
  };

  const logoSize = 140;
  const logoRadius = Math.round(logoSize * 0.19);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF9F6',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: '#D4537E' }} />

        {/* Group logo */}
        {row.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.logo_url}
            alt=""
            width={logoSize}
            height={logoSize}
            style={{ borderRadius: logoRadius, marginBottom: 24, border: '1px solid #E8E6E1' }}
          />
        ) : (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: logoRadius,
              backgroundColor: row.display_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              border: '1px solid #E8E6E1',
              fontSize: Math.round(logoSize * 0.28),
              fontWeight: 500,
              color: row.text_color,
            }}
          >
            {getAbbreviation(row.name)}
          </div>
        )}

        {/* Group name + "Quiz" */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#2C2C2A',
            marginBottom: 8,
            textAlign: 'center',
            padding: '0 40px',
          }}
        >
          {row.name} Quiz
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 24, color: '#888780', marginBottom: 36, textAlign: 'center' }}>
          Test How Well You Know {row.name}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 56 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#D4537E', fontVariantNumeric: 'tabular-nums' }}>
              {row.quiz_count}
            </div>
            <div style={{ fontSize: 16, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: 1 }}>
              quizzes
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#D4537E', fontVariantNumeric: 'tabular-nums' }}>
              {row.total_plays.toLocaleString('en-US')}
            </div>
            <div style={{ fontSize: 16, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: 1 }}>
              plays
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div style={{ position: 'absolute', bottom: 32, fontSize: 18, color: '#B4B2A9' }}>
          kpopquiz.org
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
