'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

export default function BattleCreatePage(): React.ReactElement {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?returnTo=/battle');
        return;
      }

      const { data, error } = await supabase.rpc('battle_create_room', {
        p_difficulty: 'Medium',
        p_time_per_round: 15,
        p_korean_mode: false,
        p_privacy: 'private',
      });

      if (cancelled) return;

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        console.error('Failed to create room:', error);
        router.replace('/battle?error=create_failed');
        return;
      }

      const roomCode = (data[0] as { room_code: string }).room_code;
      router.replace(`/battle/r/${roomCode}`);
    })();

    return () => { cancelled = true; };
  }, [router, supabase]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg,
    }}>
      <p style={{ fontSize: 14, color: C.textMuted }}>Creating your room...</p>
    </div>
  );
}
