import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

import { AiVisibilityDashboard } from './ai-visibility-dashboard';

export const dynamic = 'force-dynamic';

export interface AiCheck {
  id: number;
  checked_at: string;
  platform: string;
  query: string;
  mentioned: boolean;
  position: number | null;
  snippet: string | null;
  notes: string | null;
}

const TRACKED_QUERIES = [
  'best kpop quiz',
  'kpop blind test online',
  'bts quiz',
  'blackpink quiz',
  'kpop trivia',
  'kpop quiz website',
  'guess the kpop song',
  'stray kids quiz',
  'twice quiz',
  'kpop games online',
];

const PLATFORMS = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'google_aio', label: 'Google AI Overviews' },
];

export default async function AiVisibilityPage(): Promise<React.ReactElement> {
  const { user } = await requireAdmin();

  const serviceClient = createServiceRoleClient();
  const { data: checks } = await serviceClient
    .from('ai_visibility_checks')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(200);

  return (
    <AiVisibilityDashboard
      checks={(checks as AiCheck[]) ?? []}
      trackedQueries={TRACKED_QUERIES}
      platforms={PLATFORMS}
      userId={user.id}
    />
  );
}
