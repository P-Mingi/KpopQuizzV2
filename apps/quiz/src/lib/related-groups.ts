export const RELATED_GROUPS: Record<string, string[]> = {
  'bts': ['seventeen', 'txt', 'enhypen'],
  'blackpink': ['twice', 'red-velvet', 'aespa'],
  'stray-kids': ['ateez', 'txt', 'enhypen'],
  'seventeen': ['bts', 'got7', 'nct'],
  'twice': ['blackpink', 'red-velvet', 'itzy'],
  'aespa': ['ive', 'newjeans', 'le-sserafim'],
  'newjeans': ['ive', 'le-sserafim', 'aespa'],
  'exo': ['bts', 'shinee', 'got7'],
  'enhypen': ['txt', 'stray-kids', 'ateez'],
  'ateez': ['stray-kids', 'enhypen', 'txt'],
  'g-i-dle': ['aespa', 'itzy', 'ive'],
  'ive': ['newjeans', 'le-sserafim', 'aespa'],
  'itzy': ['twice', 'g-i-dle', 'aespa'],
  'red-velvet': ['blackpink', 'twice', 'mamamoo'],
  'le-sserafim': ['newjeans', 'ive', 'aespa'],
  'txt': ['enhypen', 'stray-kids', 'ateez'],
  'shinee': ['exo', 'bts', 'got7'],
  'got7': ['bts', 'exo', 'seventeen'],
  'mamamoo': ['red-velvet', 'blackpink', 'g-i-dle'],
  'nct': ['exo', 'seventeen', 'stray-kids'],
  // SEO PR-I2: the priority rookie hubs were emitting no sibling cross-links.
  // Siblings pair a labelmate with fellow rookies (all have quizzes, so the
  // "Fans also play" section renders and the rookie hubs stop being orphaned).
  'cortis': ['txt', 'enhypen', 'illit'],           // BigHit/HYBE boy group + HYBE labelmates + rookie
  'illit': ['newjeans', 'le-sserafim', 'babymonster'], // HYBE girl-group labelmates + rookie
  'babymonster': ['blackpink', 'illit', 'cortis'], // YG labelmate + fellow rookies
};

export const RELATED_GROUP_NAMES: Record<string, string> = {
  'bts': 'BTS',
  'blackpink': 'BLACKPINK',
  'stray-kids': 'Stray Kids',
  'seventeen': 'SEVENTEEN',
  'twice': 'TWICE',
  'aespa': 'aespa',
  'newjeans': 'NewJeans',
  'exo': 'EXO',
  'enhypen': 'ENHYPEN',
  'ateez': 'ATEEZ',
  'g-i-dle': '(G)I-DLE',
  'ive': 'IVE',
  'itzy': 'ITZY',
  'red-velvet': 'Red Velvet',
  'le-sserafim': 'LE SSERAFIM',
  'txt': 'TXT',
  'shinee': 'SHINee',
  'got7': 'GOT7',
  'mamamoo': 'MAMAMOO',
  'nct': 'NCT',
  'cortis': 'Cortis',
  'illit': 'ILLIT',
  'babymonster': 'BABYMONSTER',
};
