-- Migration 121: Industry Pulse tracking foundations (Workstream T1.5, staged).
-- Run manually in the prod SQL editor; not auto-applied.
--
-- Google Trends was DROPPED after a feasibility spike: its data endpoint
-- hard-blocks (429) unattended datacenter IPs, so it could never survive a
-- monthly Vercel cron and would silently rot. Instead we snapshot official
-- public APIs going forward: YouTube MV view counts (daily) and Spotify
-- follower counts (weekly). Forward-accruing only, so charts will honestly say
-- "tracked since {date}". There is no public industry page yet; it launches
-- once 2-3 months of real history exist.
--
-- Four tables + one column on groups. All carry only PUBLIC information
-- (public view counts, public follower counts, public comeback dates), so RLS
-- is public-read; every write goes through the service-role client (crons +
-- admin API), which bypasses RLS, so there are no write policies.

-- 1. The MVs we snapshot daily (owner-managed in the admin panel).
CREATE TABLE IF NOT EXISTS public.mv_tracking (
  id          BIGSERIAL PRIMARY KEY,
  video_id    TEXT NOT NULL UNIQUE,           -- YouTube 11-char video id
  title       TEXT NOT NULL,                  -- song / MV title, e.g. "Dynamite"
  artist      TEXT NOT NULL,                  -- display artist, e.g. "BTS"
  group_id    INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
  category    TEXT NOT NULL DEFAULT 'evergreen' CHECK (category IN ('comeback', 'evergreen')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mv_tracking_active ON public.mv_tracking(active);

-- 2. Daily cumulative view-count snapshot per tracked MV. Idempotent per (mv, day).
CREATE TABLE IF NOT EXISTS public.mv_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  mv_id         BIGINT NOT NULL REFERENCES public.mv_tracking(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  views         BIGINT NOT NULL,              -- cumulative views at snapshot time (BTS > 1.7B, needs bigint)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mv_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_mv_snapshots_date ON public.mv_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_mv_snapshots_mv ON public.mv_snapshots(mv_id);

-- 3. Weekly follower-count snapshot per group (Spotify). Idempotent per (group, day).
CREATE TABLE IF NOT EXISTS public.spotify_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers     BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_spotify_snapshots_date ON public.spotify_snapshots(snapshot_date);

-- 4. Comebacks calendar (owner-managed) for the future "comeback impact" section.
CREATE TABLE IF NOT EXISTS public.comebacks (
  id            BIGSERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
  artist        TEXT NOT NULL,
  title         TEXT NOT NULL,                -- comeback title (song / album)
  release_date  DATE NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'single' CHECK (kind IN ('single', 'ep', 'album', 'mv')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comebacks_release ON public.comebacks(release_date DESC);

-- 5. Spotify artist id per group (mirrors the existing deezer_artist_id). The
--    weekly cron snapshots every group with a non-null id. base-62 string -> TEXT.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS spotify_artist_id TEXT;

-- RLS: public read (public data), service-role writes only.
ALTER TABLE public.mv_tracking       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comebacks         ENABLE ROW LEVEL SECURITY;

-- List tables are gated to active rows for the public; admin reads all via service role.
DROP POLICY IF EXISTS mvt_public_read ON public.mv_tracking;
CREATE POLICY mvt_public_read ON public.mv_tracking FOR SELECT USING (active = true);
DROP POLICY IF EXISTS cmb_public_read ON public.comebacks;
CREATE POLICY cmb_public_read ON public.comebacks FOR SELECT USING (active = true);

-- Snapshot tables are plain public numbers.
DROP POLICY IF EXISTS mvs_public_read ON public.mv_snapshots;
CREATE POLICY mvs_public_read ON public.mv_snapshots FOR SELECT USING (true);
DROP POLICY IF EXISTS sps_public_read ON public.spotify_snapshots;
CREATE POLICY sps_public_read ON public.spotify_snapshots FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
