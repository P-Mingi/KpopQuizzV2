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

export type GameType = 'this_or_that' | 'blind_test' | 'name_all_members' | 'name_all_songs' | 'name_top_songs' | 'name_all_groups' | 'name_all_idols';
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

// Name All Members
export interface NameAllMember {
  name: string;
  aliases: string[];
  photo_url: string | null;
  position: string;
  color: string;
}

export interface NameAllMembersContent {
  members: NameAllMember[];
  timer_seconds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type GameContent = ThisOrThatContent | BlindTestContent | NameAllMembersContent;

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

// ============================================================
// This or That tournament game
// ============================================================

export type TotCategoryType = 'idol' | 'group' | 'song';

export interface TotCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: TotCategoryType;
  pool_size: number;
  play_count: number;
  is_published: boolean;
  created_at: string;
}

export interface TotItem {
  id: string;
  category_id: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  color: string;
  tags: string[];
  pick_count: number;
  appear_count: number;
  sort_order: number;
  created_at: string;
}

export interface TotCategoryWithItems extends TotCategory {
  items: TotItem[];
}

export interface TotBracketEntry {
  winner_id: string;
  loser_id: string;
  round: number;
}

// ============================================================
// Battle Rooms
// ============================================================

export type BattleRoomStatus = 'lobby' | 'active' | 'ended' | 'closed';
export type BattleDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane';
export type BattleGroupFilterMode = 'all' | 'specific' | 'by_gen';
export type BattleRoomPrivacy = 'public' | 'private';
export type BattleRoundStatus = 'pending' | 'countdown' | 'active' | 'reveal' | 'ended';
export type BattleQuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type BattleReportReason = 'wrong' | 'hard' | 'nsfw' | 'spam' | 'other';

export interface BattleRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: BattleRoomStatus;
  difficulty: BattleDifficulty;
  group_filter_mode: BattleGroupFilterMode;
  group_filter_values: string[];
  time_per_round: 10 | 15 | 20 | 30;
  korean_mode: boolean;
  privacy: BattleRoomPrivacy;
  current_round_id: string | null;
  winner_player_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_activity_at: string;
}

export interface BattlePlayer {
  id: string;
  room_id: string;
  user_id: string | null;
  guest_session_id: string | null;
  display_name: string;
  avatar_color: string;
  avatar_initial: string;
  score: number;
  is_host: boolean;
  is_connected: boolean;
  joined_at: string;
  left_at: string | null;
  correct_count: number;
  fastest_answer_seconds: number | null;
}

export interface BattleQuestion {
  id: string;
  prompt: string;
  text_content: string | null;
  image_url: string | null;
  answer: string;
  variants: string[];
  group_name: string;
  difficulty: BattleDifficulty;
  tags: string[];
  status: BattleQuestionStatus;
  submitter_user_id: string | null;
  rejection_reason: string | null;
  moderator_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  plays: number;
  correct_count: number;
  upvotes: number;
  reports: number;
  created_at: string;
  updated_at: string;
}

export interface BattleRound {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  status: BattleRoundStatus;
  started_at: string | null;
  countdown_ends_at: string | null;
  round_ends_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface BattleRoundAnswer {
  id: string;
  round_id: string;
  player_id: string;
  answer_text: string;
  is_correct: boolean;
  points_awarded: number;
  time_taken_seconds: number | null;
  attempt_number: number;
  submitted_at: string;
}

export interface BattleChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  message: string;
  created_at: string;
}

export interface BattleRoomSettings {
  difficulty: BattleDifficulty;
  group_filter_mode: BattleGroupFilterMode;
  group_filter_values: string[];
  time_per_round: 10 | 15 | 20 | 30;
  korean_mode: boolean;
  privacy: BattleRoomPrivacy;
}

// ============================================================
// Pinterest Cards V2
// ============================================================

export type PinterestCardVariant = 'editorial' | 'neon' | 'y2k';
export type PinterestGenerationStatus = 'pending' | 'generating' | 'ready' | 'failed';
export type PinterestPostStatus = 'unposted' | 'queued' | 'posted' | 'failed';

export interface QuizPinterestCard {
  id: string;
  quiz_id: string;
  variant: PinterestCardVariant;
  card_image_url: string | null;
  generation_status: PinterestGenerationStatus;
  generation_error: string | null;
  generated_at: string | null;
  pinterest_status: PinterestPostStatus;
  pinterest_posted_at: string | null;
  pinterest_pin_id: string | null;
  created_at: string;
  updated_at: string;
}
