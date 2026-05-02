// Sample data for the KpopQuiz prototype.
window.GROUPS = [
  { slug: 'blackpink',  name: 'BLACKPINK',  color: '#1F1F1F', logo: 'logos/blackpink.jpg',  fandom: 'BLINK',  members: ['Jisoo','Jennie','Rosé','Lisa'] },
  { slug: 'bts',        name: 'BTS',        color: '#5B2A8C', logo: 'logos/bts.jpg',        fandom: 'ARMY',   members: ['RM','Jin','Suga','J-Hope','Jimin','V','Jungkook'] },
  { slug: 'newjeans',   name: 'NewJeans',   color: '#3F86C9', logo: 'logos/newjeans.jpg',   fandom: 'Bunnies',members: ['Minji','Hanni','Danielle','Haerin','Hyein'] },
  { slug: 'stray-kids', name: 'Stray Kids', color: '#1B1B1B', logo: 'logos/stray-kids.jpg', fandom: 'STAY',   members: ['Bang Chan','Lee Know','Changbin','Hyunjin','Han','Felix','Seungmin','I.N'] },
  { slug: 'aespa',      name: 'aespa',      color: '#1F2D5C', logo: 'logos/aespa.jpg',      fandom: 'MY',     members: ['Karina','Giselle','Winter','Ningning'] },
  { slug: 'twice',      name: 'TWICE',      color: '#E84F8B', logo: 'logos/twice.jpg',      fandom: 'ONCE',   members: ['Nayeon','Jeongyeon','Momo','Sana','Jihyo','Mina','Dahyun','Chaeyoung','Tzuyu'] },
  { slug: 'ive',        name: 'IVE',        color: '#9D2A48', logo: 'logos/ive.jpg',        fandom: 'DIVE',   members: ['Yujin','Gaeul','Rei','Wonyoung','Liz','Leeseo'] },
  { slug: 'le-sserafim',name: 'LE SSERAFIM',color: '#3D2A6E', logo: 'logos/le-sserafim.jpg',fandom: 'FEARNOT',members: ['Sakura','Chaewon','Yunjin','Kazuha','Eunchae'] },
  { slug: 'seventeen',  name: 'SEVENTEEN',  color: '#D17D2D', logo: 'logos/seventeen.jpg',  fandom: 'CARAT',  members: ['S.Coups','Jeonghan','Joshua','Jun','Hoshi','Wonwoo','Woozi','DK','Mingyu','The8','Seungkwan','Vernon','Dino'] },
  { slug: 'txt',        name: 'TXT',        color: '#2A4D8A', logo: 'logos/txt.jpg',        fandom: 'MOA',    members: ['Yeonjun','Soobin','Beomgyu','Taehyun','Hueningkai'] },
  { slug: 'enhypen',    name: 'ENHYPEN',    color: '#1A1A1A', logo: 'logos/enhypen.jpg',    fandom: 'ENGENE', members: ['Jungwon','Heeseung','Jay','Jake','Sunghoon','Sunoo','Ni-ki'] },
  { slug: 'itzy',       name: 'ITZY',       color: '#C03B5C', logo: 'logos/itzy.jpg',       fandom: 'MIDZY',  members: ['Yeji','Lia','Ryujin','Chaeryeong','Yuna'] },
];

window.QUIZ_TYPES = {
  classic:  { label: 'Classic',   tint: 'classic'  },
  image:    { label: 'Image',     tint: 'image'    },
  intruder: { label: 'Intruder',  tint: 'intruder' },
  tf:       { label: 'True/False',tint: 'tf'       },
  clue:     { label: 'Clue',      tint: 'clue'     },
};

window.DIFFICULTIES = {
  easy:   { label: 'Easy',   tint: 'easy'   },
  medium: { label: 'Medium', tint: 'medium' },
  hard:   { label: 'Hard',   tint: 'hard'   },
};

window.QUIZZES = [
  { id: 'q1', slug: 'blackpink-deep-cuts', title: "BLACKPINK deep cuts: only true BLINKs survive", group: 'blackpink', type: 'classic',  difficulty: 'hard',   plays: 48210, completions: 31200, likes: 2140, creator: { name: 'jiwoo.bp',     bg: '#FFE4E9', text: '#9D2A48' } },
  { id: 'q2', slug: 'newjeans-mv-frame', title: 'NewJeans: name the MV from one frame', group: 'newjeans',  type: 'image',    difficulty: 'medium', plays: 31900, completions: 22000, likes: 1812, creator: { name: 'minji.daily',   bg: '#E1EEFB', text: '#0C447C' } },
  { id: 'q3', slug: 'bts-lyric-trivia', title: 'BTS lyric trivia (no Genius allowed)', group: 'bts',       type: 'classic',  difficulty: 'medium', plays: 92140, completions: 67000, likes: 4400, creator: { name: 'tannieslove',   bg: '#EDE2F8', text: '#3C3489' } },
  { id: 'q4', slug: 'stray-kids-find-intruder', title: 'Find the SKZ intruder', group: 'stray-kids',type: 'intruder', difficulty: 'easy',   plays: 12480, completions: 11000, likes: 980, creator: { name: 'staystay',      bg: '#FAEEDA', text: '#633806' } },
  { id: 'q5', slug: 'aespa-true-or-false', title: 'aespa: true or false (lore edition)', group: 'aespa',     type: 'tf',       difficulty: 'medium', plays: 21000, completions: 18900, likes: 1290, creator: { name: 'kwangya.kr',    bg: '#DCE9D6', text: '#27500A' } },
  { id: 'q6', slug: 'twice-mv-clue', title: 'TWICE: guess the title from 5 clues', group: 'twice',     type: 'clue',     difficulty: 'hard',   plays: 15780, completions: 9100, likes: 870, creator: { name: 'oncesince9',    bg: '#FBE4EE', text: '#72243E' } },
  { id: 'q7', slug: 'ive-rookie-era',  title: 'IVE rookie era: the deep stuff', group: 'ive',       type: 'classic', difficulty: 'medium', plays: 8120, completions: 6400, likes: 420, creator: { name: 'wonyoung.fan',  bg: '#FBE4EE', text: '#72243E' } },
  { id: 'q8', slug: 'lsf-fearnot', title: 'LE SSERAFIM trivia for fearless fans', group: 'le-sserafim',type: 'classic',difficulty: 'hard',   plays: 6600, completions: 4900, likes: 311, creator: { name: 'unforgiven.kr', bg: '#EDE2F8', text: '#3C3489' } },
  { id: 'q9', slug: 'svt-13-members', title: 'Can you name all 13 SEVENTEEN members?', group: 'seventeen', type: 'image', difficulty: 'hard', plays: 18900, completions: 12100, likes: 1430, creator: { name: 'caratbiased', bg: '#FAEEDA', text: '#633806' } },
  { id: 'q10', slug: 'twice-lightstick', title: 'TWICE comeback timeline trivia', group: 'twice',  type: 'classic', difficulty: 'easy', plays: 28100, completions: 25400, likes: 1190, creator: { name: 'oncesince9', bg: '#FBE4EE', text: '#72243E' } },
];

window.QOTD = window.QUIZZES[0];
window.TRENDING = ['q3','q1','q2','q5','q6','q4'].map(id => window.QUIZZES.find(q => q.id === id));

window.PLAYABLE = {
  id: 'q1', slug: 'blackpink-deep-cuts', title: "BLACKPINK deep cuts: only true BLINKs survive",
  group: 'blackpink', type: 'classic', difficulty: 'hard', plays: 48210, passRate: 38,
  creator: { name: 'jiwoo.bp', bg: '#FFE4E9', text: '#9D2A48' },
  questions: [
    { q: "Which BLACKPINK song was their first to surpass 1B views on YouTube?", options: ['DDU-DU DDU-DU', 'Kill This Love', 'How You Like That', 'BOOMBAYAH'], correct: 0, fact: "DDU-DU DDU-DU crossed 1B views in November 2019 — the first K-pop group MV to do so." },
    { q: "What year did BLACKPINK debut?", options: ['2014', '2015', '2016', '2017'], correct: 2, fact: "They debuted on August 8, 2016." },
    { q: "Who is the youngest member?", options: ['Jisoo', 'Jennie', 'Rosé', 'Lisa'], correct: 3, fact: "Lisa was born March 27, 1997." },
    { q: "Which member is from New Zealand?", options: ['Jisoo', 'Jennie', 'Rosé', 'Lisa'], correct: 2, fact: "Rosé was born in Auckland." },
    { q: "Name the title track from BORN PINK.", options: ['Lovesick Girls', 'Pink Venom', 'Shut Down', 'Ready For Love'], correct: 1, fact: "Pink Venom was the lead single from BORN PINK (2022)." },
    { q: "Which festival did BLACKPINK headline in April 2023?", options: ['Lollapalooza', 'Glastonbury', 'Coachella', 'Reading'], correct: 2, fact: "First Asian act to headline Coachella." },
    { q: "Jennie's solo single 'SOLO' came out in what year?", options: ['2017', '2018', '2019', '2020'], correct: 1, fact: "Released November 12, 2018." },
    { q: "How many members are in BLACKPINK?", options: ['Three', 'Four', 'Five', 'Six'], correct: 1, fact: "Jisoo, Jennie, Rosé, and Lisa." },
  ],
};

// Profile data
window.PROFILE = {
  username: 'minji.daily', displayName: 'Minji', joined: 'Joined March 2024',
  bg: '#FFE4E9', text: '#9D2A48', byeol: 2840, level: 14, levelTitle: 'Hardcore Stan',
  xpInto: 620, xpNext: 1000,
  stats: { quizzesPlayed: 348, quizzesCreated: 12, perfectScores: 47, dayStreak: 28, avgScore: 78, rank: 1240 },
  badges: [
    { id: 'streak30', name: '30-Day Streak', earned: false, prog: 0.93 },
    { id: 'perfect10', name: '10 Perfects', earned: true },
    { id: 'creator5', name: 'Quiz Maker', earned: true },
    { id: 'top100', name: 'Top 100', earned: true },
    { id: 'allgroups', name: 'Multi-Stan', earned: false, prog: 0.55 },
    { id: 'firstcomment', name: 'First Comment', earned: true },
  ],
  fandoms: [
    { group: 'newjeans', plays: 89 },
    { group: 'aespa', plays: 64 },
    { group: 'le-sserafim', plays: 41 },
    { group: 'ive', plays: 38 },
  ],
  recentQuizzes: ['q2','q5','q3','q1','q8'],
};

window.LEADERBOARD = [
  { rank: 1, name: 'kwangya.kr', bg: '#DCE9D6', text: '#27500A', byeol: 18420, plays: 1240 },
  { rank: 2, name: 'tannieslove', bg: '#EDE2F8', text: '#3C3489', byeol: 16110, plays: 1098 },
  { rank: 3, name: 'jiwoo.bp', bg: '#FFE4E9', text: '#9D2A48', byeol: 14990, plays: 980 },
  { rank: 4, name: 'oncesince9', bg: '#FBE4EE', text: '#72243E', byeol: 12440 },
  { rank: 5, name: 'staystay', bg: '#FAEEDA', text: '#633806', byeol: 11200 },
  { rank: 6, name: 'unforgiven.kr', bg: '#EDE2F8', text: '#3C3489', byeol: 10880 },
  { rank: 7, name: 'wonyoung.fan', bg: '#FBE4EE', text: '#72243E', byeol: 9410 },
  { rank: 8, name: 'caratbiased', bg: '#FAEEDA', text: '#633806', byeol: 8920 },
  { rank: 9, name: 'minji.daily', bg: '#FFE4E9', text: '#9D2A48', byeol: 2840, isMe: true },
  { rank: 10, name: 'engene4ever', bg: '#E1EEFB', text: '#0C447C', byeol: 2630 },
];

// Cards: rarities R, SR, SSR, SS, SSS
window.CARDS = [
  { id: 'c1', member: 'Jennie', group: 'blackpink', rarity: 'SSS', owned: true, ownedCount: 2 },
  { id: 'c2', member: 'Lisa', group: 'blackpink', rarity: 'SS', owned: true, ownedCount: 1 },
  { id: 'c3', member: 'Jisoo', group: 'blackpink', rarity: 'SSR', owned: true, ownedCount: 3 },
  { id: 'c4', member: 'Rosé', group: 'blackpink', rarity: 'SR', owned: true, ownedCount: 1 },
  { id: 'c5', member: 'Karina', group: 'aespa', rarity: 'SSR', owned: true, ownedCount: 1 },
  { id: 'c6', member: 'Winter', group: 'aespa', rarity: 'SR', owned: false },
  { id: 'c7', member: 'Minji', group: 'newjeans', rarity: 'SSS', owned: true, ownedCount: 1 },
  { id: 'c8', member: 'Hanni', group: 'newjeans', rarity: 'SS', owned: false },
  { id: 'c9', member: 'Hyein', group: 'newjeans', rarity: 'R', owned: true, ownedCount: 4 },
  { id: 'c10', member: 'Felix', group: 'stray-kids', rarity: 'SS', owned: true, ownedCount: 1 },
  { id: 'c11', member: 'Bang Chan', group: 'stray-kids', rarity: 'SR', owned: false },
  { id: 'c12', member: 'Wonyoung', group: 'ive', rarity: 'SSR', owned: true, ownedCount: 1 },
  { id: 'c13', member: 'Sakura', group: 'le-sserafim', rarity: 'SR', owned: false },
  { id: 'c14', member: 'Yeonjun', group: 'txt', rarity: 'R', owned: true, ownedCount: 2 },
  { id: 'c15', member: 'Sana', group: 'twice', rarity: 'SSR', owned: false },
  { id: 'c16', member: 'Yeji', group: 'itzy', rarity: 'SR', owned: true, ownedCount: 1 },
];

window.RARITIES = {
  R:   { color: '#888780', label: 'R',   weight: 0.55 },
  SR:  { color: '#378ADD', label: 'SR',  weight: 0.25 },
  SSR: { color: '#7F77DD', label: 'SSR', weight: 0.12 },
  SS:  { color: '#D4537E', label: 'SS',  weight: 0.06 },
  SSS: { color: '#EF9F27', label: 'SSS', weight: 0.02 },
};
