// facts.mjs (lot A1, 2026-10-30): the hand-made reading of the sources, one line per pool character of the 12 first series.
// Every value names its source; resolve.mjs refuses a value whose evidence is not in the cached source. No fan wiki, ever.
//   wd                     the Wikidata item of qids.mjs says it (P21 gender, P31 species, P725 Japanese voice)
//   wp(page, evidence)     the English Wikipedia page holds this short string (a fact to check, not text to reuse)
//   sec(page, head, sect)  the entry of the page is listed under this section (role at the start)
//   l04(page)              the role is the one of L04 (characters.role, same list page); the page holds the character
// null in g, s or r: the character is not a target, and the reason goes to the review list.
//
// The owner's decisions (A1-RELECTURE.md), each still checked against its source by resolve.mjs:
// - Species of Goku (saiyan), Nezuko (demon), Denji (hybrid): the species everyone knows. This DEPARTS from the contract
//   (docs/o1/contracts/dle-a1-characters.md: "the species shown first") by the owner's decision; listed for O1 in the PR body.
//   Isshin and Urahara stay human, as shown first. Uryu is quincy. Panda is panda. Rare species words accepted.
// - Roles differing from L04: Levi, Pochita, Power, Aki supporting; Uryu antagonist.
// - Muzan male (Wikipedia's "he"; Wikidata says undisclosed). Hange and Angel Devil: gender empty, so not targets.
// - Levi: first appearance empty.
// - Hunter x Hunter: the voices of the 2011 series (Madhouse), like the studio in L04, not the 1999 series.
// - Demographics: no origin magazine means none; JoJo shonen; Vinland Saga seinen.
export const wd = { kind: 'wd' }
export const wp = (page, ev) => ({ kind: 'wp', page, ev })
export const sec = (page, head, section) => ({ kind: 'sec', page, head, section })
export const l04 = (page, ev) => ({ kind: 'l04', page, ev })

const OP = 'List of One Piece characters', OPP = 'List of One Piece pirates', OPW = 'World Government (One Piece)', OP4 = 'Four Emperors (One Piece)'
const NA = 'List of Naruto characters', DS = 'List of Demon Slayer: Kimetsu no Yaiba characters', JK = 'List of Jujutsu Kaisen characters'
const DB = 'List of Dragon Ball characters', AT = 'List of Attack on Titan characters', MH = 'List of My Hero Academia characters'
const BL = 'List of Bleach characters', HH = 'List of Hunter × Hunter characters', CS = 'List of Chainsaw Man characters', FR = 'List of Frieren characters', BC = 'List of Black Clover characters'
const vb = (page, name) => wp(page, `Voiced by|${name}`)
const hh11 = (name) => wp(HH, `${name} (2011 series`)

// One row: [slug, gender, gender source, species, species source, role, role source, first appearance, its source, voice, its source]
const R = (slug, g, gs, s, ss, r, rs, f, fs, v, vs) => ({ slug, g, gs, s, ss, r, rs, f, fs, v, vs })
const HU = ['human', wd]

export const CHARACTERS = {
  'one-piece': [
    R('monkey-d-luffy', 'male', wd, ...HU, 'main', wp('Monkey D. Luffy', 'main protagonist of the manga series One Piece'), 'Chapter 1', wp('Monkey D. Luffy', 'One Piece chapter 1'), 'Mayumi Tanaka', wd),
    R('roronoa-zoro', 'male', wd, ...HU, 'main', l04('Straw Hats', 'Roronoa Zoro'), 'Chapter 3', wp('Roronoa Zoro', 'One Piece chapter 3'), 'Kazuya Nakai', wp('Roronoa Zoro', 'Kazuya Nakai')),
    R('shanks', 'male', wd, ...HU, 'supporting', l04(OP4, 'Shanks'), null, null, 'Shūichi Ikeda', wp(OP4, 'his voice actor is Shūichi Ikeda')),
    R('gol-d-roger', 'male', wd, ...HU, 'other', l04(OPP, 'Gol D. Roger'), null, null, 'Chikao Ōtsuka', wp(OPP, 'Roger is originally voiced by Chikao Ōtsuka')),
    R('makino', 'female', wd, ...HU, 'supporting', l04(OP, 'A bartender and friend of Luffy'), null, null, 'Makiko Ohmoto', wp(OP, 'Makino is voiced by Makiko Ohmoto in the original Japanese')),
    R('koby', 'male', wd, ...HU, 'supporting', l04(OPW, 'is the first friend Luffy makes'), null, null, 'Mika Doi', wp(OPW, 'his voice is supplied by Mika Doi')),
  ],
  naruto: [
    R('naruto-uzumaki', 'male', wd, ...HU, 'main', sec(NA, 'Naruto Uzumaki', 'Main characters'), 'Chapter 1', wp('Naruto Uzumaki', 'Naruto chapter 1'), 'Junko Takeuchi', wd),
    R('sasuke-uchiha', 'male', wd, ...HU, 'main', sec(NA, 'Sasuke Uchiha', 'Main characters'), 'Chapter 3', wp('Sasuke Uchiha', 'Naruto chapter 3'), 'Noriaki Sugiyama', wd),
    R('sakura-haruno', 'female', wd, ...HU, 'main', sec(NA, 'Sakura Haruno', 'Main characters'), 'Chapter 3', wp('Sakura Haruno', 'Naruto chapter 3'), 'Chie Nakamura', wd),
    R('kakashi-hatake', 'male', wd, ...HU, 'main', sec(NA, 'Kakashi Hatake', 'Main characters'), 'Chapter 3', wp('Kakashi Hatake', 'Naruto chapter 3'), 'Kazuhiko Inoue', wd),
    R('iruka-umino', 'male', wd, ...HU, 'supporting', sec(NA, 'Iruka Umino', 'Supporting characters'), null, null, 'Toshihiko Seki', wp(NA, 'his voice actor is Toshihiko Seki')),
    R('hiruzen-sarutobi', 'male', wd, ...HU, 'supporting', sec(NA, 'Hiruzen Sarutobi', 'Supporting characters'), null, null, 'Hidekatsu Shibata', wp(NA, 'he is voiced by Hidekatsu Shibata')),
    R('konohamaru-sarutobi', 'male', wd, ...HU, 'supporting', l04(NA, 'is the grandson of the Third Hokage'), null, null, 'Ikue Ōtani', wp(NA, 'voiced in the Japanese anime by Ikue Ōtani')),
  ],
  'demon-slayer': [
    R('tanjiro-kamado', 'male', wd, ...HU, 'main', sec(DS, 'Tanjiro Kamado', 'Main characters'), 'Chapter 1', wp('Tanjiro Kamado', 'Kimetsu no Yaiba chapter 1'), 'Natsuki Hanae', vb(DS, 'Natsuki Hanae')),
    R('nezuko-kamado', 'female', wd, 'demon', wp(DS, 'is the younger sister of Tanjiro, transformed into a demon'), 'main', sec(DS, 'Nezuko Kamado', 'Main characters'), 'Chapter 1', wp('Nezuko Kamado', 'Kimetsu no Yaiba chapter 1'), 'Akari Kitō', vb(DS, 'Akari Kitō')),
    R('zenitsu-agatsuma', 'male', wd, ...HU, 'main', sec(DS, 'Zenitsu Agatsuma', 'Main characters'), null, null, 'Hiro Shimono', vb(DS, 'Hiro Shimono')),
    R('inosuke-hashibira', 'male', wd, ...HU, 'main', sec(DS, 'Inosuke Hashibira', 'Main characters'), null, null, 'Yoshitsugu Matsuoka', vb(DS, 'Yoshitsugu Matsuoka')),
    R('muzan-kibutsuji', 'male', wp('Muzan Kibutsuji', 'He is the very first demon'), 'demon', wd, 'antagonist', sec(DS, 'Muzan Kibutsuji', 'Demons'), 'Chapter 13', wp('Muzan Kibutsuji', 'Kimetsu no Yaiba chapter 13'), 'Toshihiko Seki', vb(DS, 'Toshihiko Seki')),
    R('giyu-tomioka', 'male', wd, ...HU, 'supporting', l04(DS, 'The Water Hashira'), null, null, 'Takahiro Sakurai', wd),
    R('sakonji-urokodaki', 'male', wd, ...HU, 'supporting', sec(DS, 'Urokodaki Sakonji', 'Supporting characters'), null, null, 'Hōchū Ōtsuka', wd),
  ],
  'jujutsu-kaisen': [
    R('yuji-itadori', 'male', wd, ...HU, 'main', wp('Yuji Itadori', 'the protagonist of the manga series'), 'Chapter 1', wp('Yuji Itadori', 'Jujutsu Kaisen #1'), 'Junya Enoki', vb(JK, 'Junya Enoki')),
    R('satoru-gojo', 'male', wd, ...HU, 'main', l04(JK, 'is a renowned Special Grade'), 'Jujutsu Kaisen 0, Chapter 1', wp('Satoru Gojo', 'Jujutsu Kaisen 0 #1'), 'Yūichi Nakamura', wd),
    R('megumi-fushiguro', 'male', wd, ...HU, 'main', wp('Megumi Fushiguro', 'deuteragonist'), 'Chapter 1', wp('Megumi Fushiguro', 'Jujutsu Kaisen #1'), 'Yuma Uchida', vb(JK, 'Yuma Uchida')),
    R('nobara-kugisaki', 'female', wd, ...HU, 'main', wp('Nobara Kugisaki', 'three main characters'), 'Chapter 3', wp('Nobara Kugisaki', 'Jujutsu Kaisen #3'), 'Asami Seto', vb(JK, 'Asami Seto')),
    R('ryomen-sukuna', 'male', wd, 'curse', wp(JK, 'vessel for the powerful Curse'), 'antagonist', wp('Ryomen Sukuna', 'main antagonists'), 'Chapter 1', wp('Ryomen Sukuna', 'Jujutsu Kaisen #1'), 'Junichi Suwabe', wd),
    R('maki-zenin', 'female', wd, ...HU, 'supporting', l04(JK, 'is a second-year student at Tokyo Jujutsu High'), 'Jujutsu Kaisen 0, Chapter 1', wp('Maki Zen\'in', 'Jujutsu Kaisen 0 #1'), 'Mikako Komatsu', vb(JK, 'Mikako Komatsu')),
    R('toge-inumaki', 'male', wd, ...HU, 'supporting', l04(JK, 'is a second-year student at Tokyo Prefectural Jujutsu High School'), null, null, 'Koki Uchiyama', vb(JK, 'Koki Uchiyama')),
    R('panda', 'male', wd, 'panda', wp(JK, 'between panda, gorilla, and triceratops modes'), 'supporting', l04(JK, 'is a sentient Cursed Corpse'), null, null, 'Tomokazu Seki', vb(JK, 'Tomokazu Seki')),
  ],
  'dragon-ball': [
    R('goku', 'male', wd, 'saiyan', wp('Goku', 'species = Saiyan'), 'main', sec(DB, 'Son Goku', 'Main characters'), 'Chapter 1', wp('Goku', 'chapter #1'), 'Masako Nozawa', wd),
    R('bulma', 'female', wd, ...HU, 'main', sec(DB, 'Bulma', 'Main characters'), 'Chapter 1', wp('Bulma', 'chapter #1'), 'Hiromi Tsuru', wd),
    R('master-roshi', 'male', wd, ...HU, 'supporting', sec(DB, 'Master Roshi', 'Secondary characters'), 'Chapter 3', wp('Master Roshi', 'chapter 3'), 'Kōhei Miyauchi', wd),
    R('yamcha', 'male', wd, ...HU, 'supporting', sec(DB, 'Yamcha', 'Secondary characters'), 'Chapter 7', wp('Yamcha', 'chapter #7'), 'Tōru Furuya', wd),
    R('oolong', 'male', wd, 'pig', wd, 'supporting', sec(DB, 'Oolong', 'Supporting characters'), null, null, 'Naoki Tatsuta', wp(DB, 'He is voiced by Naoki Tatsuta in Japanese')),
    R('chi-chi', 'female', wd, ...HU, 'supporting', sec(DB, 'Chi-Chi', 'Supporting characters'), 'Chapter 11', wp('Chi-Chi (Dragon Ball)', 'chapter 11'), 'Mayumi Shō', wp('Chi-Chi (Dragon Ball)', 'voiced by Mayumi Shō in the Japanese version')),
    R('emperor-pilaf', 'male', wd, 'creature', wd, 'antagonist', sec(DB, 'Pilaf Gang', 'Antagonists'), null, null, 'Shigeru Chiba', wp(DB, 'Pilaf is voiced by Shigeru Chiba in Japanese')),
  ],
  'attack-on-titan': [
    R('eren-yeager', 'male', wd, ...HU, 'main', sec(AT, 'Eren', 'Main characters'), 'Chapter 1', wp('Eren Yeager', 'Attack on Titan chapter 1'), 'Yūki Kaji', wd),
    R('mikasa-ackerman', 'female', wd, ...HU, 'main', sec(AT, 'Mikasa', 'Main characters'), 'Chapter 1', wp('Mikasa Ackerman', 'Attack on Titan chapter 1'), 'Yui Ishikawa', wd),
    R('armin-arlert', 'male', wd, ...HU, 'main', sec(AT, 'Armin', 'Main characters'), null, null, 'Marina Inoue', wd),
    R('levi-ackerman', 'male', wd, ...HU, 'supporting', wp('Levi Ackerman', 'Levi is a supporting character'), null, null, 'Hiroshi Kamiya', wd),
    R('erwin-smith', 'male', wd, ...HU, 'supporting', l04(AT, 'The 13th Commander of the Survey Corps'), null, null, 'Daisuke Ono', wd),
    R('hange-zoe', null, null, ...HU, 'supporting', l04(AT, 'is a bespectacled Survey Corps veteran'), null, null, 'Romi Park', wd),
    R('jean-kirstein', 'male', wd, ...HU, 'supporting', l04(AT, 'A hot-headed young man who speaks his mind'), null, null, 'Kishō Taniyama', wp(AT, 'Kishō Taniyama in the Japanese anime')),
    R('connie-springer', 'male', wd, ...HU, 'supporting', l04(AT, 'Connie hails from the Ragako District'), null, null, 'Hiro Shimono', wd),
    R('sasha-blouse', 'female', wd, ...HU, 'supporting', l04(AT, 'Sasha is a hunter from the mountainous'), null, null, 'Yū Kobayashi', wd),
    R('marco-bott', 'male', wd, ...HU, 'other', l04(AT, 'Ranked seventh of the trainee class'), null, null, 'Ryōta Ōsaka', wp(AT, 'Marco is voiced by Ryōta Ōsaka in Japanese')),
    R('keith-shadis', 'male', wp(AT, 'His face and head are cleanly shaven'), 'human', wp(AT, 'The instructor who is in charge of training'), 'other', l04(AT, 'The instructor who is in charge of training'), null, null, 'Tsuguo Mogami', wp(AT, 'he is voiced by Tsuguo Mogami')),
    R('hannes', 'male', wp(AT, 'saving his own wife and family'), 'human', wp(AT, 'A Garrison soldier who saves Eren and Mikasa'), 'other', l04(AT, 'A Garrison soldier who saves Eren and Mikasa'), null, null, 'Keiji Fujiwara', wp(AT, 'He is voiced by Keiji Fujiwara (Season 1)')),
    R('dot-pixis', 'male', wp(AT, 'Dot Pixis is a man with a moustache'), 'human', wp(AT, 'Dot Pixis is a man with a moustache'), 'supporting', l04(AT, 'Dot Pixis is a man with a moustache'), null, null, 'Masahiko Tanaka', wp(AT, 'Pixis is voiced by Masahiko Tanaka in Japanese')),
    R('mike-zacharius', 'male', wp(AT, 'when he meets them for the first time'), 'human', wp(AT, 'A Survey Corps squad leader who has a peculiar habit'), 'supporting', l04(AT, 'A Survey Corps squad leader who has a peculiar habit'), null, null, 'Kenta Miyake', wp(AT, 'He is voiced by Kenta Miyake in Japanese')),
    R('petra-ral', 'female', wd, ...HU, 'supporting', l04(AT, 'Petra is a skilled and experienced fighter'), null, null, 'Natsuki Aikawa', wp(AT, 'She is voiced by Natsuki Aikawa in the Japanese version')),
    R('grisha-yeager', 'male', wd, ...HU, 'supporting', l04(AT, 'He is a renowned medical doctor'), null, null, 'Hiroshi Tsuchida', wp(AT, 'Grisha is voiced by Hiroshi Tsuchida in the anime')),
    R('carla-yeager', 'female', wp(AT, 'the mother of Eren and the adoptive mother of Mikasa'), 'human', wp(AT, 'Carla was originally a waitress in Shiganshina'), 'other', l04(AT, 'The second wife of Grisha'), null, null, 'Yoshino Takamori', wp(AT, 'Carla is voiced by Yoshino Takamori in the Japanese')),
  ],
  'my-hero-academia': [
    R('izuku-midoriya', 'male', wd, ...HU, 'main', wp('Izuku Midoriya', 'the main protagonist of the manga series'), 'Chapter 1', wp('Izuku Midoriya', 'My Hero Academia #1'), 'Daiki Yamashita', wd),
    R('katsuki-bakugo', 'male', wd, ...HU, 'main', wp('Katsuki Bakugo', 'one of the main protagonists of the manga series'), 'Chapter 1', wp('Katsuki Bakugo', 'My Hero Academia #1'), 'Nobuhiko Okamoto', wp(MH, 'voiced by|Nobuhiko Okamoto (Anime)')),
    R('ochaco-uraraka', 'female', wd, ...HU, 'main', l04(MH, 'Ochaco is a bubbly and cheerful girl'), 'Chapter 3', wp('Ochaco Uraraka', 'My Hero Academia #3'), 'Ayane Sakura', vb(MH, 'Ayane Sakura')),
    R('shoto-todoroki', 'male', wd, ...HU, 'main', wp('Shoto Todoroki', 'one of the main protagonists of the manga series'), 'Chapter 6', wp('Shoto Todoroki', 'My Hero Academia #6'), 'Yūki Kaji', wp(MH, 'voiced by|Yūki Kaji')),
    R('tenya-ida', 'male', wd, ...HU, 'supporting', l04(MH, 'Tenya Ida is the strait-laced president of Class 1-A'), null, null, 'Kaito Ishikawa', wd),
    R('eijiro-kirishima', 'male', wd, ...HU, 'supporting', l04(MH, 'Eijiro Kirishima is a boisterous, chivalrous student'), null, null, 'Toshiki Masuda', wd),
    R('momo-yaoyorozu', 'female', wd, ...HU, 'supporting', l04(MH, 'Momo Yaoyorozu is the mature and level-headed'), null, null, 'Marina Inoue', wp(MH, 'voiced by|Marina Inoue')),
    R('tsuyu-asui', 'female', wd, ...HU, 'supporting', l04(MH, 'Tsuyu Asui is a sincere frog-like girl'), null, null, 'Aoi Yūki', wd),
    R('denki-kaminari', 'male', wp(MH, 'Denki Kaminari is a flirty, laid-back, and friendly boy'), 'human', wp(MH, 'Denki Kaminari is a flirty, laid-back, and friendly boy'), 'supporting', l04(MH, 'Denki Kaminari is a flirty, laid-back, and friendly boy'), null, null, 'Tasuku Hatanaka', wp(MH, 'voiced by|Tasuku Hatanaka')),
    R('fumikage-tokoyami', 'male', wp(MH, 'Horikoshi considered him to be outstanding'), 'human', wp(MH, 'Fumikage Tokoyami is a stoic crow-head student in Class 1-A'), 'supporting', l04(MH, 'Fumikage Tokoyami is a stoic crow-head student'), null, null, 'Yoshimasa Hosoya', wp(MH, 'voiced by|Yoshimasa Hosoya')),
    R('mina-ashido', 'female', wp(MH, 'Mina Ashido is an upbeat and outgoing girl in Class 1-A'), 'human', wp(MH, 'Mina Ashido is an upbeat and outgoing girl in Class 1-A'), 'supporting', l04(MH, 'Mina Ashido is an upbeat and outgoing girl'), null, null, 'Eri Kitamura', wp(MH, 'voiced by|Eri Kitamura')),
    R('kyoka-jiro', 'female', wp(MH, 'Kyoka Jiro is a pragmatic, music-loving girl in Class 1-A'), 'human', wp(MH, 'Kyoka Jiro is a pragmatic, music-loving girl in Class 1-A'), 'supporting', l04(MH, 'Kyoka Jiro is a pragmatic, music-loving girl'), 'Chapter 5', wp('Kyoka Jiro', 'My Hero Academia #5'), 'Kei Shindō', wp('Kyoka Jiro', 'Jiro is voiced by Kei Shindō in Japanese')),
    R('minoru-mineta', 'male', wp(MH, 'Mineta Minoru is a diminutive, cowardly, and lecherous boy'), 'human', wp(MH, 'Mineta Minoru is a diminutive, cowardly, and lecherous boy'), 'supporting', l04(MH, 'Mineta Minoru is a diminutive'), null, null, 'Ryō Hirohashi', wp(MH, 'voiced by|Ryō Hirohashi')),
    R('all-might', 'male', wd, ...HU, 'main', l04(MH, 'Toshinori Yagi is the eighth holder'), null, null, 'Kenta Miyake', wp(MH, 'voiced by|Kenta Miyake (Anime)')),
    R('shota-aizawa', 'male', wd, ...HU, 'supporting', l04(MH, 'Shota Aizawa is the pragmatic and lethargic homeroom teacher'), null, null, 'Junichi Suwabe', wd),
    R('recovery-girl', 'female', wp(MH, 'her words hold just as much authority'), 'human', wp(MH, 'Chiyo Shuzenji is the elderly school nurse'), 'other', l04(MH, 'Chiyo Shuzenji is the elderly school nurse'), null, null, 'Etsuko Kozakura', wp(MH, 'voiced by|Etsuko Kozakura')),
    R('present-mic', 'male', wp(MH, 'amplifies his voice'), 'human', wp(MH, 'Hizashi Yamada is the school\'s English teacher'), 'supporting', l04(MH, 'Hizashi Yamada is the school\'s English teacher'), null, null, 'Hiroyuki Yoshino', wp(MH, 'voiced by|Hiroyuki Yoshino')),
    R('inko-midoriya', 'female', wd, ...HU, 'other', sec(MH, 'Midoriya Inko', 'Other characters'), null, null, 'Aya Kawakami', wd),
  ],
  bleach: [
    R('ichigo-kurosaki', 'male', wd, ...HU, 'main', sec(BL, 'Ichigo Kurosaki', 'Main characters'), 'Chapter 1', wp('Ichigo Kurosaki', 'Bleach #1'), 'Masakazu Morita', wp(BL, 'Ichigo is voiced by Masakazu Morita in the original Japanese')),
    R('rukia-kuchiki', 'female', wd, 'shinigami', wd, 'main', sec(BL, 'Rukia Kuchiki', 'Main characters'), 'Chapter 1', wp('Rukia Kuchiki', 'Bleach #1'), 'Fumiko Orikasa', wp(BL, 'Rukia is voiced by Fumiko Orikasa in the original Japanese')),
    R('orihime-inoue', 'female', wd, ...HU, 'main', sec(BL, 'Orihime Inoue', 'Main characters'), 'Chapter 2', wp('Orihime Inoue', 'Bleach chapter 2'), 'Yuki Matsuoka', wp(BL, 'Orihime is voiced by Yuki Matsuoka in the original Japanese')),
    R('uryu-ishida', 'male', wd, 'quincy', wd, 'antagonist', wp(BL, 'is an early antagonist in the series'), null, null, 'Noriaki Sugiyama', wp(BL, 'Uryū is voiced by Noriaki Sugiyama in the original Japanese')),
    R('yasutora-sado', 'male', wd, ...HU, 'main', sec(BL, 'Yasutora', 'Main characters'), 'Chapter 7', wp('Yasutora Sado', 'Bleach chapter 7'), 'Hiroki Yasumoto', wp('Yasutora Sado', 'Hiroki Yasumoto')),
    R('kisuke-urahara', 'male', wd, 'human', wp(BL, 'is the owner of the Urahara Shop'), 'supporting', sec(BL, 'Kisuke Urahara', 'Supporting characters'), null, null, 'Shin-ichiro Miki', wp(BL, 'He is voiced by Shin-ichiro Miki in the original Japanese')),
    R('isshin-kurosaki', 'male', wd, 'human', wp(BL, 'the unassuming father of Ichigo'), 'supporting', l04(BL, 'the unassuming father of Ichigo'), null, null, 'Toshiyuki Morikawa', wp(BL, 'Isshin is voiced by Toshiyuki Morikawa in the original Japanese')),
    R('kon', 'male', wd, 'mod-soul', wp(BL, 'is the first Mod-Soul to appear in Bleach'), 'supporting', l04(BL, 'is the first Mod-Soul to appear in Bleach'), null, null, 'Mitsuaki Madono', wp(BL, 'He is voiced by Mitsuaki Madono in the original Japanese')),
    R('karin-kurosaki', 'female', wd, ...HU, 'supporting', l04(BL, 'are Ichigo\'s younger sisters'), null, null, 'Rie Kugimiya', wp(BL, 'Karin is voiced by Rie Kugimiya in the original Japanese')),
    R('tatsuki-arisawa', 'female', wp(BL, 'She has known both since she was young'), 'human', wp(BL, 'is a good childhood friend of Ichigo'), 'supporting', l04(BL, 'is a good childhood friend of Ichigo'), null, null, 'Junko Noda', wp(BL, 'Tatsuki is voiced by Junko Noda in the original Japanese')),
  ],
  'hunter-x-hunter': [
    R('gon-freecss', 'male', wd, ...HU, 'main', sec(HH, 'Gon Freecss', 'Main characters'), 'Chapter 1', wp('Gon Freecss', 'manga chapter 1'), 'Megumi Han', hh11('Megumi Han')),
    R('killua-zoldyck', 'male', wd, ...HU, 'main', sec(HH, 'Killua Zoldyck', 'Main characters'), 'Chapter 6', wp('Killua Zoldyck', 'manga chapter 6'), 'Mariya Ise', hh11('Mariya Ise')),
    R('kurapika', 'male', wd, ...HU, 'main', sec(HH, 'Kurapika', 'Main characters'), 'Chapter 2', wp('Kurapika', 'manga chapter 2'), 'Miyuki Sawashiro', hh11('Miyuki Sawashiro')),
    R('leorio-paradinight', 'male', wd, ...HU, 'main', sec(HH, 'Leorio Paradinight', 'Main characters'), null, null, 'Keiji Fujiwara', hh11('Keiji Fujiwara')),
    R('hisoka-morrow', 'male', wd, ...HU, 'antagonist', sec(HH, 'Hisoka Morrow', 'Villains'), null, null, 'Daisuke Namikawa', hh11('Daisuke Namikawa')),
    R('isaac-netero', 'male', wd, ...HU, 'supporting', sec(HH, 'Isaac Netero', 'Hunter Association'), null, null, 'Ichirō Nagai', hh11('Ichirō Nagai')),
    R('ging-freecss', 'male', wd, ...HU, 'supporting', sec(HH, 'Ging Freecss', 'Hunter Association'), null, null, 'Rikiya Koyama', hh11('Rikiya Koyama')),
    R('silva-zoldyck', 'male', wd, ...HU, 'supporting', sec(HH, 'Silva Zoldyck', 'Zoldyck Family'), null, null, 'Kouichi Yamadera', hh11('Kouichi Yamadera')),
  ],
  'chainsaw-man': [
    R('denji', 'male', wd, 'hybrid', wp('Denji (Chainsaw Man)', 'species = Devil-human hybrid'), 'main', sec(CS, 'Denji', 'Main characters'), 'Chapter 1', wp('Denji (Chainsaw Man)', 'Chainsaw Man chapter 1'), 'Kikunosuke Toya', wd),
    R('pochita', 'male', wp(CS, 'He has the ability to eat a devil'), 'devil', wp(CS, 'The Chainsaw Devil, who merges with Denji'), 'supporting', sec(CS, 'ポチタ', 'Devils and Fiends'), null, null, 'Shiori Izawa', vb(CS, 'Shiori Izawa')),
    R('power', 'female', wd, 'fiend', wd, 'supporting', wp('Power (Chainsaw Man)', 'working alongside the main character'), 'Chapter 4', wp('Power (Chainsaw Man)', 'Chainsaw Man chapter 4'), 'Fairouz Ai', wd),
    R('aki-hayakawa', 'male', wd, ...HU, 'supporting', sec(CS, '早川アキ', 'Public Safety Organization'), null, null, 'Shogo Sakata', vb(CS, 'Shogo Sakata')),
    R('kobeni-higashiyama', 'female', wd, ...HU, 'supporting', sec(CS, '東山 コベニ', 'Public Safety Organization'), null, null, 'Karin Takahashi', vb(CS, 'Karin Takahashi')),
    R('himeno', 'female', wd, ...HU, 'supporting', sec(CS, '姫野', 'Public Safety Organization'), null, null, 'Mariya Ise', wd),
    R('kishibe', 'male', wp(CS, 'He maintains contracts with multiple devils'), 'human', wp(CS, 'Kishibe is a cynical veteran formerly of Tokyo Special Division 1'), 'supporting', sec(CS, '岸辺', 'Public Safety Organization'), null, null, 'Kenjiro Tsuda', vb(CS, 'Kenjiro Tsuda')),
    R('angel-devil', null, null, 'devil', sec(CS, '天使の悪魔', 'Devils and Fiends'), 'supporting', sec(CS, '天使の悪魔', 'Allies of the Public Safety Organization'), null, null, 'Maaya Uchida', vb(CS, 'Maaya Uchida')),
    R('katana-man', 'male', wp(CS, 'grandson of the yakuza boss'), 'hybrid', wp(CS, 'As a human-devil hybrid containing the Katana Devil'), 'antagonist', sec(CS, 'サムライソード', 'Yakuza'), null, null, 'Daiki Hamano', vb(CS, 'Daiki Hamano')),
  ],
  frieren: [
    R('frieren', 'female', wd, 'elf', wd, 'main', wp('Frieren (character)', 'is the titular protagonist'), 'Chapter 1', wp('Frieren (character)', 'Frieren #1'), 'Atsumi Tanezaki', vb(FR, 'Atsumi Tanezaki')),
    R('fern', 'female', wd, ...HU, 'main', l04(FR, 'A powerful young mage and Frieren\'s apprentice'), 'Chapter 2', wp('Fern (Frieren)', 'Frieren #2'), 'Kana Ichinose', vb(FR, 'Kana Ichinose')),
    R('stark', 'male', wd, ...HU, 'main', l04(FR, 'A young warrior who Eisen raised'), 'Chapter 11', wp('Stark (Frieren)', 'Frieren #11'), 'Chiaki Kobayashi', vb(FR, 'Chiaki Kobayashi')),
    R('sein', 'male', wd, ...HU, 'supporting', l04(FR, 'A village priest who joins Frieren'), null, null, 'Yuichi Nakamura', vb(FR, 'Yuichi Nakamura')),
    R('himmel', 'male', wd, ...HU, 'supporting', l04(FR, 'A human member of the Hero Party. He was the hero'), null, null, 'Nobuhiko Okamoto', vb(FR, 'Nobuhiko Okamoto')),
    R('heiter', 'male', wd, ...HU, 'supporting', l04(FR, 'A human member of the Hero Party, who was an alcohol-loving priest'), null, null, 'Hiroki Tōchi', vb(FR, 'Hiroki Tōchi')),
    R('eisen', 'male', wd, 'dwarf', wd, 'supporting', l04(FR, 'A member of the Hero Party. He is a dwarf'), null, null, 'Yōji Ueda', vb(FR, 'Yōji Ueda')),
    R('qual', 'male', wd, 'demon', wd, 'antagonist', sec(FR, 'Qual', 'Demons'), null, null, 'Hiroki Yasumoto', vb(FR, 'Hiroki Yasumoto')),
    R('aura', 'female', wd, 'demon', wd, 'antagonist', sec(FR, 'Aura', 'Demons'), null, null, 'Ayana Taketatsu', vb(FR, 'Ayana Taketatsu')),
    R('serie', 'female', wd, 'elf', wd, 'other', l04(FR, 'Serie is an ancient elf mage'), null, null, 'Mariya Ise', vb(FR, 'Mariya Ise')),
    R('denken', 'male', wd, ...HU, 'supporting', l04(FR, 'Denken is an elderly second-class mage'), null, null, 'Jiro Saito', vb(FR, 'Jiro Saito')),
    R('ubel', 'female', wd, ...HU, 'supporting', l04(FR, 'A sadistic and violent mage'), null, null, 'Ikumi Hasegawa', vb(FR, 'Ikumi Hasegawa')),
    R('land', 'male', wd, ...HU, 'supporting', l04(FR, 'Land is Fern\'s teammate'), null, null, 'Shohei Komatsu', vb(FR, 'Shohei Komatsu')),
    R('methode', 'female', wd, ...HU, 'supporting', l04(FR, 'A female mage who initially formed a party'), null, null, 'Reina Ueda', vb(FR, 'Reina Ueda')),
    R('kanne', 'female', wd, ...HU, 'supporting', l04(FR, 'A timid third-class mage who can control water'), null, null, 'Azumi Waki', vb(FR, 'Azumi Waki')),
    R('lawine', 'female', wd, ...HU, 'supporting', l04(FR, 'She is a third-class mage who can turn water into ice'), null, null, 'Sayumi Suzushiro', vb(FR, 'Sayumi Suzushiro')),
    R('wirbel', 'male', wd, ...HU, 'supporting', l04(FR, 'A second-class mage with lots of live combat experience'), null, null, 'Kishō Taniyama', vb(FR, 'Kishō Taniyama')),
  ],
  'black-clover': [
    R('asta', 'male', wd, ...HU, 'main', sec(BC, 'Asta', 'Main characters'), 'Chapter 1', wp('Asta (Black Clover)', 'Black Clover #1'), 'Gakuto Kajiwara', wd),
    R('yuno-grinberryall', 'male', wp(BC, 'He is later revealed to be the prince'), 'human', wp(BC, 'a result of being the human vessel'), 'main', sec(BC, 'Yuno Grinberryall', 'Main characters'), null, null, 'Nobunaga Shimazaki', wp(BC, 'Nobunaga Shimazaki (anime)')),
    R('noelle-silva', 'female', wd, ...HU, 'main', sec(BC, 'Noelle Silva', 'Main characters'), 'Chapter 4', wp('Noelle Silva', 'Black Clover #4'), 'Kana Yūki', vb(BC, 'Kana Yūki')),
    R('yami-sukehiro', 'male', wd, ...HU, 'supporting', l04(BC, 'is the captain of the Black Bulls'), 'Chapter 2', wp('Yami Sukehiro', 'Black Clover #2'), 'Junichi Suwabe', vb(BC, 'Junichi Suwabe')),
    R('finral-roulacase', 'male', wp(BC, 'he grows into a courageous mage'), 'human', wp(BC, 'is a Black Bulls member specializing in Spatial Magic'), 'supporting', l04(BC, 'is a Black Bulls member specializing in Spatial Magic'), null, null, 'Jun Fukuyama', vb(BC, 'Jun Fukuyama')),
    R('magna-swing', 'male', wd, ...HU, 'supporting', l04(BC, 'is a fiery-tempered Black Bulls member'), null, null, 'Genki Muro', vb(BC, 'Genki Muro')),
  ],
}

// The 50 launch series. Manga: the demographic the Wikipedia page of the work states. No magazine at the origin: 'none', from Wikidata P31.
const WI = (ev, page) => ({ kind: 'wp', page, ev })
export const SERIES = {
  'apothecary-diaries': ['none', { kind: 'p31', label: 'light novel series' }],
  'attack-on-titan': ['shonen', WI('Category:Shōnen manga', 'Attack on Titan')],
  'black-clover': ['shonen', WI('Category:Shōnen manga', 'Black Clover')],
  bleach: ['shonen', WI('Category:Shōnen manga', 'Bleach (manga)')],
  'blue-lock': ['shonen', WI('Category:Shōnen manga', 'Blue Lock')],
  'bocchi-the-rock': ['seinen', WI('Category:Seinen manga', 'Bocchi the Rock!')],
  'chainsaw-man': ['shonen', WI('Category:Shōnen manga', 'Chainsaw Man')],
  'code-geass': ['none', { kind: 'p31', label: 'anime television series' }],
  'cowboy-bebop': ['none', { kind: 'p31', label: 'anime television series' }],
  dandadan: ['shonen', WI('Category:Shōnen manga', 'Dandadan')],
  'death-note': ['shonen', WI('Category:Shōnen manga', 'Death Note')],
  'demon-slayer': ['shonen', WI('Category:Shōnen manga', 'Demon Slayer: Kimetsu no Yaiba')],
  'detective-conan': ['shonen', WI('Category:Shōnen manga', 'Case Closed')],
  'dr-stone': ['shonen', WI('Category:Shōnen manga', 'Dr. Stone')],
  'dragon-ball': ['shonen', WI('Category:Shōnen manga', 'Dragon Ball (manga)')],
  evangelion: ['none', { kind: 'p31', label: 'anime television series' }],
  'fairy-tail': ['shonen', WI('Category:Shōnen manga', 'Fairy Tail')],
  frieren: ['shonen', WI('Category:Shōnen manga', 'Frieren')],
  'fruits-basket': ['shojo', WI('Category:Shōjo manga', 'Fruits Basket')],
  'fullmetal-alchemist': ['shonen', WI('Category:Shōnen manga', 'Fullmetal Alchemist')],
  gintama: ['shonen', WI('Category:Shōnen manga', 'Gintama')],
  haikyu: ['shonen', WI('Category:Shōnen manga', 'Haikyu!!')],
  'hunter-x-hunter': ['shonen', WI('Category:Shōnen manga', 'Hunter × Hunter')],
  inuyasha: ['shonen', WI('Category:Shōnen manga', 'Inuyasha')],
  jojo: ['shonen', WI('originally serialized in Shueisha', 'JoJo\'s Bizarre Adventure')],
  'jujutsu-kaisen': ['shonen', WI('Category:Shōnen manga', 'Jujutsu Kaisen')],
  kagurabachi: ['shonen', WI('Category:Shōnen manga', 'Kagurabachi')],
  'kaguya-sama-love-is-war': ['seinen', WI('Category:Seinen manga', 'Kaguya-sama: Love Is War')],
  'kaiju-no-8': ['shonen', WI('Category:Shōnen manga', 'Kaiju No. 8')],
  'mob-psycho-100': ['shonen', WI('Category:Shōnen manga', 'Mob Psycho 100')],
  'my-hero-academia': ['shonen', WI('Category:Shōnen manga', 'My Hero Academia')],
  naruto: ['shonen', WI('Category:Shōnen manga', 'Naruto')],
  'omniscient-readers-viewpoint': ['none', { kind: 'p31', label: 'manhwa series' }],
  'one-piece': ['shonen', WI('Category:Shōnen manga', 'One Piece')],
  'one-punch-man': ['seinen', WI('Category:Seinen manga', 'One-Punch Man')],
  'oshi-no-ko': ['seinen', WI('Category:Seinen manga', 'Oshi no Ko')],
  're-zero': ['none', { kind: 'p31', label: 'light novel series' }],
  'sailor-moon': ['shojo', WI('Category:Shōjo manga', 'Sailor Moon')],
  'sakamoto-days': ['shonen', WI('Category:Shōnen manga', 'Sakamoto Days')],
  'slam-dunk': ['shonen', WI('Category:Shōnen manga', 'Slam Dunk (manga)')],
  'solo-leveling': ['none', { kind: 'p31', label: 'novel series' }],
  'spy-x-family': ['shonen', WI('Category:Shōnen manga', 'Spy × Family')],
  'steins-gate': ['none', { kind: 'p31', label: 'video game' }],
  'sword-art-online': ['none', { kind: 'p31', label: 'light novel series' }],
  'that-time-i-got-reincarnated-as-a-slime': ['none', { kind: 'p31', label: 'light novel series' }],
  'tokyo-ghoul': ['seinen', WI('Category:Seinen manga', 'Tokyo Ghoul')],
  'tokyo-revengers': ['shonen', WI('Category:Shōnen manga', 'Tokyo Revengers')],
  'tower-of-god': ['none', { kind: 'p31', label: 'webtoon' }],
  'vinland-saga': ['seinen', WI('Category:Seinen manga', 'Vinland Saga (manga)')],
  'violet-evergarden': ['none', { kind: 'p31', label: 'light novel series' }],
}
