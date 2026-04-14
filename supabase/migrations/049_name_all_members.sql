-- Name All Members game type support
-- The existing games table already supports arbitrary game_type values
-- and JSONB content, so no schema changes are needed.
-- We only need an RPC to atomically increment play count.

CREATE OR REPLACE FUNCTION public.increment_game_play_count(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.games
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = p_game_id;
END;
$$;
