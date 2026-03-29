# Blind Test V2 — Strategy & Architecture Document

## The Big Picture

Replace the current system (songs embedded in game JSONB) with a proper song database that powers unlimited blind test modes dynamically. Add a full admin UI for managing songs and timestamps.

---

## 1. The Songs Database

### `blind_test_songs` table

```sql
CREATE TABLE public.blind_test_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Song identity
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id),
  youtube_id TEXT NOT NULL,
  
  -- Metadata for filtering
  year INTEGER NOT NULL,                     -- release year: 2018, 2024, etc.
  is_title_track BOOLEAN NOT NULL DEFAULT true,
  gender TEXT NOT NULL DEFAULT 'mixed',       -- 'gg', 'bg', 'solo_female', 'solo_male', 'mixed'
  generation TEXT,                            -- '2nd', '3rd', '4th', '5th'
  
  -- 4 clip start timestamps (in seconds) — NULL means "not set yet"
  clip_intro INTEGER,     -- first seconds of the song (skip label logos)
  clip_chorus INTEGER,    -- where the main hook/chorus starts
  clip_verse INTEGER,     -- a verse section (NOT the chorus)
  clip_bridge INTEGER,    -- bridge or pre-chorus section
  
  -- Wrong answers (3 song titles from same group or similar groups)
  wrong_answers TEXT[] NOT NULL DEFAULT '{}',  -- e.g. ['Butter', 'Permission to Dance', 'Boy With Luv']
  
  -- Stats (updated per play)
  times_played INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  avg_answer_time FLOAT DEFAULT 0,
  
  -- Management
  status TEXT NOT NULL DEFAULT 'active',      -- 'active', 'inactive', 'broken'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_btsongs_group ON blind_test_songs(group_id);
CREATE INDEX idx_btsongs_year ON blind_test_songs(year);
CREATE INDEX idx_btsongs_gender ON blind_test_songs(gender);
CREATE INDEX idx_btsongs_gen ON blind_test_songs(generation);
CREATE INDEX idx_btsongs_status ON blind_test_songs(status);
CREATE INDEX idx_btsongs_youtube ON blind_test_songs(youtube_id);
```

### Why this design:

- **4 clip timestamps per song**: You set them once. Every mode picks the right one.
- **NULL timestamps**: If `clip_bridge` is NULL, the song doesn't appear in "bridge mode." No crashes, no empty clips. The mode query simply filters `WHERE clip_bridge IS NOT NULL`.
- **wrong_answers as TEXT[]**: 3 wrong song titles stored per song. These are reused across all modes. They should be from the same artist/group for single-group modes, or from similar groups for mixed modes.
- **Metadata fields**: `gender`, `generation`, `year`, `is_title_track` power the filter system. A "4th gen girl group title tracks" mode is just `WHERE generation = '4th' AND gender = 'gg' AND is_title_track = true`.

---

## 2. Game Modes

Modes are NOT stored in the database. They're defined in code as configuration objects:

```typescript
// src/lib/blind-test-modes.ts

export interface BlindTestMode {
  id: string;
  title: string;
  description: string;
  clip_point: 'intro' | 'chorus' | 'verse' | 'bridge';
  clip_duration: number;   // seconds
  song_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  filter: {
    group_slug?: string;
    gender?: 'gg' | 'bg' | 'solo_female' | 'solo_male';
    generation?: string;
    year_min?: number;
    year_max?: number;
    is_title_track?: boolean;
  };
  // Visual
  color: string;           // badge color for the card
  icon?: string;           // optional icon identifier
}

export const BLIND_TEST_MODES: BlindTestMode[] = [
  // ─── DIFFICULTY MODES ───
  {
    id: 'intro-challenge',
    title: 'Intro challenge',
    description: 'Name it from the first 5 seconds',
    clip_point: 'intro',
    clip_duration: 5,
    song_count: 10,
    difficulty: 'medium',
    filter: {},
    color: 'green',
  },
  {
    id: 'classic',
    title: 'Classic',
    description: 'The standard blind test — 10 seconds of chorus',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: {},
    color: 'blue',
  },
  {
    id: 'verse-only',
    title: 'Verse only',
    description: 'No choruses — only real fans survive',
    clip_point: 'verse',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'hard',
    filter: {},
    color: 'red',
  },
  {
    id: 'bridge-or-break',
    title: 'Bridge or break',
    description: 'The hardest sections only',
    clip_point: 'bridge',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'expert',
    filter: {},
    color: 'red',
  },

  // ─── GROUP-SPECIFIC MODES ───
  {
    id: 'bts',
    title: 'BTS',
    description: 'How well do you know the BTS discography?',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { group_slug: 'bts' },
    color: 'purple',
  },
  {
    id: 'blackpink',
    title: 'BLACKPINK',
    description: 'They only have 30 songs — can you name them all?',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { group_slug: 'blackpink' },
    color: 'pink',
  },
  // ... more group-specific modes

  // ─── FILTER MODES ───
  {
    id: '4th-gen-gg',
    title: '4th gen girl groups',
    description: 'aespa, IVE, NewJeans, LE SSERAFIM, ITZY, (G)I-DLE',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { generation: '4th', gender: 'gg' },
    color: 'pink',
  },
  {
    id: '4th-gen-bg',
    title: '4th gen boy groups',
    description: 'Stray Kids, ENHYPEN, TXT, ATEEZ',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { generation: '4th', gender: 'bg' },
    color: 'blue',
  },
  {
    id: 'recent-hits',
    title: '2024-2026 hits',
    description: 'The latest K-pop songs — how current are you?',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'medium',
    filter: { year_min: 2024, is_title_track: true },
    color: 'amber',
  },
];
```

### How a mode generates a game

When a player picks a mode, the server:

1. Queries songs matching the mode's filter + clip_point is NOT NULL
2. Randomly selects `song_count` songs
3. For each song, picks the clip start from the appropriate `clip_{point}` column
4. Shuffles wrong answers + correct answer into 4 choices
5. Returns the song list to the player (without correct_index until they answer)

```typescript
async function generateBlindTestRound(mode: BlindTestMode) {
  const clipColumn = `clip_${mode.clip_point}`;
  
  let query = supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, ' + clipColumn + ', group_id')
    .eq('status', 'active')
    .not(clipColumn, 'is', null);  // only songs with this clip point set

  // Apply filters
  if (mode.filter.group_slug) {
    const group = await getGroupBySlug(mode.filter.group_slug);
    if (group) query = query.eq('group_id', group.id);
  }
  if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
  if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
  if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
  if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

  const { data: songs } = await query;

  if (!songs || songs.length < mode.song_count) {
    return null; // not enough songs for this mode
  }

  // Randomly pick song_count songs
  const shuffled = songs.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, mode.song_count);

  return selected.map(song => ({
    id: song.id,
    youtube_id: song.youtube_id,
    clip_start: song[clipColumn],
    clip_duration: mode.clip_duration,
    title: song.title,        // hidden from client until answered
    artist: song.artist,      // hidden from client until answered
    choices: shuffleArray([song.title, ...song.wrong_answers.slice(0, 3)]),
    correct_index: null,       // computed after shuffle, sent to client only after answer
  }));
}
```

### Mode availability

A mode is "available" when enough songs match its filter + clip point. If a mode needs 10 songs but only 6 songs have `clip_bridge` set, the mode shows as "Coming soon (6/10 songs)" on the UI. This incentivizes you to add more timestamps.

```typescript
async function getModeAvailability(mode: BlindTestMode): Promise<{ available: boolean; songCount: number }> {
  const clipColumn = `clip_${mode.clip_point}`;
  
  let query = supabase
    .from('blind_test_songs')
    .select('id', { count: 'exact' })
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  // Apply same filters as generateBlindTestRound...
  
  const { count } = await query;
  return {
    available: (count ?? 0) >= mode.song_count,
    songCount: count ?? 0,
  };
}
```

---

## 3. Admin Panel — Song Manager

### 3.1 Song List View

```
Admin > Blind Test Songs                    [+ Add song]

Search: [                    ]   Filter: [All groups ▾] [All gens ▾]

┌────────────────────────────────────────────────────────────────────┐
│ Song             │ Artist    │ Group │ Year │ Intro │ Chor. │ Verse│ Bridge │
├──────────────────┼───────────┼───────┼──────┼───────┼───────┼──────┼────────┤
│ Dynamite         │ BTS       │ BTS   │ 2020 │ 0:00  │ 0:49  │ 0:18 │ 2:35  │
│ DDU-DU DDU-DU    │ BLACKPINK │ BP    │ 2018 │ 0:00  │ 0:52  │ 0:22 │ 2:18  │
│ Next Level       │ aespa     │ aespa │ 2021 │ 0:00  │ 0:38  │ 0:15 │  --   │
│ Hype Boy         │ NewJeans  │ NJ    │ 2022 │ 0:00  │ 0:40  │ 0:12 │ 2:02  │
│ ...              │           │       │      │       │       │      │       │
└────────────────────────────────────────────────────────────────────┘

Showing 40 of 40 songs  ·  Modes available: 8/12
```

### 3.2 Song Edit View (click any song row)

```
Edit song: Dynamite

┌────────────────────────────────────────────────────────────────────┐
│  YouTube: https://youtube.com/watch?v=gdZLi9oWNZg                │
│  [Thumbnail preview]                                              │
│                                                                    │
│  Title:   [ Dynamite              ]                               │
│  Artist:  [ BTS                   ]                               │
│  Group:   [ BTS ▾ ]                                               │
│  Year:    [ 2020 ]                                                │
│  Gender:  [BG] GG  Solo  Mixed                                    │
│  Gen:     2nd  3rd  [4th]  5th                                    │
│  Title track: [Yes] No                                            │
│                                                                    │
│  ── Clip timestamps ──────────────────────────────────────────    │
│                                                                    │
│  Intro:   [ 0:00 ]  [▶ Preview]  [▶ Open MV]                    │
│  Chorus:  [ 0:49 ]  [▶ Preview]  [▶ Open MV]                    │
│  Verse:   [ 0:18 ]  [▶ Preview]  [▶ Open MV]                    │
│  Bridge:  [ 2:35 ]  [▶ Preview]  [▶ Open MV]                    │
│                                                                    │
│  ── Wrong answers ────────────────────────────────────────────    │
│                                                                    │
│  1: [ Butter                ]                                     │
│  2: [ Permission to Dance   ]                                     │
│  3: [ Boy With Luv          ]                                     │
│                                                                    │
│  [Cancel]  [Save]                                                  │
└────────────────────────────────────────────────────────────────────┘
```

**"Preview" button per clip**: plays audio-only from that timestamp for the mode's duration (5s for intro, 10s for others). Uses hidden YouTube IFrame — same technique as the player. This lets you fine-tune timestamps by listening.

**"Open MV" button**: opens the YouTube video at that timestamp in a new tab (`youtube.com/watch?v={id}&t={seconds}`). This lets you visually find the right moment.

### 3.3 Add Song View

```
Add new song

YouTube URL: [ https://youtube.com/watch?v=...  ]  [Fetch]

[Thumbnail]  Title auto-detected: "BTS (방탄소년단) 'Dynamite' Official MV"
             Parsed: Dynamite — BTS

Title:   [ Dynamite              ]  (auto-filled, editable)
Artist:  [ BTS                   ]  (auto-filled, editable)
Group:   [ BTS ▾ ]
Year:    [ 2020 ]
Gender:  BG  GG  Solo  Mixed
Gen:     2nd  3rd  4th  5th
Title track: Yes  No

Clip timestamps (set at least one):
  Intro:   [ 0:00 ]  [▶ Preview]
  Chorus:  [      ]  [▶ Preview]
  Verse:   [      ]  [▶ Preview]
  Bridge:  [      ]  [▶ Preview]

Wrong answers:
  1: [                    ]  (auto-suggest from same group)
  2: [                    ]
  3: [                    ]

[Cancel]  [Save & add another]  [Save]
```

"Save & add another" saves and clears the form for the next song. This makes bulk-adding faster.

---

## 4. Player-Facing Pages

### 4.1 /blind-test — Mode Selection Page

This replaces the current listing page. Instead of showing individual blind tests, it shows MODES the player can choose:

```
Blind test
Listen to a clip. Guess the song. No peeking.

[40 songs]  [8 modes]  [0 total plays]

── Difficulty ──────────────────────────────────────────

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ [thumbnails] │  │ [thumbnails] │  │ [eq bars]    │  │ [eq bars]    │
│              │  │              │  │              │  │              │
│ Intro        │  │ Classic      │  │ Verse only   │  │ Bridge       │
│ challenge    │  │              │  │              │  │ or break     │
│ 5s · Easy    │  │ 10s · Medium │  │ 10s · Hard   │  │ 10s · Expert │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

── By group ────────────────────────────────────────────

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ [BTS thumb]  │  │ [BP thumb]   │  │ [SKZ thumb]  │
│              │  │              │  │              │
│ BTS          │  │ BLACKPINK    │  │ Stray Kids   │
│ 15 songs     │  │ 10 songs     │  │ 12 songs     │
└──────────────┘  └──────────────┘  └──────────────┘

── By generation ───────────────────────────────────────

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ [4th gen GG] │  │ [4th gen BG] │  │ [2024-2026]  │
│              │  │              │  │              │
│ 4th gen GG   │  │ 4th gen BG   │  │ Recent hits  │
│ 20 songs     │  │ 18 songs     │  │ 15 songs     │
└──────────────┘  └──────────────┘  └──────────────┘

── Top players ─────────────────────────────────────────

1. @army_mina    87/100 correct
2. @carat        72/100 correct
3. ...
```

### 4.2 /blind-test/[mode-id] — Play a Mode

URL structure: `/blind-test/classic`, `/blind-test/bts`, `/blind-test/verse-only`

NOT using `/g/[slug]` anymore. Blind tests get their own route namespace.

The flow:
1. Intro screen: mode title, description, difficulty badge, song count, avg score, "Play" button
2. Server generates a random set of songs for this mode
3. Player plays through (same player UI as before: equalizer, timer, MV reveal, etc.)
4. Results screen with score, missed songs, share button

**Every play is a NEW random set of songs.** If the mode has 30 eligible songs and needs 10, each play gets a different random 10. This means:
- Infinite replayability
- No two players get the same exact test (unless very few songs)
- You can't memorize the order

### 4.3 Mode Cards — Visual Design

Each mode card on /blind-test shows:
- 4 MV thumbnails mosaic (from random songs in that mode) for easy/medium modes
- Dark background + equalizer bars for hard/expert modes (same concept as before)
- Mode title, clip duration, difficulty badge
- Song count available

```tsx
function ModeCard({ mode, songCount }: { mode: BlindTestMode; songCount: number }) {
  const isAvailable = songCount >= mode.song_count;
  
  return (
    <Link href={isAvailable ? `/blind-test/${mode.id}` : '#'}>
      <div className={`rounded-2xl overflow-hidden border border-[var(--border-light)] ${
        isAvailable ? 'hover:border-[var(--border-medium)]' : 'opacity-50'
      }`}>
        {/* Thumbnail area or equalizer */}
        {mode.difficulty === 'hard' || mode.difficulty === 'expert' ? (
          <DarkEqualizerPreview />
        ) : (
          <ThumbnailMosaic mode={mode} />
        )}
        
        <div className="p-3">
          <div className="flex gap-1.5 mb-1">
            <DifficultyBadge difficulty={mode.difficulty} />
          </div>
          <p className="text-sm font-medium">{mode.title}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {isAvailable
              ? `${songCount} songs · ${mode.clip_duration}s`
              : `Coming soon (${songCount}/${mode.song_count} songs)`
            }
          </p>
        </div>
      </div>
    </Link>
  );
}
```

---

## 5. Migration Plan

### Step 1: Create the `blind_test_songs` table

### Step 2: Migrate existing 40 songs from the 4 JSONB blind tests

Extract each song from the existing games' JSONB and insert into the new table:

```sql
-- For each existing blind test game, extract songs
-- and insert them into blind_test_songs
-- The clip_start in the JSONB becomes the appropriate clip_{mode} column
-- based on the game's original clip_mode setting
```

### Step 3: Build the admin song manager UI

### Step 4: Build the new /blind-test mode selection page

### Step 5: Build the /blind-test/[mode-id] dynamic player

### Step 6: Delete the old blind test games from the `games` table

### Step 7: Update the old `/g/[slug]` routes to redirect to new modes

---

## 6. Scoring & Stats

### Per-song stats

Each time a song is played (in any mode):
- Increment `times_played`
- If correct, increment `times_correct`
- Update `avg_answer_time`

These stats are global — they aggregate across all modes. This is fine because a song's difficulty is mostly about the clip point, not the mode.

### Per-player stats

Track in `blind_test_plays` table:

```sql
CREATE TABLE public.blind_test_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id),
  mode_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  choices JSONB NOT NULL,  -- { song_id: { picked, correct, time } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_btplays_player ON blind_test_plays(player_id);
CREATE INDEX idx_btplays_mode ON blind_test_plays(mode_id);
```

This replaces the old `game_plays` table for blind tests.

### Leaderboard

Top players = sorted by total correct answers across all modes.

Per-mode leaderboard: highest score in that mode.

---

## 7. What This Enables (Future)

- **Daily challenge**: auto-pick 10 songs, same set for everyone for 24 hours, leaderboard resets daily
- **Speed run**: 30 songs, 5s each, no pause between — pure speed
- **Streak tracking**: play a blind test every day, maintain a streak
- **Difficulty progression**: start with Classic, unlock Verse Only at 80%+ avg, unlock Bridge at 90%+
- **Community requests**: "add [song] to the blind test" request form
- **More clip points**: `clip_dance_break`, `clip_rap_verse`, `clip_outro` — each one creates a new mode for free
- **Cross-platform sharing**: result cards that say "I got 9/10 on BTS verse-only mode"

None of these require architectural changes — they're all just new queries or UI features on top of the same songs table.

---

## 8. Build Order (Prompts)

### Prompt 1: Database + Migration
- Create `blind_test_songs` table
- Create `blind_test_plays` table
- Migrate existing 40 songs from JSONB to new table
- RLS policies

### Prompt 2: Admin Song Manager
- Song list view (table with all songs, timestamps, filters)
- Song edit view (edit all fields, preview clips, open MV)
- Add song view (YouTube URL paste, auto-detect, set timestamps)
- Preview clip functionality (hidden YT iframe)

### Prompt 3: /blind-test Page Redesign + Mode System
- Mode configuration (the BLIND_TEST_MODES array)
- /blind-test page with mode cards, difficulty sections, group sections
- Mode availability calculation
- Thumbnail mosaic component

### Prompt 4: /blind-test/[mode-id] Player
- Dynamic song generation from songs table
- Updated player flow (same UI: equalizer, timer, MV reveal)
- Score recording in blind_test_plays
- Results screen
- XP awards

### Prompt 5: Cleanup
- Delete old blind test games from `games` table
- Remove old admin creation page (if not already deleted)
- Redirect old `/g/[slug]` blind test URLs to new mode pages
- Update navbar, sitemap, metadata

### Prompt 6: Populate Songs (Claude Code)
- Add 60+ more songs to reach 100 total
- Cover: BTS (15), BLACKPINK (10), Stray Kids (12), TWICE (12), aespa (8), NewJeans (6), IVE (6), EXO (10), SEVENTEEN (8), (G)I-DLE (6), ITZY (6), others
- Set all 4 clip timestamps per song
- Verify all YouTube IDs

---

## Decision: What NOT to Build Now

- Daily challenge (needs active user base)
- Speed run mode (needs 30+ songs per filter group)
- Streak tracking (needs daily active users)
- Difficulty progression/unlocks (needs enough plays to establish baselines)
- Push notifications
- Social features (comments, sharing within the site)

These are all post-launch features that require the song database to be populated and active users to be playing. The song database + modes + admin UI is the foundation everything else builds on.
