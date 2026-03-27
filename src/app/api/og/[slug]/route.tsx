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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const score = searchParams.get('s');
  const total = searchParams.get('t');

  const supabase = await createServerClient();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('title, play_count, difficulty, groups!inner (name, display_color, text_color, logo_url), profiles!inner (username)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!quiz) {
    return new Response('Not found', { status: 404 });
  }

  const row = quiz as unknown as {
    title: string;
    play_count: number;
    difficulty: string;
    groups: { name: string; display_color: string; text_color: string; logo_url: string | null };
    profiles: { username: string };
  };

  const hasScore = score !== null && total !== null;
  const logoSize = 80;
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
          backgroundColor: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: '#FBEAF0' }} />

        {/* Group logo */}
        {row.groups.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.groups.logo_url}
            alt=""
            width={logoSize}
            height={logoSize}
            style={{ borderRadius: logoRadius, marginBottom: 12, border: '1px solid #E8E6E1' }}
          />
        ) : (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: logoRadius,
              backgroundColor: row.groups.display_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              border: '1px solid #E8E6E1',
              fontSize: Math.round(logoSize * 0.28),
              fontWeight: 500,
              color: row.groups.text_color,
            }}
          >
            {getAbbreviation(row.groups.name)}
          </div>
        )}

        {/* Group pill + difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 9999,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: row.groups.display_color,
              color: row.groups.text_color,
            }}
          >
            {row.groups.name}
          </div>
          {!hasScore && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: row.difficulty === 'easy' ? '#EAF3DE' : row.difficulty === 'hard' ? '#FCEBEB' : '#FAEEDA',
                color: row.difficulty === 'easy' ? '#27500A' : row.difficulty === 'hard' ? '#791F1F' : '#633806',
              }}
            >
              {row.difficulty.charAt(0).toUpperCase() + row.difficulty.slice(1)}
            </div>
          )}
        </div>

        {/* Score (if personalized) */}
        {hasScore && (
          <div style={{ fontSize: 72, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
            {score}/{total}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: hasScore ? 24 : 36,
            fontWeight: 500,
            color: hasScore ? '#6B6B6B' : '#1A1A1A',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.3,
            padding: '0 40px',
          }}
        >
          {quiz.title}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 18, color: '#6B6B6B', marginTop: 16 }}>
          {hasScore ? 'Can you beat this score?' : `by ${row.profiles.username} · ${row.play_count} plays`}
        </div>

        {/* Watermark */}
        <div style={{ fontSize: 16, color: '#9B9B9B', marginTop: 32 }}>
          kpopquiz.org
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
