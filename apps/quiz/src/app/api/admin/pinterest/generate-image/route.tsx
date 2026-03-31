import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

const W = 1000;
const H = 1500;

interface Pin {
  id: string;
  pin_type: string;
  group_name: string | null;
  headline: string;
  subtext: string | null;
  fact_date: string | null;
  score_display: string | null;
  score_percent: string | null;
  image_url: string | null;
  link_url: string | null;
}

function QuizLinkTemplate({ pin }: { pin: Pin }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0f0e17',
        position: 'relative',
      }}
    >
      {pin.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pin.image_url}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.45,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(15,14,23,0.35) 0%, rgba(15,14,23,0.85) 60%, rgba(15,14,23,0.97) 100%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '80px 80px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            KpopQuiz
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {pin.group_name && (
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#c4b5fd',
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              {pin.group_name}
            </span>
          )}
          <span style={{ fontSize: 76, fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>
            {pin.headline}
          </span>
          {pin.subtext && (
            <span style={{ fontSize: 34, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
              {pin.subtext}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              padding: '22px 44px',
              background: '#7c3aed',
              borderRadius: 16,
              alignSelf: 'flex-start',
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>Take the Quiz</span>
          </div>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.55)' }}>kpopquiz.org</span>
        </div>
      </div>
    </div>
  );
}

function FactCardTemplate({ pin }: { pin: Pin }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#FAFAF8',
        padding: '80px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 64 }}>
        <div
          style={{ width: 8, height: 56, background: '#7c3aed', borderRadius: 4, display: 'flex' }}
        />
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#7c3aed',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {pin.group_name ? `${pin.group_name} Fact` : 'K-pop Fact'}
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <span style={{ fontSize: 62, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>
          {pin.headline}
        </span>
      </div>

      {pin.subtext && (
        <span
          style={{
            fontSize: 34,
            color: '#555',
            lineHeight: 1.45,
            marginTop: 40,
            marginBottom: 24,
          }}
        >
          {pin.subtext}
        </span>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 56,
          borderTop: '2px solid #eee',
          paddingTop: 32,
        }}
      >
        <span style={{ fontSize: 22, color: '#aaa' }}>{pin.fact_date ?? 'K-pop Trivia'}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>kpopquiz.org</span>
      </div>
    </div>
  );
}

function DidYouKnowTemplate({ pin }: { pin: Pin }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0f0e17',
        padding: '80px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          padding: '14px 32px',
          background: '#7c3aed',
          borderRadius: 50,
          marginBottom: 64,
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
          Did You Know?
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
          {pin.headline}
        </span>
      </div>

      {pin.subtext && (
        <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45, marginBottom: 32 }}>
          {pin.subtext}
        </span>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 56,
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: 32,
        }}
      >
        {pin.group_name && (
          <span style={{ fontSize: 22, fontWeight: 600, color: '#c4b5fd', letterSpacing: 2, textTransform: 'uppercase' }}>
            {pin.group_name}
          </span>
        )}
        <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
          kpopquiz.org
        </span>
      </div>
    </div>
  );
}

function ScoreChallengeTemplate({ pin }: { pin: Pin }) {
  const scoreNum = pin.score_percent ? parseInt(pin.score_percent) : null;
  const circumference = 2 * Math.PI * 140;
  const dashOffset = scoreNum !== null ? circumference * (1 - scoreNum / 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0f0e17',
        padding: '80px',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 32 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#c4b5fd', letterSpacing: 3, textTransform: 'uppercase' }}>
          {pin.group_name ?? 'K-pop'}
        </span>

        <span style={{ fontSize: 68, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>
          {pin.headline}
        </span>

        {/* Score ring */}
        <div style={{ display: 'flex', position: 'relative', width: 320, height: 320, alignItems: 'center', justifyContent: 'center' }}>
          <svg
            width="320"
            height="320"
            style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
          >
            <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
            {scoreNum !== null && (
              <circle
                cx="160"
                cy="160"
                r="140"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${dashOffset}`}
              />
            )}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {pin.score_display ?? '?/10'}
            </span>
            {pin.score_percent && (
              <span style={{ fontSize: 28, color: '#c4b5fd', fontWeight: 600 }}>
                {pin.score_percent}%
              </span>
            )}
          </div>
        </div>

        {pin.subtext && (
          <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.4 }}>
            {pin.subtext}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: 28,
          width: '100%',
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
          kpopquiz.org
        </span>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();
  const { data: pin, error } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pin) {
    return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
  }

  let template: React.ReactElement;

  switch (pin.pin_type) {
    case 'quiz_link':
      template = <QuizLinkTemplate pin={pin as Pin} />;
      break;
    case 'fact_card':
      template = <FactCardTemplate pin={pin as Pin} />;
      break;
    case 'did_you_know':
      template = <DidYouKnowTemplate pin={pin as Pin} />;
      break;
    case 'score_challenge':
      template = <ScoreChallengeTemplate pin={pin as Pin} />;
      break;
    default:
      template = <FactCardTemplate pin={pin as Pin} />;
  }

  return new ImageResponse(template, {
    width: W,
    height: H,
  });
}
