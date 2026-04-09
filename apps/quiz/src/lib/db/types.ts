// ============================================
// Database row types (match schema exactly)
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

export type QuizType = 'multiple_choice' | 'true_false' | 'guess_from_clues' | 'image' | 'intruder';
export type QuizStatus = 'draft' | 'published' | 'flagged' | 'removed';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizSettings {
  timer: boolean;
  timer_seconds: number;
  shuffle: boolean;
  show_answers: boolean;
}

export interface MultipleChoiceQuestion {
  question: string;
  options: [string, string, string, string];
  correct: number;
  fun_fact?: string;
}

export interface TrueFalseQuestion {
  question: string;
  correct: boolean;
  fun_fact?: string;
}

export interface GuessFromCluesQuestion {
  question: string;
  clues: [string, string, string];
  options: [string, string, string, string];
  correct: number;
  fun_fact?: string;
}

export interface ImageQuestion {
  question: string;
  image_url: string;
  options: [string, string, string, string];
  correct: number;
  fun_fact?: string;
}

export interface IntruderOption {
  label: string;
  image_url: string;
}

export interface IntruderQuestion {
  question: string;
  options: [IntruderOption, IntruderOption, IntruderOption, IntruderOption];
  correct: number; // index of the intruder
  fun_fact?: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | GuessFromCluesQuestion | ImageQuestion | IntruderQuestion;

export interface Quiz {
  id: string;
  creator_id: string;
  group_id: number;
  title: string;
  slug: string;
  quiz_type: QuizType;
  questions: Question[];
  settings: QuizSettings;
  difficulty: Difficulty;
  status: QuizStatus;
  is_quiz_of_the_day: boolean;
  quiz_of_the_day_date: string | null;
  play_count: number;
  total_score_sum: number;
  total_completions: number;
  report_count: number;
  created_at: string;
  updated_at: string;
}

export interface Play {
  id: string;
  quiz_id: string;
  player_id: string | null;
  score: number;
  total_questions: number;
  time_taken_seconds: number | null;
  created_at: string;
}

export type ReportReason = 'wrong_answers' | 'spam' | 'inappropriate' | 'duplicate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface Report {
  id: string;
  quiz_id: string;
  reporter_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

// ============================================
// Joined/computed types (used in components)
// ============================================

export interface QuizWithGroup {
  id: string;
  title: string;
  slug: string;
  quiz_type: QuizType;
  questions: Question[];
  settings: QuizSettings;
  difficulty: Difficulty;
  status: QuizStatus;
  is_quiz_of_the_day: boolean;
  quiz_of_the_day_date: string | null;
  play_count: number;
  total_score_sum: number;
  total_completions: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  creator_id: string;
  group_id: number;
  group_name: string;
  group_slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  fandom_name: string;
  creator_username: string;
  creator_avatar_url: string | null;
  creator_avatar_bg: string;
  creator_avatar_text: string;
  cover_image_url: string | null;
}

export interface QuizCardData {
  id: string;
  title: string;
  slug: string;
  quiz_type: QuizType;
  difficulty: Difficulty;
  play_count: number;
  total_score_sum: number;
  total_completions: number;
  like_count: number;
  created_at: string;
  group_name: string;
  group_slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  fandom_name: string;
  creator_username: string;
  creator_avatar_url: string | null;
  creator_avatar_bg: string;
  creator_avatar_text: string;
  question_count: number;
  cover_image_url: string | null;
}


export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon_type: string;
  color_bg: string;
  color_stroke: string;
  color_text: string;
  sort_order: number;
}

export interface UserBadge {
  badge_id: string;
  earned_at: string;
}

export interface TopCreator {
  username: string;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  total_quizzes_created: number;
  weekly_plays: number;
}

export interface RecordPlayResult {
  play_id: string;
  percentile: number;
}

// ============================================
// Game types (This or That, Blind Test, etc.)
// ============================================

export type GameType = 'this_or_that' | 'blind_test';
export type GameStatus = 'draft' | 'published' | 'flagged' | 'removed';

export interface Matchup {
  id: string;
  option_a: string;
  option_b: string;
  votes_a: number;
  votes_b: number;
}

export interface ThisOrThatContent {
  matchups: Matchup[];
}

export type ClipMode = 'chorus' | 'intro' | 'random' | 'custom';

export interface BlindTestSong {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  clip_start: number;
  clip_mode: ClipMode;
  choices: [string, string, string, string];
  correct_index: number;
  times_correct: number;
  times_played: number;
  avg_answer_time: number;
}

export interface BlindTestSettings {
  clip_duration: number;
  song_count: number;
  difficulty: Difficulty;
}

export interface BlindTestContent {
  settings: BlindTestSettings;
  songs: BlindTestSong[];
}

export type GameContent = ThisOrThatContent | BlindTestContent;

export interface Game {
  id: string;
  creator_id: string;
  group_id: number | null;
  title: string;
  slug: string;
  game_type: GameType;
  content: GameContent;
  matchup_count: number;
  status: GameStatus;
  play_count: number;
  like_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
}

export interface GameCardData {
  id: string;
  title: string;
  slug: string;
  game_type: GameType;
  content: GameContent;
  matchup_count: number;
  play_count: number;
  like_count: number;
  created_at: string;
  group_name: string | null;
  group_slug: string | null;
  display_color: string | null;
  text_color: string | null;
  logo_url: string | null;
  creator_username: string;
  creator_avatar_url: string | null;
  creator_avatar_bg: string;
  creator_avatar_text: string;
}

export interface GameWithGroup extends Game {
  group_name: string | null;
  group_slug: string | null;
  display_color: string | null;
  text_color: string | null;
  logo_url: string | null;
  fandom_name: string | null;
  creator_username: string;
  creator_avatar_url: string | null;
  creator_avatar_bg: string;
  creator_avatar_text: string;
}
