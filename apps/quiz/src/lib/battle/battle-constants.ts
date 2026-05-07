// Battle Rooms palette (matches prototype C object)
export const BATTLE_PALETTE = {
  pink: '#D4537E',
  pinkHover: '#C44A72',
  pinkLight: 'rgba(212,83,126,0.08)',
  pinkBorder: 'rgba(212,83,126,0.15)',
  bg: '#FAF9F6',
  card: '#fff',
  cardHover: '#FAF2F5',
  cardBorder: '#e8e6e0',
  textDark: '#2c2c2a',
  textMuted: '#888780',
  textLight: '#b4b2a9',
  border: '#e8e6e0',
  borderLight: '#f0ede8',
  amber: '#e8a060',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9a7acc',
  chatBg: '#F5EFF1',
  chatBorder: '#EADBE0',
} as const;

// Groups available for filtering
export const BATTLE_GROUPS = [
  'BTS', 'BLACKPINK', 'Stray Kids', 'aespa', 'TWICE',
  'NewJeans', 'SEVENTEEN', 'IVE', 'EXO', 'Red Velvet',
  '(G)I-DLE', 'ITZY',
] as const;

// Game limits
export const BATTLE_MAX_PLAYERS = 8;
export const BATTLE_WIN_SCORE = 100;
export const BATTLE_CODE_LENGTH = 4;
export const BATTLE_MAX_CHAT_LENGTH = 500;
export const BATTLE_COUNTDOWN_SECONDS = 3;
export const BATTLE_TIME_OPTIONS = [10, 15, 20, 30] as const;
