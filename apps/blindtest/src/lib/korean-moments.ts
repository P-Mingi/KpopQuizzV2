/**
 * Korean micro-moments: Hangul phrases dropped in at emotional peaks during
 * gameplay and on results. Each key is used in exactly one place to keep the
 * Korean from feeling random or decorative.
 */

export interface KoreanMoment {
  text: string;
  romanized: string;
  meaning: string;
}

export const KOREAN_MOMENTS: Record<string, KoreanMoment> = {
  // During gameplay
  combo3:  { text: '\uD654\uC774\uD305!',        romanized: 'hwaiting!',    meaning: "let's go!" },
  combo5:  { text: '\uB300\uBC15!',              romanized: 'daebak!',      meaning: 'amazing!' },
  combo8:  { text: '\uBBF8\uCCE4\uB2E4!',        romanized: 'michyeotda!',  meaning: "that's insane!" },
  combo10: { text: '\uC804\uC124\uC774\uB2E4!',  romanized: 'jeonseolida!', meaning: "you're a legend!" },

  wrong:   { text: '\uC544\uC774\uACE0~',        romanized: 'aigo~',        meaning: 'oh no~' },
  timeout: { text: '\uC557!',                    romanized: 'at!',          meaning: 'oops!' },

  // Results screen
  perfect:     { text: '\uC62C\uD0AC!',           romanized: 'all-kill!',   meaning: 'perfect sweep!' },
  nearPerfect: { text: '\uC544\uAE4C\uB2E4!',     romanized: 'akkapda!',    meaning: 'so close!' },
  great:       { text: '\uB300\uBC15!',           romanized: 'daebak!',     meaning: 'amazing!' },
  good:        { text: '\uAD1C\uCC2E\uC544~',     romanized: 'gwaenchana~', meaning: "it's okay~" },
  tryAgain:    { text: '\uB2E4\uC2DC!',           romanized: 'dasi!',       meaning: 'again!' },

  // Level up
  levelUp: { text: '\uCD95\uD558\uD574!', romanized: 'chukahae!', meaning: 'congratulations!' },

  // Streak
  streakRisk: { text: '\uC548\uB3FC!',   romanized: 'andwae!',   meaning: 'no way!' },
  streakGrow: { text: '\uD654\uC774\uD305!', romanized: 'hwaiting!', meaning: 'keep going!' },
};

/** Returns the Korean combo phrase for a given combo count, or null below 3. */
export function getComboKorean(combo: number): string | null {
  if (combo >= 10) return KOREAN_MOMENTS.combo10!.text;
  if (combo >= 8) return KOREAN_MOMENTS.combo8!.text;
  if (combo >= 5) return KOREAN_MOMENTS.combo5!.text;
  if (combo >= 3) return KOREAN_MOMENTS.combo3!.text;
  return null;
}
