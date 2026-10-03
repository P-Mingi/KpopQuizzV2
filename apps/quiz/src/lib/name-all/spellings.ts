// Name them all (V12 G6): the accepted spellings, per group slug and per member.
//
// The member LIST is not here: it is read from the database (`idols`, active rows
// of the group, in `ord` order). This table only adds what a fan may type for a
// member besides the display name: other romanizations, the birth name (given name
// alone and with the family name), and the Hangul of the stage and birth names.
// The key of each row is the exact `idols.name`. A member the table does not know
// is still playable with the display name and the Hangul stored in the database.
//
// Checked against production on 2026-10-02 with read-only SQL
// (docs/design/growth-v12/run/reports/G6/roster-check.txt): every key below is an
// active `idols.name` of its group, and every active member of these groups has a row.
//
// NAME_ALL_GROUPS is the list of groups that have a page. The database has active
// members for one more group, `nct`, but those 9 rows are the NCT 127 line-up under
// the NCT group: "name all 9 NCT members" would be wrong, so it has no page (report
// G6, owner decision 1).

export const NAME_ALL_GROUPS = [
  'bts', 'blackpink', 'stray-kids', 'twice', 'aespa', 'newjeans', 'seventeen', 'exo',
  'g-i-dle', 'ive', 'le-sserafim', 'red-velvet', 'ateez', 'enhypen', 'txt', 'itzy', 'shinee',
] as const;

export type NameAllGroupSlug = (typeof NAME_ALL_GROUPS)[number];

export function isNameAllGroup(slug: string): slug is NameAllGroupSlug {
  return (NAME_ALL_GROUPS as readonly string[]).includes(slug);
}

export const NAME_ALL_SPELLINGS: Record<NameAllGroupSlug, Record<string, string[]>> = {
  bts: {
    RM: ['Namjoon', 'Kim Namjoon', 'Rap Monster', '알엠', '남준', '김남준'],
    Jin: ['Seokjin', 'Kim Seokjin', '진', '석진', '김석진'],
    Suga: ['Yoongi', 'Min Yoongi', 'Agust D', '슈가', '윤기', '민윤기'],
    'J-Hope': ['Hoseok', 'Jung Hoseok', 'Hobi', '제이홉', '호석', '정호석'],
    Jimin: ['Park Jimin', '지민', '박지민'],
    V: ['Taehyung', 'Kim Taehyung', 'Tae', '뷔', '태형', '김태형'],
    Jungkook: ['Jeon Jungkook', 'Jeongguk', 'JK', '정국', '전정국'],
  },
  blackpink: {
    Jisoo: ['Kim Jisoo', '지수', '김지수'],
    Jennie: ['Jennie Kim', 'Kim Jennie', '제니', '김제니'],
    Rose: ['Rosie', 'Roseanne', 'Roseanne Park', 'Park Chaeyoung', 'Chaeyoung', '로제', '채영', '박채영'],
    Lisa: ['Lalisa', 'Lalisa Manoban', 'Lalisa Manobal', '리사', '라리사'],
  },
  'stray-kids': {
    'Bang Chan': ['Chan', 'Chris', 'Christopher Bang', '방찬', '찬'],
    'Lee Know': ['Minho', 'Lee Minho', '리노', '민호', '이민호'],
    Changbin: ['Seo Changbin', '창빈', '서창빈'],
    Hyunjin: ['Hwang Hyunjin', '현진', '황현진'],
    Han: ['Jisung', 'Han Jisung', '한', '지성', '한지성'],
    Felix: ['Lee Felix', 'Yongbok', 'Lee Yongbok', '필릭스', '용복', '이용복'],
    Seungmin: ['Kim Seungmin', '승민', '김승민'],
    'I.N': ['Jeongin', 'Yang Jeongin', '아이엔', '정인', '양정인'],
  },
  twice: {
    Nayeon: ['Im Nayeon', '나연', '임나연'],
    Jeongyeon: ['Yoo Jeongyeon', 'Jungyeon', '정연', '유정연'],
    Momo: ['Hirai Momo', '모모'],
    Sana: ['Minatozaki Sana', '사나'],
    Jihyo: ['Park Jihyo', '지효', '박지효'],
    Mina: ['Myoui Mina', '미나'],
    Dahyun: ['Kim Dahyun', '다현', '김다현'],
    Chaeyoung: ['Son Chaeyoung', '채영', '손채영'],
    Tzuyu: ['Chou Tzuyu', '쯔위'],
  },
  aespa: {
    Karina: ['Jimin', 'Yoo Jimin', 'Yu Jimin', '카리나', '지민', '유지민'],
    Giselle: ['Aeri', 'Uchinaga Aeri', '지젤', '애리'],
    Winter: ['Minjeong', 'Kim Minjeong', '윈터', '민정', '김민정'],
    Ningning: ['Ning Yizhuo', '닝닝'],
  },
  newjeans: {
    Minji: ['Kim Minji', '민지', '김민지'],
    Hanni: ['Hanni Pham', '하니'],
    Danielle: ['Danielle Marsh', 'Mo Danielle', 'Mo Jihye', '다니엘'],
    Haerin: ['Kang Haerin', '해린', '강해린'],
    Hyein: ['Lee Hyein', '혜인', '이혜인'],
  },
  seventeen: {
    'S.Coups': ['Coups', 'Seungcheol', 'Choi Seungcheol', '에스쿱스', '승철', '최승철'],
    Jeonghan: ['Yoon Jeonghan', '정한', '윤정한'],
    Joshua: ['Jisoo', 'Hong Jisoo', 'Joshua Hong', '조슈아', '지수', '홍지수'],
    Jun: ['Junhui', 'Wen Junhui', '준', '문준휘'],
    Hoshi: ['Soonyoung', 'Kwon Soonyoung', '호시', '순영', '권순영'],
    Wonwoo: ['Jeon Wonwoo', '원우', '전원우'],
    Woozi: ['Jihoon', 'Lee Jihoon', '우지', '지훈', '이지훈'],
    DK: ['Dokyeom', 'Seokmin', 'Lee Seokmin', '도겸', '석민', '이석민'],
    Mingyu: ['Kim Mingyu', '민규', '김민규'],
    The8: ['Minghao', 'Xu Minghao', 'Myungho', '디에잇', '명호'],
    Seungkwan: ['Boo Seungkwan', '승관', '부승관'],
    Vernon: ['Hansol', 'Chwe Hansol', 'Choi Hansol', '버논', '한솔', '최한솔'],
    Dino: ['Chan', 'Lee Chan', '디노', '찬', '이찬'],
  },
  exo: {
    Xiumin: ['Minseok', 'Kim Minseok', '시우민', '민석', '김민석'],
    Suho: ['Junmyeon', 'Kim Junmyeon', '수호', '준면', '김준면'],
    Lay: ['Yixing', 'Zhang Yixing', '레이'],
    Baekhyun: ['Byun Baekhyun', '백현', '변백현'],
    Chen: ['Jongdae', 'Kim Jongdae', '첸', '종대', '김종대'],
    Chanyeol: ['Park Chanyeol', '찬열', '박찬열'],
    'D.O.': ['Kyungsoo', 'Do Kyungsoo', '디오', '경수', '도경수'],
    Kai: ['Jongin', 'Kim Jongin', '카이', '종인', '김종인'],
    Sehun: ['Oh Sehun', '세훈', '오세훈'],
  },
  'g-i-dle': {
    Miyeon: ['Cho Miyeon', '미연', '조미연'],
    Minnie: ['Nicha Yontararak', '민니'],
    Soyeon: ['Jeon Soyeon', '소연', '전소연'],
    Yuqi: ['Song Yuqi', '우기'],
    Shuhua: ['Yeh Shuhua', '슈화'],
  },
  ive: {
    Yujin: ['Ahn Yujin', 'An Yujin', '유진', '안유진'],
    Gaeul: ['Kim Gaeul', '가을', '김가을'],
    Rei: ['Naoi Rei', '레이'],
    Wonyoung: ['Jang Wonyoung', '원영', '장원영'],
    Liz: ['Jiwon', 'Kim Jiwon', '리즈', '지원', '김지원'],
    Leeseo: ['Hyunseo', 'Lee Hyunseo', '이서', '현서', '이현서'],
  },
  'le-sserafim': {
    Sakura: ['Miyawaki Sakura', '사쿠라'],
    Chaewon: ['Kim Chaewon', '채원', '김채원'],
    Yunjin: ['Huh Yunjin', 'Jennifer Huh', '윤진', '허윤진'],
    Kazuha: ['Nakamura Kazuha', '카즈하'],
    Eunchae: ['Hong Eunchae', '은채', '홍은채'],
  },
  'red-velvet': {
    Irene: ['Joohyun', 'Juhyun', 'Bae Joohyun', '아이린', '주현', '배주현'],
    Seulgi: ['Kang Seulgi', '슬기', '강슬기'],
    Wendy: ['Seungwan', 'Son Seungwan', '웬디', '승완', '손승완'],
    Joy: ['Sooyoung', 'Park Sooyoung', '조이', '수영', '박수영'],
    Yeri: ['Yerim', 'Kim Yerim', '예리', '예림', '김예림'],
  },
  ateez: {
    Hongjoong: ['Kim Hongjoong', '홍중', '김홍중'],
    Seonghwa: ['Park Seonghwa', '성화', '박성화'],
    Yunho: ['Jeong Yunho', '윤호', '정윤호'],
    Yeosang: ['Kang Yeosang', '여상', '강여상'],
    San: ['Choi San', '산', '최산'],
    Mingi: ['Song Mingi', '민기', '송민기'],
    Wooyoung: ['Jung Wooyoung', '우영', '정우영'],
    Jongho: ['Choi Jongho', '종호', '최종호'],
  },
  enhypen: {
    Heeseung: ['Lee Heeseung', '희승', '이희승'],
    Jay: ['Jongseong', 'Park Jongseong', 'Jay Park', '제이', '종성', '박종성'],
    Jake: ['Jaeyun', 'Sim Jaeyun', 'Jake Sim', '제이크', '재윤', '심재윤'],
    Sunghoon: ['Park Sunghoon', '성훈', '박성훈'],
    Sunoo: ['Kim Sunoo', 'Seonwoo', 'Kim Seonwoo', '선우', '김선우'],
    Jungwon: ['Yang Jungwon', '정원', '양정원'],
    'Ni-ki': ['Riki', 'Nishimura Riki', '니키'],
  },
  txt: {
    Soobin: ['Choi Soobin', '수빈', '최수빈'],
    Yeonjun: ['Choi Yeonjun', '연준', '최연준'],
    Beomgyu: ['Choi Beomgyu', '범규', '최범규'],
    Taehyun: ['Kang Taehyun', '태현', '강태현'],
    'Huening Kai': ['Kai', 'Kai Kamal Huening', '휴닝카이'],
  },
  itzy: {
    Yeji: ['Hwang Yeji', '예지', '황예지'],
    Lia: ['Jisu', 'Choi Jisu', 'Julia Choi', '리아', '지수', '최지수'],
    Ryujin: ['Shin Ryujin', '류진', '신류진'],
    Chaeryeong: ['Lee Chaeryeong', '채령', '이채령'],
    Yuna: ['Shin Yuna', '유나', '신유나'],
  },
  shinee: {
    Onew: ['Jinki', 'Lee Jinki', '온유', '진기', '이진기'],
    Key: ['Kibum', 'Kim Kibum', '키', '기범', '김기범'],
    Minho: ['Choi Minho', '민호', '최민호'],
    Taemin: ['Lee Taemin', '태민', '이태민'],
  },
};
