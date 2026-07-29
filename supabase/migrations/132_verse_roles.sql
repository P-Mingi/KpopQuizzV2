-- 132_verse_roles.sql
-- Workstream W4.1 - per-space collaboration roles + memberships. Run manually in the
-- prod SQL editor; NOT auto-applied.
--
-- Introduces per-space membership and the role ladder:
--   Visitor (no row) -> Member -> Contributor -> Curator -> SpaceAdmin.
-- Global admins (ADMIN_USER_IDS) are treated as SpaceAdmin everywhere in code (the
-- owner's test account can therefore exercise every curator/reviewer flow).
--
-- This one migration also carries the columns later W4 steps need, to avoid extra
-- owner round-trips: per-space contributor reputation (W4.5) lives on the membership
-- row, and verse_spaces gets the collaboration `stage` column (W4.11) defaulting to
-- 'A' (curator-authored; members do not edit) - the Stage B/C mechanism ships OFF.

CREATE TABLE IF NOT EXISTS public.space_members (
  id             SERIAL PRIMARY KEY,
  group_id       INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL,                      -- auth.users id (no cross-schema FK by convention)
  role           TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'contributor', 'curator', 'space_admin')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  -- Per-space contributor reputation (W4.5); global editor XP stays in the passport spine.
  contrib_xp     INTEGER NOT NULL DEFAULT 0,
  contrib_streak INTEGER NOT NULL DEFAULT 0,
  last_contrib_date DATE,
  invited_by     UUID,
  blocked_by     UUID,
  blocked_at     TIMESTAMPTZ,
  block_reason   TEXT,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_space_members_group ON public.space_members(group_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_space_members_user  ON public.space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_role  ON public.space_members(group_id, role) WHERE status = 'active';

-- Public read of ACTIVE members only (member directory + counts); blocked rows are
-- visible only to the service-role client (curator tools). Writes via service-role.
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS space_members_public_read ON public.space_members;
CREATE POLICY space_members_public_read ON public.space_members FOR SELECT USING (status = 'active');

-- W4.11 foundation: per-space collaboration stage. 'A' = curator-authored (current
-- behaviour, members cannot edit). 'B'/'C' are flipped ON per space at launch.
ALTER TABLE public.verse_spaces
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'A' CHECK (stage IN ('A', 'B', 'C'));

NOTIFY pgrst, 'reload schema';
