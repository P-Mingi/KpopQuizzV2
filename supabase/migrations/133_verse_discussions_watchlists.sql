-- 133_verse_discussions_watchlists.sql
-- Workstream W4.6 - per-page discussions + watchlists. Run manually in the prod SQL
-- editor; NOT auto-applied.
--
-- Discussions: a comment thread attached to any Verse entity page (talk-page style),
-- with one level of replies. Watchlists: a user follows a page and is notified (through
-- the EXISTING creator_notifications spine, not a new one) when it changes. The
-- recent-changes feed reads verse_revisions directly and needs no table.

CREATE TABLE IF NOT EXISTS public.verse_discussions (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  author       UUID NOT NULL,
  body         TEXT NOT NULL,
  parent_id    INTEGER REFERENCES public.verse_discussions(id) ON DELETE CASCADE, -- one-level replies
  status       TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_discussions_page ON public.verse_discussions(entity_type, entity_id, created_at);

-- Public read of visible comments; writes via service-role.
ALTER TABLE public.verse_discussions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_discussions_public_read ON public.verse_discussions;
CREATE POLICY verse_discussions_public_read ON public.verse_discussions FOR SELECT USING (status = 'visible');

-- Watchlists are private (a user's own follows). RLS on, no public select policy: reads
-- go through the service-role API keyed to the signed-in user; the fan-out for
-- notify-on-change also uses service-role.
CREATE TABLE IF NOT EXISTS public.verse_watchlists (
  id           SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_verse_watchlists_page ON public.verse_watchlists(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verse_watchlists_user ON public.verse_watchlists(user_id);
ALTER TABLE public.verse_watchlists ENABLE ROW LEVEL SECURITY; -- no select policy: private

-- Notify-on-change reuses the existing notification spine. Add the watch type via the
-- established CHECK-swap (mirrors migrations 095 / 111 / 122).
ALTER TABLE public.creator_notifications DROP CONSTRAINT IF EXISTS creator_notifications_type_check;
ALTER TABLE public.creator_notifications ADD CONSTRAINT creator_notifications_type_check
  CHECK (type IN (
    'milestone', 'rating', 'comment', 'admin_dm', 'new_follower',
    'streak_milestone', 'group_mastered', 'followed_new_quiz',
    'badge_earned', 'cheer', 'verse_watch'
  ));

NOTIFY pgrst, 'reload schema';
