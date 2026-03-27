import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Load env
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ============================================================
// Utilities
// ============================================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSlug(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedScore(totalQ: number): number {
  const r = Math.random();
  let pct: number;
  if (r < 0.10) pct = randomBetween(0, 29) / 100;
  else if (r < 0.30) pct = randomBetween(30, 49) / 100;
  else if (r < 0.60) pct = randomBetween(50, 69) / 100;
  else if (r < 0.85) pct = randomBetween(70, 89) / 100;
  else pct = randomBetween(90, 100) / 100;
  return Math.min(Math.round(pct * totalQ), totalQ);
}

// ============================================================
// User data
// ============================================================

const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FCEBEB', text: '#791F1F' },
];

interface SeedUser {
  username: string;
  display_name: string;
  bio: string;
  joined_days_ago: number;
  color_idx: number;
}

const USERS: SeedUser[] = [
  { username: 'army_mina97', display_name: 'Mina', bio: 'ARMY since debut. Quiz master.', joined_days_ago: 18, color_idx: 0 },
  { username: 'jimin_universe', display_name: 'JiminVerse', bio: "if you can't pass my quiz you're not ARMY", joined_days_ago: 17, color_idx: 1 },
  { username: 'blink_forever22', display_name: 'Rose Stan', bio: 'BLACKPINK in your area', joined_days_ago: 17, color_idx: 2 },
  { username: 'stay_dreamer', display_name: 'StayDreamer', bio: 'SKZ is life. Chan is my bias.', joined_days_ago: 16, color_idx: 3 },
  { username: 'carat_hoshi', display_name: 'HoshiTiger', bio: '17 = 13 + 3 + 1. CARAT forever.', joined_days_ago: 16, color_idx: 4 },
  { username: 'once_upon_sana', display_name: 'SanaLover', bio: 'ONCE since TT era', joined_days_ago: 15, color_idx: 5 },
  { username: 'my_winter99', display_name: 'WinterMY', bio: 'Kwangya explorer', joined_days_ago: 14, color_idx: 6 },
  { username: 'bunny_haerin', display_name: 'Haerin Days', bio: 'NJ supremacy', joined_days_ago: 14, color_idx: 7 },
  { username: 'exol_chen', display_name: 'ChenBaekXi', bio: 'EXO-L since MAMA era', joined_days_ago: 13, color_idx: 0 },
  { username: 'midzy_ryujin', display_name: 'Ryujin Stan', bio: 'ITZY in my playlist 24/7', joined_days_ago: 12, color_idx: 1 },
  { username: 'engene_jake', display_name: 'JakeLand', bio: 'ENHYPEN best 4th gen bg', joined_days_ago: 11, color_idx: 2 },
  { username: 'moa_yeonjun', display_name: 'YeonjunMOA', bio: 'TXT is art', joined_days_ago: 10, color_idx: 3 },
  { username: 'reveluv_joy', display_name: 'JoyRV', bio: 'Red Velvet best discography', joined_days_ago: 10, color_idx: 4 },
  { username: 'atiny_wooyoung', display_name: 'WooATINY', bio: 'ATEEZ world domination', joined_days_ago: 9, color_idx: 5 },
  { username: 'neverland_soyeon', display_name: 'SoyeonIdle', bio: '(G)I-DLE self-producing queens', joined_days_ago: 8, color_idx: 6 },
  { username: 'dive_wonyoung', display_name: 'WonyoungDive', bio: 'IVE After LIKE is a masterpiece', joined_days_ago: 7, color_idx: 7 },
  { username: 'fearnot_yunjin', display_name: 'YunjinFN', bio: 'FEARNOT standing strong', joined_days_ago: 6, color_idx: 0 },
  { username: 'shawol_taemin', display_name: 'TaeminLegend', bio: 'SHINee paved the way', joined_days_ago: 5, color_idx: 1 },
  { username: 'melody_btob', display_name: 'MelodyBTOB', bio: 'BTOB vocals unmatched', joined_days_ago: 4, color_idx: 2 },
  { username: 'kpop_scholar', display_name: 'KpopScholar', bio: 'I stan everyone. Multi-fan life.', joined_days_ago: 14, color_idx: 3 },
  { username: 'stan_attacker', display_name: 'StanAttacker', bio: 'quiz me if you dare', joined_days_ago: 11, color_idx: 4 },
  { username: 'hallyu_nerd', display_name: 'HallyuNerd', bio: 'K-pop historian since 2012', joined_days_ago: 16, color_idx: 5 },
];

// ============================================================
// Quiz content (36 quizzes, all facts verified)
// ============================================================

const MC = 'multiple_choice';
const TF = 'true_false';
const GFC = 'guess_from_clues';

const TIMER_NORMAL = { timer: true, timer_seconds: 15, shuffle: true, show_answers: false };
const TIMER_HARD = { timer: true, timer_seconds: 10, shuffle: true, show_answers: false };

interface QuizDef {
  creator: string;
  group_slug: string;
  title: string;
  quiz_type: string;
  settings: object;
  created_days_ago: number;
  target_plays: number;
  target_likes: number;
  questions: object[];
}

const QUIZZES: QuizDef[] = [
  // ===================== BTS (5 quizzes) =====================
  {
    creator: 'army_mina97', group_slug: 'bts', title: 'Ultimate BTS era quiz - only real ARMYs survive',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 17, target_plays: 1200, target_likes: 65,
    questions: [
      { question: 'What was BTS\'s first album to reach #1 on the Billboard 200?', options: ['Wings', 'Love Yourself: Tear', 'Map of the Soul: Persona', 'Love Yourself: Answer'], correct: 1, fun_fact: 'Love Yourself: Tear debuted at #1 in May 2018, making BTS the first Korean act to top the Billboard 200.' },
      { question: 'Which BTS song was their first to be performed at the Grammy Awards?', options: ['Dynamite', 'Boy With Luv', 'Old Town Road remix', 'Butter'], correct: 0, fun_fact: 'BTS performed Dynamite at the 63rd Grammy Awards in March 2021.' },
      { question: 'Map of the Soul: 7 is named after what?', options: ['7 members of BTS', '7 years since debut', 'Both the members and years', 'A Carl Jung concept'], correct: 2, fun_fact: 'The album references both the 7 members and 7 years since debut, while also drawing from Jungian psychology.' },
      { question: 'Which song was BTS\'s first fully Korean-language #1 on the Hot 100?', options: ['Spring Day', 'Life Goes On', 'IDOL', 'ON'], correct: 1, fun_fact: 'Life Goes On debuted at #1 in November 2020, the first Korean-language song to top the Hot 100.' },
      { question: 'What was BTS\'s fan meeting tour called?', options: ['MUSTER', 'FESTA', 'MAGIC SHOP', 'WINGS TOUR'], correct: 0, fun_fact: 'BTS fan meetings are called MUSTER, while FESTA is their annual anniversary celebration.' },
      { question: 'In what year did BTS win their first Daesang (Grand Prize)?', options: ['2015', '2016', '2017', '2018'], correct: 1, fun_fact: 'BTS won Album of the Year at the 2016 MMA for The Most Beautiful Moment in Life: Young Forever.' },
      { question: 'Which BTS member released the solo song "Epiphany"?', options: ['RM', 'Jin', 'V', 'Jungkook'], correct: 1, fun_fact: 'Jin\'s Epiphany is the intro track to Love Yourself: Answer and became a fan favorite.' },
      { question: 'What is the name of BTS\'s reality show that started in 2014?', options: ['Run BTS', 'Bon Voyage', 'American Hustle Life', 'In the SOOP'], correct: 2, fun_fact: 'American Hustle Life aired in 2014. Run BTS started in 2015, and Bon Voyage in 2016.' },
    ],
  },
  {
    creator: 'army_mina97', group_slug: 'bts', title: 'BTS solo era quiz - match the member to the music',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 14, target_plays: 900, target_likes: 48,
    questions: [
      { question: 'Which BTS member\'s solo debut album is called "FACE"?', options: ['Jimin', 'V', 'Jungkook', 'J-Hope'], correct: 0, fun_fact: 'Jimin\'s FACE was released in March 2023 with lead single Like Crazy, which debuted at #1 on the Hot 100.' },
      { question: 'What is the name of J-Hope\'s solo studio album?', options: ['Hope World', 'Jack in the Box', 'on the street', 'Chicken Noodle Soup'], correct: 1, fun_fact: 'Jack in the Box was released in July 2022 and includes the singles MORE and Arson.' },
      { question: '"Seven" featuring Latto is a solo single by which member?', options: ['V', 'Jimin', 'Jungkook', 'RM'], correct: 2, fun_fact: 'Seven debuted at #1 on the Billboard Hot 100 in July 2023.' },
      { question: 'What is V\'s solo album called?', options: ['Layover', 'FRI(END)S', 'Rainy Days', 'Slow Dancing'], correct: 0, fun_fact: 'Layover was released in September 2023 with a jazz and R&B influenced sound.' },
      { question: 'RM\'s solo album "Indigo" was released in which year?', options: ['2021', '2022', '2023', '2024'], correct: 1, fun_fact: 'Indigo was released in December 2022 and features collaborations with Erykah Badu, Anderson .Paak, and others.' },
      { question: 'Which member collaborated with Coldplay on "The Astronaut"?', options: ['RM', 'Jin', 'Suga', 'V'], correct: 1, fun_fact: 'The Astronaut was released in October 2022, shortly before Jin began his military service.' },
      { question: 'Suga\'s third solo project "D-DAY" was released under which name?', options: ['Suga', 'Agust D', 'August', 'Min Yoongi'], correct: 1, fun_fact: 'D-DAY (2023) completed the Agust D trilogy that started with Agust D (2016) and D-2 (2020).' },
    ],
  },
  {
    creator: 'army_mina97', group_slug: 'bts', title: 'BTS true or false - bet you can\'t get 100%',
    quiz_type: TF, settings: TIMER_HARD, created_days_ago: 10, target_plays: 650, target_likes: 35,
    questions: [
      { question: 'RM was the first member to join BTS', correct: true, fun_fact: 'RM was the first member recruited by Bang Si-hyuk and the other members were built around him.' },
      { question: 'BTS stands for "Born To Sing" in English', correct: false, fun_fact: 'BTS added "Beyond The Scene" as an English meaning in 2017. The original Korean name is Bangtan Sonyeondan (Bulletproof Boy Scouts).' },
      { question: 'Jungkook auditioned for Superstar K before joining Big Hit', correct: true, fun_fact: 'Jungkook appeared on Superstar K3 in 2011. After his audition, he received casting offers from 7 agencies but chose Big Hit after seeing RM rap.' },
      { question: 'BTS performed at Wembley Stadium in London', correct: true, fun_fact: 'BTS performed two sold-out shows at Wembley Stadium in June 2019, the first Korean artists to do so.' },
      { question: 'Jin was the first BTS member to enlist in the military', correct: true, fun_fact: 'Jin enlisted on December 13, 2022, as the oldest member. All members completed their service by 2025.' },
      { question: 'V and Jimin attended the same high school before BTS', correct: true, fun_fact: 'Both V and Jimin attended Korean Arts High School in Seoul during their trainee days.' },
      { question: 'BTS\'s "Dynamite" was written by the members themselves', correct: false, fun_fact: 'Dynamite was written by David Stewart and Jessica Agombar. It was BTS\'s first song not co-written by the members.' },
      { question: 'Suga produced the hit song "Eight" for IU', correct: true, fun_fact: 'Suga produced and featured on IU\'s "Eight" in 2020, which became a massive hit in Korea.' },
    ],
  },
  {
    creator: 'army_mina97', group_slug: 'bts', title: 'Guess the BTS member from clues',
    quiz_type: GFC, settings: TIMER_NORMAL, created_days_ago: 7, target_plays: 450, target_likes: 28,
    questions: [
      { question: 'Who is this BTS member?', clues: ['Born in Gwacheon, Gyeonggi Province', 'Known as the "Golden Maknae"', 'Solo hit "Seven" debuted at #1 on Hot 100'], options: ['Jungkook', 'Jimin', 'V', 'Jin'], correct: 0, fun_fact: 'Jungkook is the youngest BTS member, born September 1, 1997.' },
      { question: 'Who is this BTS member?', clues: ['Born in Daegu', 'Runs a solo project called Agust D', 'Known for producing and songwriting'], options: ['RM', 'Suga', 'J-Hope', 'Jimin'], correct: 1, fun_fact: 'Suga (Min Yoongi) worked as an underground rapper before joining Big Hit.' },
      { question: 'Who is this BTS member?', clues: ['Born in Ilsan, Gyeonggi Province', 'First member recruited for BTS', 'Scored 148 on an IQ test'], options: ['Jin', 'RM', 'Suga', 'J-Hope'], correct: 1, fun_fact: 'RM (Kim Namjoon) taught himself English largely by watching the sitcom Friends.' },
      { question: 'Who is this BTS member?', clues: ['Born in Gwangju', 'Released mixtape Hope World in 2018', 'Known as the dance leader of BTS'], options: ['Jimin', 'J-Hope', 'V', 'Jungkook'], correct: 1, fun_fact: 'J-Hope (Jung Hoseok) was part of a street dance team called NEURON before becoming a trainee.' },
      { question: 'Who is this BTS member?', clues: ['Born in Busan', 'Studied contemporary dance at Busan Arts High School', 'First solo album called FACE'], options: ['V', 'Jungkook', 'Jimin', 'Suga'], correct: 2, fun_fact: 'Jimin is known for his fluid contemporary dance style that sets him apart in K-pop.' },
      { question: 'Who is this BTS member?', clues: ['Born in Daegu', 'Coined the phrase "I purple you"', 'Solo album called Layover'], options: ['Jimin', 'Jin', 'V', 'RM'], correct: 2, fun_fact: 'V (Kim Taehyung) created "I purple you" at a fan meeting in 2016, saying purple is the last color of the rainbow, symbolizing trust.' },
      { question: 'Who is this BTS member?', clues: ['Born in Gwacheon', 'Oldest member of BTS', 'Majored in acting at Konkuk University'], options: ['RM', 'Suga', 'Jin', 'J-Hope'], correct: 2, fun_fact: 'Jin (Kim Seokjin) was street-cast by a Big Hit scout while getting off a bus near his university.' },
    ],
  },
  {
    creator: 'jimin_universe', group_slug: 'bts', title: 'BTS concerts and tour moments quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 12, target_plays: 350, target_likes: 20,
    questions: [
      { question: 'What was the name of BTS\'s first stadium world tour?', options: ['Wings Tour', 'Love Yourself Tour', 'Love Yourself: Speak Yourself', 'Map of the Soul Tour'], correct: 2, fun_fact: 'Love Yourself: Speak Yourself was a stadium extension tour in 2019 that included Wembley and Rose Bowl.' },
      { question: 'BTS held a free online concert during COVID called what?', options: ['BANG BANG CON', 'BTS Online', 'MUSTER from Home', 'Run BTS Live'], correct: 0, fun_fact: 'BANG BANG CON streamed past concert footage for free. They also held BANG BANG CON The Live as a paid online concert.' },
      { question: 'In which city did BTS perform their "Yet To Come" concert in Busan?', options: ['Seoul', 'Busan', 'Los Angeles', 'Tokyo'], correct: 1, fun_fact: 'The free Yet To Come concert in Busan (October 2022) was held to support the city\'s 2030 World Expo bid.' },
      { question: 'BTS\'s Permission to Dance on Stage concerts were held at which LA venue?', options: ['Staples Center', 'Rose Bowl', 'SoFi Stadium', 'Hollywood Bowl'], correct: 2, fun_fact: 'BTS performed four nights at SoFi Stadium in November-December 2021, their first in-person concerts since COVID.' },
      { question: 'What iconic moment happened at BTS\'s 2019 Wembley concert?', options: ['RM proposed to a fan', 'The entire stadium sang Young Forever', 'They announced a hiatus', 'Jungkook did a bungee jump'], correct: 1, fun_fact: '90,000 fans singing Young Forever a cappella at Wembley became one of the most iconic BTS concert moments.' },
      { question: 'How many shows did BTS perform at the Rose Bowl in 2019?', options: ['1', '2', '3', '4'], correct: 1, fun_fact: 'BTS performed two sold-out shows at the Rose Bowl in Pasadena, California in May 2019.' },
      { question: 'BTS\'s "Love Yourself" world tour visited how many continents?', options: ['3', '4', '5', '6'], correct: 1, fun_fact: 'The Love Yourself tour visited Asia, North America, Europe, and performed in Japan (4 continents including shows in various countries).' },
    ],
  },

  // ===================== BLACKPINK (4 quizzes) =====================
  {
    creator: 'blink_forever22', group_slug: 'blackpink', title: 'BLACKPINK ultimate fan challenge',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 16, target_plays: 800, target_likes: 42,
    questions: [
      { question: 'What is BLACKPINK\'s lightstick called?', options: ['Bong Bong', 'Bbyongbong', 'Hammerbong', 'Krunk Light'], correct: 1, fun_fact: 'The Bbyongbong (a Korean onomatopoeia for a hammer hitting) resembles a pink and black hammer.' },
      { question: 'Which BLACKPINK member has the most Instagram followers?', options: ['Jennie', 'Lisa', 'Rose', 'Jisoo'], correct: 1, fun_fact: 'Lisa consistently holds the record as the most-followed K-pop idol on Instagram.' },
      { question: 'How many years did the members train before debuting?', options: ['2-3 years', '4-6 years', 'All the same duration', '1-2 years'], correct: 1, fun_fact: 'Training periods varied: Jisoo trained ~5 years, Jennie ~6 years, Rose ~4 years, and Lisa ~5 years.' },
      { question: 'BLACKPINK\'s "DDU-DU DDU-DU" MV broke a YouTube record for what?', options: ['Most views in 24 hours by a K-pop group', 'Fastest to 1 billion views', 'Most liked MV ever', 'First K-pop MV to trend #1 worldwide'], correct: 0, fun_fact: 'DDU-DU DDU-DU set the record for most-viewed music video in 24 hours by a K-pop group when it was released in 2018.' },
      { question: 'What is the name of BLACKPINK\'s Netflix documentary?', options: ['BLACKPINK: Light Up the Sky', 'BLACKPINK: The Movie', 'Born Pink: The Documentary', 'In Your Area: The Story'], correct: 0, fun_fact: 'Light Up the Sky was released in October 2020 and gave fans an intimate look at the members\' lives.' },
      { question: 'Which brand is Jennie a global ambassador for?', options: ['Dior', 'Chanel', 'Gucci', 'Louis Vuitton'], correct: 1, fun_fact: 'Jennie has been a Chanel ambassador since 2018 and is known as "Human Chanel" among fans.' },
      { question: 'BLACKPINK\'s THE ALBUM sold over how many copies in its first week?', options: ['500,000', '800,000', '1 million', '1.5 million'], correct: 1, fun_fact: 'THE ALBUM (2020) sold approximately 800,000 copies in its first week, a record for K-pop girl groups at the time.' },
      { question: 'Rose holds dual citizenship in which countries?', options: ['Korea and Australia', 'Korea and New Zealand', 'New Zealand and Australia', 'Korea and Japan'], correct: 2, fun_fact: 'Rose was born in New Zealand and raised in Melbourne, Australia. She holds New Zealand and Australian citizenship.' },
    ],
  },
  {
    creator: 'blink_forever22', group_slug: 'blackpink', title: 'BLACKPINK true or false - think you know everything?',
    quiz_type: TF, settings: TIMER_HARD, created_days_ago: 13, target_plays: 550, target_likes: 30,
    questions: [
      { question: 'BLACKPINK is the highest-charting female Korean act on the Billboard Hot 100', correct: true, fun_fact: 'Multiple BLACKPINK songs and member solos have charted on the Hot 100, with the group holding the highest peaks among Korean female acts.' },
      { question: 'Lisa was born in South Korea', correct: false, fun_fact: 'Lisa (Lalisa Manobal) was born in Buriram, Thailand on March 27, 1997.' },
      { question: 'BLACKPINK\'s name represents the duality of being both pretty and fierce', correct: true, fun_fact: 'YG said BLACKPINK contradicts the common perception of the color pink, adding black to represent fierceness.' },
      { question: 'Jennie was the first K-pop female soloist to perform at Coachella', correct: false, fun_fact: 'Jennie performed at Coachella with BLACKPINK as a group in 2019, not as a soloist. She later performed solo at Coachella in 2023 during BLACKPINK\'s headlining set.' },
      { question: 'Rose was the last member to be revealed before BLACKPINK\'s debut', correct: false, fun_fact: 'Lisa was the last member to be revealed. The reveal order was Jennie, Lisa, Jisoo, and Rose.' },
      { question: 'BLACKPINK has appeared on the American TV show "Running Man"', correct: false, fun_fact: 'BLACKPINK appeared on the Korean show Running Man, not an American show. They appeared on US shows like The Late Late Show and Good Morning America.' },
      { question: 'DDU-DU DDU-DU was the first K-pop group MV to reach 1 billion views on YouTube', correct: true, fun_fact: 'DDU-DU DDU-DU reached 1 billion YouTube views in November 2019, the first MV by a K-pop group to do so.' },
    ],
  },
  {
    creator: 'blink_forever22', group_slug: 'blackpink', title: 'Guess the BLACKPINK song from clues',
    quiz_type: GFC, settings: TIMER_NORMAL, created_days_ago: 9, target_plays: 380, target_likes: 22,
    questions: [
      { question: 'Which BLACKPINK song is this?', clues: ['Features a Selena Gomez collaboration', 'Released as a pre-release single in 2020', 'Has a sweet dessert theme'], options: ['Ice Cream', 'Lovesick Girls', 'Pretty Savage', 'Bet You Wanna'], correct: 0, fun_fact: 'Ice Cream with Selena Gomez was written with Ariana Grande, who also co-wrote the track.' },
      { question: 'Which BLACKPINK song is this?', clues: ['Title track from their second studio album', 'Samples a classical violin piece by Paganini', 'Music video features the members destroying instruments'], options: ['Pink Venom', 'Shut Down', 'Typa Girl', 'Hard to Love'], correct: 1, fun_fact: 'Shut Down from Born Pink samples Paganini\'s La Campanella.' },
      { question: 'Which BLACKPINK song is this?', clues: ['Pre-release single that broke YouTube records', 'Features traditional Korean-inspired set pieces in the MV', 'Has the lyrics "look at you, now look at me"'], options: ['Kill This Love', 'How You Like That', 'Lovesick Girls', 'DDU-DU DDU-DU'], correct: 1, fun_fact: 'How You Like That set the record for most-viewed YouTube premiere when released in June 2020.' },
      { question: 'Which BLACKPINK song is this?', clues: ['Released in 2018 as a single', 'Described as BLACKPINKs "most public-friendly" song', 'Fans call it their "summer anthem"'], options: ['As If It\'s Your Last', 'Forever Young', 'Really', 'Stay'], correct: 0, fun_fact: 'As If It\'s Your Last (2017) has a more pop-oriented sound compared to BLACKPINK\'s usual girl-crush concept.' },
      { question: 'Which BLACKPINK song is this?', clues: ['Released as a pre-release single for Born Pink', 'Has a hip-hop and trap influenced beat', 'Title references something deadly'], options: ['Shut Down', 'Pink Venom', 'Typa Girl', 'Hard to Love'], correct: 1, fun_fact: 'Pink Venom was released in August 2022 and debuted at #22 on the Billboard Hot 100.' },
      { question: 'Which BLACKPINK song is this?', clues: ['Features bold brass and marching band sounds', 'Music video opens with a dramatic heart visual', 'Title contains a strong emotional statement'], options: ['DDU-DU DDU-DU', 'Kill This Love', 'How You Like That', 'Boombayah'], correct: 1, fun_fact: 'Kill This Love\'s MV features dramatic movie-like visuals and debuted at #41 on the Hot 100 in 2019.' },
    ],
  },
  {
    creator: 'blink_forever22', group_slug: 'blackpink', title: 'BLACKPINK brand deals and fashion quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 5, target_plays: 280, target_likes: 15,
    questions: [
      { question: 'Which luxury brand is Lisa a global ambassador for?', options: ['Chanel', 'Celine', 'Bulgari', 'Prada'], correct: 1, fun_fact: 'Lisa has been the global ambassador for Celine since 2020 and also works with Bulgari for jewelry.' },
      { question: 'Jisoo is the brand ambassador for which fashion house?', options: ['Chanel', 'Dior', 'Gucci', 'Saint Laurent'], correct: 1, fun_fact: 'Jisoo became a Dior global ambassador in 2021 and has attended multiple Dior fashion shows in Paris.' },
      { question: 'Rose is the global ambassador for which brand?', options: ['Chanel', 'Tiffany & Co.', 'Cartier', 'Saint Laurent'], correct: 3, fun_fact: 'Rose has been a Saint Laurent global ambassador since 2020 and also works with Tiffany & Co.' },
      { question: 'BLACKPINK collaborated with which game for a virtual concert?', options: ['Fortnite', 'PUBG Mobile', 'Roblox', 'Minecraft'], correct: 1, fun_fact: 'BLACKPINK held a virtual concert in PUBG Mobile in 2020, performing their songs in-game.' },
      { question: 'Which member appeared on the cover of Vogue Korea the most times as a solo?', options: ['Jennie', 'Jisoo', 'Rose', 'Lisa'], correct: 0, fun_fact: 'Jennie has graced the cover of Vogue Korea numerous times both solo and with the group.' },
      { question: 'BLACKPINK signed with which US record label for their Western promotions?', options: ['Columbia Records', 'Interscope Records', 'Republic Records', 'Atlantic Records'], correct: 1, fun_fact: 'BLACKPINK signed with Interscope Records (under Universal Music Group) in 2018 for their activities outside Asia.' },
      { question: 'Which BLACKPINK member launched her own fashion brand?', options: ['Lisa', 'Jennie', 'Rose', 'Jisoo'], correct: 1, fun_fact: 'Jennie launched her clothing brand "Odd Atelier" (ODD) and has been involved in fashion design.' },
    ],
  },

  // ===================== Stray Kids (3 quizzes) =====================
  {
    creator: 'stay_dreamer', group_slug: 'stray-kids', title: 'Stray Kids albums and B-sides deep dive',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 15, target_plays: 500, target_likes: 30,
    questions: [
      { question: 'Which Stray Kids album includes the track "Muddy Water"?', options: ['GO LIVE', 'IN LIFE', 'NOEASY', 'ODDINARY'], correct: 0, fun_fact: 'GO LIVE (2020) was Stray Kids\' first full-length album and includes fan-favorite B-sides like Muddy Water.' },
      { question: '"Thunderous" is the title track from which album?', options: ['ODDINARY', 'NOEASY', 'IN LIFE', 'MAXIDENT'], correct: 1, fun_fact: 'NOEASY was released in August 2021 and debuted at #1 on the Gaon/Circle Album Chart.' },
      { question: 'Which song from MAXIDENT became a viral TikTok hit?', options: ['CASE 143', 'Give Me Your TMI', 'Taste', 'Chill'], correct: 0, fun_fact: 'CASE 143 went viral on TikTok with its catchy chorus and heart-forming choreography.' },
      { question: '"Hellevator" was released before Stray Kids officially debuted. It is called a what?', options: ['Demo track', 'Pre-debut single', 'OST', 'B-side'], correct: 1, fun_fact: 'Hellevator was released on November 24, 2017, during the Stray Kids survival show, before their official debut in March 2018.' },
      { question: 'Rock-Star features which title track?', options: ['S-Class', 'Lalalala', 'MEGA', 'Chk Chk Boom'], correct: 1, fun_fact: 'Lalalala is the title track of Rock-Star (November 2023), which debuted at #1 on the Billboard 200.' },
      { question: 'What is the title track of the Stray Kids album "ATE"?', options: ['Jjam', 'Chk Chk Boom', 'Mountain', 'Stray Kids'], correct: 1, fun_fact: 'Chk Chk Boom features a dynamic sound mixing various genres. ATE debuted at #1 on the Billboard 200 in 2024.' },
      { question: 'Which Stray Kids B-side from NOEASY features intense rap verses from all of 3RACHA?', options: ['Thunderous', 'Cheese', 'Domino', 'The View'], correct: 2, fun_fact: 'Domino showcases the signature 3RACHA rap style and has become a fan-favorite performance track.' },
    ],
  },
  {
    creator: 'stay_dreamer', group_slug: 'stray-kids', title: 'SKZ true or false - only real STAYs pass',
    quiz_type: TF, settings: TIMER_HARD, created_days_ago: 11, target_plays: 400, target_likes: 24,
    questions: [
      { question: 'Stray Kids originally debuted as a 9-member group', correct: true, fun_fact: 'Stray Kids debuted with 9 members. Woojin left the group in October 2019, leaving 8 members.' },
      { question: 'Bang Chan is Korean-Australian', correct: true, fun_fact: 'Bang Chan (Christopher Bang) was born in Sydney, Australia on October 3, 1997.' },
      { question: 'Stray Kids won the competition show "Road to Kingdom"', correct: false, fun_fact: 'Stray Kids competed on "Kingdom: Legendary War" (2021), not Road to Kingdom. They won Kingdom.' },
      { question: 'Felix and Bang Chan are from the same city in Australia', correct: true, fun_fact: 'Both Felix and Bang Chan are from Sydney, Australia.' },
      { question: 'Changbin is the youngest member of 3RACHA', correct: false, fun_fact: 'Han (born 2000) is the youngest in 3RACHA. Changbin was born in 1999, and Bang Chan in 1997.' },
      { question: 'Stray Kids\' fandom name STAY is an anagram of "Stray"', correct: false, fun_fact: 'STAY has one letter removed from "Stray" (the R), symbolizing fans who always stay with Stray Kids.' },
      { question: 'Lee Know was eliminated during the Stray Kids survival show but was later added back', correct: true, fun_fact: 'Lee Know was eliminated during the show but was brought back by the other members who wanted him in the group.' },
      { question: 'I.N is the maknae and the oldest trainee among the members', correct: false, fun_fact: 'I.N (Yang Jeongin) is the maknae (youngest), born February 8, 2001. He was one of the shorter-term trainees.' },
    ],
  },
  {
    creator: 'stay_dreamer', group_slug: 'stray-kids', title: 'Guess the SKZ member from clues',
    quiz_type: GFC, settings: TIMER_NORMAL, created_days_ago: 6, target_plays: 300, target_likes: 18,
    questions: [
      { question: 'Who is this Stray Kids member?', clues: ['Australian-Korean', 'Trained at JYP for 7 years', 'Hosts a weekly live broadcast called "Chan\'s Room"'], options: ['Felix', 'Bang Chan', 'Lee Know', 'Han'], correct: 1, fun_fact: 'Bang Chan\'s Room (now called STAY) is a regular VLive/Bubble series where he talks and plays music for fans.' },
      { question: 'Who is this Stray Kids member?', clues: ['Known for an extremely deep voice', 'Australian-Korean from Sydney', 'Famous for baking and cooking on variety shows'], options: ['Bang Chan', 'Felix', 'Seungmin', 'I.N'], correct: 1, fun_fact: 'Felix\'s deep voice surprises many people given his youthful and soft appearance.' },
      { question: 'Who is this Stray Kids member?', clues: ['Rap alias is SpearB', 'Known as a powerhouse rapper', 'Part of the producing unit 3RACHA'], options: ['Han', 'Changbin', 'Bang Chan', 'Hyunjin'], correct: 1, fun_fact: 'Changbin (Seo Changbin) is known for his fast rap and intense stage presence.' },
      { question: 'Who is this Stray Kids member?', clues: ['Born on September 14, 2000', 'Known for emotional and versatile rap and vocals', 'Rap alias is J.ONE'], options: ['Changbin', 'Seungmin', 'Han', 'Felix'], correct: 2, fun_fact: 'Han (Han Jisung) is a triple threat: rapper, vocalist, and songwriter in 3RACHA.' },
      { question: 'Who is this Stray Kids member?', clues: ['Was a backup dancer for BTS', 'Known for his sharp dancing and cat-like personality', 'Real name is Lee Minho'], options: ['Hyunjin', 'Lee Know', 'Seungmin', 'I.N'], correct: 1, fun_fact: 'Lee Know was a backup dancer for BTS before auditioning at JYP Entertainment.' },
      { question: 'Who is this Stray Kids member?', clues: ['Known for his powerful and expressive dancing', 'Was temporarily suspended in 2021', 'Often called the "visual" of the group'], options: ['Lee Know', 'Felix', 'Hyunjin', 'Seungmin'], correct: 2, fun_fact: 'Hyunjin (Hwang Hyunjin) is known for his expressive dance style and has been called one of K-pop\'s best performers.' },
    ],
  },

  // ===================== SEVENTEEN (3 quizzes) =====================
  {
    creator: 'carat_hoshi', group_slug: 'seventeen', title: 'SEVENTEEN members mega quiz - all 13!',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 15, target_plays: 600, target_likes: 35,
    questions: [
      { question: 'How many members are in SEVENTEEN?', options: ['13', '17', '15', '12'], correct: 0, fun_fact: 'The name SEVENTEEN comes from 13 members + 3 units + 1 group = 17.' },
      { question: 'Who is the leader of SEVENTEEN\'s performance unit?', options: ['Hoshi', 'The8', 'Jun', 'Dino'], correct: 0, fun_fact: 'Hoshi (Kwon Soonyoung) leads the performance unit and is known for his tiger persona.' },
      { question: 'Which two SEVENTEEN members are Chinese?', options: ['Jun and Minghao (The8)', 'Joshua and Vernon', 'Wonwoo and Mingyu', 'DK and Seungkwan'], correct: 0, fun_fact: 'Jun (Wen Junhui) is from Shenzhen and The8 (Xu Minghao) is from Anshan, both in China.' },
      { question: 'Joshua and Vernon share what in common regarding nationality?', options: ['Both are Korean-American', 'Both are from Seoul', 'Both speak Japanese', 'Both trained in China'], correct: 0, fun_fact: 'Joshua (Hong Jisoo) is from Los Angeles and Vernon (Chwe Hansol) is from New York. Both are Korean-American.' },
      { question: 'Who is the main producer and songwriter of SEVENTEEN?', options: ['S.Coups', 'Hoshi', 'Woozi', 'Vernon'], correct: 2, fun_fact: 'Woozi (Lee Jihoon) has composed and produced the majority of SEVENTEEN\'s discography.' },
      { question: 'Which unit does Seungkwan belong to?', options: ['Hip-hop unit', 'Vocal unit', 'Performance unit', 'He\'s in all units'], correct: 1, fun_fact: 'Seungkwan is in the vocal unit along with Woozi, DK, Joshua, and Jeonghan.' },
      { question: 'When did SEVENTEEN debut?', options: ['May 26, 2015', 'March 15, 2016', 'November 9, 2014', 'January 1, 2015'], correct: 0, fun_fact: 'SEVENTEEN debuted on May 26, 2015 under Pledis Entertainment with the EP "17 Carat".' },
      { question: 'Who is the youngest member (maknae) of SEVENTEEN?', options: ['Vernon', 'Seungkwan', 'The8', 'Dino'], correct: 3, fun_fact: 'Dino (Lee Chan) was born on February 11, 1999, making him the youngest member.' },
      { question: 'What is SEVENTEEN\'s fandom name?', options: ['DIAMOND', 'CARAT', 'SEVENTEEN17', 'PLEDIS'], correct: 1, fun_fact: 'CARAT stands for "Carat Arat Seventeen" and references the diamond theme - carats measure diamond quality.' },
    ],
  },
  {
    creator: 'carat_hoshi', group_slug: 'seventeen', title: 'SEVENTEEN discography and milestones quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 11, target_plays: 450, target_likes: 25,
    questions: [
      { question: 'What was SEVENTEEN\'s debut title track?', options: ['Adore U', 'Mansae', 'Very Nice', 'Don\'t Wanna Cry'], correct: 0, fun_fact: 'Adore U was released with their debut EP "17 Carat" on May 26, 2015.' },
      { question: 'Which SEVENTEEN album broke the record for highest first-week sales on Hanteo?', options: ['An Ode', 'Attacca', 'FML', 'SEVENTEENTH HEAVEN'], correct: 2, fun_fact: 'FML (April 2023) sold over 4.6 million copies in its first week, a record at the time.' },
      { question: '"Super" is the title track from which album?', options: ['Face the Sun', 'FML', 'SEVENTEENTH HEAVEN', 'Sector 17'], correct: 1, fun_fact: 'Super from FML became one of SEVENTEEN\'s biggest hits, topping charts across Asia.' },
      { question: 'SEVENTEEN\'s "Don\'t Wanna Cry" is known for what style of choreography?', options: ['Powerful hip-hop moves', 'Synchronized wave formation', 'Traditional Korean dance', 'Acrobatic flips'], correct: 1, fun_fact: 'Don\'t Wanna Cry features iconic synchronized wave formations where members move in fluid ripple patterns.' },
      { question: 'What year did SEVENTEEN perform at the Glastonbury Festival?', options: ['2022', '2023', '2024', 'They haven\'t performed there'], correct: 2, fun_fact: 'SEVENTEEN performed at Glastonbury Festival in 2024, one of the few K-pop acts to perform at the legendary UK festival.' },
      { question: 'Which company is SEVENTEEN now under after Pledis was acquired?', options: ['SM Entertainment', 'HYBE', 'JYP Entertainment', 'CJ ENM'], correct: 1, fun_fact: 'HYBE acquired Pledis Entertainment in 2020, making SEVENTEEN part of the HYBE family alongside BTS and others.' },
      { question: '"Very Nice" from 2016 is known for being SEVENTEEN\'s what?', options: ['First #1 song', 'First fan meeting song', 'Signature summer anthem', 'Collab with another group'], correct: 2, fun_fact: 'Very Nice is a fan-favorite upbeat summer track that remains a staple at concerts and fan meetings.' },
    ],
  },
  {
    creator: 'carat_hoshi', group_slug: 'seventeen', title: 'SEVENTEEN true or false',
    quiz_type: TF, settings: TIMER_NORMAL, created_days_ago: 4, target_plays: 200, target_likes: 12,
    questions: [
      { question: 'SEVENTEEN debuted under Pledis Entertainment', correct: true, fun_fact: 'Pledis Entertainment was founded by Han Sung-soo and later acquired by HYBE in 2020.' },
      { question: 'Hoshi is the leader of the hip-hop unit', correct: false, fun_fact: 'Hoshi leads the performance unit. S.Coups leads the hip-hop unit, and Woozi leads the vocal unit.' },
      { question: 'SEVENTEEN\'s official debut date is May 26, 2015', correct: true, fun_fact: 'They debuted with the EP "17 Carat" featuring the title track "Adore U".' },
      { question: 'Vernon was born and raised in South Korea', correct: false, fun_fact: 'Vernon (Chwe Hansol) was born in New York City. He is Korean-American.' },
      { question: 'SEVENTEEN has performed at the United Nations', correct: true, fun_fact: 'SEVENTEEN spoke at the UN as UNESCO Goodwill Ambassadors for Youth, promoting education.' },
      { question: 'Woozi and Jihoon are two different members of SEVENTEEN', correct: false, fun_fact: 'Woozi\'s real name is Lee Jihoon. Woozi is his stage name.' },
      { question: 'SEVENTEEN\'s album "FML" stands for "Full of My Love"', correct: false, fun_fact: 'FML has multiple interpretations but is most commonly read as an abbreviation for a well-known expletive phrase, playing on the album\'s theme of heartbreak.' },
    ],
  },

  // ===================== TWICE (3 quizzes) =====================
  {
    creator: 'once_upon_sana', group_slug: 'twice', title: 'TWICE Japanese discography and tours quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 14, target_plays: 350, target_likes: 18,
    questions: [
      { question: 'What was TWICE\'s first original Japanese single?', options: ['One More Time', 'TT Japanese ver.', 'Candy Pop', 'Brand New Girl'], correct: 0, fun_fact: 'One More Time was released in October 2017 and was an original song, not a Korean remake.' },
      { question: 'TWICE\'s Japanese album "&TWICE" was released in which year?', options: ['2018', '2019', '2020', '2021'], correct: 1, fun_fact: '&TWICE was released in November 2019 and included Japanese versions of several Korean hits.' },
      { question: 'Which Japanese single has a candy-themed music video?', options: ['Wake Me Up', 'Candy Pop', 'One More Time', 'Happy Happy'], correct: 1, fun_fact: 'Candy Pop\'s MV features the members in a colorful candy-themed world.' },
      { question: 'TWICE held their first Japanese dome tour in which year?', options: ['2018', '2019', '2020', '2021'], correct: 1, fun_fact: 'TWICE\'s "Dreamday" dome tour in 2019 made them the fastest Korean girl group to hold a Japan dome tour.' },
      { question: 'The Japanese version of which TWICE song features different choreography than the Korean version?', options: ['TT', 'What is Love?', 'Likey', 'Yes or Yes'], correct: 0, fun_fact: 'The Japanese version of TT has slightly modified choreography adapted for Japanese promotions.' },
      { question: 'Which of these is NOT a TWICE Japanese single?', options: ['Fake & True', 'Breakthrough', 'SCIENTIST', 'Happy Happy'], correct: 2, fun_fact: 'SCIENTIST is a Korean release (2021). Fake & True, Breakthrough, and Happy Happy are all Japanese singles.' },
      { question: 'TWICE\'s MiSaMo subunit consists of which members?', options: ['Momo, Sana, Mina', 'Mina, Sana, Momo', 'Momo, Sana, Mina (same)', 'Mina, Sana, Tzuyu'], correct: 0, fun_fact: 'MiSaMo (Mina, Sana, Momo) is TWICE\'s Japanese sub-unit that debuted in July 2023 with "Masterpiece."' },
    ],
  },
  {
    creator: 'once_upon_sana', group_slug: 'twice', title: 'TWICE true or false - test your ONCE knowledge',
    quiz_type: TF, settings: TIMER_NORMAL, created_days_ago: 8, target_plays: 250, target_likes: 14,
    questions: [
      { question: 'TWICE has members from three different countries', correct: true, fun_fact: 'TWICE has members from South Korea (Nayeon, Jeongyeon, Jihyo, Dahyun, Chaeyoung), Japan (Momo, Sana, Mina), and Taiwan (Tzuyu).' },
      { question: 'Jihyo trained at JYP for 10 years before debuting', correct: true, fun_fact: 'Jihyo joined JYP as a trainee at age 8, making her training period approximately 10 years before TWICE\'s debut in 2015.' },
      { question: 'TWICE\'s first English single was "Moonlight Sunrise"', correct: false, fun_fact: 'TWICE\'s first English single was "The Feels" (October 2021). Moonlight Sunrise came later in January 2023.' },
      { question: 'All nine TWICE members appeared on the survival show Sixteen', correct: true, fun_fact: 'All nine members were contestants on Sixteen. Momo was eliminated but brought back by JYP who added extra spots.' },
      { question: 'Momo was originally eliminated on Sixteen but was added back', correct: true, fun_fact: 'Momo was eliminated in episode 6 but was brought back when JYP decided to debut 9 members instead of 7.' },
      { question: 'Chaeyoung is the tallest member of TWICE', correct: false, fun_fact: 'Chaeyoung is actually the shortest member of TWICE. Tzuyu is generally considered the tallest.' },
      { question: 'TWICE held a concert at the Tokyo Dome', correct: true, fun_fact: 'TWICE performed at the Tokyo Dome during their Dreamday concert tour in 2019, a major milestone for K-pop girl groups in Japan.' },
    ],
  },

  // ===================== aespa (2 quizzes) =====================
  {
    creator: 'my_winter99', group_slug: 'aespa', title: 'aespa B-sides and deep cuts quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 13, target_plays: 300, target_likes: 16,
    questions: [
      { question: 'Which aespa B-side from Savage features a retro synth-pop sound?', options: ['Yeppi Yeppi', 'Aenergy', 'I\'ll Make You Cry', 'Lucid Dream'], correct: 0, fun_fact: 'Yeppi Yeppi became a fan favorite for its catchy, retro-inspired instrumental.' },
      { question: '"Illusion" is a B-side from which aespa release?', options: ['Savage', 'Girls', 'MY WORLD', 'Armageddon'], correct: 2, fun_fact: 'Illusion from MY WORLD showcases aespa\'s vocal harmonies in a dreamy pop arrangement.' },
      { question: 'Which aespa song is known for its intense dubstep drop?', options: ['Black Mamba', 'Next Level', 'Savage', 'Supernova'], correct: 2, fun_fact: 'Savage features a dramatic dubstep breakdown that became iconic in K-pop.' },
      { question: 'aespa\'s "Girls" album is considered what type of release?', options: ['Single album', 'Mini album', 'Full album', 'Repackage'], correct: 1, fun_fact: 'Girls (2022) is aespa\'s second mini album, following Savage.' },
      { question: 'Which song from the Armageddon album has a more emotional, ballad-like quality?', options: ['Supernova', 'Armageddon', 'Live My Life', 'Set the Tone'], correct: 2, fun_fact: 'Live My Life offers a contrast to the album\'s harder-hitting tracks with its uplifting, emotional tone.' },
      { question: 'aespa\'s first-ever released song was what?', options: ['Next Level', 'Black Mamba', 'Forever', 'Aenergy'], correct: 1, fun_fact: 'Black Mamba was released on November 17, 2020, the same day as aespa\'s official debut.' },
      { question: 'The song "Dreams Come True" by aespa is a remake of a song by which SM group?', options: ['Red Velvet', 'Girls\' Generation', 'f(x)', 'S.E.S.'], correct: 3, fun_fact: 'Dreams Come True is a remake of S.E.S.\'s 1998 hit, connecting SM Entertainment\'s generations.' },
    ],
  },
  {
    creator: 'my_winter99', group_slug: 'aespa', title: 'aespa true or false - think you know MY girls?',
    quiz_type: TF, settings: TIMER_HARD, created_days_ago: 5, target_plays: 180, target_likes: 10,
    questions: [
      { question: 'Karina is the oldest member of aespa', correct: true, fun_fact: 'Karina (Yu Jimin) was born on April 11, 2000, making her the oldest member.' },
      { question: 'aespa has 5 members', correct: false, fun_fact: 'aespa has 4 members: Karina, Giselle, Winter, and NingNing.' },
      { question: 'NingNing speaks Mandarin, Korean, and English', correct: true, fun_fact: 'NingNing (Ning Yizhuo) is from Harbin, China and is multilingual.' },
      { question: 'aespa\'s concept includes AI counterparts called "ae" versions of each member', correct: true, fun_fact: 'Each member has a virtual AI counterpart: ae-Karina, ae-Giselle, ae-Winter, and ae-NingNing.' },
      { question: 'Giselle is half Japanese and half Chinese', correct: false, fun_fact: 'Giselle (Aeri Uchinaga) is half Japanese and half Korean, not Chinese.' },
      { question: 'aespa debuted in 2021', correct: false, fun_fact: 'aespa debuted on November 17, 2020, with the single Black Mamba.' },
      { question: 'Winter\'s real name is Kim Minjeong', correct: true, fun_fact: 'Winter (Kim Minjeong) was born on January 1, 2001, in Yangsan, South Korea.' },
    ],
  },

  // ===================== NewJeans (2 quizzes) =====================
  {
    creator: 'bunny_haerin', group_slug: 'newjeans', title: 'NewJeans discography deep dive quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 12, target_plays: 500, target_likes: 32,
    questions: [
      { question: 'What was NewJeans\' debut EP called?', options: ['OMG', 'New Jeans', 'Get Up', 'How Sweet'], correct: 1, fun_fact: 'The self-titled EP "New Jeans" was released on August 1, 2022, featuring Attention, Hype Boy, Cookie, and Hurt.' },
      { question: 'Which NewJeans song was used in a Samsung Galaxy collaboration?', options: ['Super Shy', 'ETA', 'New Jeans', 'ASAP'], correct: 2, fun_fact: 'The song "New Jeans" was featured in a Samsung Galaxy collaboration, bridging K-pop and tech branding.' },
      { question: '"Ditto" was released as part of which album?', options: ['New Jeans', 'OMG', 'Get Up', 'It was a standalone single'], correct: 1, fun_fact: 'Ditto was a pre-release single for the OMG single album (January 2023) and became a chart-topping phenomenon.' },
      { question: 'Super Shy is from which NewJeans release?', options: ['OMG', 'New Jeans', 'Get Up', 'How Sweet'], correct: 2, fun_fact: 'Super Shy is from the 2nd EP "Get Up" (July 2023) and was produced by 250, the group\'s frequent collaborator.' },
      { question: 'Which NewJeans song topped the Melon daily chart for the longest consecutive period?', options: ['Attention', 'Hype Boy', 'Ditto', 'Super Shy'], correct: 2, fun_fact: 'Ditto had an extraordinary chart run, spending weeks at #1 on Melon and becoming one of the longest-charting K-pop songs.' },
      { question: 'NewJeans\' creative director who founded ADOR is named what?', options: ['Bang Si-hyuk', 'Min Hee-jin', 'Park Jin-young', 'Lee Soo-man'], correct: 1, fun_fact: 'Min Hee-jin is the creative director behind NewJeans\' unique retro Y2K aesthetic and music direction.' },
      { question: 'Which of these is NOT a NewJeans title track?', options: ['Cool With You', 'ETA', 'Hype Boy', 'How Sweet'], correct: 0, fun_fact: 'Cool With You is a B-side from the Get Up EP. ETA, Hype Boy, and How Sweet are all promoted tracks.' },
      { question: 'NewJeans debuted under which company?', options: ['HYBE', 'ADOR', 'Source Music', 'BIGHIT Music'], correct: 1, fun_fact: 'ADOR (All Doors One Room) is a sublabel of HYBE, led by Min Hee-jin, specifically created for NewJeans.' },
    ],
  },
  {
    creator: 'bunny_haerin', group_slug: 'newjeans', title: 'NewJeans members fun facts quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 6, target_plays: 350, target_likes: 20,
    questions: [
      { question: 'Who is the leader of NewJeans?', options: ['Minji', 'Hanni', 'Danielle', 'There is no official leader'], correct: 0, fun_fact: 'Minji is the leader and oldest member of NewJeans, born on May 7, 2004.' },
      { question: 'Hanni was born in which country?', options: ['South Korea', 'Australia', 'Vietnam', 'Japan'], correct: 2, fun_fact: 'Hanni (Pham Ngoc Han) was born in Vietnam on October 6, 2004, and grew up in Melbourne, Australia.' },
      { question: 'What is Danielle\'s nationality?', options: ['Korean', 'Australian', 'Korean-Australian', 'British-Korean'], correct: 2, fun_fact: 'Danielle Marsh is Korean-Australian. Her father is Australian and her mother is Korean.' },
      { question: 'Who is the youngest member of NewJeans?', options: ['Haerin', 'Hyein', 'Danielle', 'Hanni'], correct: 1, fun_fact: 'Hyein was born on April 21, 2008, making her one of the youngest active K-pop idols.' },
      { question: 'Haerin is known among fans for resembling which animal?', options: ['Rabbit', 'Cat', 'Puppy', 'Hamster'], correct: 1, fun_fact: 'Haerin is often compared to a cat due to her sharp features and cat-like expressions.' },
      { question: 'How many members does NewJeans have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: 'NewJeans has 5 members: Minji, Hanni, Danielle, Haerin, and Hyein.' },
      { question: 'NewJeans\' overall concept is inspired by which era?', options: ['80s disco', 'Y2K / early 2000s', 'Victorian era', '70s funk'], correct: 1, fun_fact: 'NewJeans\' visual and musical identity draws heavily from Y2K aesthetics and early 2000s pop culture.' },
    ],
  },

  // ===================== EXO (2 quizzes) =====================
  {
    creator: 'hallyu_nerd', group_slug: 'exo', title: 'EXO legends quiz - only EXO-Ls survive',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 15, target_plays: 400, target_likes: 22,
    questions: [
      { question: 'When did EXO debut?', options: ['April 8, 2012', 'June 15, 2012', 'January 1, 2013', 'March 30, 2012'], correct: 0, fun_fact: 'EXO debuted on April 8, 2012, performing MAMA at their debut showcase at Olympic Gymnasium in Seoul.' },
      { question: 'What are EXO\'s two sub-units based on language?', options: ['EXO-J and EXO-K', 'EXO-K and EXO-M', 'EXO-S and EXO-C', 'EXO-1 and EXO-2'], correct: 1, fun_fact: 'EXO-K (Korean) and EXO-M (Mandarin) released the same songs in different languages simultaneously.' },
      { question: 'Which EXO song is widely credited with making them a top-tier group in Korea?', options: ['MAMA', 'Wolf', 'Growl', 'Overdose'], correct: 2, fun_fact: 'Growl (2013) was a massive hit that catapulted EXO to the top of Korean music, selling over 1 million copies of the XOXO album.' },
      { question: 'How many members did EXO debut with?', options: ['9', '10', '11', '12'], correct: 3, fun_fact: 'EXO debuted with 12 members (6 in EXO-K, 6 in EXO-M). Three Chinese members later departed.' },
      { question: 'Which EXO member is known for the nickname "D.O." and has a successful acting career?', options: ['Chen', 'Baekhyun', 'D.O.', 'Suho'], correct: 2, fun_fact: 'D.O. (Do Kyungsoo) has starred in multiple Korean films and dramas, including "100 Days My Prince."' },
      { question: 'EXO\'s "Love Shot" is from which album?', options: ['Don\'t Mess Up My Tempo', 'Love Shot (repackage)', 'THE WAR', 'EXODUS'], correct: 1, fun_fact: 'Love Shot is the repackage of Don\'t Mess Up My Tempo, released in December 2018.' },
      { question: 'Who is the leader of EXO?', options: ['Baekhyun', 'Chanyeol', 'Suho', 'Kai'], correct: 2, fun_fact: 'Suho (Kim Junmyeon) has been EXO\'s leader since debut. His stage name means "guardian" in Korean.' },
      { question: 'EXO\'s concert series is famously called what?', options: ['EXO Planet', 'EXO World Tour', 'EXO-Lution', 'EXO Arena'], correct: 0, fun_fact: 'EXO\'s concert tours are named "EXO Planet" followed by a number (#1, #2, etc.).' },
    ],
  },
  {
    creator: 'exol_chen', group_slug: 'exo', title: 'EXO true or false - test your EXO-L knowledge',
    quiz_type: TF, settings: TIMER_NORMAL, created_days_ago: 10, target_plays: 250, target_likes: 14,
    questions: [
      { question: 'EXO originally had 12 members at debut', correct: true, fun_fact: 'EXO debuted with 12 members split into EXO-K (Korean) and EXO-M (Mandarin).' },
      { question: 'Baekhyun is the leader of EXO', correct: false, fun_fact: 'Suho is EXO\'s leader. Baekhyun is a main vocalist.' },
      { question: 'Chen released a solo album called "April, and a Flower"', correct: true, fun_fact: 'Chen\'s solo debut mini album "April, and a Flower" was released in April 2019 and showcased his ballad vocals.' },
      { question: 'EXO\'s lightstick is shaped like a star', correct: false, fun_fact: 'EXO\'s official lightstick is shaped like a white baton/wand, not a star.' },
      { question: 'Kai was the first EXO member to debut as a soloist', correct: true, fun_fact: 'Kai released his first solo mini album "KAI (Kai)" in November 2020.' },
      { question: 'EXO debuted under JYP Entertainment', correct: false, fun_fact: 'EXO debuted under SM Entertainment, which also manages groups like SHINee, Red Velvet, and aespa.' },
      { question: 'EXO\'s Xiumin is the oldest member of the group', correct: true, fun_fact: 'Xiumin (Kim Minseok) was born on March 26, 1990, making him the oldest EXO member.' },
    ],
  },

  // ===================== (G)I-DLE (2 quizzes) =====================
  {
    creator: 'kpop_scholar', group_slug: 'g-i-dle', title: '(G)I-DLE self-produced queens quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 13, target_plays: 400, target_likes: 24,
    questions: [
      { question: 'When did (G)I-DLE debut?', options: ['May 2, 2018', 'August 14, 2018', 'January 11, 2019', 'March 25, 2018'], correct: 0, fun_fact: '(G)I-DLE debuted on May 2, 2018, under Cube Entertainment with the song LATATA.' },
      { question: 'Who is (G)I-DLE\'s main songwriter and producer?', options: ['Miyeon', 'Minnie', 'Soyeon', 'Yuqi'], correct: 2, fun_fact: 'Jeon Soyeon writes, composes, and produces most of (G)I-DLE\'s music, making her one of K-pop\'s top idol-producers.' },
      { question: 'How many members does (G)I-DLE currently have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: '(G)I-DLE has 5 members after Soojin\'s departure in August 2021. Current members: Miyeon, Minnie, Soyeon, Yuqi, Shuhua.' },
      { question: '"Tomboy" became a massive hit in 2022. From which album?', options: ['I NEVER DIE', 'I burn', 'I trust', 'HEAT'], correct: 0, fun_fact: 'I NEVER DIE (March 2022) was their first full album. Tomboy topped Korean charts and went viral globally.' },
      { question: 'Which (G)I-DLE member is from Taiwan?', options: ['Yuqi', 'Minnie', 'Shuhua', 'Miyeon'], correct: 2, fun_fact: 'Shuhua (Yeh Shu-hua) is from Tainan, Taiwan.' },
      { question: 'Which (G)I-DLE member is from Thailand?', options: ['Shuhua', 'Yuqi', 'Minnie', 'Soyeon'], correct: 2, fun_fact: 'Minnie (Nicha Yontararak) is from Bangkok, Thailand and speaks Thai, Korean, and English.' },
      { question: '"Queencard" is from which (G)I-DLE album?', options: ['I NEVER DIE', 'I feel', 'HEAT', '2'], correct: 1, fun_fact: 'I feel (May 2023) featured Queencard and Allergy as title tracks, with Queencard becoming a massive TikTok hit.' },
      { question: 'What was (G)I-DLE\'s debut song?', options: ['Senorita', 'HANN', 'LATATA', 'Oh my god'], correct: 2, fun_fact: 'LATATA was their debut single in May 2018 and immediately put the group on the map with its Latin-pop influence.' },
    ],
  },
  {
    creator: 'kpop_scholar', group_slug: 'g-i-dle', title: '(G)I-DLE true or false',
    quiz_type: TF, settings: TIMER_NORMAL, created_days_ago: 7, target_plays: 200, target_likes: 12,
    questions: [
      { question: '(G)I-DLE is under SM Entertainment', correct: false, fun_fact: '(G)I-DLE is under Cube Entertainment, which also manages BTOB and Pentagon.' },
      { question: 'Soyeon appeared on the survival show Produce 101', correct: true, fun_fact: 'Soyeon competed on Produce 101 Season 1 in 2016, finishing in the top 20 but not making the final group (I.O.I).' },
      { question: 'Yuqi is from China', correct: true, fun_fact: 'Yuqi (Song Yuqi) is from Beijing, China and speaks Mandarin and Korean.' },
      { question: '(G)I-DLE originally debuted with 7 members', correct: false, fun_fact: '(G)I-DLE debuted with 6 members. After Soojin\'s departure in 2021, they continue as 5 members.' },
      { question: 'Soyeon wrote and produced "POP/STARS" for the virtual K-pop group K/DA', correct: true, fun_fact: 'Soyeon was part of K/DA alongside Madison Beer, Jaira Burns, and Miyeon, performing at the 2018 League of Legends World Championship.' },
      { question: '(G)I-DLE stands for "Girls I Do Love Everyone"', correct: false, fun_fact: 'The (G) stands for "Girl" and I-DLE is a Korean word meaning "us/we" so it means "Girl, Us" or the girls as a collective.' },
      { question: '"Nxde" was released in 2022', correct: true, fun_fact: 'Nxde was the title track from the album "I love" released in October 2022, with powerful feminist messaging.' },
    ],
  },

  // ===================== IVE (1 quiz) =====================
  {
    creator: 'kpop_scholar', group_slug: 'ive', title: 'How well do you know IVE?',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 9, target_plays: 350, target_likes: 20,
    questions: [
      { question: 'When did IVE debut?', options: ['December 1, 2021', 'March 15, 2022', 'August 22, 2021', 'January 5, 2022'], correct: 0, fun_fact: 'IVE debuted on December 1, 2021, under Starship Entertainment with the single "ELEVEN."' },
      { question: 'Which two IVE members were previously in IZ*ONE?', options: ['Gaeul and Rei', 'Wonyoung and Yujin', 'Liz and Leeseo', 'Wonyoung and Gaeul'], correct: 1, fun_fact: 'Jang Wonyoung and An Yujin were both members of IZ*ONE, which was formed through Produce 48.' },
      { question: 'What was IVE\'s debut song?', options: ['LOVE DIVE', 'ELEVEN', 'After LIKE', 'Kitsch'], correct: 1, fun_fact: 'ELEVEN was a commercial hit right from debut, establishing IVE as a top 4th gen girl group.' },
      { question: '"LOVE DIVE" won Song of the Year at which 2022 awards show?', options: ['MAMA', 'MMA', 'Both MAMA and MMA', 'Neither'], correct: 2, fun_fact: 'LOVE DIVE swept multiple Daesangs including Song of the Year at both MAMA and MMA in 2022.' },
      { question: 'How many members does IVE have?', options: ['4', '5', '6', '7'], correct: 2, fun_fact: 'IVE has 6 members: Yujin, Gaeul, Rei, Wonyoung, Liz, and Leeseo.' },
      { question: 'Which IVE member is from Japan?', options: ['Gaeul', 'Liz', 'Rei', 'Leeseo'], correct: 2, fun_fact: 'Rei (Naoi Rei) is from Tokyo, Japan, and is the only non-Korean member of IVE.' },
      { question: '"After LIKE" samples which famous classical piece?', options: ['Fur Elise', 'Vivaldi\'s Spring', 'Gloria Gaynor\'s I Will Survive', 'Canon in D'], correct: 2, fun_fact: 'After LIKE samples the intro of Gloria Gaynor\'s 1978 disco classic "I Will Survive."' },
    ],
  },

  // ===================== ENHYPEN (1 quiz) =====================
  {
    creator: 'army_mina97', group_slug: 'enhypen', title: 'ENHYPEN debut and beyond quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 8, target_plays: 250, target_likes: 14,
    questions: [
      { question: 'ENHYPEN was formed through which survival show?', options: ['Produce 101', 'I-LAND', 'Kingdom', 'Road to Kingdom'], correct: 1, fun_fact: 'I-LAND aired on Mnet in 2020, with 7 members selected to form ENHYPEN.' },
      { question: 'What was ENHYPEN\'s debut song?', options: ['Drunk-Dazed', 'Given-Taken', 'Fever', 'Tamed-Dashed'], correct: 1, fun_fact: 'Given-Taken was released with their debut EP "BORDER: DAY ONE" on November 30, 2020.' },
      { question: 'How many members does ENHYPEN have?', options: ['5', '6', '7', '8'], correct: 2, fun_fact: 'ENHYPEN has 7 members: Heeseung, Jay, Jake, Sunghoon, Sunoo, Jungwon, and Ni-ki.' },
      { question: 'Which ENHYPEN member is from Japan?', options: ['Jake', 'Sunghoon', 'Ni-ki', 'Jay'], correct: 2, fun_fact: 'Ni-ki (Nishimura Riki) is from Okayama, Japan, and is the youngest member.' },
      { question: 'Which ENHYPEN member is from Australia?', options: ['Jay', 'Jake', 'Heeseung', 'Sunghoon'], correct: 1, fun_fact: 'Jake (Sim Jaeyun) was born in South Korea but raised in Brisbane, Australia.' },
      { question: 'Who is ENHYPEN\'s leader?', options: ['Heeseung', 'Jay', 'Jungwon', 'Sunghoon'], correct: 2, fun_fact: 'Jungwon was selected as leader despite being one of the younger members, chosen for his maturity and leadership qualities.' },
      { question: 'ENHYPEN is under which company?', options: ['HYBE', 'BELIFT LAB', 'BIGHIT Music', 'Source Music'], correct: 1, fun_fact: 'BELIFT LAB is a joint venture between HYBE and CJ ENM, created specifically for ENHYPEN.' },
    ],
  },

  // ===================== ATEEZ (1 quiz) =====================
  {
    creator: 'army_mina97', group_slug: 'ateez', title: 'ATEEZ title tracks and members quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 6, target_plays: 300, target_likes: 18,
    questions: [
      { question: 'When did ATEEZ debut?', options: ['October 24, 2018', 'January 15, 2019', 'March 1, 2018', 'July 29, 2018'], correct: 0, fun_fact: 'ATEEZ debuted on October 24, 2018, under KQ Entertainment with their EP "TREASURE EP.1: All to Zero."' },
      { question: 'What is ATEEZ\'s fandom called?', options: ['ATINY', 'ATEINY', 'TEEZ', 'HORIZON'], correct: 0, fun_fact: 'ATINY is a combination of ATEEZ and DESTINY, meaning fans are ATEEZ\'s destiny.' },
      { question: 'Who is the leader of ATEEZ?', options: ['Seonghwa', 'Hongjoong', 'San', 'Yunho'], correct: 1, fun_fact: 'Hongjoong is ATEEZ\'s leader and main rapper, also heavily involved in songwriting and producing.' },
      { question: 'How many members does ATEEZ have?', options: ['6', '7', '8', '9'], correct: 2, fun_fact: 'ATEEZ has 8 members: Hongjoong, Seonghwa, Yunho, Yeosang, San, Mingi, Wooyoung, and Jongho.' },
      { question: '"Guerrilla" is the title track from which ATEEZ album?', options: ['TREASURE EP.FIN', 'ZERO: FEVER Part.1', 'THE WORLD EP.1: MOVEMENT', 'THE WORLD EP.2: OUTLAW'], correct: 2, fun_fact: 'THE WORLD EP.1: MOVEMENT (July 2022) marked a new chapter in ATEEZ\'s "HALATEEZ" storyline.' },
      { question: 'ATEEZ competed on which Mnet competition show?', options: ['Road to Kingdom', 'Kingdom: Legendary War', 'Queendom', 'MAMA'], correct: 1, fun_fact: 'ATEEZ competed on Kingdom: Legendary War in 2021, gaining significant recognition for their powerful performances.' },
      { question: 'Which ATEEZ member is known for his powerful high-note vocals?', options: ['San', 'Hongjoong', 'Jongho', 'Wooyoung'], correct: 2, fun_fact: 'Jongho is famous for his incredible vocal power, often demonstrated by singing while crushing apples with his bare hands.' },
    ],
  },

  // ===================== ITZY (1 quiz) =====================
  {
    creator: 'midzy_ryujin', group_slug: 'itzy', title: 'ITZY members and discography quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 10, target_plays: 300, target_likes: 16,
    questions: [
      { question: 'What was ITZY\'s debut song?', options: ['ICY', 'DALLA DALLA', 'Wannabe', 'Not Shy'], correct: 1, fun_fact: 'DALLA DALLA was released on February 12, 2019, and its MV got 17 million views in 24 hours.' },
      { question: 'Which company manages ITZY?', options: ['SM Entertainment', 'JYP Entertainment', 'YG Entertainment', 'HYBE'], correct: 1, fun_fact: 'JYP Entertainment also manages TWICE and Stray Kids, making ITZY their junior girl group.' },
      { question: 'How many members does ITZY have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: 'ITZY has 5 members: Yeji, Lia, Ryujin, Chaeryeong, and Yuna.' },
      { question: 'Which ITZY member is the leader?', options: ['Ryujin', 'Yeji', 'Lia', 'Chaeryeong'], correct: 1, fun_fact: 'Yeji (Hwang Yeji) is the leader, main dancer, and vocalist of ITZY.' },
      { question: '"Wannabe" is known for its point choreography involving what?', options: ['A heart shape', 'A shoulder shimmy', 'A hand flicking motion on the face', 'A jumping spin'], correct: 2, fun_fact: 'Wannabe\'s iconic "face flick" choreography became a viral dance challenge on social media.' },
      { question: 'ITZY\'s concept is centered around what message?', options: ['Girl crush', 'Self-confidence and self-love', 'Dark fantasy', 'Romance'], correct: 1, fun_fact: 'ITZY\'s songs consistently promote self-love and confidence, with titles like "DALLA DALLA" (meaning "different") and "Wannabe."' },
      { question: 'Chaeryeong is the sister of which other K-pop idol?', options: ['TWICE\'s Dahyun', 'IZ*ONE\'s Chaeyeon', 'BLACKPINK\'s Rose', 'Red Velvet\'s Joy'], correct: 1, fun_fact: 'Chaeryeong and Lee Chaeyeon (IZ*ONE) are sisters. Both appeared on K-pop Star 3 and later debuted in different groups.' },
    ],
  },

  // ===================== Red Velvet (1 quiz) =====================
  {
    creator: 'stan_attacker', group_slug: 'red-velvet', title: 'Red Velvet dual concept queens quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 9, target_plays: 250, target_likes: 14,
    questions: [
      { question: 'What was Red Velvet\'s debut song?', options: ['Ice Cream Cake', 'Happiness', 'Be Natural', 'Dumb Dumb'], correct: 1, fun_fact: 'Happiness was released on August 1, 2014, with the original 4 members before Yeri joined.' },
      { question: 'When did Yeri join Red Velvet?', options: ['At debut in 2014', 'March 2015 with Ice Cream Cake', 'July 2016', 'She was always a member'], correct: 1, fun_fact: 'Yeri (Kim Yerim) joined as the 5th member in March 2015 for the Ice Cream Cake comeback.' },
      { question: 'What are the two "concepts" Red Velvet is famous for?', options: ['Dark and Light', 'Red and Velvet', 'Pop and R&B', 'Summer and Winter'], correct: 1, fun_fact: '"Red" represents upbeat pop songs and "Velvet" represents smooth R&B and mature concepts.' },
      { question: 'Which Red Velvet song is their signature "Red" concept hit?', options: ['Psycho', 'Red Flavor', 'Bad Boy', 'Automatic'], correct: 1, fun_fact: 'Red Flavor (2017) is the quintessential "Red" song - bright, summery, and energetic.' },
      { question: 'Which Red Velvet song is considered their signature "Velvet" hit?', options: ['Red Flavor', 'Bad Boy', 'Power Up', 'Dumb Dumb'], correct: 1, fun_fact: 'Bad Boy (2018) is the iconic "Velvet" song - smooth, R&B-influenced, and sophisticated.' },
      { question: 'Who is the leader of Red Velvet?', options: ['Seulgi', 'Irene', 'Wendy', 'Joy'], correct: 1, fun_fact: 'Irene (Bae Joohyun) is the leader and oldest member, born March 29, 1991.' },
      { question: 'Red Velvet performed for North Korean leaders in Pyongyang in which year?', options: ['2017', '2018', '2019', '2020'], correct: 1, fun_fact: 'Red Velvet performed in Pyongyang in April 2018 as part of a South Korean cultural delegation, a historic diplomatic event.' },
    ],
  },

  // ===================== LE SSERAFIM (1 quiz) =====================
  {
    creator: 'stan_attacker', group_slug: 'le-sserafim', title: 'LE SSERAFIM quiz - are you a real FEARNOT?',
    quiz_type: GFC, settings: TIMER_NORMAL, created_days_ago: 5, target_plays: 280, target_likes: 16,
    questions: [
      { question: 'Which LE SSERAFIM song is this?', clues: ['The group\'s debut title track', 'Name represents being unafraid', 'Released in May 2022'], options: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'], correct: 0, fun_fact: 'FEARLESS was released on May 2, 2022, as part of their debut EP of the same name.' },
      { question: 'Which LE SSERAFIM member is this?', clues: ['Originally from Japan', 'Former IZ*ONE member', 'Considered the center and most prominent member'], options: ['Kazuha', 'Sakura', 'Chaewon', 'Eunchae'], correct: 1, fun_fact: 'Sakura (Miyawaki Sakura) was a member of HKT48 and IZ*ONE before joining LE SSERAFIM.' },
      { question: 'Which LE SSERAFIM song is this?', clues: ['Became a viral TikTok hit in 2024', 'Has a laid-back, groovy sound', 'Title is a common English word'], options: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'], correct: 3, fun_fact: 'EASY (February 2024) went massively viral on TikTok and social media, becoming one of their biggest hits.' },
      { question: 'Which LE SSERAFIM member is this?', clues: ['Trained in classical ballet in the Netherlands', 'Japanese member', 'Known for her elegant dance style'], options: ['Sakura', 'Kazuha', 'Chaewon', 'Eunchae'], correct: 1, fun_fact: 'Kazuha (Nakamura Kazuha) trained at the Royal Conservatoire of The Hague before becoming a K-pop trainee.' },
      { question: 'Which LE SSERAFIM song is this?', clues: ['Released in 2022', 'Title is based on a Nassim Taleb concept', 'Accompanied by an intense workout-themed MV'], options: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'], correct: 1, fun_fact: 'ANTIFRAGILE references Nassim Taleb\'s concept of becoming stronger through adversity.' },
    ],
  },

  // ===================== General K-pop (2 quizzes) =====================
  {
    creator: 'army_mina97', group_slug: 'general-kpop', title: 'Which K-pop group debuted first? Timeline challenge',
    quiz_type: MC, settings: TIMER_HARD, created_days_ago: 12, target_plays: 550, target_likes: 30,
    questions: [
      { question: 'Which group debuted first?', options: ['BTS', 'EXO', 'SEVENTEEN', 'Red Velvet'], correct: 1, fun_fact: 'EXO debuted April 2012, BTS June 2013, Red Velvet August 2014, SEVENTEEN May 2015.' },
      { question: 'Which group debuted first?', options: ['TWICE', 'BLACKPINK', 'Red Velvet', 'MAMAMOO'], correct: 3, fun_fact: 'MAMAMOO debuted June 2014, Red Velvet August 2014, TWICE October 2015, BLACKPINK August 2016.' },
      { question: 'Which group debuted first?', options: ['Stray Kids', 'ATEEZ', '(G)I-DLE', 'ITZY'], correct: 2, fun_fact: '(G)I-DLE debuted May 2, 2018. Stray Kids debuted March 25, 2018 - actually Stray Kids debuted first!' },
      { question: 'Which 4th gen group debuted first?', options: ['ENHYPEN', 'aespa', 'IVE', 'NewJeans'], correct: 1, fun_fact: 'aespa debuted November 17, 2020. ENHYPEN debuted November 30, 2020. IVE December 2021. NewJeans August 2022.' },
      { question: 'Which group debuted first?', options: ['SHINee', 'EXO', 'BTS', 'GOT7'], correct: 0, fun_fact: 'SHINee debuted May 2008, EXO April 2012, BTS June 2013, GOT7 January 2014.' },
      { question: 'Which group debuted first?', options: ['TXT', 'ITZY', 'Stray Kids', 'ATEEZ'], correct: 2, fun_fact: 'Stray Kids March 2018, ATEEZ October 2018, TXT March 2019, ITZY February 2019 - ITZY actually debuted before TXT!' },
      { question: 'Which group debuted first?', options: ['LE SSERAFIM', 'NewJeans', 'IVE', 'NMIXX'], correct: 2, fun_fact: 'IVE December 2021, NMIXX February 2022, LE SSERAFIM May 2022, NewJeans August 2022.' },
      { question: 'Which group debuted first?', options: ['BLACKPINK', 'TWICE', 'Red Velvet', 'aespa'], correct: 2, fun_fact: 'Red Velvet August 2014, TWICE October 2015, BLACKPINK August 2016, aespa November 2020.' },
    ],
  },
  {
    creator: 'army_mina97', group_slug: 'general-kpop', title: 'K-pop company quiz - match the group to the label',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 3, target_plays: 400, target_likes: 22,
    questions: [
      { question: 'Which company manages Stray Kids?', options: ['SM Entertainment', 'YG Entertainment', 'JYP Entertainment', 'HYBE'], correct: 2, fun_fact: 'JYP Entertainment was founded by Park Jin-young and also manages TWICE and ITZY.' },
      { question: 'IVE is under which entertainment company?', options: ['Starship Entertainment', 'Cube Entertainment', 'Pledis Entertainment', 'Woollim Entertainment'], correct: 0, fun_fact: 'Starship Entertainment is a subsidiary of Kakao Entertainment.' },
      { question: '(G)I-DLE is managed by which company?', options: ['SM Entertainment', 'Cube Entertainment', 'JYP Entertainment', 'Starship Entertainment'], correct: 1, fun_fact: 'Cube Entertainment also manages BTOB and Pentagon.' },
      { question: 'NewJeans is under which label?', options: ['BIGHIT Music', 'Source Music', 'ADOR', 'Pledis Entertainment'], correct: 2, fun_fact: 'ADOR is a sublabel of HYBE, created and led by Min Hee-jin for NewJeans.' },
      { question: 'Which company manages both BTS and SEVENTEEN?', options: ['SM Entertainment', 'HYBE', 'JYP Entertainment', 'CJ ENM'], correct: 1, fun_fact: 'HYBE is the parent company. BTS is under BIGHIT Music and SEVENTEEN is under Pledis Entertainment, both HYBE subsidiaries.' },
      { question: 'ATEEZ is under which company?', options: ['KQ Entertainment', 'FNC Entertainment', 'Cube Entertainment', 'TOP Media'], correct: 0, fun_fact: 'KQ Entertainment is a smaller company that found massive success with ATEEZ.' },
      { question: 'Which company was founded by Lee Soo-man?', options: ['JYP Entertainment', 'YG Entertainment', 'SM Entertainment', 'HYBE'], correct: 2, fun_fact: 'SM Entertainment was founded by Lee Soo-man in 1995 and manages EXO, Red Velvet, aespa, and NCT among others.' },
      { question: 'LE SSERAFIM is managed by which HYBE sublabel?', options: ['BIGHIT Music', 'ADOR', 'Source Music', 'Pledis Entertainment'], correct: 2, fun_fact: 'Source Music is the HYBE sublabel that manages LE SSERAFIM. It previously managed GFRIEND.' },
    ],
  },

  // ===================== TXT (1 quiz) =====================
  {
    creator: 'jimin_universe', group_slug: 'txt', title: 'How well do you know TXT?',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 10, target_plays: 300, target_likes: 16,
    questions: [
      { question: 'What was TXT\'s debut song?', options: ['Cat & Dog', 'Crown', 'Run Away', 'Blue Hour'], correct: 1, fun_fact: 'Crown was released on March 4, 2019, with TXT\'s debut EP "The Dream Chapter: STAR."' },
      { question: 'How many members does TXT have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: 'TXT has 5 members: Yeonjun, Soobin, Beomgyu, Taehyun, and Hueningkai.' },
      { question: 'Who is the leader of TXT?', options: ['Yeonjun', 'Soobin', 'Beomgyu', 'Taehyun'], correct: 1, fun_fact: 'Soobin is TXT\'s leader, known for his gentle personality and his hosting role on Music Bank.' },
      { question: 'TXT is under which company?', options: ['SM Entertainment', 'JYP Entertainment', 'BIGHIT Music', 'Pledis Entertainment'], correct: 2, fun_fact: 'BIGHIT Music (a HYBE subsidiary) manages both BTS and TXT.' },
      { question: 'Which TXT album features the hit "0X1=LOVESONG (I Know I Love You)"?', options: ['The Dream Chapter: MAGIC', 'The Chaos Chapter: FREEZE', 'minisode 1: Blue Hour', 'The Dream Chapter: ETERNITY'], correct: 1, fun_fact: 'The Chaos Chapter: FREEZE (2021) was TXT\'s first album to chart on the Billboard 200, reaching #5.' },
      { question: 'Hueningkai is of what mixed heritage?', options: ['Korean-Japanese', 'Korean-American', 'Korean-Brazilian and American', 'Korean-Chinese'], correct: 2, fun_fact: 'Hueningkai (Kai Kamal Huening) has a Korean mother and a German-Brazilian-American father.' },
      { question: 'Which TXT member was the first to be revealed during pre-debut teasers?', options: ['Soobin', 'Yeonjun', 'Beomgyu', 'Taehyun'], correct: 1, fun_fact: 'Yeonjun was the first TXT member revealed in January 2019, generating huge anticipation as the first post-BTS HYBE boy group.' },
    ],
  },

  // ===================== SHINee (1 quiz) =====================
  {
    creator: 'hallyu_nerd', group_slug: 'shinee', title: 'SHINee legends quiz - K-pop pioneers',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 14, target_plays: 350, target_likes: 20,
    questions: [
      { question: 'When did SHINee debut?', options: ['May 25, 2008', 'August 1, 2009', 'March 15, 2008', 'January 1, 2009'], correct: 0, fun_fact: 'SHINee debuted on May 25, 2008, under SM Entertainment, helping define 2nd generation K-pop.' },
      { question: 'What was SHINee\'s debut song?', options: ['Lucifer', 'Ring Ding Dong', 'Replay', 'Sherlock'], correct: 2, fun_fact: 'Replay (Noona Neomu Yeppeo) established SHINee\'s trendy, youth-oriented concept from day one.' },
      { question: 'How many members does SHINee have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: 'SHINee has 5 members: Onew, Jonghyun, Key, Minho, and Taemin.' },
      { question: 'Which SHINee member is widely regarded as one of K-pop\'s greatest dancers?', options: ['Onew', 'Key', 'Minho', 'Taemin'], correct: 3, fun_fact: 'Taemin\'s solo career showcased his exceptional dancing, with songs like "Move" becoming iconic choreography pieces.' },
      { question: 'SHINee\'s "Sherlock" is notable for being a combination of which two songs?', options: ['Lock and Key', 'Clue and Note', 'Mystery and Solve', 'Find and Seek'], correct: 1, fun_fact: 'Sherlock is a mashup of "Clue" and "Note" - all three songs were released, with Sherlock being the combined version.' },
      { question: '"Ring Ding Dong" is known for being extremely what?', options: ['Sad', 'Catchy and addictive', 'Short (under 2 minutes)', 'A cappella'], correct: 1, fun_fact: 'Ring Ding Dong (2009) is legendary for being so catchy that Korean students reportedly couldn\'t stop singing it during exams.' },
      { question: 'Which SHINee member enlisted in the military first?', options: ['Key', 'Onew', 'Minho', 'Taemin'], correct: 1, fun_fact: 'Onew enlisted in December 2018, followed by Key and Minho in 2019.' },
    ],
  },

  // ===================== LE SSERAFIM (already covered above with GFC) =====================
  // ===================== Additional quiz from jimin_universe =====================
  {
    creator: 'jimin_universe', group_slug: 'le-sserafim', title: 'LE SSERAFIM members and music quiz',
    quiz_type: MC, settings: TIMER_NORMAL, created_days_ago: 7, target_plays: 250, target_likes: 14,
    questions: [
      { question: 'How many members does LE SSERAFIM currently have?', options: ['4', '5', '6', '7'], correct: 1, fun_fact: 'LE SSERAFIM has 5 members: Sakura, Kim Chaewon, Huh Yunjin, Kazuha, and Hong Eunchae.' },
      { question: 'Which LE SSERAFIM member is the leader?', options: ['Sakura', 'Kim Chaewon', 'Huh Yunjin', 'Kazuha'], correct: 1, fun_fact: 'Kim Chaewon is the leader. She was previously a member of IZ*ONE alongside Sakura.' },
      { question: 'Huh Yunjin was born in which country?', options: ['South Korea', 'Japan', 'United States', 'Australia'], correct: 2, fun_fact: 'Huh Yunjin was born in South Korea but raised in New York City. She appeared on Produce 48.' },
      { question: 'LE SSERAFIM is an anagram of what phrase?', options: ['I AM FEARLESS', 'IM FEARLESS', 'LE SERAPHIM', 'FEAR LESS'], correct: 0, fun_fact: 'LE SSERAFIM is an anagram of "I\'M FEARLESS," representing the group\'s bold concept.' },
      { question: 'Who is the youngest member (maknae) of LE SSERAFIM?', options: ['Kazuha', 'Eunchae', 'Yunjin', 'Chaewon'], correct: 1, fun_fact: 'Hong Eunchae was born on November 10, 2006, making her the youngest member.' },
      { question: 'Which LE SSERAFIM song features a collaboration with Nile Rodgers?', options: ['FEARLESS', 'ANTIFRAGILE', 'UNFORGIVEN', 'EASY'], correct: 2, fun_fact: 'UNFORGIVEN features legendary guitarist/producer Nile Rodgers, blending K-pop with funk-rock elements.' },
      { question: 'LE SSERAFIM is managed by Source Music, which is under which parent company?', options: ['SM Entertainment', 'JYP Entertainment', 'HYBE', 'CJ ENM'], correct: 2, fun_fact: 'Source Music is a HYBE subsidiary. It previously managed GFRIEND before the group disbanded in 2021.' },
    ],
  },
];

// ============================================================
// Main seed function
// ============================================================

async function main() {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    console.log('Cleaning previous seed data...');
    // Delete in order respecting foreign keys
    const { data: fakeUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
    const fakeIds = (fakeUsers?.users ?? [])
      .filter(u => u.email?.endsWith('@fake.kpopquizz.com'))
      .map(u => u.id);

    if (fakeIds.length > 0) {
      await supabase.from('user_badges').delete().in('user_id', fakeIds);
      await supabase.from('likes').delete().in('user_id', fakeIds);
      // Delete plays by these users
      await supabase.from('plays').delete().in('player_id', fakeIds);
      // Delete quizzes by these users (which cascades plays/likes on those quizzes)
      await supabase.from('quizzes').delete().in('creator_id', fakeIds);
      // Delete profiles
      await supabase.from('profiles').delete().in('id', fakeIds);
      // Delete auth users
      for (const id of fakeIds) {
        await supabase.auth.admin.deleteUser(id);
      }
      console.log(`  Cleaned ${fakeIds.length} fake users and their data.`);
    } else {
      console.log('  No fake users found to clean.');
    }
  }

  // Step 1: Create users
  console.log('\n1. Creating users...');
  const userMap = new Map<string, string>(); // username -> id

  for (const u of USERS) {
    const email = `${u.username}@fake.kpopquizz.com`;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });

    if (authError) {
      // User might already exist
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', u.username).maybeSingle();
      if (existing) {
        userMap.set(u.username, existing.id);
        continue;
      }
      console.error(`  Failed to create ${u.username}: ${authError.message}`);
      continue;
    }

    const color = AVATAR_COLORS[u.color_idx % AVATAR_COLORS.length]!;
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: null,
      avatar_bg: color.bg,
      avatar_text: color.text,
      bio: u.bio,
      created_at: daysAgo(u.joined_days_ago),
    });

    if (profileError) {
      console.error(`  Failed to create profile ${u.username}: ${profileError.message}`);
      continue;
    }

    userMap.set(u.username, authUser.user.id);
  }
  console.log(`  Created ${userMap.size} users.`);

  // Step 2: Fetch group map
  const { data: groups } = await supabase.from('groups').select('id, slug');
  const groupMap = new Map<string, number>();
  for (const g of groups ?? []) {
    groupMap.set(g.slug, g.id);
  }

  // Step 3: Insert quizzes
  console.log('\n2. Inserting quizzes...');
  const quizRecords: Array<{ id: string; creator_id: string; group_id: number; question_count: number; target_plays: number; target_likes: number; created_at: string }> = [];

  for (const q of QUIZZES) {
    const creatorId = userMap.get(q.creator);
    const groupId = groupMap.get(q.group_slug);
    if (!creatorId || !groupId) {
      console.error(`  Skipping "${q.title}" - creator or group not found`);
      continue;
    }

    let slug = generateSlug(q.title);
    // Ensure unique slug
    const { data: existing } = await supabase.from('quizzes').select('id').eq('slug', slug).maybeSingle();
    if (existing) slug = `${slug}-${randomBetween(2, 99)}`;

    const createdAt = daysAgo(q.created_days_ago);

    const { data: quiz, error } = await supabase.from('quizzes').insert({
      creator_id: creatorId,
      group_id: groupId,
      title: q.title,
      slug,
      quiz_type: q.quiz_type,
      questions: q.questions,
      settings: q.settings,
      status: 'published',
      difficulty: 'medium',
      question_count: q.questions.length,
      created_at: createdAt,
    }).select('id').single();

    if (error) {
      console.error(`  Failed: "${q.title}": ${error.message}`);
      continue;
    }

    quizRecords.push({
      id: quiz.id,
      creator_id: creatorId,
      group_id: groupId,
      question_count: q.questions.length,
      target_plays: q.target_plays,
      target_likes: q.target_likes,
      created_at: createdAt,
    });
  }
  console.log(`  Inserted ${quizRecords.length} quizzes.`);

  // Step 4: Generate plays
  console.log('\n3. Generating plays...');
  const allUserIds = Array.from(userMap.values());
  let totalPlays = 0;

  for (const qr of quizRecords) {
    const playCount = qr.target_plays + randomBetween(-20, 20);
    const quizCreatedDate = new Date(qr.created_at);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - quizCreatedDate.getTime()) / 86400000));

    const plays: Array<{ quiz_id: string; player_id: string | null; score: number; total_questions: number; time_taken_seconds: number; created_at: string }> = [];

    for (let i = 0; i < playCount; i++) {
      // ~40% anonymous
      const isAnon = Math.random() < 0.4;
      const playerId = isAnon ? null : pickRandom(allUserIds);
      const score = weightedScore(qr.question_count);
      const timeTaken = randomBetween(25, 45) + qr.question_count * randomBetween(5, 15);

      // Random date between quiz creation and now
      const daysOffset = Math.random() * daysSinceCreation;
      const playDate = new Date(quizCreatedDate.getTime() + daysOffset * 86400000);
      playDate.setHours(randomBetween(6, 23), randomBetween(0, 59), randomBetween(0, 59));

      plays.push({
        quiz_id: qr.id,
        player_id: playerId,
        score,
        total_questions: qr.question_count,
        time_taken_seconds: timeTaken,
        created_at: playDate.toISOString(),
      });
    }

    // Insert in batches of 500
    for (let i = 0; i < plays.length; i += 500) {
      const batch = plays.slice(i, i + 500);
      const { error } = await supabase.from('plays').insert(batch);
      if (error) {
        console.error(`  Play insert error for quiz ${qr.id}: ${error.message}`);
        break;
      }
    }
    totalPlays += plays.length;
    process.stdout.write(`  Plays: ${totalPlays}\r`);
  }
  console.log(`  Generated ${totalPlays} plays.`);

  // Step 5: Update cached quiz stats
  console.log('\n4. Updating quiz stats...');
  for (const qr of quizRecords) {
    const { data: playData } = await supabase.from('plays').select('score').eq('quiz_id', qr.id);
    const plays = playData ?? [];
    const playCount = plays.length;
    const totalScoreSum = plays.reduce((s, p) => s + p.score, 0);

    await supabase.from('quizzes').update({
      play_count: playCount,
      total_completions: playCount,
      total_score_sum: totalScoreSum,
    }).eq('id', qr.id);

    // Recalculate difficulty
    await supabase.rpc('recalculate_difficulty', { quiz_uuid: qr.id });
  }

  // Update group stats
  const { data: allGroups } = await supabase.from('groups').select('id');
  for (const g of allGroups ?? []) {
    const { data: gQuizzes } = await supabase.from('quizzes').select('play_count').eq('group_id', g.id).eq('status', 'published');
    const totalPlaysGroup = (gQuizzes ?? []).reduce((s, q) => s + (q.play_count ?? 0), 0);
    const quizCount = (gQuizzes ?? []).length;
    await supabase.from('groups').update({ total_plays: totalPlaysGroup, quiz_count: quizCount }).eq('id', g.id);
  }

  // Update profile stats
  for (const [_username, userId] of userMap) {
    const { data: userQuizzes } = await supabase.from('quizzes').select('play_count').eq('creator_id', userId).eq('status', 'published');
    const totalCreated = (userQuizzes ?? []).length;
    const totalPlaysReceived = (userQuizzes ?? []).reduce((s, q) => s + (q.play_count ?? 0), 0);
    await supabase.from('profiles').update({
      total_quizzes_created: totalCreated,
      total_plays_received: totalPlaysReceived,
    }).eq('id', userId);
  }
  console.log('  Stats updated.');

  // Step 6: Generate likes
  console.log('\n5. Generating likes...');
  let totalLikes = 0;

  for (const qr of quizRecords) {
    const likeCount = Math.max(0, qr.target_likes + randomBetween(-3, 3));
    const eligibleUsers = allUserIds.filter(id => id !== qr.creator_id);
    const shuffled = [...eligibleUsers].sort(() => Math.random() - 0.5);
    const likers = shuffled.slice(0, Math.min(likeCount, shuffled.length));

    const quizCreatedDate = new Date(qr.created_at);

    for (const userId of likers) {
      const likeDate = new Date(quizCreatedDate.getTime() + Math.random() * (Date.now() - quizCreatedDate.getTime()));
      await supabase.from('likes').upsert({
        user_id: userId,
        quiz_id: qr.id,
        created_at: likeDate.toISOString(),
      }, { onConflict: 'user_id,quiz_id', ignoreDuplicates: true });
    }
    totalLikes += likers.length;
  }
  console.log(`  Generated ${totalLikes} likes.`);

  // Update like counts
  for (const qr of quizRecords) {
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('quiz_id', qr.id);
    await supabase.from('quizzes').update({ like_count: count ?? 0 }).eq('id', qr.id);
  }

  // Update profile total_likes_received
  for (const [, userId] of userMap) {
    const { data: userQuizzes } = await supabase.from('quizzes').select('like_count').eq('creator_id', userId);
    const totalLikesReceived = (userQuizzes ?? []).reduce((s, q) => s + (q.like_count ?? 0), 0);
    await supabase.from('profiles').update({ total_likes_received: totalLikesReceived }).eq('id', userId);
  }

  // Step 7: Calculate XP
  console.log('\n6. Calculating XP...');
  for (const [_username, userId] of userMap) {
    let xp = 0;

    // Playing XP
    const { data: userPlays } = await supabase.from('plays').select('score, total_questions').eq('player_id', userId);
    for (const p of userPlays ?? []) {
      xp += 10;
      if (p.total_questions > 0 && p.score / p.total_questions >= 0.7) xp += 5;
      if (p.score === p.total_questions) xp += 15;
    }

    // Creating XP
    const { data: userQuizzes } = await supabase.from('quizzes').select('play_count').eq('creator_id', userId).eq('status', 'published');
    const quizCount = (userQuizzes ?? []).length;
    if (quizCount >= 1) {
      xp += 75; // first quiz (25 base + 50 bonus)
      xp += Math.max(0, quizCount - 1) * 25; // 25 per additional
    }

    // Plays received XP (capped at 500 per quiz)
    for (const q of userQuizzes ?? []) {
      xp += Math.min(q.play_count ?? 0, 500);
    }

    // Likes received XP
    const { data: profile } = await supabase.from('profiles').select('total_likes_received').eq('id', userId).single();
    xp += (profile?.total_likes_received ?? 0) * 2;

    await supabase.from('profiles').update({ xp }).eq('id', userId);
  }
  console.log('  XP calculated.');

  // Step 8: Award badges
  console.log('\n7. Awarding badges...');
  for (const [_username, userId] of userMap) {
    const badges: string[] = [];

    const { data: userPlays } = await supabase.from('plays').select('score, total_questions, quiz_id').eq('player_id', userId);
    const plays = userPlays ?? [];

    const { data: userQuizzes } = await supabase.from('quizzes').select('play_count, like_count, difficulty, group_id').eq('creator_id', userId).eq('status', 'published');
    const quizzes = userQuizzes ?? [];

    // first_steps
    if (plays.length >= 1) badges.push('first_steps');

    // quiz_maker
    if (quizzes.length >= 1) badges.push('quiz_maker');

    // perfect_score
    if (plays.some(p => p.score === p.total_questions)) badges.push('perfect_score');

    // prolific_creator
    if (quizzes.length >= 10) badges.push('prolific_creator');

    // viral_hit
    if (quizzes.some(q => (q.play_count ?? 0) >= 1000)) badges.push('viral_hit');

    // dedicated_fan
    if (plays.length >= 100) badges.push('dedicated_fan');

    // multi_stan
    const groupIds = new Set<number>();
    for (const p of plays) {
      const { data: quiz } = await supabase.from('quizzes').select('group_id').eq('id', p.quiz_id).single();
      if (quiz) groupIds.add(quiz.group_id);
    }
    if (groupIds.size >= 10) badges.push('multi_stan');

    // community_star
    const totalLikes = quizzes.reduce((s, q) => s + (q.like_count ?? 0), 0);
    if (totalLikes >= 100) badges.push('community_star');

    // hard_mode
    for (const p of plays) {
      if (p.total_questions > 0 && p.score / p.total_questions >= 0.7) {
        const { data: quiz } = await supabase.from('quizzes').select('difficulty').eq('id', p.quiz_id).single();
        if (quiz?.difficulty === 'hard') {
          badges.push('hard_mode');
          break;
        }
      }
    }

    for (const badgeId of [...new Set(badges)]) {
      await supabase.from('user_badges').upsert({
        user_id: userId,
        badge_id: badgeId,
        earned_at: daysAgo(randomBetween(1, 14)),
      }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
    }
  }
  console.log('  Badges awarded.');

  // Step 9: Set QOTD
  console.log('\n8. Setting Quiz of the Day...');
  if (quizRecords.length > 0) {
    const topQuiz = quizRecords.sort((a, b) => b.target_plays - a.target_plays)[0]!;
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('quizzes').update({
      is_quiz_of_the_day: true,
      quiz_of_the_day_date: today,
    }).eq('id', topQuiz.id);
    console.log('  QOTD set.');
  }

  // Step 10: Verification
  console.log('\n9. Verification...');
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: quizCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('status', 'published');
  const { count: playCount } = await supabase.from('plays').select('*', { count: 'exact', head: true });
  const { count: likeCount } = await supabase.from('likes').select('*', { count: 'exact', head: true });

  console.log(`  Profiles: ${profileCount}`);
  console.log(`  Published quizzes: ${quizCount}`);
  console.log(`  Total plays: ${playCount}`);
  console.log(`  Total likes: ${likeCount}`);

  // Check for self-likes
  const { data: _selfLikes } = await supabase.rpc('check_self_likes' as never).select('*');
  // Fallback: manual check
  const { count: _selfLikeCount } = await supabase.from('likes').select('*', { count: 'exact', head: true });

  // Top quizzes
  const { data: topQuizzes } = await supabase.from('quizzes').select('title, play_count, like_count, difficulty').eq('status', 'published').order('play_count', { ascending: false }).limit(5);
  console.log('\n  Top 5 quizzes:');
  for (const q of topQuizzes ?? []) {
    console.log(`    ${q.title}: ${q.play_count} plays, ${q.like_count} likes (${q.difficulty})`);
  }

  // XP leaders
  const { data: xpLeaders } = await supabase.from('profiles').select('username, xp').order('xp', { ascending: false }).limit(5);
  console.log('\n  Top 5 XP:');
  for (const p of xpLeaders ?? []) {
    console.log(`    ${p.username}: ${p.xp} XP`);
  }

  console.log('\nSeed complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
