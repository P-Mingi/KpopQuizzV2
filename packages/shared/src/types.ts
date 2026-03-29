// ============================================
// Shared database row types
// ============================================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
  total_quizzes_created: number;
  total_plays_received: number;
  total_likes_received: number;
  xp: number;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  fandom_name: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  quiz_count: number;
  total_plays: number;
  seo_intro: string | null;
  is_custom: boolean;
  needs_review: boolean;
  created_by_user: boolean;
  created_at: string;
}

// ============================================
// Blind Test V2 types
// ============================================

export interface BlindTestSongV2 {
  id: string;
  title: string;
  artist: string;
  group_id: number | null;
  youtube_id: string;
  year: number;
  is_title_track: boolean;
  gender: 'gg' | 'bg' | 'solo_female' | 'solo_male' | 'mixed';
  generation: string | null;
  clip_intro: number | null;
  clip_chorus: number | null;
  clip_verse: number | null;
  clip_bridge: number | null;
  wrong_answers: string[];
  times_played: number;
  times_correct: number;
  avg_answer_time: number;
  status: 'active' | 'inactive' | 'broken';
  created_at: string;
  updated_at: string;
}

// ============================================
// Blind Test Game types (Prompt 02)
// ============================================

export interface Player {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  level: number;
  xp: number;
  total_songs_played: number;
  total_songs_correct: number;
  total_points: number;
  best_combo: number;
  current_streak: number;
  longest_streak: number;
  last_played_date: string | null;
  liked_song_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PlayerGroupMastery {
  id: string;
  player_id: string;
  group_id: number;
  mastery_level: number;
  mastery_xp: number;
  songs_correct: number;
  songs_played: number;
  best_score: number;
  updated_at: string;
}

export interface BtPlay {
  id: string;
  player_id: string | null;
  mode_id: string;
  score: number;
  correct: number;
  total: number;
  total_time: number;
  best_combo: number;
  songs: BtPlaySong[];
  created_at: string;
}

export interface BtPlaySong {
  song_id: string;
  question_type: 'title' | 'artist';
  picked: number;
  correct: boolean;
  time: number;
  points: number;
  combo: number;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface DailyChallenge {
  id: string;
  date: string;
  song_ids: string[];
  clip_point: string;
  clip_duration: number;
  created_at: string;
}

export interface DailyChallengePlay {
  id: string;
  player_id: string;
  challenge_id: string;
  score: number;
  correct: number;
  total_time: number;
  songs: BtPlaySong[];
  created_at: string;
}
