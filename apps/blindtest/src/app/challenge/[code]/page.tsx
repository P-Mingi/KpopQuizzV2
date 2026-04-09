import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { ChallengeIntro } from '@/components/challenge/challenge-intro';

import type { Metadata } from 'next';

interface ChallengeRow {
  id: string;
  short_code: string;
  playlist: string;
  mode: string;
  difficulty: string;
  creator_name: string;
  creator_score: number;
  creator_correct: number;
  creator_total: number;
  creator_time: number | null;
  expires_at: string;
}

async function loadChallenge(code: string): Promise<ChallengeRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('challenges')
    .select('id, short_code, playlist, mode, difficulty, creator_name, creator_score, creator_correct, creator_total, creator_time, expires_at')
    .eq('short_code', code)
    .maybeSingle();
  return (data as ChallengeRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const challenge = await loadChallenge(code);
  if (!challenge) return { title: 'Challenge not found - K-pop Blindtest' };

  const title = `${challenge.creator_name} challenged you - K-pop Blindtest`;
  const description = `${challenge.creator_name} scored ${challenge.creator_correct}/${challenge.creator_total}. Can you beat them? Same 10 songs, same order.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ChallengeLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const challenge = await loadChallenge(code);

  if (!challenge) {
    return <ChallengeStateCard title="Challenge not found" body="This challenge link is invalid." />;
  }
  if (new Date(challenge.expires_at) < new Date()) {
    return <ChallengeStateCard title="Challenge expired" body="Challenges are only playable for 7 days." />;
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from('challenge_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id);

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  return (
    <ChallengeIntro
      challenge={{
        short_code: challenge.short_code,
        playlist: challenge.playlist,
        mode: challenge.mode,
        creator_name: challenge.creator_name,
        creator_score: challenge.creator_score,
        creator_correct: challenge.creator_correct,
        creator_total: challenge.creator_total ?? 10,
        creator_time: challenge.creator_time,
      }}
      attemptCount={count ?? 0}
      isLoggedIn={Boolean(user)}
    />
  );
}

function ChallengeStateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-[100dvh] bg-primary flex items-center justify-center px-5">
      <div className="w-full max-w-[400px] text-center">
        <p className="text-2xl font-bold text-primary mb-2">{title}</p>
        <p className="text-sm text-ghost mb-6">{body}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-accent text-primary text-sm font-bold"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
