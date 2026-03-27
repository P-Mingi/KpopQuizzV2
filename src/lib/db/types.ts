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

export type QuizType = 'multiple_choice' | 'true_false' | 'guess_from_clues';
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

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | GuessFromCluesQuestion;

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
}

// ============================================
// Game types
// ============================================

export type GameType = 'this_or_that';
export type GameStatus = 'published' | 'flagged' | 'removed';

export interface Matchup {
  id: string;
  option_a: string;
  option_b: string;
  votes_a: number;
  votes_b: number;
}

export interface GameContent {
  matchups: Matchup[];
}

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
  play_count: number;
  like_count: number;
  matchup_count: number;
  content: GameContent;
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
